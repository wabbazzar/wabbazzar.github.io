#!/usr/bin/env python3
"""Generate Men Don't Talk social cards and crawler-friendly episode routes.

Each episode gets a deterministic 1200x630 PNG built from its metadata and
the first ten seconds of its published audio.  The route carries episode-
specific Open Graph tags, then redirects human browsers to the matching
anchor on the main player page.

Run from anywhere:

    python3 tools/generate_mdt_previews.py
"""

from __future__ import annotations

import array
import html
import json
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = pathlib.Path(__file__).resolve().parent.parent
MDT = ROOT / "men-dont-talk"
DATA = MDT / "episodes.json"
PREVIEWS = MDT / "previews"
ROUTES = MDT / "episode"

W, H = 1200, 630

# The web page's existing palette. Keeping this exact is more important than
# making the cards resemble a generic podcast tile.
BG = (10, 10, 9)
INK = (245, 245, 244)
DIM = (155, 154, 150)
FAINT = (102, 101, 96)
LINE = (43, 42, 39)
SIGNAL = (185, 173, 255)
WARM = (234, 223, 159)

FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/dejavu")


def font(filename: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / filename), size)


F_DISPLAY = lambda size: font("DejaVuSans-Bold.ttf", size)
F_TEXT = lambda size: font("DejaVuSans.ttf", size)
F_MONO = lambda size: font("DejaVuSansMono.ttf", size)
F_MONO_BOLD = lambda size: font("DejaVuSansMono-Bold.ttf", size)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def hex_color(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def load_photo(episode: dict) -> Image.Image:
    return Image.open(MDT / episode["photo"]).convert("RGB")


def cover_photo(photo: Image.Image, size: tuple[int, int], center=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(
        photo,
        size,
        method=Image.Resampling.LANCZOS,
        centering=tuple(center),
    )


def tracked_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: int,
):
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += draw.textlength(char, font=fnt) + tracking


def wrap_pixels(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and draw.textlength(candidate, font=fnt) > max_width:
            lines.append(current)
            current = word
            if len(lines) == max_lines:
                break
        else:
            current = candidate
    if len(lines) < max_lines and current:
        lines.append(current)
    if sum(len(line.split()) for line in lines) < len(words):
        lines[-1] = lines[-1].rstrip(".,") + "…"
    return lines


def audio_peaks(path: pathlib.Path, bars: int = 340) -> list[float]:
    """Return a normalized amplitude envelope from the episode cold open."""
    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
            "-t", "10", "-i", str(path), "-ac", "1", "-ar", "8000",
            "-f", "s16le", "-",
        ],
        check=True,
        capture_output=True,
    )
    samples = array.array("h")
    samples.frombytes(proc.stdout)
    if sys.byteorder != "little":
        samples.byteswap()
    if not samples:
        return [0.04] * bars
    bucket = max(1, len(samples) // bars)
    peaks = []
    for i in range(bars):
        part = samples[i * bucket : (i + 1) * bucket]
        peaks.append(max((abs(v) for v in part), default=0) / 32768)
    ceiling = max(peaks) or 1
    # Compression keeps conversation legible without letting one plosive own
    # the entire waveform.
    return [(value / ceiling) ** 0.62 for value in peaks]


def draw_waveform(
    draw: ImageDraw.ImageDraw,
    peaks: list[float],
    box: tuple[int, int, int, int],
    accent: tuple[int, int, int] = SIGNAL,
):
    x0, y0, x1, y1 = box
    mid = (y0 + y1) / 2
    half = (y1 - y0) / 2
    draw.line((x0, mid, x1, mid), fill=LINE, width=1)
    step = (x1 - x0) / max(1, len(peaks) - 1)
    quiet = mix(BG, accent, 0.54)
    for i, peak in enumerate(peaks):
        x = round(x0 + i * step)
        amp = max(2, round(peak * half))
        color = accent if peak > 0.72 else quiet
        draw.line((x, mid - amp, x, mid + amp), fill=color, width=2)


def guest_lines(name: str) -> list[str]:
    parts = name.upper().split()
    if len(parts) < 2:
        return [parts[0] + "."]
    return [" ".join(parts[:-1]), parts[-1] + "."]


def render_episode(episode: dict) -> Image.Image:
    accent = hex_color(episode["accent"])
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    tracked_text(draw, (58, 41), "MEN DON'T TALK", F_MONO_BOLD(18), INK, 2)
    marker = f"EPISODE {episode['number']}  /  {episode['duration']}"
    draw.text((598, 45), marker, anchor="ra", font=F_MONO(15), fill=DIM)
    draw.line((58, 82, 606, 82), fill=LINE, width=1)

    title_y = 104
    for line in guest_lines(episode["guest"]):
        draw.text((54, title_y), line, font=F_DISPLAY(66), fill=INK)
        title_y += 64

    label = f"WESLEY BECKNER WITH {episode['guest'].upper()}"
    tracked_text(draw, (59, 253), label, F_MONO_BOLD(12), accent, 1)

    quote_font = F_TEXT(22)
    quote_lines = wrap_pixels(draw, f'“{episode["quote"]}”', quote_font, 500, 3)
    quote_y = 300
    draw.rectangle((58, quote_y + 3, 63, quote_y + 74), fill=WARM)
    for line in quote_lines:
        draw.text((82, quote_y), line, font=quote_font, fill=DIM)
        quote_y += 29

    draw_waveform(
        draw,
        audio_peaks(MDT / episode["audio"], 180),
        (58, 478, 602, 548),
        accent,
    )
    draw.text((58, 582), "WABBAZZAR.COM / MDT", font=F_MONO(13), fill=FAINT)

    photo = cover_photo(load_photo(episode), (500, 500), episode["photo_center"])
    img.paste(photo, (650, 65))
    draw = ImageDraw.Draw(img)
    draw.rectangle((649, 64, 1150, 565), outline=LINE, width=2)
    draw.rectangle((650, 65, 662, 565), fill=accent)
    draw.text((1120, 535), episode["number"], anchor="rb", font=F_DISPLAY(104), fill=INK)
    return img


def render_show(episodes: list[dict]) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    tracked_text(draw, (58, 41), "A WABBAZZAR PODCAST", F_MONO_BOLD(17), SIGNAL, 2)
    draw.line((58, 82, W - 58, 82), fill=LINE, width=1)

    draw.text((52, 112), "MEN DON'T", font=F_DISPLAY(88), fill=INK)
    draw.text((52, 198), "TALK.", font=F_DISPLAY(88), fill=INK)
    draw.text((58, 323), "Long conversations with old friends.", font=F_TEXT(26), fill=DIM)

    x = 684
    thumb_size = 104
    for i, episode in enumerate(episodes):
        y = 96 + i * 128
        thumb = cover_photo(load_photo(episode), (thumb_size, thumb_size), episode["photo_center"])
        img.paste(thumb, (x, y))
        draw = ImageDraw.Draw(img)
        draw.text((x + 126, y + 8), episode["number"], font=F_MONO_BOLD(13), fill=hex_color(episode["accent"]))
        draw.text((x + 126, y + 34), episode["guest"].upper(), font=F_DISPLAY(24), fill=INK)
        draw.text((x + 126, y + 71), episode["duration"], font=F_MONO(12), fill=FAINT)

    combined: list[float] = []
    for episode in episodes:
        combined.extend(audio_peaks(MDT / episode["audio"], 90))
    draw_waveform(draw, combined, (58, 490, W - 58, 553))
    draw.text((58, 582), "WABBAZZAR.COM / MEN-DONT-TALK", font=F_MONO(13), fill=FAINT)
    return img


def route_html(episode: dict) -> str:
    route = f"https://wabbazzar.com/men-dont-talk/episode/{episode['number']}-{episode['slug']}/"
    image = f"https://wabbazzar.com/men-dont-talk/previews/episode-{episode['number']}-{episode['slug']}.png?v=20260824-1"
    target = f"/men-dont-talk/#{episode['anchor']}"
    handoff = f"/men-dont-talk/?episode={episode['anchor']}#{episode['anchor']}"
    title = f"{episode['guest']} — Men Don't Talk"
    esc = html.escape
    return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(episode['description'], quote=True)}">
    <link rel="canonical" href="{route}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Men Don't Talk">
    <meta property="og:url" content="{route}">
    <meta property="og:title" content="{esc(title, quote=True)}">
    <meta property="og:description" content="{esc(episode['description'], quote=True)}">
    <meta property="og:image" content="{image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Men Don't Talk episode {episode['number']} with {esc(episode['guest'], quote=True)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{esc(title, quote=True)}">
    <meta name="twitter:description" content="{esc(episode['description'], quote=True)}">
    <meta name="twitter:image" content="{image}">
    <script>window.location.replace({json.dumps(handoff)});</script>
    <style>
        html,body{{min-height:100%;margin:0;background:#0a0a09;color:#f5f5f4;font:16px/1.5 system-ui,sans-serif}}
        body{{display:grid;place-items:center}}
        a{{color:#b9adff}}
    </style>
</head>
<body><p><a href="{target}">Open {esc(episode['guest'])}'s episode</a></p></body>
</html>
"""


def main():
    episodes = json.loads(DATA.read_text())
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    ROUTES.mkdir(parents=True, exist_ok=True)

    for episode in episodes:
        stem = f"episode-{episode['number']}-{episode['slug']}"
        image_path = PREVIEWS / f"{stem}.png"
        render_episode(episode).save(image_path, "PNG", optimize=True)

        route_dir = ROUTES / f"{episode['number']}-{episode['slug']}"
        route_dir.mkdir(parents=True, exist_ok=True)
        (route_dir / "index.html").write_text(route_html(episode))
        print(f"wrote {image_path.relative_to(ROOT)}")
        print(f"wrote {(route_dir / 'index.html').relative_to(ROOT)}")

    show_path = PREVIEWS / "show.png"
    render_show(episodes).save(show_path, "PNG", optimize=True)
    print(f"wrote {show_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

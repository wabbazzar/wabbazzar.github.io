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

from PIL import Image, ImageDraw, ImageFont


ROOT = pathlib.Path(__file__).resolve().parent.parent
MDT = ROOT / "men-dont-talk"
DATA = MDT / "episodes.json"
PREVIEWS = MDT / "previews"
ROUTES = MDT / "episode"

W, H = 1200, 630

# The web page's existing palette. Keeping this exact is more important than
# making the cards resemble a generic podcast tile.
BG = (10, 10, 9)
BG_LIFT = (18, 18, 16)
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


def base_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        draw.line((0, y, W, y), fill=mix(BG_LIFT, BG, y / H))

    # A quiet signal grid: enough texture to survive an unfurl thumbnail,
    # never enough to compete with the guest's name.
    grid = mix(BG, SIGNAL, 0.075)
    for x in range(0, W, 40):
        draw.point((x, 18), fill=grid)
        draw.point((x, H - 19), fill=grid)
    return img, draw


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
):
    x0, y0, x1, y1 = box
    mid = (y0 + y1) / 2
    half = (y1 - y0) / 2
    draw.line((x0, mid, x1, mid), fill=LINE, width=1)
    step = (x1 - x0) / max(1, len(peaks) - 1)
    quiet = mix(BG, SIGNAL, 0.54)
    for i, peak in enumerate(peaks):
        x = round(x0 + i * step)
        amp = max(2, round(peak * half))
        color = SIGNAL if peak > 0.72 else quiet
        draw.line((x, mid - amp, x, mid + amp), fill=color, width=2)


def header(draw: ImageDraw.ImageDraw, number: str, duration: str):
    tracked_text(draw, (58, 41), "MEN DON'T TALK", F_MONO_BOLD(18), INK, 2)
    right = f"EPISODE {number}   /   {duration}"
    fnt = F_MONO(16)
    draw.text((W - 58 - draw.textlength(right, font=fnt), 43), right, font=fnt, fill=DIM)
    draw.line((58, 82, W - 58, 82), fill=LINE, width=1)


def guest_lines(name: str) -> list[str]:
    parts = name.upper().split()
    if len(parts) < 2:
        return [parts[0] + "."]
    return [" ".join(parts[:-1]), parts[-1] + "."]


def render_episode(episode: dict) -> Image.Image:
    img, draw = base_canvas()
    header(draw, episode["number"], episode["duration"])

    # The episode number is structural, not ornament: a quiet registration
    # mark that makes a growing collection scan quickly.
    number_font = F_DISPLAY(300)
    draw.text(
        (W - 52, 70), episode["number"], anchor="ra", font=number_font,
        fill=BG, stroke_width=2, stroke_fill=LINE,
    )

    title_font = F_DISPLAY(104)
    lines = guest_lines(episode["guest"])
    title_y = 108
    for line in lines:
        draw.text((54, title_y), line, font=title_font, fill=INK, stroke_width=1, stroke_fill=INK)
        title_y += 100

    label = f"WESLEY BECKNER WITH {episode['guest'].upper()}"
    tracked_text(draw, (59, 326), label, F_MONO_BOLD(15), SIGNAL, 1)

    quote_font = F_TEXT(24)
    quote_lines = wrap_pixels(draw, f'“{episode["quote"]}”', quote_font, 850, 2)
    quote_y = 367
    draw.rectangle((58, quote_y + 4, 63, quote_y + 56), fill=WARM)
    for line in quote_lines:
        draw.text((82, quote_y), line, font=quote_font, fill=DIM)
        quote_y += 32

    draw_waveform(draw, audio_peaks(MDT / episode["audio"]), (58, 475, W - 58, 553))

    footer_font = F_MONO(14)
    draw.text((58, 582), "WABBAZZAR.COM / MDT", font=footer_font, fill=FAINT)
    version = episode["version"].upper()
    draw.text(
        (W - 58 - draw.textlength(version, font=footer_font), 582),
        version,
        font=footer_font,
        fill=FAINT,
    )
    return img


def render_show(episodes: list[dict]) -> Image.Image:
    img, draw = base_canvas()
    tracked_text(draw, (58, 41), "A WABBAZZAR PODCAST", F_MONO_BOLD(17), SIGNAL, 2)
    draw.line((58, 82, W - 58, 82), fill=LINE, width=1)

    # Keep the show title inside the left column; the episode ledger on the
    # right should remain a distinct, scannable object at thumbnail size.
    title_font = F_DISPLAY(90)
    draw.text((54, 119), "MEN DON'T", font=title_font, fill=INK)
    draw.text((54, 207), "TALK.", font=title_font, fill=INK)
    draw.text(
        (62, 326),
        "Long conversations with old friends.",
        font=F_TEXT(28),
        fill=DIM,
    )

    x = 680
    draw.line((x, 116, x, 405), fill=LINE, width=1)
    for i, episode in enumerate(episodes):
        y = 123 + i * 132
        draw.text((x + 36, y), episode["number"], font=F_MONO_BOLD(16), fill=SIGNAL)
        draw.text((x + 94, y - 10), episode["guest"].upper(), font=F_DISPLAY(34), fill=INK)
        draw.text((x + 94, y + 34), episode["duration"], font=F_MONO(14), fill=FAINT)

    combined: list[float] = []
    for episode in episodes:
        combined.extend(audio_peaks(MDT / episode["audio"], 170))
    draw_waveform(draw, combined, (58, 475, W - 58, 553))
    draw.text((58, 582), "WABBAZZAR.COM / MEN-DONT-TALK", font=F_MONO(14), fill=FAINT)
    return img


def route_html(episode: dict) -> str:
    route = f"https://wabbazzar.com/men-dont-talk/episode/{episode['number']}-{episode['slug']}/"
    image = f"https://wabbazzar.com/men-dont-talk/previews/episode-{episode['number']}-{episode['slug']}.png"
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

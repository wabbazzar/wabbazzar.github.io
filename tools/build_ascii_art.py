#!/usr/bin/env python3
"""Regenerate /ascii-art.json from the tile icons.

Mirrors the pipeline in ascii.js (toLuminance -> resizeAreaAverage -> gradients
-> asciifyGrid) so the JSON glyphs match what users see raining on the site.
Run: `make ascii-art` (or `python3 tools/build_ascii_art.py`).
"""
import json
import math
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TILES = [
    "assets/icons/shredly.png",
    "assets/icons/quizly.png",
    "assets/icons/starbird.png",
    "assets/icons/portavec.png",
]
COLS, ROWS = 40, 24
MAX_DIM = 600
THRESHOLD = 40
FAINT = 25


def load_luma(path: Path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    scale = min(1.0, MAX_DIM / w)
    w2, h2 = round(w * scale), round(h * scale)
    if (w2, h2) != (w, h):
        img = img.resize((w2, h2), Image.BILINEAR)
    # Flatten onto white to match a browser canvas' default behavior when an
    # icon has transparent pixels. This keeps glyphs faithful to the live site.
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    img = Image.alpha_composite(bg, img).convert("RGB")
    px = img.load()
    luma = [0.0] * (w2 * h2)
    for y in range(h2):
        for x in range(w2):
            r, g, b = px[x, y]
            luma[y * w2 + x] = (r * 299 + g * 587 + b * 114) // 1000
    return luma, w2, h2


def resize_area_average(src, sw, sh, dw, dh):
    out = [0.0] * (dw * dh)
    x_scale = sw / dw
    y_scale = sh / dh
    for dy in range(dh):
        sy0 = dy * y_scale
        sy1 = (dy + 1) * y_scale
        y0 = int(math.floor(sy0))
        y1 = min(sh, int(math.ceil(sy1)))
        for dx in range(dw):
            sx0 = dx * x_scale
            sx1 = (dx + 1) * x_scale
            x0 = int(math.floor(sx0))
            x1 = min(sw, int(math.ceil(sx1)))
            total = 0.0
            wsum = 0.0
            for y in range(y0, y1):
                wy = min(y + 1, sy1) - max(y, sy0)
                if wy <= 0:
                    continue
                for x in range(x0, x1):
                    wx = min(x + 1, sx1) - max(x, sx0)
                    if wx <= 0:
                        continue
                    w = wx * wy
                    total += src[y * sw + x] * w
                    wsum += w
            out[dy * dw + dx] = total / wsum if wsum > 0 else 0.0
    return out


def asciify(brightness, gx, gy, rows, cols):
    lines = []
    for r in range(rows):
        chars = []
        for c in range(cols):
            i = r * cols + c
            b = brightness[i]
            if b < FAINT:
                chars.append(" ")
                continue
            if b < THRESHOLD:
                chars.append(".")
                continue
            mag = math.hypot(gx[i], gy[i])
            if mag < 5:
                if b > 180:
                    chars.append("#")
                elif b > 120:
                    chars.append("+")
                else:
                    chars.append(":")
                continue
            edge = math.atan2(gx[i], -gy[i])
            deg = (edge * 180 / math.pi) % 180
            if deg < 0:
                deg += 180
            if 67.5 < deg < 112.5:
                chars.append("|")
            elif deg < 22.5 or deg > 157.5:
                chars.append("-")
            elif 22.5 <= deg <= 67.5:
                chars.append("/")
            else:
                chars.append("\\")
        lines.append("".join(chars))
    return lines


def image_to_ascii(path: Path):
    luma, w, h = load_luma(path)
    brightness = resize_area_average(luma, w, h, COLS, ROWS)
    hr_w, hr_h = COLS * 4, ROWS * 4
    hr = resize_area_average(luma, w, h, hr_w, hr_h)
    gx = [0.0] * (hr_w * hr_h)
    gy = [0.0] * (hr_w * hr_h)
    for y in range(hr_h):
        for x in range(1, hr_w - 1):
            gx[y * hr_w + x] = hr[y * hr_w + (x + 1)] - hr[y * hr_w + (x - 1)]
    for y in range(1, hr_h - 1):
        for x in range(hr_w):
            gy[y * hr_w + x] = hr[(y + 1) * hr_w + x] - hr[(y - 1) * hr_w + x]
    gxc = [0.0] * (ROWS * COLS)
    gyc = [0.0] * (ROWS * COLS)
    for r in range(ROWS):
        for c in range(COLS):
            sx = sy = 0.0
            for yy in range(4):
                for xx in range(4):
                    hi = (r * 4 + yy) * hr_w + (c * 4 + xx)
                    sx += gx[hi]
                    sy += gy[hi]
            gxc[r * COLS + c] = sx / 16
            gyc[r * COLS + c] = sy / 16
    return asciify(brightness, gxc, gyc, ROWS, COLS)


def main():
    glyphs = []
    for rel in TILES:
        p = ROOT / rel
        if not p.exists():
            print(f"skip missing: {rel}")
            continue
        lines = image_to_ascii(p)
        glyphs.append("\n".join(lines))
        print(f"ok: {rel}")
    out = ROOT / "ascii-art.json"
    out.write_text(json.dumps({"glyphs": glyphs}, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {out} ({len(glyphs)} glyphs)")


if __name__ == "__main__":
    main()

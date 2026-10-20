#!/usr/bin/env python3
"""Generate the silent pretend juice advert used as the classroom placeholder.

The pictures and words are original artwork for this prototype. No third-party
footage is included.
"""

import math
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 960, 540
FPS = 25
DURATION = 15
FRAMES = FPS * DURATION
FONT_ZH = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
FONT_EN = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size, index=0) if path.endswith(".ttc") else ImageFont.truetype(path, size)


ZH = font(FONT_ZH, 78)
ZH_SM = font(FONT_ZH, 28)
EN = font(FONT_EN, 34)
EN_SM = font(FONT_EN, 22)


def center_text(draw, text, y, face, fill):
    box = draw.textbbox((0, 0), text, font=face)
    x = (W - (box[2] - box[0])) / 2
    draw.text((x, y), text, font=face, fill=fill)


def badge(draw):
    draw.rounded_rectangle((28, 24, 168, 72), radius=16, fill=(255, 255, 255))
    draw.text((48, 32), "示範", font=ZH_SM, fill=(26, 26, 26))


def ring_dots(draw, scene, bg):
    for i in range(4):
        x = W / 2 - 54 + i * 36
        y = H - 42
        if i == scene:
            draw.ellipse((x - 11, y - 11, x + 11, y + 11), fill=(255, 255, 255))
        else:
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), outline=(255, 255, 255), width=3)


def scene_index(t):
    if t < 4:
        return 0
    if t < 8:
        return 1
    if t < 12:
        return 2
    return 3


def draw_frame(t):
    scene = scene_index(t)
    local = t - scene * 4
    img = Image.new("RGB", (W, H), (255, 140, 20))
    draw = ImageDraw.Draw(img)

    if scene == 0:
        img.paste((255, 138, 24), (0, 0, W, H))
        draw = ImageDraw.Draw(img)
        pulse = 1 + 0.04 * math.sin(local * 3.2)
        r = 118 * pulse
        cx, cy = 480, 210
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 214, 92))
        draw.ellipse((cx - r * 0.55, cy - r * 0.2, cx + r * 0.15, cy + r * 0.55), fill=(255, 159, 28))
        center_text(draw, "陽光橙", 400, ZH, (255, 255, 255))
        center_text(draw, "Sunny Orange", 488, EN, (255, 248, 230))
    elif scene == 1:
        img.paste((232, 78, 42), (0, 0, W, H))
        draw = ImageDraw.Draw(img)
        shift = (local * 80) % 80
        for i, x0 in enumerate((180, 400, 620)):
            x = x0 + shift * 0.35
            y = 230
            draw.polygon([(x, y - 70), (x + 90, y), (x, y + 70), (x + 28, y)], fill=(255, 214, 92))
        center_text(draw, "出發啦", 400, ZH, (255, 255, 255))
        center_text(draw, "Let's go", 488, EN, (255, 236, 220))
    elif scene == 2:
        img.paste((18, 148, 136), (0, 0, W, H))
        draw = ImageDraw.Draw(img)
        rise = min(1, local / 3.2)
        left, right, top, bottom = 400, 560, 120, 360
        draw.rounded_rectangle((left, top, right, bottom), radius=28, fill=(255, 248, 235))
        liquid_top = bottom - 28 - int(170 * rise)
        draw.rounded_rectangle((left + 18, liquid_top, right - 18, bottom - 16), radius=16, fill=(255, 159, 28))
        draw.ellipse((left - 10, top - 24, right + 10, top + 36), fill=(255, 248, 235))
        draw.ellipse((left + 8, top - 10, right - 8, top + 28), fill=(255, 196, 92))
        center_text(draw, "喝一口", 400, ZH, (255, 255, 255))
        center_text(draw, "Have a sip", 488, EN, (230, 255, 248))
    else:
        img.paste((255, 186, 64), (0, 0, W, H))
        draw = ImageDraw.Draw(img)
        draw.ellipse((330, 48, 630, 348), fill=(255, 244, 214))
        draw.ellipse((400, 150, 436, 186), fill=(40, 40, 40))
        draw.ellipse((524, 150, 560, 186), fill=(40, 40, 40))
        draw.arc((410, 160, 550, 300), start=18, end=162, fill=(40, 40, 40), width=10)
        center_text(draw, "微笑一下", 390, ZH, (80, 48, 12))
        center_text(draw, "Smile", 478, EN, (120, 72, 20))

    badge(draw)
    ring_dots(draw, scene, None)
    return img


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    frame_dir = os.path.join(root, "media", "_frames")
    os.makedirs(frame_dir, exist_ok=True)
    poster_frame = None
    for i in range(FRAMES):
        t = i / FPS
        img = draw_frame(t)
        img.save(os.path.join(frame_dir, f"f{i:04d}.png"))
        if i == 12:
            poster_frame = img
    poster = os.path.join(root, "media", "poster.png")
    poster_frame.save(poster)
    out = os.path.join(root, "media", "placeholder.mp4")
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(FPS),
        "-i", os.path.join(frame_dir, "f%04d.png"),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-shortest",
        "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.1",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "48k",
        "-movflags", "+faststart",
        out,
    ]
    subprocess.check_call(cmd)
    shutil.rmtree(frame_dir, ignore_errors=True)
    print(out)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)

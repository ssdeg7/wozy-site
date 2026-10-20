#!/usr/bin/env python3
"""
Builds the site's assets/ folder from the master files in
"Odyz Assets/Website".

    python3 tools/build-assets.py /path/to/"Odyz Assets"/Website

What it does:
  * re-encodes the app screenshots as WebP (they arrive as 2-3 MB PNGs)
  * composites the 3D-map screenshots into handphone.png, matching the
    perspective of the phone in the hand
  * copies the stamps, avatars, logo, favicon and QR code into place
  * crops the flag strip out of the passport screenshot
  * renders a 1200x630 og-image.png for social previews

Re-run it any time you update a source file.
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# The published site lives in ../odyz.app (this folder is not published to odyz.app).
SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "odyz.app")
SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/Odyz Assets--Website"
OUT = os.path.join(SITE, "assets")

# Screen of the phone inside handphone.png, as a quad (measured from the image).
HAND_QUAD = [(135, 29), (520, 28), (528, 915), (133, 917)]

ACCENT = "#bb73ff"
BG = "#121212"


def src(rel):
    return os.path.join(SRC, rel)


def out(rel):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save_webp(im, rel, quality=86, max_w=None):
    im = im.convert("RGB")
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(out(rel), "WEBP", quality=quality, method=6)
    print(f"  {rel}  {im.width}x{im.height}  {os.path.getsize(out(rel))//1024} KB")


def perspective_coeffs(dst, src_pts):
    """Coefficients mapping dst -> src, as PIL.Image.transform(PERSPECTIVE) wants."""
    matrix = []
    for (x, y), (u, v) in zip(dst, src_pts):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(matrix, dtype=float)
    B = np.array(src_pts, dtype=float).reshape(8)
    return np.linalg.solve(A, B)


def hand_composite(screenshot_path, rel_out):
    """Drop a screenshot into the phone the hand is holding."""
    hand = Image.open(src("Content/handphone.png")).convert("RGBA")
    shot = Image.open(screenshot_path).convert("RGBA")

    w, h = hand.size
    dst = HAND_QUAD
    src_pts = [(0, 0), (shot.width, 0), (shot.width, shot.height), (0, shot.height)]
    coeffs = perspective_coeffs(dst, src_pts)

    warped = shot.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    # Mask: the screen quad with rounded corners.
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(dst, fill=255)
    rounded = Image.new("L", (w, h), 0)
    x0 = min(p[0] for p in dst); x1 = max(p[0] for p in dst)
    y0 = min(p[1] for p in dst); y1 = max(p[1] for p in dst)
    ImageDraw.Draw(rounded).rounded_rectangle([x0, y0, x1, y1], radius=42, fill=255)
    mask = Image.fromarray(np.minimum(np.array(mask), np.array(rounded)))

    hand.paste(warped, (0, 0), mask)
    hand = hand.resize((744, 1008), Image.LANCZOS)          # 0.8x is plenty at display size
    hand.save(out(rel_out), "WEBP", quality=88, method=6)   # WebP keeps the alpha channel
    print(f"  {rel_out}  {hand.width}x{hand.height}  {os.path.getsize(out(rel_out))//1024} KB")


def main():
    print("Screens ->")
    screens = {
        # hero shelf, left to right
        "screens/hero-1.webp": "Content/IMG_0490.PNG",       # passport, dark
        "screens/hero-2.webp": "Content/Timeline.jpeg",      # trip timeline, light
        "screens/hero-3.webp": "Content/IMG_1044.PNG",       # Eiffel Tower on the 3D map
        "screens/hero-4.webp": "Content/IMG_0492.PNG",       # landmarks visited
        "screens/hero-5.webp": "Content/IMG_0494.PNG",       # glowing pins over Europe
        # feature cards
        "screens/passport-light-1.webp": "Content/Pass/IMG_1061.PNG",
        "screens/passport-light-2.webp": "Content/Pass/IMG_1063.PNG",
        "screens/passport-dark-1.webp": "Content/Pass/IMG_1064.PNG",
        "screens/passport-dark-2.webp": "Content/IMG_0490.PNG",
        "screens/timeline.webp": "Content/Timeline.jpeg",
        "screens/worldmap.webp": "Content/IMG_0494.PNG",
        "screens/download.webp": "Content/IMG_0506.PNG",     # world trips globe
    }
    for rel, source in screens.items():
        save_webp(Image.open(src(source)), rel, quality=86, max_w=468)

    print("3D map, composited into the hand ->")
    hand_composite(src("Content/IMG_1044.PNG"), "screens/story-1.webp")  # relive in 3D
    hand_composite(src("Content/IMG_1043.PNG"), "screens/story-2.webp")  # right where it happened
    hand_composite(src("Content/IMG_1047.PNG"), "screens/story-3.webp")  # global adventures

    print("Stamps ->")
    for name in ["agra", "berlin", "buenosaires", "cairo", "dubai", "istanbul",
                 "la", "newyork", "rio", "rome", "sf", "singapore"]:
        im = Image.open(src(f"Stamps/{name}.png")).convert("RGBA")
        im.save(out(f"stamps/{name}.webp"), "WEBP", quality=90, method=6)
    print(f"  12 stamps")

    print("Brand + people ->")
    logo = Image.open(src("OdyzCentered.png")).convert("RGBA")
    logo.resize((450, 450), Image.LANCZOS).save(out("logo-stamp.png"), optimize=True)
    Image.open(src("favicon.png")).save(out("favicon.png"), optimize=True)
    # The master QR is white modules on transparent (made for a dark background).
    # Flatten it to black-on-white so it scans reliably wherever it lands.
    qr = Image.open(src("QRCode.png")).convert("RGBA")
    qr_arr = np.array(qr)
    modules = qr_arr[..., 3] > 128
    flat = np.full(qr_arr.shape[:2] + (3,), 255, dtype=np.uint8)
    flat[modules] = 0
    Image.fromarray(flat).save(out("qr-appstore.png"), optimize=True)
    for i in (1, 2, 3):
        Image.open(src(f"Testimonials/Avatar{i}.png")).save(out(f"avatars/avatar-{i}.png"), optimize=True)
    print("  logo, favicon, QR, 3 avatars")

    print("Flag strip ->")
    # Lift the row of country flags out of the passport screen and key out the
    # purple background behind it, so the flags sit on the dark card cleanly.
    from scipy import ndimage
    strip = Image.open(src("Content/IMG_0490.PNG")).convert("RGB").crop((8, 534, 460, 580))
    lum = np.array(strip).astype(float).mean(axis=2)
    mask = ndimage.binary_fill_holes(
        ndimage.binary_closing(lum > 82, np.ones((3, 3)), iterations=2))
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 150])
    rgba = np.dstack([np.array(strip), (keep * 255).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(out("flag-strip.png"), "PNG", optimize=True)
    print("  flag-strip.png")

    print("Social image ->")
    og = Image.new("RGB", (1200, 630), BG)
    glow = Image.new("RGB", (1200, 630), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([180, -420, 1020, 420], fill=(38, 25, 54))
    og = Image.blend(og, glow, 0.9)
    stamp = Image.open(src("OdyzCentered.png")).convert("RGBA")
    stamp.thumbnail((250, 250), Image.LANCZOS)
    og.paste(stamp, ((1200 - stamp.width) // 2, 70), stamp)
    d = ImageDraw.Draw(og)

    def font(size, bold=True):
        for path in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                     "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        return ImageFont.load_default()

    def centered(text, y, size, fill):
        f = font(size)
        w = d.textbbox((0, 0), text, font=f)[2]
        d.text(((1200 - w) // 2, y), text, font=f, fill=fill)

    centered("Odyz", 350, 78, ACCENT)
    centered("THE ULTIMATE TRAVEL EXPERIENCE", 460, 40, "#ffffff")
    centered("Automatic trip tracking, built from your photos", 525, 25, "#9a9a9a")
    og.save(out("og-image.png"), optimize=True)
    print("  og-image.png 1200x630")


if __name__ == "__main__":
    main()

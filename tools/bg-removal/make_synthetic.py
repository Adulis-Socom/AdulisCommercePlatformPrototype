"""Deterministic AUTHORISED SYNTHETIC test photographs for the background-removal experiment (PROTO-BGR-RESEARCH-001).

  python make_synthetic.py [--out fixtures/synthetic] [--small30 <folder>]

Every image is drawn from scratch with PIL and numpy under a fixed seed (no photograph, no download, nothing private), so a re-run is
byte-reproducible for the same library versions. For each image the generator also writes the ground-truth subject mask (`<name>.mask.png`)
and records the subject centre in `index.json`; the SAM smoke tests use that centre as the foreground point (the point comes from the
generator, not from any model). The masks are only for a human to look at; this repository computes NO quality score from them.

`--small30 <folder>` writes 30 small (256x256) JPEGs for the Lab's 30-image sequential run (leak check); those are not committed.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
SS = 4  # supersampling for anti-aliased masks


def _noise(rng, w, h, cells, amp):
    small = rng.random((cells, cells * w // h + 1)).astype("float32")
    big = Image.fromarray((small * 255).astype("uint8")).resize((w, h), Image.BICUBIC)
    return (np.asarray(big, dtype="float32") / 255 - 0.5) * 2 * amp


def background(rng, w, h, base, texture=14.0):
    yy = np.linspace(0, 1, h, dtype="float32")[:, None, None]
    xx = np.linspace(0, 1, w, dtype="float32")[None, :, None]
    img = np.array(base, dtype="float32")[None, None, :] + 18 * (0.6 * yy + 0.4 * xx) - 9
    img = img + _noise(rng, w, h, 9, texture)[..., None] + _noise(rng, w, h, 70, 2.5)[..., None]
    return np.clip(img, 0, 255)


def draw_mask(w, h, painter):
    big = Image.new("L", (w * SS, h * SS), 0)
    painter(ImageDraw.Draw(big), SS)
    return big.resize((w, h), Image.LANCZOS)


def shade(color, w, h, mask, light=0.35):
    """Cylindrical shading across the subject's own bounding box."""
    m = np.asarray(mask) > 8
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    u = np.clip((np.arange(w, dtype="float32") - x0) / max(1, x1 - x0), 0, 1)[None, :]
    v = np.clip((np.arange(h, dtype="float32") - y0) / max(1, y1 - y0), 0, 1)[:, None]
    lum = 1 - light * np.abs(u - 0.35) * 1.6 - 0.12 * v
    return np.clip(np.array(color, dtype="float32")[None, None, :] * lum[..., None], 0, 255)


def composite(bg, subject, mask, shadow_offset=(0.02, 0.025), shadow_strength=0.38, opacity=1.0):
    h, w = mask.size[1], mask.size[0]
    a = np.asarray(mask, dtype="float32") / 255
    sh = mask.filter(ImageFilter.GaussianBlur(max(w, h) * 0.012))
    dx, dy = int(w * shadow_offset[0]), int(h * shadow_offset[1])
    sh = np.roll(np.roll(np.asarray(sh, dtype="float32") / 255, dy, 0), dx, 1)
    sh[:dy, :], sh[:, :dx] = 0, 0  # the roll wraps; a shadow must not re-enter from the opposite edge
    out = bg * (1 - shadow_strength * sh[..., None] * (1 - a[..., None]))
    alpha = (a * opacity)[..., None]
    return np.clip(out * (1 - alpha) + subject * alpha, 0, 255), a


def centre(mask):
    ys, xs = np.nonzero(np.asarray(mask) > 127)
    return int(xs.mean()), int(ys.mean())


def bottle(rng, w, h):
    def paint(d, s):
        cx, bw = w * s // 2, w * s * 0.17
        d.rounded_rectangle([cx - bw, h * s * 0.36, cx + bw, h * s * 0.88], radius=bw * 0.45, fill=255)
        d.rounded_rectangle([cx - bw * 0.42, h * s * 0.14, cx + bw * 0.42, h * s * 0.42], radius=bw * 0.2, fill=255)
        d.rounded_rectangle([cx - bw * 0.5, h * s * 0.10, cx + bw * 0.5, h * s * 0.16], radius=bw * 0.1, fill=255)
    mask = draw_mask(w, h, paint)
    sub = shade((30, 110, 170), w, h, mask)
    m = np.asarray(mask) > 8
    ys, xs = np.nonzero(m)
    band = (np.arange(h)[:, None] > h * 0.52) & (np.arange(h)[:, None] < h * 0.74) & m  # label band
    sub[band] = sub[band] * 0.25 + np.array([235, 232, 220]) * 0.75 * (sub[band] / 150)
    return background(rng, w, h, (196, 188, 176)), sub, mask


def mug(rng, w, h):
    def paint(d, s):
        cx, cy, r = w * s * 0.46, h * s * 0.52, h * s * 0.24
        d.rounded_rectangle([cx - r * 0.95, cy - r, cx + r * 0.95, cy + r * 1.1], radius=r * 0.18, fill=255)
        d.ellipse([cx + r * 0.7, cy - r * 0.55, cx + r * 1.55, cy + r * 0.65], fill=255)
        d.ellipse([cx + r * 0.98, cy - r * 0.27, cx + r * 1.27, cy + r * 0.37], fill=0)
        d.rounded_rectangle([cx - r * 0.95, cy - r, cx + r * 0.95, cy + r * 1.1], radius=r * 0.18, fill=255)
    mask = draw_mask(w, h, paint)
    return background(rng, w, h, (225, 214, 190)), shade((190, 62, 48), w, h, mask), mask


def fringe(rng, w, h):
    def paint(d, s):
        cx, cy = w * s * 0.5, h * s * 0.56
        d.ellipse([cx - w * s * 0.17, cy - h * s * 0.2, cx + w * s * 0.17, cy + h * s * 0.24], fill=255)
        d.rectangle([cx - w * s * 0.06, cy + h * s * 0.2, cx + w * s * 0.06, cy + h * s * 0.36], fill=255)
        d.pieslice([cx - w * s * 0.3, cy + h * s * 0.3, cx + w * s * 0.3, cy + h * s * 0.8], 180, 360, fill=255)
        rr = np.random.default_rng(7)
        for _ in range(260):  # hair-like fringe: thin curved strands over the crown
            ang = rr.uniform(np.pi * 1.05, np.pi * 1.95)
            r0, r1 = h * s * rr.uniform(0.16, 0.2), h * s * rr.uniform(0.27, 0.36)
            bend = rr.uniform(-0.25, 0.25)
            pts = [(cx + np.cos(ang + bend * t) * (r0 + (r1 - r0) * t) * 1.0, cy - h * s * 0.02 + np.sin(ang + bend * t) * (r0 + (r1 - r0) * t)) for t in np.linspace(0, 1, 12)]
            d.line(pts, fill=255, width=int(rr.integers(1, 3) * s))
    mask = draw_mask(w, h, paint)
    sub = shade((58, 40, 34), w, h, mask, light=0.3)
    m = np.asarray(mask) > 8
    ys = np.nonzero(m)[0]
    face = np.zeros((h, w), bool)
    face_img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(face_img).ellipse([w * 0.5 - w * 0.14, h * 0.56 - h * 0.14, w * 0.5 + w * 0.14, h * 0.56 + h * 0.2], fill=255)
    face = np.asarray(face_img) > 127
    sub[face & m] = shade((222, 176, 146), w, h, mask)[face & m]
    return background(rng, w, h, (128, 134, 140), 9), sub, mask


def glass(rng, w, h):
    def paint(d, s):
        cx = w * s * 0.5
        d.ellipse([cx - w * s * 0.13, h * s * 0.14, cx + w * s * 0.13, h * s * 0.46], fill=255)  # bowl
        d.rectangle([cx - w * s * 0.012, h * s * 0.42, cx + w * s * 0.012, h * s * 0.78], fill=255)  # stem
        d.ellipse([cx - w * s * 0.1, h * s * 0.76, cx + w * s * 0.1, h * s * 0.82], fill=255)  # foot
    mask = draw_mask(w, h, paint)
    sub = shade((205, 225, 230), w, h, mask, light=0.25)
    # glass-like: the subject shows the background through itself (opacity .28) with brighter rim and highlight
    edge = np.asarray(mask.filter(ImageFilter.MaxFilter(5))).astype("float32") - np.asarray(mask.filter(ImageFilter.MinFilter(5))).astype("float32")
    sub = np.clip(sub + edge[..., None] * 0.45, 0, 255)
    img, a = composite(background(rng, w, h, (120, 98, 80), 20), sub, mask, shadow_strength=0.2, opacity=0.3)
    return img, None, mask


def shoe(rng, w, h):
    def paint(d, s):
        pts = [(0.22, 0.62), (0.26, 0.40), (0.40, 0.36), (0.48, 0.48), (0.62, 0.52), (0.78, 0.58), (0.80, 0.70), (0.22, 0.72)]
        d.polygon([(x * w * s, y * h * s) for x, y in pts], fill=255)
        d.rounded_rectangle([0.20 * w * s, 0.70 * h * s, 0.82 * w * s, 0.76 * h * s], radius=0.02 * w * s, fill=255)
    mask = draw_mask(w, h, paint)
    return background(rng, w, h, (200, 186, 160), 6), shade((186, 170, 144), w, h, mask, light=0.12), mask  # low contrast


def torso(rng, w, h):
    def paint(d, s):
        cx = w * s * 0.5
        d.ellipse([cx - w * s * 0.1, h * s * 0.12, cx + w * s * 0.1, h * s * 0.38], fill=255)
        d.rectangle([cx - w * s * 0.04, h * s * 0.34, cx + w * s * 0.04, h * s * 0.44], fill=255)
        d.rounded_rectangle([cx - w * s * 0.28, h * s * 0.42, cx + w * s * 0.28, h * s * 1.0], radius=w * s * 0.12, fill=255)
    mask = draw_mask(w, h, paint)
    sub = shade((70, 90, 120), w, h, mask)
    head = np.asarray(draw_mask(w, h, lambda d, s: d.ellipse([w * s * 0.4, h * s * 0.12, w * s * 0.6, h * s * 0.38], fill=255))) > 127
    sub[head] = shade((205, 160, 130), w, h, mask)[head]
    return background(rng, w, h, (214, 220, 226), 10), sub, mask


SUBJECTS = [("bottle", bottle, (1024, 1024)), ("mug", mug, (1600, 1200)), ("fringe", fringe, (1024, 1024)), ("glass", glass, (1600, 1200)), ("shoe-lowcontrast", shoe, (1024, 1024)), ("torso", torso, (1600, 1200))]


def make(name, fn, size, seed):
    w, h = size
    rng = np.random.default_rng(seed)
    bg, sub, mask = fn(rng, w, h)
    img = composite(bg, sub, mask)[0] if sub is not None else bg
    return Image.fromarray(img.astype("uint8")), mask


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(HERE / "fixtures" / "synthetic"))
    parser.add_argument("--small30")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    index = []
    for seed, (name, fn, size) in enumerate(SUBJECTS):
        image, mask = make(name, fn, size, 1000 + seed)
        jpg, png = out / f"{name}.jpg", out / f"{name}.mask.png"
        image.save(jpg, format="JPEG", quality=82, optimize=True)
        mask.point(lambda v: 255 if v > 127 else 0).convert("1").save(png, optimize=True)
        x, y = centre(mask)
        index.append({"name": name, "file": jpg.name, "mask": png.name, "width": size[0], "height": size[1], "subjectCentre": [x, y],
                      "centreSource": "synthetic generator (centroid of the drawn ground-truth mask)", "bytes": jpg.stat().st_size,
                      "sha256": hashlib.sha256(jpg.read_bytes()).hexdigest()})
    (out / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    if args.small30:
        folder = Path(args.small30)
        folder.mkdir(parents=True, exist_ok=True)
        for i in range(30):
            name, fn, _ = SUBJECTS[i % len(SUBJECTS)]
            image, _ = make(name, fn, (256, 256), 5000 + i)
            image.save(folder / f"small-{i + 1:02d}-{name}.jpg", format="JPEG", quality=85)
    for item in index:
        print(f"{item['file']}: {item['width']}x{item['height']}, {item['bytes']} bytes, centre {item['subjectCentre']}")


if __name__ == "__main__":
    main()

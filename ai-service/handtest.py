from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
from ultralytics import YOLO

HERE = Path(__file__).parent
model = YOLO(str(HERE / "models" / "best.pt"))
SRC, OUT = HERE / "handtest" / "photos", HERE / "handtest" / "out"
SRC.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

for p in sorted(SRC.glob("*")):
    if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        continue
    img = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    r = model.predict(img, conf=0.10, verbose=False)[0]
    draw, rows = ImageDraw.Draw(img), []
    for b in r.boxes:
        name, c = model.names[int(b.cls[0])], float(b.conf[0])
        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0]]
        draw.rectangle([x1, y1, x2, y2], outline="red" if c >= 0.25 else "yellow", width=3)
        draw.text((x1 + 4, y1 + 4), f"{name} {c:.2f}", fill="red")
        rows.append(f"{name} {c:.2f}")
    img.save(OUT / p.name)
    print(f"{p.name}: " + (", ".join(rows) if rows else "nothing"))
import io
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from ultralytics import YOLO

app = FastAPI(title="CIVIS AI Service")
model = YOLO(str(Path(__file__).parent / "models" / "best.pt"))

# model class -> hazardType returned to the app (contract values unchanged)
API_TYPE = {
    "pothole": "pothole",
    "crack": "crack",
    "manhole_open": "manhole_hazard",
    "manhole_loose": "manhole_hazard",
    "manhole_hazard": "manhole_hazard",      # lets the v2 weights still work
    "streetlight_broken": "streetlight_broken",
}
BASE_SEVERITY = {
    "manhole_open": 2, "manhole_hazard": 2, "manhole_loose": 1,
    "pothole": 1, "streetlight_broken": 1, "crack": 0,
}
LEVELS = ["low", "medium", "high"]
LARGE_AREA_RATIO = 0.15       # box covers >15% of the frame -> bump severity; tune later
DEFAULT_CONF = 0.25
CLASS_CONF = {}               # per-class overrides, e.g. {"manhole_loose": 0.45}


def severity(cls, area_ratio):
    if cls not in BASE_SEVERITY:
        return None
    level = BASE_SEVERITY[cls] + (1 if area_ratio > LARGE_AREA_RATIO else 0)
    return LEVELS[min(level, 2)]


def reply(is_hazard, cls=None, conf=None, sev=None, box=None):
    return {
        "isHazard": is_hazard,
        "hazardType": API_TYPE.get(cls, cls),
        "confidenceScore": None if conf is None else round(conf, 3),
        "severity": sev,
        "detectedClass": cls,    # extra field: the raw model class
        "box": box,              # extra field: [x, y, w, h], normalized 0-1
    }


@app.get("/health")
def health():
    return {"status": "ok", "classes": model.names}


@app.post("/detect")
async def detect(photo: UploadFile = File(...)):
    if not photo.content_type or not photo.content_type.startswith("image/"):
        return JSONResponse({"error": "File must be an image"}, status_code=400)
    try:
        raw = Image.open(io.BytesIO(await photo.read()))
        image = ImageOps.exif_transpose(raw).convert("RGB")
    except Exception:
        return JSONResponse({"error": "Could not read image"}, status_code=400)

    floor = min([DEFAULT_CONF, *CLASS_CONF.values()])
    result = model.predict(image, conf=floor, verbose=False)[0]

    detections = []
    for b in result.boxes:
        name = model.names[int(b.cls[0])]
        conf = float(b.conf[0])
        if conf < CLASS_CONF.get(name, DEFAULT_CONF):
            continue
        x, y, w, h = [float(v) for v in b.xywhn[0]]
        detections.append({"cls": name, "conf": conf, "area": w * h, "box": [x, y, w, h]})

    hazards = [d for d in detections if d["cls"] in API_TYPE]
    if hazards:
        top = max(hazards, key=lambda d: d["conf"])
        return reply(True, top["cls"], top["conf"], severity(top["cls"], top["area"]), top["box"])

    if detections:   # only manhole_good / streetlight_working found
        top = max(detections, key=lambda d: d["conf"])
        return reply(False, top["cls"], top["conf"], None, top["box"])

    return reply(False)
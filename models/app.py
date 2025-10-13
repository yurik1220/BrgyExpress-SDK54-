import os, io, hashlib
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
from torchvision import transforms, models
from pydantic import BaseModel

# Config
MODEL_PATH = os.getenv("MODEL_PATH", "image_forgery_finetuned_v2.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))

# ELA (in-memory)
def convert_to_ela_image_bytes(img: Image.Image, quality: int = 90) -> Image.Image:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    resaved = Image.open(buf)
    ela_im = ImageChops.difference(img.convert("RGB"), resaved)
    extrema = ela_im.getextrema()
    max_diff = max([ex[1] for ex in extrema]) or 1
    ela_im = ImageEnhance.Brightness(ela_im).enhance(255.0 / max_diff)
    resaved.close()
    buf.close()
    return ela_im

# Transforms (val-time)
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std =[0.229, 0.224, 0.225]),
])

# Limit CPU thread usage for free-tier memory/CPU constraints
try:
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
except Exception:
    pass

# Build model (ResNet50 with dropout head)
def build_model():
    m = models.resnet50(weights=None)
    in_features = m.fc.in_features
    m.fc = nn.Sequential(nn.Dropout(p=0.5), nn.Linear(in_features, 1))
    return m

# Lazy-load model on first request to reduce boot memory
model = None

def ensure_model_loaded():
    global model
    if model is None:
        m = build_model().to(DEVICE)
        # Load only weights; allow partial load if needed
        state = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True) if hasattr(torch, 'load') else torch.load(MODEL_PATH, map_location=DEVICE)
        m.load_state_dict(state)
        m.eval()
        model = m

app = FastAPI()

# CORS for cross-origin requests (e.g., from a Node.js server)
_cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
allow_origins = [o.strip() for o in _cors_origins.split(",")] if _cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictResponse(BaseModel):
    prob_tampered: float
    pred_label: str
    threshold_used: float

@app.get("/")
def root():
    return {"name": "image-forgery-api", "health": "/health", "predict": "/predict"}

@app.get("/health")
def health():
    return {"status": "ok", "device": str(DEVICE)}

@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # ELA + transforms
    ela_img = convert_to_ela_image_bytes(img, quality=90)
    x = val_transform(ela_img).unsqueeze(0).to(DEVICE)

    # Inference
    with torch.no_grad():
        ensure_model_loaded()
        logit = model(x)
        prob = torch.sigmoid(logit).item()
    pred = 1 if prob >= THRESHOLD else 0
    label = "tampered" if pred == 1 else "original"

    return JSONResponse({
        "prob_tampered": float(prob),
        "pred_label": label,
        "threshold_used": THRESHOLD
    })
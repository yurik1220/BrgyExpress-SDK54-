# models/Dockerfile
FROM python:3.10-slim

# System deps (Pillow/torch may need these)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy model code + weights
COPY . .

# Optional: eager warm-up on container start (lazy-load still in app.py)
ENV UVICORN_WORKERS=1 \
    TORCH_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    MODEL_PATH=image_forgery_finetuned_v2.pth \
    THRESHOLD=0.5 \
    CORS_ALLOW_ORIGINS=*

# Expose for docs; platforms will inject $PORT
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
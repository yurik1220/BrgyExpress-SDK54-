# BrgyExpress QR Scanner API

FastAPI service for scanning and normalizing PhilSys QR codes from uploaded images.

## Features

- Scans QR codes from uploaded images using pyzbar + PIL
- Normalizes both new and old PhilSys card formats
- Converts date of birth to ISO 8601 format (YYYY-MM-DD)
- Returns structured JSON response

## API Endpoints

- `POST /scan_qr` - Upload image and get normalized QR data
- `GET /health` - Health check

## Local Development

1. Create virtual environment:
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate  # Linux/Mac
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run server:
```bash
uvicorn main:app --reload
```

## Deployment

This service is configured for Render deployment with `render.yaml`.

## Usage Example

```bash
curl -F "image=@qr.jpg" https://your-app.onrender.com/scan_qr
```

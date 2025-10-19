from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from pyzbar.pyzbar import decode as qr_decode
from PIL import Image
from io import BytesIO
import json
import uuid
from typing import Optional, Dict, Any, Tuple
from dateutil import parser as date_parser


app = FastAPI()

# CORS for mobile/web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UNWANTED_KEYS = {"raw", "bf", "bt", "n_s", "p", "v", "z"}


def normalize_dob(dob_str: str) -> Optional[str]:
    """
    Normalize date of birth to ISO 8601 format (YYYY-MM-DD).
    Returns None if parsing fails or dob_str is empty.
    """
    if not dob_str or not isinstance(dob_str, str):
        return None
    
    # Check if already in ISO format
    if len(dob_str) == 10 and dob_str.count('-') == 2:
        try:
            # Validate it's a proper ISO date
            date_parser.parse(dob_str, fuzzy=False)
            return dob_str
        except (ValueError, TypeError):
            pass
    
    try:
        # Parse the date string and convert to ISO format
        parsed_date = date_parser.parse(dob_str, fuzzy=True)
        return parsed_date.strftime('%Y-%m-%d')
    except (ValueError, TypeError, AttributeError):
        return None


def build_request_id() -> str:
    return f"TID{uuid.uuid4().hex}"


def construct_full_name(first: Optional[str], middle: Optional[str], last: Optional[str]) -> str:
    parts = [p for p in [first or "", middle or "", last or ""] if p]
    return " ".join(parts).strip()


def normalize_new_philsys(qr_json: dict) -> Dict[str, Any]:
    # Preserve suffix before filtering as it is part of UNWANTED_KEYS
    suffix_val = qr_json.get("n_s") or ""

    # Remove unwanted keys
    filtered = {k: v for k, v in qr_json.items() if k not in UNWANTED_KEYS}

    first = filtered.get("n_f") or ""
    middle = filtered.get("n_m") or ""
    last = filtered.get("n_l") or ""
    full_name = construct_full_name(first, middle, last)

    return {
        "dob": normalize_dob(filtered.get("bd") or ""),
        "first_name": first,
        "middle_name": middle,
        "last_name": last,
        "full_name": full_name,
        "philsys_card_number": filtered.get("pcn"),
        "place_of_birth": filtered.get("pob"),
        "sex": filtered.get("s"),
        "suffix": suffix_val or ""
    }


def normalize_old_philsys(qr_json: dict) -> Optional[Dict[str, Any]]:
    subj = qr_json.get("subject")
    if not isinstance(subj, dict):
        return None

    first = subj.get("fName") or ""
    middle = subj.get("mName") or ""
    last = subj.get("lName") or ""
    full_name = construct_full_name(first, middle, last)

    return {
        "dob": normalize_dob(subj.get("DOB") or ""),
        "first_name": first,
        "middle_name": middle,
        "last_name": last,
        "full_name": full_name,
        "philsys_card_number": subj.get("PCN"),
        "place_of_birth": subj.get("POB"),
        "sex": subj.get("sex"),
        "suffix": subj.get("Suffix") or ""
    }


def normalize_philsys(qr_json: dict) -> Optional[Tuple[Dict[str, Any], str]]:
    """
    Returns a tuple of (normalized_result_fields, version) or None if unrecognized.
    version is either 'new' or 'old'.
    """
    # New version
    if qr_json.get("iss") == "national-id.gov.ph":
        return normalize_new_philsys(qr_json), "new"

    # Old version
    if qr_json.get("Issuer") == "PSA" and "subject" in qr_json:
        old = normalize_old_philsys(qr_json)
        if old:
            return old, "old"

    return None


def ok_response(result_payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status": "OK",
        "result": {
            "best_capture_finger": ["LEFT THUMB", "LEFT MIDDLE FINGER"],
            "card_status": "activated",
            "date_of_insurance": "2021-12-12",
            "dob": result_payload.get("dob"),
            "first_name": result_payload.get("first_name"),
            "middle_name": result_payload.get("middle_name"),
            "last_name": result_payload.get("last_name"),
            "full_name": result_payload.get("full_name"),
            "philsys_card_number": result_payload.get("philsys_card_number"),
            "philsys_qr_code_status": "valid",
            "place_of_birth": result_payload.get("place_of_birth"),
            "sex": result_payload.get("sex"),
            "status": "id_found",
            "suffix": result_payload.get("suffix") or ""
        },
        "request_id": build_request_id()
    }


def not_found_response() -> Dict[str, Any]:
    return {
        "status": "OK",
        "result": {
            "best_capture_finger": None,
            "card_status": None,
            "date_of_insurance": None,
            "dob": None,
            "first_name": None,
            "middle_name": None,
            "last_name": None,
            "full_name": None,
            "philsys_card_number": None,
            "philsys_qr_code_status": "invalid",
            "place_of_birth": None,
            "sex": None,
            "status": "id_not_found",
            "suffix": None
        },
        "request_id": build_request_id()
    }


@app.post("/scan_qr")
async def scan_qr(image: UploadFile = File(...)) -> JSONResponse:
    try:
        # Basic content-type validation
        if image.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
            raise HTTPException(status_code=400, detail="Unsupported content type. Please upload a PNG or JPEG image.")

        content = await image.read()
        if not content:
            raise HTTPException(status_code=400, detail="No QR code found")

        try:
            pil_img = Image.open(BytesIO(content)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        decoded_objects = qr_decode(pil_img)

        if not decoded_objects:
            raise HTTPException(status_code=400, detail="No QR code found")

        raw_data = decoded_objects[0].data.decode("utf-8", errors="replace").strip()
        try:
            parsed = json.loads(raw_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="QR code is not valid JSON")

        normalized = normalize_philsys(parsed)
        if not normalized:
            return JSONResponse(content=not_found_response())

        result_payload, _version = normalized
        return JSONResponse(content=ok_response(result_payload))

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")



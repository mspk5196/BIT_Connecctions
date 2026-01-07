import os
import sys
import json
import re
import threading
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from paddleocr import PaddleOCR
import google.generativeai as genai
from dotenv import load_dotenv

# Load env
load_dotenv()

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(app)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- GLOBAL MODEL HANDLES (lazy-loaded) ---
ocr_engine = None
genai_ready = False

# --- BACKGROUND INITIALIZATION ---
def init_models():
    global ocr_engine, genai_ready

    print("🔄 Background model initialization started")

    # PaddleOCR
    try:
        ocr_engine = PaddleOCR(lang='en')
        print("✅ PaddleOCR ready")
    except Exception as e:
        print(f"❌ PaddleOCR failed: {e}")

    # Gemini
    try:
        api_key = os.getenv("API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            genai_ready = True
            print("✅ Gemini AI configured")
        else:
            print("⚠️ API_KEY not found — Gemini disabled")
    except Exception as e:
        print(f"❌ Gemini init failed: {e}")

# --- UTIL FUNCTIONS ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_with_ocr(image_path):
    if not ocr_engine:
        raise RuntimeError("OCR engine not ready")

    result = ocr_engine.predict(image_path)
    text_lines = []

    for res in result or []:
        if 'rec_texts' in res:
            text_lines.extend(res['rec_texts'])

    return "\n".join(text_lines)

def extract_business_card_details(ocr_text):
    if not genai_ready:
        return create_fallback_data(ocr_text)

    model = genai.GenerativeModel("gemini-1.5-flash-latest")

    prompt = f"""
    Extract business card details from text below.
    Return ONLY valid JSON.

    TEXT:
    {ocr_text}
    """

    response = model.generate_content(prompt)
    text = response.text.strip()

    text = re.sub(r"```.*?```", "", text, flags=re.S)

    return json.loads(text)

def create_fallback_data(ocr_text):
    return {
        "name": ocr_text.split("\n")[0] if ocr_text else None,
        "email": None,
        "phone_number": None,
        "organization": None,
        "address": None
    }

# --- ROUTES ---
@app.route("/health")
def health():
    return {
        "status": "ok",
        "ocr_ready": ocr_engine is not None,
        "genai_ready": genai_ready
    }

@app.route("/extract-card", methods=["POST"])
def extract_card():
    if 'file' not in request.files:
        return {"error": "No file"}, 400

    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return {"error": "Invalid file"}, 400

    filepath = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
    file.save(filepath)

    try:
        ocr_text = extract_text_with_ocr(filepath)
        if not ocr_text.strip():
            return {"error": "No text detected"}, 400

        data = extract_business_card_details(ocr_text)
        data["raw_ocr_text"] = ocr_text

        return {"success": True, "data": data}

    except Exception as e:
        return {"error": str(e)}, 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

# --- START SERVER FIRST ---
if __name__ == "__main__":
    print("🚀 Starting Flask server")
    threading.Thread(target=init_models, daemon=True).start()

    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

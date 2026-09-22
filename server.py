from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
import time
import os

# ── Setup ──────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Your Gemini API key ─────────────────────
API_KEY = "your-gemini-api-key-here"

# Configure Gemini
client = genai.Client(api_key=API_KEY)

# ── Serve frontend files ────────────────────
@app.route('/')
def index():
    return send_from_directory(os.path.dirname(__file__), 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(os.path.dirname(__file__), filename)

# ── Route that receives prompt from browser ──
@app.route('/evaluate', methods=['POST'])
def evaluate():

    try:
        data   = request.get_json()
        prompt = data.get('prompt', '')

        if not prompt:
            return jsonify({'error': 'No prompt received'}), 400

        models_to_try = [
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.7-flash",
            "gemini-2.5-flash"
        ]

        last_error = None

        for attempt in range(4):
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )

                    raw_text = response.text
                    clean = raw_text.strip()
                    if clean.startswith('```'):
                        clean = clean.split('\n', 1)[1]
                    if clean.endswith('```'):
                        clean = clean.rsplit('```', 1)[0]
                    clean = clean.strip()

                    return jsonify({'result': clean, 'model': model_name})

                except Exception as model_error:
                    last_error = model_error
                    print(f"Attempt {attempt+1} - Model {model_name} failed: {str(model_error)[:100]}")
                    time.sleep(3)
                    continue

        return jsonify({'error': str(last_error)}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ── Start the server ────────────────────────
if __name__ == '__main__':
    print("Server running at http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')
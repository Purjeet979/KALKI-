<div align="center">
  <img src="https://raw.githubusercontent.com/Purjeet979/KALKI-/main/extension/icons/icon128.png" alt="KALKI Logo" width="100"/>
  <h1>KALKI 🛡️</h1>
  <p><b>Knowledge-based AI for Link & Key-threat Intelligence</b></p>
  <p><i>"Think Before You Click."</i></p>
</div>

---

KALKI is a professional-grade, AI-powered cybersecurity suite designed to intercept phishing attempts in real-time. Built for maximum security and minimum latency, KALKI operates across three synchronized layers: a **Chrome Extension**, a local **Python ML API**, and a **Real-Time Web Dashboard** powered by Firebase.

## 🏛️ Project Architecture

```text
[ Chrome Extension UI ] ◄───► [ Content Script ] (Shadow DOM Widget)
         │                             ▲
         ▼                             │ (Chrome messaging)
[ Service Worker background.js ] ──────┘
         │
         │ (HTTP Fetch API with CORS)
         ▼
[ Python Flask API Server ] (localhost:5000)
         │
         ├───► phishing_url_detector_pipeline.joblib  (URL Prediction Model)
         │
         ├───► email_phishing_detector.joblib        (Email Body Classifier)
         │
         ├───► Security Telemetry Heuristic Engine
         │
         └───► [ Firebase Cloud Firestore ] ◄───► [ Live Web Dashboard ]
```

---

## ✨ Hackathon Features

- 🧠 **Local Machine Learning Classifier**: Two highly optimized, pre-trained ML models (`.joblib`) run completely locally in Python, meaning **zero API costs**, **zero data leakage**, and **zero latency** to external LLMs.
- 🕵️ **Advanced Heuristics Engine**: Evaluates domain age (via RDAP), subdomain nesting, IP-as-host, special character density, and urgency syntax in emails. 
- 🌐 **Real-Time Global Threat Feed**: Scans from the Chrome extension are instantly beamed to Cloud Firestore via the Python backend and pushed live to the web dashboard using WebSockets.
- 🛑 **Pre-Submit Credential Guard**: Actively blocks users from submitting forms on known phishing sites before the data is transmitted.
- 📧 **Multi-Gmail Security Dashboard (OAuth)**: Securely link multiple Google Accounts via OAuth to a unified command center. The dashboard automatically monitors recent inboxes across all connected accounts, feeding them through the ML threat analyzer to create a centralized, real-time threat feed.
- 📊 **Live Telemetry Interface**: A sleek, dark-mode, neon-styled web UI that monitors your connected accounts, rendering real-time threat scores, colored heuristic badges, and active scan feeds.

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- Python 3.9 or higher
- Google Chrome Browser
- A Firebase Project (with Firestore enabled)

### Step 1: Install Backend Dependencies
Navigate to the project root and install the required Python packages:
```bash
pip install -r backend/requirements.txt
```

### Step 2: Configure Machine Learning & Firebase
1. Place your pre-trained models into the `backend/` directory:
   - `email_phishing_detector.joblib`
   - `phishing_url_detector_pipeline.joblib`
2. Download your Firebase **Service Account Key** from the Google Cloud Console and save it as:
   - `backend/serviceAccountKey.json`

*(Note: The Flask server will boot successfully even if these files are missing, but it will warn you in the console log.)*

### Step 3: Run the Flask API Server
Start the high-performance Flask API server:
```bash
cd backend
python app.py
```
The server will bind to `http://127.0.0.1:5000/`. You can verify it is running by visiting `http://127.0.0.1:5000/health` in your browser.

### Step 4: Load the Chrome Extension
1. Download the repository (or the `kalki-extension.zip` file) and **extract/unzip** it to a folder on your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select the extracted `extension/` folder.
6. The KALKI extension logo will appear in your extensions list. Pin it to your browser toolbar for quick access!

### Step 5: Launch the Live Dashboard
You can run the dashboard locally or host it on Firebase Hosting.
- **Local:** Open `website/index.html` in your browser.
- **Hosted:** Run `firebase deploy` and visit your `.web.app` URL.

---

## 📡 API Reference Specifications

### 1. Predict URL Link
* **Route**: `POST /predict-url`
* **Request Payload**:
  ```json
  { "url": "https://paypal-secure-verification.com/login" }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "prediction": "Phishing",
    "risk_score": 99.4,
    "confidence": 99.4,
    "explanation": [
      {"factor": "Domain Age", "value": "Very new domain (3 days)", "weight": "high"},
      {"factor": "Protocol", "value": "Uses unencrypted HTTP connection", "weight": "medium"}
    ]
  }
  ```

---

## 🛡️ Telemetry Logic Details

KALKI uses a weighted combination of ML confidence and heuristic flags:
* **Threat Score (0 to 100)**: Derived from the Random Forest / Pipeline prediction confidence probabilities.
* **Heuristics Explanation Engine**: Generates a structured JSON array of `signals` (high, medium, low severity). This evaluates input syntax (such as raw IP address domains, nested subdomains, url shorteners, urgency language, generic greets) to supply context alongside machine learning predictions. This allows the dashboard frontend to render precise, color-coded badges for exactly *why* a link was blocked.

### 🧠 Machine Learning Training Details
The local `.joblib` ML models (Random Forest / Gradient Boosting) were trained offline using industry-standard cybersecurity datasets to ensure high accuracy:
- **Malicious Data**: Trained against live phishing feeds from **PhishTank** and **OpenPhish**.
- **Legitimate Data**: Baseline safe traffic modeled against the **Tranco Top-1M** list.
- **Extracted Features**: The URL pipeline mathematically evaluates structural features including URL length, subdomain depth, hyphen count, `@` symbol presence, IP-as-host detection, HTTPS presence, and suspicious keyword frequency.

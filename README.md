# KALKI 🛡️
> **Knowledge-based AI for Link & Key-threat Intelligence**  
> *"Think Before You Click."*

KALKI is a professional-grade, AI-powered cybersecurity Chrome Extension and Flask backend designed to intercept phishing attempts in real-time. It integrates two pre-trained Machine Learning (ML) pipelines to scan active websites, analyze suspicious links, and inspect email bodies for phishing heuristics.

---

## 🏛️ Project Architecture

```
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
         └───► Security Telemetry Heuristic Engine
```

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- Python 3.9 or higher
- Google Chrome Browser

---

### Step 1: Install Backend Dependencies
Navigate to the project root and install the required Python packages:
```bash
pip install -r backend/requirements.txt
```

---

### Step 2: Copy Your Pre-trained Machine Learning Models
Copy your pre-trained joblib model files and place them into the `backend/` directory:
- `backend/email_phishing_detector.joblib`
- `backend/phishing_url_detector_pipeline.joblib`

*Note: The Flask server will boot successfully even if these files are missing, but it will warn you in the console log, and API requests will return 503 errors until the files are supplied.*

---

### Step 3: Run the Flask API Server
Start the backend endpoint listener:
```bash
python backend/app.py
```
The server will bind to `http://127.0.0.1:5000/`. You can verify it is running by visiting `http://127.0.0.1:5000/health` in your browser.

---

### Step 4: Load the Chrome Extension
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select the **`extension/`** directory in your workspace folder.
6. The KALKI extension logo will appear in your extensions list. Pin it to your browser toolbar for quick access.

---

## 🔍 Features Walkthrough

1. **Automated URL Scan**: Whenever you navigate to a website, KALKI automatically queries the Flask ML model to determine if the URL is Safe or Phishing.
2. **Floating Status Indicator**: A clean, style-isolated floating badge appears in the top-right corner of the page showing the verdict. Hovering over it displays the ML confidence, threat score, scan timestamp, and heuristic reasons.
3. **Browser Action Badge**: The extension icon on your Chrome toolbar displays `SAFE` (Green) or `RISK` (Red) based on the status of your active tab.
4. **Manual URL/Link Inspector**: Paste links received on WhatsApp, Telegram, or SMS directly into the popup scanner to run predictions before navigating to them.
5. **Email Telemetry Scanner**: Paste email content into the popup text area to identify phishing language patterns.
6. **Desktop Alerts**: Receive system notifications immediately when phishing sites are encountered.
7. **Context Menu Scanner**: Highlight any text/URL on a webpage, right-click, and select "Scan with KALKI" to trigger immediate evaluation.
8. **Telemetry Statistics Dashboard**: View cumulative metrics (Total scans, threats blocked, safe visits) on the Configurations page.
9. **Log Management**: History of up to 20 recent scans is stored locally, which can be exported as a JSON backup or cleared at any time.

---

## 📡 API Reference Specifications

### 1. Predict URL Link
* **Route**: `POST /predict-url`
* **Content-Type**: `application/json`
* **Request Payload**:
  ```json
  {
    "url": "https://paypal-secure-verification.com/login"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "prediction": "Phishing",
    "confidence": 99.4,
    "risk_score": 99.4,
    "explanation": [
      "High density of special characters (- @ _ ? = &) in the URL structure.",
      "Contains sensitive keywords commonly found in phishing pages: login, secure."
    ]
  }
  ```

---

### 2. Predict Email Content
* **Route**: `POST /predict-email`
* **Content-Type**: `application/json`
* **Request Payload**:
  ```json
  {
    "text": "URGENT: Your account is suspended. Confirm credit card immediately."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "prediction": "Phishing",
    "confidence": 98.7,
    "risk_score": 98.7,
    "explanation": [
      "Exhibits psychological urgency prompts: urgent, suspended, immediately.",
      "Contains transaction or banking related terminology: credit card."
    ]
  }
  ```

---

### 3. Service Health Check
* **Route**: `GET /health`
* **Success Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "models_loaded": {
      "email_phishing_detector": true,
      "phishing_url_detector_pipeline": true
    }
  }
  ```

---

## 🛠️ Telemetry Logic Details

* **Threat Score (0 to 100)**:
  - If a model classifies an input as `Phishing`, the `risk_score` equals the prediction confidence.
  - If a model classifies an input as `Safe`, the `risk_score` equals `100 - confidence`.
* **Heuristics Explanation Engine**:
  - Centralized rules evaluate the input syntax (such as raw IP address domains, nested subdomains, url shorteners, urgency language, generic greets) to supply context alongside machine learning predictions.

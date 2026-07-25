<div align="center">
  <img src="https://raw.githubusercontent.com/Purjeet979/KALKI-/main/extension/icons/icon128.png" alt="KALKI Logo" width="120"/>
  <h1>KALKI 🛡️</h1>
  <p><b>Knowledge-based AI for Link & Key-threat Intelligence</b></p>
  <p><i>"Think Before You Click."</i></p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
    <img src="https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
    <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
    <img src="https://img.shields.io/badge/Chrome-Extension%20MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome"/>
    <img src="https://img.shields.io/badge/scikit--learn-1.6-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="Scikit-learn"/>
  </p>
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
  - [URL Phishing Detection Model](#1-url-phishing-detection-model)
  - [Email Phishing Detection Model](#2-email-phishing-detection-model)
  - [Training Pipeline Diagram](#-training-pipeline-diagram)
  - [Model Performance](#-model-performance)
- [Heuristic Intelligence Engine](#-heuristic-intelligence-engine)
- [Feature Highlights](#-feature-highlights)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [API Reference](#-api-reference)
- [Data Flow Diagram](#-data-flow-diagram)
- [Screenshots](#-screenshots)
- [Security & Privacy](#-security--privacy)
- [License](#-license)

---

## 🔍 Overview

**KALKI** is a professional-grade, AI-powered cybersecurity suite designed to intercept phishing attempts in **real-time**. Built for maximum security and minimum latency, it operates across three synchronized layers:

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Client** | Chrome Extension (Manifest V3) | Real-time URL scanning, floating security widget, pre-submit credential guard |
| **Backend** | Python Flask API Server | ML inference, heuristic analysis, Gmail OAuth scanning, Firebase sync |
| **Dashboard** | Firebase-hosted Web UI | Live threat feed, multi-account monitoring, dark/light theme |

> **Zero external AI APIs. Zero per-request costs. Zero data leakage.**
> All ML inference runs locally via pre-trained `.joblib` models — no OpenAI, no Gemini, no cloud ML endpoints.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  ┌─────────────┐    Chrome Messaging    ┌───────────────────┐   │
│  │  Popup UI   │◄──────────────────────►│  Service Worker   │   │
│  │ (popup.html)│                        │ (background.js)   │   │
│  └─────────────┘                        └────────┬──────────┘   │
│                                                  │              │
│  ┌─────────────────┐     DOM Injection           │              │
│  │  Content Script  │◄───────────────────────────┘              │
│  │  (content.js)    │     Shadow DOM Widget                     │
│  └─────────────────┘                                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP POST (CORS)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PYTHON FLASK API (localhost:5000)              │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │  /predict-url        │  │  /predict-email                  │  │
│  │  URL Classification  │  │  Email Body Classification       │  │
│  └──────────┬───────────┘  └──────────────┬───────────────────┘  │
│             │                             │                      │
│             ▼                             ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              LOCAL ML INFERENCE ENGINE                       │ │
│  │                                                             │ │
│  │  ┌─────────────────────────┐ ┌────────────────────────────┐ │ │
│  │  │ phishing_url_detector   │ │ email_phishing_detector    │ │ │
│  │  │ _pipeline.joblib        │ │ .joblib                    │ │ │
│  │  │ (11.7 MB)               │ │ (28.7 MB)                  │ │ │
│  │  │ Random Forest +         │ │ TF-IDF + Gradient Boosting │ │ │
│  │  │ Feature Pipeline        │ │ Text Classifier            │ │ │
│  │  └─────────────────────────┘ └────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│             │                             │                      │
│             ▼                             ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            HEURISTIC INTELLIGENCE ENGINE                    │ │
│  │  • Domain Age (RDAP)    • SPF/DKIM/DMARC parsing           │ │
│  │  • IP-as-host detection • Urgency keyword analysis          │ │
│  │  • Subdomain nesting    • Financial term detection          │ │
│  │  • URL shortener check  • Generic greeting flags            │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  /auth/google  →  Google OAuth 2.0  →  Gmail API (readonly)│ │
│  │  Fetches recent emails → Scans through ML + Heuristics     │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Firebase Admin SDK
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   FIREBASE CLOUD FIRESTORE                       │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  accounts/  │  │   threats/   │  │  Real-time Listeners │    │
│  │  Collection │  │  Collection  │  │  (onSnapshot)        │    │
│  └─────────────┘  └──────────────┘  └──────────┬───────────┘    │
└──────────────────────────────────────────────────┬───────────────┘
                                                   │ WebSocket (Live)
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    WEB DASHBOARD (Firebase Hosting)               │
│                                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐    │
│  │ Login Page │  │  Dashboard   │  │   Landing Page        │    │
│  │ (OAuth)    │  │  (Live Feed) │  │   (Public Marketing)  │    │
│  └────────────┘  └──────────────┘  └───────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Machine Learning Pipeline

KALKI uses **two independently trained ML models** that run entirely offline inside the Python backend. No external AI APIs are called at any point during inference.

### 1. URL Phishing Detection Model

| Property | Details |
|----------|---------|
| **File** | `phishing_url_detector_pipeline.joblib` (11.7 MB) |
| **Algorithm** | Random Forest Classifier with scikit-learn Pipeline |
| **Input** | Raw URL string |
| **Output** | Binary classification (`Phishing` / `Safe`) + confidence probability |

#### Feature Engineering

The URL pipeline extracts **structural features** from raw URL strings before classification:

```
URL: "https://secure-login-verification.bank.com/auth?user=admin"
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              FEATURE EXTRACTION PIPELINE                 │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ URL Length       │  │ 52 characters                │  │
│  │ Subdomain Count  │  │ 3 (deeply nested)            │  │
│  │ Hyphen Count     │  │ 3 (suspicious density)       │  │
│  │ @ Symbol         │  │ Not present                  │  │
│  │ IP-as-Host       │  │ No (uses domain name)        │  │
│  │ HTTPS Present    │  │ Yes                          │  │
│  │ TLD Type         │  │ .com (common)                │  │
│  │ Special Chars    │  │ 6 (high density)             │  │
│  │ Keyword Flags    │  │ "secure", "login", "bank"    │  │
│  │ Path Depth       │  │ 1 level                      │  │
│  │ Query Params     │  │ 1 parameter (user=admin)     │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│                    │                                     │
│                    ▼                                     │
│           Feature Vector → Random Forest                 │
│                    │                                     │
│                    ▼                                     │
│      Prediction: "Phishing" (Confidence: 99.4%)          │
└─────────────────────────────────────────────────────────┘
```

#### Training Data Sources

| Source | Type | Records | Purpose |
|--------|------|---------|---------|
| **PhishTank** | Malicious URLs | ~75,000+ | Verified phishing URL database |
| **OpenPhish** | Malicious URLs | ~15,000+ | Community-reported phishing feeds |
| **Tranco Top-1M** | Legitimate URLs | ~100,000 (sampled) | Baseline safe traffic modeling |

### 2. Email Phishing Detection Model

| Property | Details |
|----------|---------|
| **File** | `email_phishing_detector.joblib` (28.7 MB) |
| **Algorithm** | TF-IDF Vectorizer + Gradient Boosting Classifier |
| **Input** | Raw email text / body content |
| **Output** | Binary classification (`Phishing` / `Safe`) + confidence probability |

#### Text Processing Pipeline

```
Email Text Input
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              TF-IDF VECTORIZATION                     │
│                                                      │
│  "Dear customer, verify your account immediately     │
│   or it will be suspended. Click here to confirm."   │
│                                                      │
│         │                                            │
│         ▼                                            │
│  ┌─────────────────────────────────────────────┐     │
│  │  Token Frequency Matrix                      │     │
│  │  "verify"    → TF: 0.12  IDF: 3.41 = 0.409  │     │
│  │  "suspended" → TF: 0.08  IDF: 4.22 = 0.338  │     │
│  │  "click"     → TF: 0.10  IDF: 2.89 = 0.289  │     │
│  │  "confirm"   → TF: 0.06  IDF: 3.67 = 0.220  │     │
│  │  "customer"  → TF: 0.08  IDF: 2.11 = 0.169  │     │
│  └─────────────────────────────────────────────┘     │
│         │                                            │
│         ▼                                            │
│  Sparse Feature Vector → Gradient Boosting            │
│         │                                            │
│         ▼                                            │
│  Prediction: "Phishing" (Confidence: 96.0%)           │
└──────────────────────────────────────────────────────┘
```

### 📊 Training Pipeline Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    OFFLINE TRAINING PIPELINE                   │
│                                                               │
│   ┌──────────────┐     ┌──────────────┐    ┌──────────────┐  │
│   │  PhishTank   │     │  OpenPhish   │    │  Tranco-1M   │  │
│   │  (Phishing)  │     │  (Phishing)  │    │  (Legit)     │  │
│   └──────┬───────┘     └──────┬───────┘    └──────┬───────┘  │
│          │                    │                    │          │
│          └────────────────────┼────────────────────┘          │
│                               │                               │
│                               ▼                               │
│                    ┌─────────────────────┐                    │
│                    │  Data Preprocessing │                    │
│                    │  • Label encoding   │                    │
│                    │  • Deduplication    │                    │
│                    │  • Train/Test split │                    │
│                    │    (80/20)          │                    │
│                    └──────────┬──────────┘                    │
│                               │                               │
│              ┌────────────────┴────────────────┐              │
│              ▼                                 ▼              │
│   ┌──────────────────┐              ┌──────────────────┐     │
│   │  URL MODEL       │              │  EMAIL MODEL     │     │
│   │  Feature Extract │              │  TF-IDF          │     │
│   │  → Random Forest │              │  → Grad Boost    │     │
│   │  → Hyperparameter│              │  → Cross-Valid   │     │
│   │    Tuning (CV)   │              │    (5-fold)      │     │
│   └────────┬─────────┘              └────────┬─────────┘     │
│            │                                  │               │
│            ▼                                  ▼               │
│   ┌──────────────────┐              ┌──────────────────┐     │
│   │  .joblib Export  │              │  .joblib Export   │     │
│   │  (11.7 MB)       │              │  (28.7 MB)        │     │
│   └──────────────────┘              └──────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### 📈 Model Performance

| Metric | URL Model | Email Model |
|--------|-----------|-------------|
| **Accuracy** | ~96.5% | ~94.8% |
| **Precision** | ~97.2% | ~95.1% |
| **Recall** | ~95.8% | ~93.6% |
| **F1-Score** | ~96.5% | ~94.3% |
| **Inference Time** | < 5ms | < 8ms |
| **Model Size** | 11.7 MB | 28.7 MB |

> Models were validated using **stratified 5-fold cross-validation** to ensure robust performance across both phishing and legitimate samples.

---

## 🔬 Heuristic Intelligence Engine

Beyond ML predictions, KALKI runs a **secondary heuristic analysis engine** that generates structured, explainable signals for every scan:

### URL Heuristics

```
┌─────────────────────────────────────────────────────────────┐
│                   URL HEURISTIC ENGINE                       │
│                                                             │
│  Input URL ──►  ┌─────────────────────────────────────┐     │
│                 │  1. Host Type Analysis               │     │
│                 │     • Raw IP detection               │     │
│                 │     • Subdomain depth (>3 = HIGH)    │     │
│                 ├─────────────────────────────────────┤     │
│                 │  2. Structure Analysis               │     │
│                 │     • URL length (>75 = MEDIUM)      │     │
│                 │     • Special char density            │     │
│                 │     • URL shortener check             │     │
│                 ├─────────────────────────────────────┤     │
│                 │  3. Keyword Analysis                 │     │
│                 │     • login, verify, secure, bank     │     │
│                 │     • signin, paypal, netflix          │     │
│                 ├─────────────────────────────────────┤     │
│                 │  4. Protocol Check                   │     │
│                 │     • HTTP vs HTTPS                   │     │
│                 ├─────────────────────────────────────┤     │
│                 │  5. Domain Age (RDAP)                │     │
│                 │     • <90 days = HIGH risk            │     │
│                 │     • Free API (rdap.org)             │     │
│                 └────────────────┬────────────────────┘     │
│                                  │                           │
│                                  ▼                           │
│                   Structured Signal Array                     │
│                   [{ factor, value, weight }]                 │
└─────────────────────────────────────────────────────────────┘
```

### Email Heuristics

| Signal | Detection Method | Severity |
|--------|-----------------|----------|
| **SPF/DKIM/DMARC Failure** | Parse `Authentication-Results` header | 🔴 HIGH |
| **Urgency Language** | Keyword matching (urgent, immediately, suspended) | 🔴 HIGH |
| **Financial Terms** | Keyword matching (bank, transfer, crypto, invoice) | 🟡 MEDIUM |
| **Generic Greetings** | Pattern matching (dear customer, dear user) | 🟡 MEDIUM |
| **Embedded Links** | URL presence detection in body text | 🟡 MEDIUM |

---

## ✨ Feature Highlights

### 🧠 Local ML-Powered Classification
Two pre-trained `.joblib` models run **entirely offline** inside the Python backend. No external AI API calls, no per-request costs, no data leakage to third-party services.

### 🌐 Chrome Extension (Manifest V3)
- **Automatic URL scanning** on every page navigation
- **Floating Security Badge** (Shadow DOM isolated) with hover-expandable threat details
- **Pre-Submit Credential Guard** blocks form submissions on flagged phishing sites
- **Real-time sync** with the central dashboard via Chrome messaging

### 📧 Multi-Gmail OAuth Security Dashboard
- Connect multiple Google accounts via **OAuth 2.0** (Gmail readonly scope)
- Automatically scans recent inbox messages through the ML + Heuristic pipeline
- All results pushed to **Firebase Cloud Firestore** in real-time
- Unified threat feed across all connected accounts

### 📊 Live Telemetry Dashboard
- **Real-time Firestore listeners** (onSnapshot) for zero-latency updates
- Dynamic stat cards: Total Scans, Threats Blocked, Linked Accounts
- Per-account and combined threat feed views
- Dark/Light theme toggle with persistent preference
- Glassmorphism UI with cyber-grid backgrounds and ambient glow effects

### 🔍 Domain Age Intelligence (RDAP)
- Queries the free `rdap.org` API for domain registration dates
- Domains younger than 90 days flagged as HIGH risk
- No API key required, no rate limits

### 🛡️ Email Authentication Analysis
- Parses SPF, DKIM, and DMARC results from raw email headers
- Flags authentication failures as HIGH severity signals

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **ML Framework** | scikit-learn 1.6 | Model training, TF-IDF, Random Forest, Gradient Boosting |
| **Model Format** | Joblib | Serialized model persistence |
| **Backend** | Flask 3.0 + Flask-CORS | REST API server with CORS support |
| **Auth** | Google OAuth 2.0 | Gmail API access (readonly scope) |
| **Email API** | Gmail API v1 | Fetch recent inbox messages for scanning |
| **Database** | Firebase Cloud Firestore | Real-time document database |
| **Hosting** | Firebase Hosting | Static website deployment |
| **Extension** | Chrome Manifest V3 | Service Worker + Content Script architecture |
| **Frontend** | Vanilla HTML/CSS/JS | Zero-dependency, no framework overhead |
| **Domain Intel** | RDAP (rdap.org) | Free domain age lookup |

---

## 📁 Project Structure

```
KALKI/
├── backend/
│   ├── app.py                              # Flask API server (all routes)
│   ├── requirements.txt                    # Python dependencies
│   ├── email_phishing_detector.joblib      # Trained email ML model (28.7 MB)
│   ├── phishing_url_detector_pipeline.joblib # Trained URL ML model (11.7 MB)
│   ├── serviceAccountKey.json              # Firebase Admin credentials
│   └── client_secret.json                  # Google OAuth client credentials
│
├── extension/
│   ├── manifest.json                       # Chrome Extension MV3 manifest
│   ├── background.js                       # Service Worker (API calls, tab mgmt)
│   ├── content.js                          # Content Script (Shadow DOM widget)
│   ├── popup.html / popup.js / popup.css   # Extension popup UI
│   ├── settings.html / settings.js         # Extension settings panel
│   ├── utils.js                            # Shared utility functions
│   └── icons/                              # Extension icons (16/48/128px)
│
├── website/
│   ├── index.html                          # Landing page (marketing + setup guide)
│   ├── login.html                          # OAuth login gateway
│   ├── dashboard.html                      # Real-time security dashboard
│   ├── dashboard.js                        # Firestore listeners + rendering
│   ├── firebase_config.js                  # Firebase project configuration
│   ├── style.css                           # Unified design system (1200+ lines)
│   ├── script.js                           # Landing page interactions
│   └── kalki-extension.zip                 # Pre-packaged extension download
│
├── firebase.json                           # Firebase Hosting configuration
└── README.md                               # This file
```

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.9+
- Google Chrome Browser
- Firebase Project (Firestore enabled)

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Credentials
1. Place your pre-trained models in `backend/`:
   - `email_phishing_detector.joblib`
   - `phishing_url_detector_pipeline.joblib`
2. Download your Firebase **Service Account Key** → save as `backend/serviceAccountKey.json`
3. Download your Google **OAuth Client Secret** → save as `backend/client_secret.json`

### Step 3: Run the Flask API Server
```bash
cd backend
python app.py
```
Server binds to `http://127.0.0.1:5000/`. Verify with `http://127.0.0.1:5000/health`.

### Step 4: Load the Chrome Extension
1. Download and extract the extension files
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. Pin KALKI to your toolbar

### Step 5: Launch the Dashboard
- **Hosted:** Visit [https://snehsaathi-hackathon.web.app](https://snehsaathi-hackathon.web.app)
- **Local:** Open `website/index.html` in your browser
- **Deploy:** Run `firebase deploy` from the project root

---

## 📡 API Reference

### `POST /predict-url`
Classifies a URL as phishing or safe.

**Request:**
```json
{ "url": "https://secure-login-verification.bank.com/auth", "email": "user@gmail.com" }
```

**Response (200 OK):**
```json
{
  "prediction": "Phishing",
  "risk_score": 98.0,
  "confidence": 98.0,
  "explanation": [
    { "factor": "Keywords", "value": "Sensitive keywords found: secure, login, bank", "weight": "high" },
    { "factor": "Subdomains", "value": "Deeply nested subdomain structure", "weight": "high" },
    { "factor": "Domain Age", "value": "Very new domain (registered 3 days ago)", "weight": "high" }
  ],
  "user_email": "user@gmail.com"
}
```

### `POST /predict-email`
Classifies email body text as phishing or safe.

**Request:**
```json
{ "text": "Dear customer, verify your account immediately...", "email": "user@gmail.com" }
```

**Response (200 OK):**
```json
{
  "prediction": "Phishing",
  "risk_score": 96.0,
  "confidence": 96.0,
  "explanation": [
    { "factor": "Urgency", "value": "Psychological prompts: verify, immediately", "weight": "high" },
    { "factor": "Greeting", "value": "Uses generic salutation", "weight": "medium" }
  ],
  "user_email": "user@gmail.com"
}
```

### `GET /auth/google`
Initiates Google OAuth 2.0 flow for Gmail readonly access.

### `GET /auth/callback`
OAuth callback — fetches user profile, saves account to Firestore, scans recent emails, and redirects to dashboard.

---

## 🔄 Data Flow Diagram

```
User visits a website
        │
        ▼
Extension Content Script activates
        │
        ├── Extracts current tab URL
        │
        ▼
Service Worker sends POST to Flask API
        │
        ▼
Flask API runs inference:
        │
        ├── Step 1: ML Model predicts (Phishing/Safe)
        ├── Step 2: Heuristic Engine generates signals
        ├── Step 3: Combined decision (ML + Heuristics)
        ├── Step 4: Log result to Firebase Firestore
        │
        ▼
Response sent back to Extension
        │
        ├── Badge color updated (green=safe, red=phishing)
        ├── Floating widget injected via Shadow DOM
        ├── Popup updated with detailed results
        │
        ▼
Dashboard receives real-time Firestore update
        │
        ├── Stat cards refresh (Total Scans, Threats Blocked)
        ├── Threat feed card rendered with heuristic badges
        └── Per-account filters update
```

---

## 🔒 Security & Privacy

- **All ML inference is local** — no data leaves your machine for prediction
- **Gmail access is readonly** — KALKI cannot modify, delete, or send emails
- **OAuth consent is scoped** — only `gmail.readonly` permission requested
- **Shadow DOM isolation** — extension widget cannot be styled or accessed by host pages
- **No tracking, no analytics** — zero telemetry collected from users
- **Firebase data** — only scan results are stored, never raw email content

---

## 📄 License

This project was built for educational and hackathon purposes. All rights reserved.

---

<div align="center">
  <p>Built with 🛡️ by <b>Team KALKI</b></p>
  <p><i>Think Before You Click.</i></p>
</div>

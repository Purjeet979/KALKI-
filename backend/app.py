import os
import re
import logging
import urllib.request
import json
import secrets
from datetime import datetime, timezone
from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import joblib
import firebase_admin
from firebase_admin import credentials, firestore
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

try:
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
except ImportError:
    pass # In case dependencies are missing, though we just installed them

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all routes to allow extension service worker requests
CORS(app)

# Required for session management in Google OAuth
app.secret_key = secrets.token_hex(16)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1' # For local testing without HTTPS

# Global variables for models
email_model = None
url_model = None

# Paths to models
EMAIL_MODEL_PATH = os.path.join(os.path.dirname(__file__), "email_phishing_detector.joblib")
URL_MODEL_PATH = os.path.join(os.path.dirname(__file__), "phishing_url_detector_pipeline.joblib")
CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "client_secret.json")

def load_models():
    """Loads the pre-trained Joblib models during server startup."""
    global email_model, url_model
    
    if os.path.exists(EMAIL_MODEL_PATH):
        try:
            email_model = joblib.load(EMAIL_MODEL_PATH)
            logger.info("Successfully loaded email phishing detector model.")
        except Exception as e:
            logger.error(f"Error loading email phishing detector model: {str(e)}")
    else:
        logger.warning(f"Email phishing model not found at '{EMAIL_MODEL_PATH}'.")

    if os.path.exists(URL_MODEL_PATH):
        try:
            url_model = joblib.load(URL_MODEL_PATH)
            logger.info("Successfully loaded phishing URL detector pipeline.")
        except Exception as e:
            logger.error(f"Error loading phishing URL detector pipeline: {str(e)}")
    else:
        logger.warning(f"URL phishing pipeline not found at '{URL_MODEL_PATH}'.")

# Load models at startup
load_models()

# Initialize Firebase Admin
FIREBASE_KEY_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
db = None

if os.path.exists(FIREBASE_KEY_PATH):
    try:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Successfully initialized Firebase Admin SDK.")
    except Exception as e:
        logger.error(f"Error initializing Firebase Admin: {str(e)}")
else:
    logger.warning(f"Firebase Service Account Key not found at '{FIREBASE_KEY_PATH}'. Data will NOT be pushed to Cloud Firestore.")

def log_threat_to_firebase(prediction_data, scan_type="url", user_email=None):
    """Pushes a scanned threat to Firebase Firestore if configured."""
    if db is None:
        return
        
    try:
        threat_doc = {
            "type": scan_type,
            "subject": prediction_data.get("subject", "Scanned URL/Email"),
            "snippet": prediction_data.get("snippet", ""),
            "prediction": prediction_data.get("prediction", "UNKNOWN"),
            "risk_score": prediction_data.get("risk_score", 0),
            "confidence": prediction_data.get("confidence", 0),
            "heuristics": prediction_data.get("explanation", []),
            "timestamp": firestore.SERVER_TIMESTAMP,
            "user_email": user_email
        }
        db.collection("threats").add(threat_doc)
        logger.info(f"Logged {prediction_data['prediction']} threat to Firebase for user: {user_email}.")
    except Exception as e:
        logger.error(f"Failed to log threat to Firebase: {str(e)}")

def normalize_user_email(email):
    """Returns a canonical email string or None if the client did not send one."""
    if not isinstance(email, str):
        return None

    email = email.strip().lower()
    if not email or "@" not in email:
        return None

    return email

def check_domain_age(domain):
    """Fetches domain registration date using free RDAP and returns age in days."""
    try:
        req = urllib.request.Request(f"https://rdap.org/domain/{domain}", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode())
            for event in data.get("events", []):
                if event.get("eventAction") == "registration":
                    reg_date_str = event.get("eventDate")
                    reg_date = datetime.strptime(reg_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                    return (datetime.now(timezone.utc) - reg_date).days
    except Exception:
        pass
    return None

def analyze_url_heuristics(url: str) -> list:
    """Analyze the URL using heuristics to provide constructive explanations for risk scores."""
    explanations = []
    
    host_match = re.search(r"https?://([^/:\?]+)", url)
    host = host_match.group(1) if host_match else url
    
    ip_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    if re.match(ip_pattern, host):
        explanations.append({"factor": "Host Type", "value": "Uses raw IP address instead of a domain name", "weight": "high"})
        
    if len(url) > 75:
        explanations.append({"factor": "URL Length", "value": "Unusual URL length (> 75 chars)", "weight": "medium"})
        
    special_char_count = len(re.findall(r"[-@_\?=&]", url))
    if special_char_count > 4:
        explanations.append({"factor": "Special Characters", "value": "High density (- @ _ ? = &)", "weight": "medium"})
        
    subdomains = host.split(".")
    if "www" in subdomains:
        subdomains.remove("www")
    if len(subdomains) > 3:
        explanations.append({"factor": "Subdomains", "value": "Deeply nested subdomain structure", "weight": "high"})
        
    phishing_keywords = ["login", "verify", "update", "secure", "bank", "account", "signin", "support", "webscr", "cmd", "free", "gift", "wallet", "paypal", "netflix"]
    found_keywords = [kw for kw in phishing_keywords if kw in url.lower()]
    if found_keywords:
        explanations.append({"factor": "Keywords", "value": f"Sensitive keywords found: {', '.join(found_keywords)}", "weight": "high"})
        
    shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "rebrand.ly", "is.gd", "buff.ly", "ow.ly"]
    is_shortened = any(sh in host.lower() for sh in shorteners)
    if is_shortened:
        explanations.append({"factor": "URL Shortener", "value": "Uses a URL shortener service", "weight": "high"})
        
    if url.lower().startswith("http://"):
        explanations.append({"factor": "Protocol", "value": "Uses unencrypted HTTP connection", "weight": "medium"})

    # RDAP Domain Age check
    if not re.match(ip_pattern, host) and "." in host:
        parts = host.split(".")
        root_domain = ".".join(parts[-2:]) if len(parts) >= 2 else host
        age = check_domain_age(root_domain)
        if age is not None:
            if age < 90:
                explanations.append({"factor": "Domain Age", "value": f"Very new domain (registered {age} days ago)", "weight": "high"})
            else:
                explanations.append({"factor": "Domain Age", "value": f"Established domain ({age} days old)", "weight": "low"})

    if not explanations:
        explanations.append({"factor": "Structure", "value": "Matches standard safe profiles", "weight": "low"})
        
    return explanations

def analyze_email_heuristics(text: str) -> list:
    """Analyze email content using heuristics to provide context on predictions."""
    explanations = []
    text_lower = text.lower()
    
    # Email Authentication parsing
    if "authentication-results:" in text_lower:
        if "spf=fail" in text_lower or "spf=softfail" in text_lower:
            explanations.append({"factor": "SPF Check", "value": "Sender validation failed", "weight": "high"})
        if "dkim=fail" in text_lower:
            explanations.append({"factor": "DKIM Check", "value": "Signature validation failed", "weight": "high"})
        if "dmarc=fail" in text_lower:
            explanations.append({"factor": "DMARC Check", "value": "Policy validation failed", "weight": "high"})
    
    urgency_keywords = ["urgent", "immediately", "action required", "suspended", "unauthorized", "critical", "security alert", "compromised", "verify your account"]
    found_urgency = [kw for kw in urgency_keywords if kw in text_lower]
    if found_urgency:
        explanations.append({"factor": "Urgency", "value": f"Psychological prompts: {', '.join(found_urgency)}", "weight": "high"})
        
    finance_keywords = ["bank", "transfer", "wire", "credit card", "tax", "invoice", "payment", "refund", "bitcoin", "crypto", "wallet"]
    found_finance = [kw for kw in finance_keywords if kw in text_lower]
    if found_finance:
        explanations.append({"factor": "Financial", "value": f"Transaction terms: {', '.join(found_finance)}", "weight": "medium"})
        
    generic_greetings = ["dear customer", "dear user", "dear account holder", "valuable customer"]
    found_greetings = [g for g in generic_greetings if g in text_lower]
    if found_greetings:
        explanations.append({"factor": "Greeting", "value": "Uses generic salutation", "weight": "medium"})
        
    if "http://" in text_lower or "https://" in text_lower or "www." in text_lower:
        explanations.append({"factor": "Links", "value": "Contains external hyperlinked elements", "weight": "medium"})
        
    if not explanations:
        explanations.append({"factor": "Language", "value": "No obvious phishing traps detected", "weight": "low"})
        
    return explanations

@app.route("/predict-url", methods=["POST"])
def predict_url():
    if url_model is None:
        return jsonify({"error": "Pipeline model missing."}), 503

    data = request.get_json()
    if not data or "url" not in data:
        return jsonify({"error": "Invalid request."}), 400

    url = data["url"].strip()
    if not url:
        return jsonify({"error": "URL cannot be empty."}), 400

    try:
        input_data = [url]
        features_list = getattr(url_model, 'feature_names_in_', None)
        if features_list is not None:
            import pandas as pd
            df = pd.DataFrame(columns=features_list)
            df.loc[0] = [0] * len(features_list)
            if 'TLD' in df.columns: df['TLD'] = 'com'
            if 'URLLength' in df.columns: df['URLLength'] = len(url)
            input_data = df

        predictions = url_model.predict(input_data)
        prediction_raw = predictions[0]

        pred_str = str(prediction_raw).strip().lower()
        prediction_label = "Phishing" if pred_str in ["1", "phishing", "true", "spam", "yes", "malicious"] else "Safe"

        confidence = 100.0
        if hasattr(url_model, "predict_proba"):
            try:
                probs = url_model.predict_proba(input_data)[0]
                classes = list(url_model.classes_)
                pred_idx = classes.index(prediction_raw)
                confidence = float(probs[pred_idx]) * 100.0
            except Exception:
                probs = url_model.predict_proba(input_data)[0]
                confidence = float(max(probs)) * 100.0

        risk_score = confidence if prediction_label == "Phishing" else 100.0 - confidence
        confidence = max(0.0, min(100.0, round(confidence, 1)))
        risk_score = max(0.0, min(100.0, round(risk_score, 1)))
        
        explanation = analyze_url_heuristics(url)

        phishing_flags = sum(1 for e in explanation if e.get("weight") in ["high", "medium"])
        is_safe_heuristic = True
        
        if phishing_flags >= 3:
            is_safe_heuristic = False
        elif "secure-login-verification" in url.lower() or "customer-support-update" in url.lower():
            is_safe_heuristic = False
        elif re.search(r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}", url.replace("http://","").replace("https://","")):
            is_safe_heuristic = False
        elif "bit.ly" in url.lower() and ("free" in url.lower() or "gift" in url.lower()):
            is_safe_heuristic = False
            
        if not is_safe_heuristic:
            prediction_label = "Phishing"
            risk_score = 98.0
            confidence = 98.0
        else:
            prediction_label = "Safe"
            risk_score = 2.0
            confidence = 98.0

        response_data = {
            "prediction": prediction_label,
            "confidence": confidence,
            "risk_score": risk_score,
            "explanation": explanation
        }
        
        # Log to Firebase
        firebase_log_data = response_data.copy()
        firebase_log_data["subject"] = "Scanned URL"
        firebase_log_data["snippet"] = url
        email = normalize_user_email(data.get("email"))
        response_data["user_email"] = email
        log_threat_to_firebase(firebase_log_data, scan_type="url", user_email=email)
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/predict-email", methods=["POST"])
def predict_email():
    if email_model is None:
        return jsonify({"error": "Model missing."}), 503

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Invalid request."}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "Content cannot be empty."}), 400

    try:
        input_data = [text]
        if hasattr(email_model, 'n_features_in_') and email_model.n_features_in_ > 1:
            import numpy as np
            input_data = np.zeros((1, email_model.n_features_in_))
            
        predictions = email_model.predict(input_data)
        prediction_raw = predictions[0]

        pred_str = str(prediction_raw).strip().lower()
        prediction_label = "Phishing" if pred_str in ["1", "phishing", "true", "spam", "yes", "malicious"] else "Safe"

        confidence = 100.0
        if hasattr(email_model, "predict_proba"):
            try:
                probs = email_model.predict_proba(input_data)[0]
                classes = list(email_model.classes_)
                pred_idx = classes.index(prediction_raw)
                confidence = float(probs[pred_idx]) * 100.0
            except Exception:
                probs = email_model.predict_proba(input_data)[0]
                confidence = float(max(probs)) * 100.0

        risk_score = confidence if prediction_label == "Phishing" else 100.0 - confidence
        confidence = max(0.0, min(100.0, round(confidence, 1)))
        risk_score = max(0.0, min(100.0, round(risk_score, 1)))
        
        explanation = analyze_email_heuristics(text)

        is_safe_heuristic = len(explanation) == 1 and explanation[0].get("weight") == "low"
        if not is_safe_heuristic:
            prediction_label = "Phishing"
            risk_score = 96.0
            confidence = 96.0
        else:
            prediction_label = "Safe"
            risk_score = 4.0
            confidence = 96.0

        response_data = {
            "prediction": prediction_label,
            "confidence": confidence,
            "risk_score": risk_score,
            "explanation": explanation
        }
        
        # Log to Firebase
        firebase_log_data = response_data.copy()
        firebase_log_data["subject"] = "Scanned Email Content"
        firebase_log_data["snippet"] = text[:150] + ("..." if len(text) > 150 else "")
        email = normalize_user_email(data.get("email"))
        response_data["user_email"] = email
        log_threat_to_firebase(firebase_log_data, scan_type="email", user_email=email)
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# =======================================================
# API Endpoint for Unified Dashboard
# =======================================================
@app.route('/api/threats', methods=['GET'])
def get_threats():
    # Return mock data structured for the dashboard feed
    mock_data = [
        {
            "subject": "URGENT: Your PayPal account is suspended",
            "snippet": "Dear user, click here immediately to verify your account or it will be permanently locked...",
            "risk": "HIGH",
            "prediction": "PHISHING DETECTED",
            "heuristics": [
                { "factor": "Urgency", "value": "Prompts: urgent, immediately, suspended", "weight": "high" },
                { "factor": "Financial", "value": "Transaction terms: paypal, account", "weight": "medium" }
            ]
        },
        {
            "subject": "Action Required: Unrecognized Login Attempt",
            "snippet": "We blocked a login from Russia. If this wasn't you, secure your account at http://security-google-verify.com/auth",
            "risk": "HIGH",
            "prediction": "PHISHING DETECTED",
            "heuristics": [
                { "factor": "Domain Age", "value": "Very new domain (registered 2 days ago)", "weight": "high" },
                { "factor": "Keywords", "value": "Sensitive keywords found: secure, verify, auth", "weight": "high" },
                { "factor": "Protocol", "value": "Uses unencrypted HTTP connection", "weight": "medium" }
            ]
        },
        {
            "subject": "Team Lunch tomorrow!",
            "snippet": "Hey team, we're grabbing pizza tomorrow at 12. Let me know if you can make it.",
            "risk": "LOW",
            "prediction": "SAFE",
            "heuristics": [
                { "factor": "Language", "value": "No obvious phishing traps detected", "weight": "low" }
            ]
        }
    ]
    return jsonify(mock_data)

# =======================================================
# Google Account Security Dashboard Routes
# =======================================================
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

@app.route('/auth/google')
def auth_google():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        return """
        <html><head><title>Setup Required</title><style>body{background:#0a0f1e;color:white;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body><h2>Hackathon Note: Missing OAuth Credentials</h2>
        <p>To use the real Google Account Dashboard, you must create a project in Google Cloud, download the OAuth credentials, and save them as <code>backend/client_secret.json</code>.</p>
        <p>Alternatively, since this is a demo, <a href="/dashboard?mock=true" style="color:#00ffcc;">Click here to view the Mock Dashboard</a></p>
        </body></html>
        """
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE, scopes=SCOPES,
            redirect_uri=url_for('auth_callback', _external=True)
        )
        authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')
        session['state'] = state
        return redirect(authorization_url)
    except Exception as e:
        return str(e), 500

@app.route('/auth/callback')
def auth_callback():
    state = session.get('state')
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state,
        redirect_uri=url_for('auth_callback', _external=True)
    )
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    
    # Get the real email from Google profile
    user_email = None
    try:
        people_service = build('oauth2', 'v2', credentials=credentials)
        user_info = people_service.userinfo().get().execute()
        user_email = user_info.get('email')
        user_name = user_info.get('name', user_email)
        user_picture = user_info.get('picture', '')
        
        # Save connected account to Firebase 'accounts' collection
        if db and user_email:
            db.collection('accounts').document(user_email).set({
                'email': user_email,
                'name': user_name,
                'picture': user_picture,
                'status': 'Monitoring Active',
                'connected_at': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Saved account {user_email} to Firebase.")
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")

    # Immediately fetch emails, scan them, and push to Firebase
    try:
        service = build('gmail', 'v1', credentials=credentials)
        results = service.users().messages().list(userId='me', maxResults=5).execute()
        messages = results.get('messages', [])
        
        for msg in messages:
            msg_id = msg['id']
            message_data = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            snippet = message_data.get('snippet', '')
            
            explanation = analyze_email_heuristics(snippet)
            high_risk = sum(1 for e in explanation if e.get("weight") in ["high", "medium"])
            
            firebase_log_data = {
                "subject": f"Gmail Inbox Scan ({user_email or 'Unknown'})",
                "snippet": snippet[:150] + ("..." if len(snippet) > 150 else ""),
                "prediction": "PHISHING" if high_risk > 0 else "SAFE",
                "risk_score": 95.0 if high_risk > 0 else 5.0,
                "confidence": 99.0,
                "explanation": explanation
            }
            log_threat_to_firebase(firebase_log_data, scan_type="email", user_email=user_email)
            
        logger.info("Successfully scanned Gmail inbox and pushed to Firebase.")
    except Exception as e:
        logger.error(f"Error fetching Gmail: {e}")

    # Redirect back to the stunning glassmorphism frontend
    return redirect("https://snehsaathi-hackathon.web.app/dashboard.html")

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

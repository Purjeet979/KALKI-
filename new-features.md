# Aegis AI — New Features List

All new features discussed, with what they do, why they matter for the hackathon, and how to build them.

---

## 1. Browser Extension (Manifest V3)
**Priority: Must-have — this is the actual deliverable the problem statement asks for**

- Content script watches the active tab's URL and link hovers
- Calls your existing `/v1/analyze/url` backend in real time
- Popup shows a risk gauge (Safe / Suspicious / High Risk) + explanation
- Optional warning banner injected directly on flagged pages

**Why:** Right now Aegis is backend-only. The problem statement explicitly asks for "a browser extension or web application" — without this, you don't have a submittable deliverable yet.

---

## 2. Local Trained ML Classifier
**Priority: Must-have — this is the literal "ML classifier" requirement**

- Random Forest / Gradient Boosting model, trained offline on PhishTank + OpenPhish (phishing) vs Tranco top-1M (legitimate)
- Features: URL length, subdomain/hyphen count, `@` symbol, IP-as-host, HTTPS presence, domain age, suspicious keywords
- Runs in-process inside FastAPI (no external call, no per-request cost)

**Why:** Your current system is heuristics + an LLM (Gemini) — there's no trained classifier in the technical sense. This closes that gap and also makes the system dramatically cheaper to run at scale.

---

## 3. Domain Age Check (via free RDAP)
**Priority: High — cheap to build, strong signal**

- Query `https://rdap.org/domain/{domain}` — free, no API key, no rate limit
- Extract registration date → compute domain age in days
- Feed into both the heuristic engine and the ML classifier as a feature
- Flag domains younger than ~30-90 days as high risk

**Why:** Domain age is one of the strongest, most-cited phishing signals in the literature, and it's one of the requirement's named "suggested focus areas" (domain age, structural red flags).

---

## 4. Structured, Explainable Risk Score
**Priority: Must-have — explicitly required ("risk score along with a short explanation")**

- Replace free-text Gemini explanations with a structured object:
```json
{
  "risk_score": 82,
  "verdict": "high_risk",
  "signals": [
    { "factor": "Domain age", "value": "3 days", "weight": "high" },
    { "factor": "IP-based URL", "value": true, "weight": "high" },
    { "factor": "HTTPS present", "value": false, "weight": "medium" }
  ]
}
```
- Frontend (extension/dashboard) renders this as a bulleted "why it was flagged" list

**Why:** Judges specifically look for a clear score + explanation. A structured, consistent output looks far more credible than LLM prose.

---

## 5. Threat-Feed Sync Pipeline (Safe Browsing + PhishTank + OpenPhish)
**Priority: High**

- Scheduled job (every 6h) pulls Google Safe Browsing matches + PhishTank/OpenPhish open feeds
- Stores results in your own MongoDB blacklist collection
- Live requests check your own DB, not the external API directly

**Why:** Makes your "known scam domain" database look live and large in a demo, and keeps you within free API quotas since you're not calling external APIs per user request.

---

## 6. Email Authentication Analysis (SPF / DKIM / DMARC)
**Priority: High — turns "email" from a claim into a real capability**

- Accept a raw `.eml` file or pasted header block
- Parse the `Authentication-Results` header locally (no external API needed)
- Flag SPF/DKIM/DMARC failures and sender-domain vs display-name mismatches
- Fold result into the overall risk score

**Why:** Currently Aegis analyzes SMS/text, not email headers specifically — this is a direct, cheap way to make your email-analysis claim literally true.

---

## 7. Google Account Security Dashboard
**Priority: Differentiator — your original idea, expanded**

- OAuth-connect one or more Gmail accounts (readonly scope)
- Auto-scan recent inbox links/attachments through your existing analyzer
- Unified dashboard: threats found, risk trend, top flagged senders — across multiple linked accounts
- **Hackathon note:** keep the OAuth consent screen in **Testing mode** and manually add your own/demo accounts as test users. Full production verification (CASA Tier 2) takes weeks and isn't realistic before a deadline — mention this limitation proactively in your pitch.

**Why:** Nobody else at a typical hackathon will have this. It turns Aegis from "a scanner you paste links into" into "a dashboard that protects your actual inbox."

---

## 8. QR Code (Quishing) Scanner
**Priority: Nice-to-have, cheap to add**

- Decode uploaded/scanned QR images locally using `pyzbar` or `opencv` (fully offline, free)
- Feed the extracted URL into your existing `/v1/analyze/url` pipeline

**Why:** QR-code phishing ("quishing") is a fast-growing, underserved category. Almost no infrastructure needed since you already have the URL analyzer — just add image decoding in front of it.

---

## 9. Pre-Submit OTP / Credential Guard
**Priority: Nice-to-have, strong demo moment**

- Extension detects a password/OTP input field on a page already flagged as high risk
- Blocks form submission with a warning overlay instead of only flagging the page passively

**Why:** Turns Aegis from reactive ("we told you it was bad") into preventive ("we stopped you before you typed your OTP in") — a great live demo beat for judges.

---

## Suggested Build Order (if time-constrained)

1. Browser extension shell + connect to existing backend
2. Structured risk score output (#4) — small backend change, big visual payoff
3. Domain age via RDAP (#3) — ~30 minutes of work
4. Local ML classifier (#2) — the biggest credibility win
5. Email header check (#6)
6. Threat-feed sync pipeline (#5)
7. Google Dashboard (#7), QR scanner (#8), OTP guard (#9) — as time allows, in that order

/**
 * KALKI - Content Script
 * Responsible for injecting the floating security widget in a style-isolated Shadow DOM.
 */

// Global root element for the widget
let widgetRoot = null;

// Initialize content script
function init() {
  // Inject extension detection marker for the website frontend
  const marker = document.createElement("div");
  marker.id = "kalki-extension-installed";
  marker.style.display = "none";
  document.body.appendChild(marker);

  // Query background service worker for any cached scan result for the current page
  chrome.runtime.sendMessage({ action: "get_tab_status" }, (response) => {
    if (response && response.result) {
      displayFloatingWidget(response.result);
    }
  });
}

// Listen for incoming messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "display_widget" && message.result) {
    displayFloatingWidget(message.result);
  }
});

/**
 * Creates or updates the style-isolated floating security widget.
 * @param {object} scanResult 
 */
function displayFloatingWidget(scanResult) {
  // Double-check if the badge is enabled in settings
  chrome.storage.local.get("settings", (data) => {
    const settings = data.settings || {};
    if (settings.enableFloatingBadge === false) {
      removeWidget();
      return;
    }
    
    renderWidgetDOM(scanResult);
  });
}

/**
 * Creates the DOM tree and Shadow Root.
 */
function renderWidgetDOM(scanResult) {
  if (widgetRoot) {
    widgetRoot.remove();
  }

  // Create hosting element
  widgetRoot = document.createElement("div");
  widgetRoot.id = "kalki-floating-widget-root";
  
  // High z-index to stay above elements on the page
  widgetRoot.style.position = "fixed";
  widgetRoot.style.top = "16px";
  widgetRoot.style.right = "16px";
  widgetRoot.style.zIndex = "2147483647";
  widgetRoot.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  
  // Attach Shadow DOM for style isolation
  const shadow = widgetRoot.attachShadow({ mode: "open" });
  
  // Styles for the widget components
  const isPhishing = scanResult.prediction === "Phishing";
  const neonColor = isPhishing ? "#ff0055" : "#00ffcc";
  const glowColor = isPhishing ? "rgba(255, 0, 85, 0.4)" : "rgba(0, 255, 204, 0.4)";
  
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      display: block;
    }
    
    .kalki-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 14px;
      border-radius: 19px;
      background: rgba(10, 15, 30, 0.9);
      border: 1px solid ${neonColor};
      box-shadow: 0 4px 15px ${glowColor};
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      user-select: none;
      box-sizing: border-box;
    }

    .kalki-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px ${glowColor};
    }

    .kalki-icon {
      width: 16px;
      height: 16px;
      fill: ${neonColor};
      animation: pulse 2s infinite ease-in-out;
    }

    /* Expansible Panel */
    .kalki-card {
      position: absolute;
      top: 46px;
      right: 0;
      width: 290px;
      background: rgba(12, 18, 38, 0.95);
      border: 1px solid ${neonColor};
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${glowColor};
      backdrop-filter: blur(12px);
      color: #e0e6ed;
      font-size: 13px;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-sizing: border-box;
    }

    /* Show class triggered via hover */
    .kalki-widget-container:hover .kalki-card {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-title {
      font-weight: 800;
      color: #00f0ff;
      letter-spacing: 1px;
      font-size: 14px;
    }

    .close-btn {
      background: none;
      border: none;
      color: #8892b0;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #ffffff;
    }

    .info-row {
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .label {
      color: #8892b0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      color: #ffffff;
      font-weight: 600;
      word-break: break-all;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      background: ${isPhishing ? "rgba(255, 0, 85, 0.15)" : "rgba(0, 255, 204, 0.15)"};
      color: ${neonColor};
      border: 1px solid ${neonColor};
      margin-top: 2px;
    }

    /* Score Meter Bar */
    .score-container {
      margin: 12px 0;
    }

    .score-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      width: ${scanResult.riskScore}%;
      background: linear-gradient(90deg, #005bbf, ${neonColor});
      border-radius: 3px;
      box-shadow: 0 0 8px ${neonColor};
    }

    /* Explanations */
    .reasons-title {
      font-weight: 700;
      font-size: 11px;
      color: #8892b0;
      text-transform: uppercase;
      margin-top: 12px;
      margin-bottom: 4px;
    }

    .reasons-list {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      line-height: 1.4;
      color: #ccd6f6;
    }

    .reasons-list li {
      margin-bottom: 4px;
    }

    .footer {
      margin-top: 12px;
      text-align: center;
      font-size: 10px;
      color: #4b587c;
      letter-spacing: 0.5px;
    }

    @keyframes pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; filter: drop-shadow(0 0 4px ${neonColor}); }
      100% { opacity: 0.8; }
    }
  `;
  
  shadow.appendChild(style);

  // Container to hold both hover states
  const container = document.createElement("div");
  container.className = "kalki-widget-container";
  container.style.position = "relative";
  
  // Status Pill Badge
  const badge = document.createElement("div");
  badge.className = "kalki-badge";
  
  // Shield SVG Icon
  const shieldSvg = `
    <svg class="kalki-icon" viewBox="0 0 24 24">
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18c3.55.93 6 4.19 6 7.91 0 3.73-2.45 6.98-6 7.91-3.55-.93-6-4.19-6-7.91 0-3.72 2.45-6.98 6-7.91z"/>
    </svg>
  `;
  
  badge.innerHTML = shieldSvg + `<span>${isPhishing ? "PHISHING" : "SAFE"}</span>`;
  container.appendChild(badge);

  // Expanded Dashboard Card
  const card = document.createElement("div");
  card.className = "kalki-card";

  // Build Explanations List
  let explanationsHtml = "";
  if (scanResult.explanation && scanResult.explanation.length > 0) {
    explanationsHtml = `<ul class="reasons-list">`;
    scanResult.explanation.forEach(reason => {
      if (typeof reason === 'object' && reason !== null) {
        explanationsHtml += `<li><span class="status-badge" style="padding: 1px 4px; font-size: 9px; margin-right: 4px; color:#fff; background: ${reason.weight === 'high' ? '#ff0055' : (reason.weight === 'medium' ? '#ffaa00' : '#8892b0')}">${reason.weight}</span> <strong>${reason.factor}:</strong> ${reason.value}</li>`;
      } else {
        explanationsHtml += `<li>${reason}</li>`;
      }
    });
    explanationsHtml += `</ul>`;
  } else {
    explanationsHtml = `<p style="margin: 0; font-style: italic; color: #8892b0; font-size: 11px;">No suspicious markers found.</p>`;
  }

  // Format Scan Date
  const dateStr = formatDate(scanResult.timestamp);

  // Extract base domain
  const rawUrl = scanResult.source;
  let domain = rawUrl;
  try {
    const urlObj = new URL(rawUrl);
    domain = urlObj.hostname;
  } catch(e) {}

  card.innerHTML = `
    <div class="card-header">
      <span class="brand-title">KALKI SECURE</span>
      <button class="close-btn" id="kalki-close-widget">&times;</button>
    </div>
    
    <div class="info-row">
      <div class="label">${scanResult.type === 'email' ? 'Email Text' : 'Website'}</div>
      <div class="value" title="${rawUrl}">${domain}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Analysis Status</div>
      <div>
        <span class="status-badge">${scanResult.prediction.toUpperCase()}</span>
      </div>
    </div>
    
    <div class="score-container">
      <div class="score-meta">
        <span class="label">Threat Score</span>
        <span style="font-weight: 700; color: ${neonColor}">${scanResult.riskScore} / 100</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill"></div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
      <div><span class="label">Confidence</span> <strong style="color: #ffffff;">${scanResult.confidence}%</strong></div>
      <div><span class="label">Scanned</span> <strong style="color: #ffffff;">${dateStr}</strong></div>
    </div>

    <div class="reasons-title">Risk Identifiers</div>
    ${explanationsHtml}
    
    <div class="footer">KALKI CYBER WIDGET • THINK BEFORE YOU CLICK</div>
  `;
  
  container.appendChild(card);
  shadow.appendChild(container);
  document.body.appendChild(widgetRoot);
  
  // Attach event listener to close button
  const closeButton = shadow.getElementById("kalki-close-widget");
  if (closeButton) {
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      removeWidget();
    });
  }

  // Apply OTP / Credential Guard
  applyCredentialGuard(isPhishing);
}

/**
 * Safely removes the widget from DOM.
 */
function removeWidget() {
  if (widgetRoot) {
    widgetRoot.remove();
    widgetRoot = null;
  }
}

// Pre-Submit OTP / Credential Guard
function applyCredentialGuard(isPhishing) {
  if (!isPhishing) return;
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const passwordFields = form.querySelectorAll('input[type="password"]');
      if (passwordFields.length > 0) {
        e.preventDefault();
        alert("🛡️ KALKI SECURITY ALERT 🛡️\n\nThis page has been flagged as a HIGH RISK phishing site.\nSubmission of credentials has been blocked to protect your account.");
      }
    });
  });
}

// Kick off initialization
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}

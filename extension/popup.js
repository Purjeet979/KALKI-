/**
 * KALKI - Popup Dashboard Script
 */

document.addEventListener("DOMContentLoaded", () => {
  // Navigation elements
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const btnSettings = document.getElementById("btn-settings");
  
  // Dashboard elements
  const siteStatus = document.getElementById("site-status");
  const siteDomain = document.getElementById("site-domain");
  const siteUrl = document.getElementById("site-url");
  const siteConfidence = document.getElementById("site-confidence");
  const confidenceBar = document.getElementById("confidence-bar");
  const siteSeverity = document.getElementById("site-severity");
  const siteReasons = document.getElementById("site-reasons");
  const statusGlow = document.getElementById("status-glow");
  
  // Manual Scanner toggle elements
  const btnScanUrlView = document.getElementById("btn-scan-url-view");
  const btnScanEmailView = document.getElementById("btn-scan-email-view");
  const manualUrlFrame = document.getElementById("manual-url-frame");
  const manualEmailFrame = document.getElementById("manual-email-frame");
  
  // Manual Scanner execution elements
  const manualUrlInput = document.getElementById("manual-url-input");
  const btnScanUrl = document.getElementById("btn-scan-url");
  const manualEmailInput = document.getElementById("manual-email-input");
  const btnScanEmail = document.getElementById("btn-scan-email");
  
  // Manual Scanner result elements
  const manualResultCard = document.getElementById("manual-result-card");
  const btnCloseResult = document.getElementById("btn-close-result");
  const manualResultPrediction = document.getElementById("manual-result-prediction");
  const manualResultScore = document.getElementById("manual-result-score");
  const manualResultConfidence = document.getElementById("manual-result-confidence");
  const manualConfidenceBar = document.getElementById("manual-confidence-bar");
  const manualResultReasons = document.getElementById("manual-result-reasons");
  
  // History elements
  const historyListContainer = document.getElementById("history-list-container");
  const btnClearHistoryQuick = document.getElementById("btn-clear-history-quick");

  // Global tracking for tab context
  let currentActiveTabId = null;

  /* =========================================================================
     Tab Switching Logic
     ========================================================================= */
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove active classes
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      
      // Add active state to clicked tab
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
      
      // Trigger updates when entering specific tabs
      if (tabId === "tab-history") {
        renderHistoryList();
      }
    });
  });

  // Settings redirect
  btnSettings.addEventListener("click", () => {
    chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : window.open("settings.html");
  });

  /* =========================================================================
     Active Site Analysis (Dashboard)
     ========================================================================= */
  function initializeDashboard() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const tab = tabs[0];
      currentActiveTabId = tab.id;
      
      // Update basic site labels in UI
      const domainName = getDomain(tab.url);
      siteDomain.textContent = domainName;
      siteUrl.textContent = tab.url;
      siteUrl.title = tab.url;

      // Handle internal protocol domains (chrome://, extension popup files, etc)
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("view-source:")
      ) {
        siteStatus.className = "status-chip safe";
        siteStatus.textContent = "INTERNAL";
        siteSeverity.textContent = "SECURE";
        siteSeverity.style.color = "var(--color-safe)";
        siteConfidence.textContent = "100%";
        confidenceBar.style.width = "100%";
        confidenceBar.style.background = "var(--color-safe)";
        statusGlow.style.background = "var(--color-safe)";
        updateCircularGauge(0, false);
        siteReasons.innerHTML = "<li>System file or internal protocol path. Safe from external network exploits.</li>";
        return;
      }

      // Query background service worker cache for status
      chrome.runtime.sendMessage({ action: "get_tab_status", tabId: tab.id }, (response) => {
        if (response && response.result) {
          renderSiteStatus(response.result);
        } else {
          // If not scanned yet (e.g. auto scan off), trigger active scan request
          triggerActiveTabScan(tab.url);
        }
      });
    });
  }

  function triggerActiveTabScan(url) {
    siteStatus.className = "status-chip loading";
    siteStatus.textContent = "SCANNING...";
    
    chrome.runtime.sendMessage({ action: "scan_url", url: url }, (response) => {
      if (response && response.success) {
        renderSiteStatus(response.result);
      } else {
        // Render offline/error state if connection to Flask API is missing
        siteStatus.className = "status-chip warn";
        siteStatus.textContent = "OFFLINE";
        siteSeverity.textContent = "UNAVAILABLE";
        siteSeverity.style.color = "var(--color-warn)";
        updateCircularGauge(0, false);
        siteReasons.innerHTML = `
          <li style="color: var(--color-warn);">Failed to connect to KALKI Backend Engine.</li>
          <li>Ensure the Flask API server is active locally on port 5000.</li>
        `;
      }
    });
  }

  function renderSiteStatus(scanItem) {
    const isPhishing = scanItem.prediction === "Phishing";
    
    // Status chip color
    siteStatus.className = isPhishing ? "status-chip phishing" : "status-chip safe";
    siteStatus.textContent = scanItem.prediction;
    
    // Glowing gradient line in card top
    statusGlow.style.background = isPhishing ? "var(--color-phish)" : "var(--color-safe)";
    statusGlow.style.boxShadow = isPhishing ? "0 0 10px var(--color-phish)" : "0 0 10px var(--color-safe)";

    // Statistics section
    siteConfidence.textContent = `${scanItem.confidence.toFixed(1)}%`;
    confidenceBar.style.width = `${scanItem.confidence}%`;
    confidenceBar.style.background = isPhishing ? "var(--color-phish)" : "var(--color-safe)";
    
    // Verdict Severity
    if (isPhishing) {
      siteSeverity.textContent = scanItem.riskScore >= 75 ? "CRITICAL THREAT" : "SUSPICIOUS";
      siteSeverity.style.color = "var(--color-phish)";
    } else {
      siteSeverity.textContent = "SECURE";
      siteSeverity.style.color = "var(--color-safe)";
    }

    // Circular Animated Gauge
    updateCircularGauge(scanItem.riskScore, isPhishing);

    // List heuristics explanations
    let reasonsHtml = "";
    if (scanItem.explanation && scanResultHasInsights(scanItem.explanation)) {
      scanItem.explanation.forEach(reason => {
        if (typeof reason === 'object' && reason !== null) {
          reasonsHtml += `<li><span class="status-badge" style="padding: 1px 4px; font-size: 9px; margin-right: 4px; color:#fff; background: ${reason.weight === 'high' ? '#ff0055' : (reason.weight === 'medium' ? '#ffaa00' : '#8892b0')}">${reason.weight}</span> <strong>${reason.factor}:</strong> ${reason.value}</li>`;
        } else {
          reasonsHtml += `<li>${reason}</li>`;
        }
      });
    } else {
      reasonsHtml = "<li>Domain reputation and structural attributes are normal.</li>";
    }
    siteReasons.innerHTML = reasonsHtml;
  }

  function scanResultHasInsights(explanations) {
    if (!explanations || explanations.length === 0) return false;
    // Filter out standard fallback message
    if (explanations.length === 1 && explanations[0].includes("match standard profiles")) return false;
    return true;
  }

  /* =========================================================================
     Gauge Drawing & Value Counter Animation
     ========================================================================= */
  function updateCircularGauge(score, isPhishing) {
    const gaugeFill = document.getElementById("gauge-fill");
    const gaugeText = document.getElementById("gauge-text");
    
    // Max perimeter values for r=40 is 251.2
    const circumference = 251.2;
    const offsetValue = circumference - (circumference * score) / 100;
    
    gaugeFill.style.strokeDashoffset = offsetValue;
    
    if (isPhishing) {
      gaugeFill.style.stroke = "var(--color-phish)";
    } else {
      gaugeFill.style.stroke = "var(--color-safe)";
    }
    
    // Number text animation
    let currentVal = 0;
    const targetVal = Math.round(score);
    const animDuration = 500;
    const intervalMs = Math.max(Math.floor(animDuration / (targetVal || 1)), 8);
    
    if (window.gaugeTimer) {
      clearInterval(window.gaugeTimer);
    }
    
    if (targetVal === 0) {
      gaugeText.textContent = "0";
      return;
    }
    
    window.gaugeTimer = setInterval(() => {
      currentVal++;
      gaugeText.textContent = currentVal;
      if (currentVal >= targetVal) {
        clearInterval(window.gaugeTimer);
        gaugeText.textContent = targetVal;
      }
    }, intervalMs);
  }

  /* =========================================================================
     Manual Scanners (URL and Email tabs toggles)
     ========================================================================= */
  btnScanUrlView.addEventListener("click", () => {
    btnScanUrlView.classList.add("active");
    btnScanEmailView.classList.remove("active");
    manualUrlFrame.classList.add("active");
    manualEmailFrame.classList.remove("active");
    hideManualResult();
  });

  btnScanEmailView.addEventListener("click", () => {
    btnScanEmailView.classList.add("active");
    btnScanUrlView.classList.remove("active");
    manualEmailFrame.classList.add("active");
    manualUrlFrame.classList.remove("active");
    hideManualResult();
  });

  // Action: Scan Manual URL
  btnScanUrl.addEventListener("click", () => {
    let rawUrl = manualUrlInput.value.trim();
    if (!rawUrl) {
      alert("Please paste a valid URL to analyze.");
      return;
    }

    // Prepend protocol if missing
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = "https://" + rawUrl;
    }

    btnScanUrl.classList.add("loading");
    btnScanUrl.disabled = true;
    hideManualResult();

    chrome.runtime.sendMessage({ action: "scan_url", url: rawUrl }, (response) => {
      btnScanUrl.classList.remove("loading");
      btnScanUrl.disabled = false;

      if (response && response.success) {
        displayManualResult(response.result);
      } else {
        alert(response ? response.error : "Failed to scan. Is the Flask API running?");
      }
    });
  });

  // Action: Scan Manual Email
  btnScanEmail.addEventListener("click", () => {
    const rawEmail = manualEmailInput.value.trim();
    if (!rawEmail) {
      alert("Please paste email body text to analyze.");
      return;
    }

    btnScanEmail.classList.add("loading");
    btnScanEmail.disabled = true;
    hideManualResult();

    chrome.runtime.sendMessage({ action: "scan_email", text: rawEmail }, (response) => {
      btnScanEmail.classList.remove("loading");
      btnScanEmail.disabled = false;

      if (response && response.success) {
        displayManualResult(response.result);
      } else {
        alert(response ? response.error : "Failed to scan. Is the Flask API running?");
      }
    });
  });

  function displayManualResult(scanItem) {
    const isPhishing = scanItem.prediction === "Phishing";
    
    // Populate Results drawer UI
    manualResultPrediction.className = isPhishing ? "status-chip phishing" : "status-chip safe";
    manualResultPrediction.textContent = scanItem.prediction;
    
    manualResultScore.textContent = scanItem.riskScore.toFixed(0);
    manualResultScore.style.color = isPhishing ? "var(--color-phish)" : "var(--color-safe)";
    
    manualResultConfidence.textContent = `${scanItem.confidence.toFixed(1)}%`;
    manualConfidenceBar.style.width = `${scanItem.confidence}%`;
    manualConfidenceBar.style.background = isPhishing ? "var(--color-phish)" : "var(--color-safe)";

    let reasonsHtml = "";
    if (scanItem.explanation && scanItem.explanation.length > 0) {
      scanItem.explanation.forEach(reason => {
        if (typeof reason === 'object' && reason !== null) {
          reasonsHtml += `<li><span class="status-badge" style="padding: 1px 4px; font-size: 9px; margin-right: 4px; color:#fff; background: ${reason.weight === 'high' ? '#ff0055' : (reason.weight === 'medium' ? '#ffaa00' : '#8892b0')}">${reason.weight}</span> <strong>${reason.factor}:</strong> ${reason.value}</li>`;
        } else {
          reasonsHtml += `<li>${reason}</li>`;
        }
      });
    } else {
      reasonsHtml = "<li>No active anomalies detected in string.</li>";
    }
    manualResultReasons.innerHTML = reasonsHtml;

    // Reveal Drawer Card
    manualResultCard.style.display = "block";
  }

  function hideManualResult() {
    manualResultCard.style.display = "none";
  }

  btnCloseResult.addEventListener("click", hideManualResult);

  /* =========================================================================
     Scan Logs / History List UI
     ========================================================================= */
  function renderHistoryList() {
    chrome.storage.local.get("scanHistory", (data) => {
      const history = data.scanHistory || [];
      historyListContainer.innerHTML = "";
      
      if (history.length === 0) {
        historyListContainer.innerHTML = `<li class="empty-history">No recent scans recorded.</li>`;
        return;
      }

      history.forEach(item => {
        const isPhishing = item.prediction === "Phishing";
        const dateFormatted = formatDate(item.timestamp);
        const itemTypeLabel = item.type === "url" ? "LINK SCAN" : "EMAIL SCAN";
        const cleanSource = item.type === "url" ? getDomain(item.source) : item.source;
        
        const li = document.createElement("li");
        li.className = "history-item";
        li.innerHTML = `
          <div class="history-item-left">
            <span class="history-source" title="${item.source}">${cleanSource}</span>
            <span class="history-meta">${itemTypeLabel} • ${dateFormatted}</span>
          </div>
          <div class="history-item-right">
            <span class="history-pill ${isPhishing ? "phishing" : "safe"}">${item.prediction}</span>
            <span class="history-score">Score: ${item.riskScore}</span>
          </div>
        `;
        historyListContainer.appendChild(li);
      });
    });
  }

  // Action: Clear Logs from Dashboard tab
  btnClearHistoryQuick.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all scan history logs?")) {
      chrome.storage.local.set({ scanHistory: [] }, () => {
        renderHistoryList();
      });
    }
  });

  // Load dashboard on initialization
  initializeDashboard();
});

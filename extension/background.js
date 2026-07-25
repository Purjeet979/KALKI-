/**
 * KALKI - Background Service Worker (Manifest V3)
 */

// Import shared utilities in background context
importScripts("utils.js");

// Cache for active tabs' scan results to update the badge and popup quickly
const tabScanStates = {};
// Set to track domains we've already notified the user about in this session (avoids notification spam)
const notifiedDomains = new Set();

// Set up extension listeners on installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings in local storage
  getSettings().then((settings) => {
    chrome.storage.local.set({ settings });
  });

  // Create context menus
  chrome.contextMenus.create({
    id: "kalki_scan_url",
    title: "Scan selection as URL with KALKI",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "kalki_scan_email",
    title: "Scan selection as Email text with KALKI",
    contexts: ["selection"]
  });
  
  console.log("KALKI extension initialized successfully.");
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText ? info.selectionText.trim() : "";
  if (!selectedText) return;

  if (info.menuItemId === "kalki_scan_url") {
    // Attempt to format/validate URL
    let targetUrl = selectedText;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    
    performUrlScan(targetUrl, tab ? tab.id : null)
      .then((result) => {
        showContextMenuResult(result);
      })
      .catch((err) => {
        showNotification("Scan Failed", `Error scanning URL: ${err.message}`);
      });
  } else if (info.menuItemId === "kalki_scan_email") {
    performEmailScan(selectedText)
      .then((result) => {
        showContextMenuResult(result);
        
        // Also show the floating widget on the page!
        if (tab && tab.id) {
          getSettings().then((settings) => {
            if (settings.enableFloatingBadge) {
              chrome.tabs.sendMessage(tab.id, {
                action: "display_widget",
                result: result
              }).catch(() => {});
            }
          });
        }
      })
      .catch((err) => {
        showNotification("Scan Failed", `Error scanning Email: ${err.message}`);
      });
  }
});

// Watch for tab URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We only run scans when the page navigation is complete
  if (changeInfo.status === "complete" && tab.url) {
    const url = tab.url;
    
    // Ignore internal pages
    if (
      url.startsWith("chrome://") || 
      url.startsWith("chrome-extension://") || 
      url.startsWith("about:") || 
      url.startsWith("view-source:")
    ) {
      updateBadge(tabId, null);
      return;
    }

    getSettings().then((settings) => {
      if (settings.enableAutoScan) {
        performUrlScan(url, tabId)
          .then((result) => {
            // Send message to the content script of the tab to render the floating badge
            if (settings.enableFloatingBadge) {
              chrome.tabs.sendMessage(tabId, {
                action: "display_widget",
                result: result
              }).catch(() => {
                // Ignore errors from tabs that don't have content script loaded yet
              });
            }
          })
          .catch((err) => {
            console.error("Auto scan URL error:", err);
          });
      }
    });
  }
});

// Keep badge updated when user switches tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  const cachedState = tabScanStates[tabId];
  if (cachedState) {
    updateBadge(tabId, cachedState);
  } else {
    // Clear badge for unscanned / internal pages
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});

// Listen for messages from content scripts, popups, and options pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scan_url") {
    const tabId = sender.tab ? sender.tab.id : null;
    performUrlScan(message.url, tabId)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  } 
  
  else if (message.action === "scan_email") {
    performEmailScan(message.text)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  } 
  
  else if (message.action === "get_tab_status") {
    const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
    sendResponse({ result: tabScanStates[tabId] || null });
  }
  
  else if (message.action === "sync_accounts") {
    chrome.storage.local.set({ activeEmail: message.email }, () => {
      console.log("Synced active email:", message.email);
    });
  }
  
  else if (message.action === "scan_gmail") {
    performEmailScan(message.text)
      .then(result => sendResponse({ result }))
      .catch(err => {
        console.error("Gmail background scan failed:", err);
        sendResponse({ error: err.message });
      });
    return true; // Keep channel open for async response
  }
});

/**
 * Performs a URL phishing scan by contacting the Flask backend.
 */
async function performUrlScan(url, tabId = null) {
  const settings = await getSettings();
  const apiEndpoint = `${settings.backendUrl}/predict-url`;
  
  const storageData = await chrome.storage.local.get("activeEmail");
  const email = storageData.activeEmail || null;

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, email: email })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const result = await response.json();
    
    // Add extra metadata for history log
    const scanItem = {
      type: "url",
      source: url,
      prediction: result.prediction,
      confidence: result.confidence,
      riskScore: result.risk_score,
      explanation: result.explanation,
      user_email: result.user_email || email,
      timestamp: Date.now()
    };

    // Save to history and update cumulative statistics
    await addScanToHistory(scanItem);
    await updateCumulativeStats("url", result.prediction);

    // Cache status in memory for active tabs
    if (tabId) {
      tabScanStates[tabId] = scanItem;
      updateBadge(tabId, scanItem);
    }

    // Handle phishing warnings and desktop alerts
    if (result.prediction === "Phishing") {
      const domain = getDomain(url);
      if (settings.enableNotifications && !notifiedDomains.has(domain)) {
        notifiedDomains.add(domain);
        showNotification(
          "⚠ KALKI Security Alert",
          `Potential phishing website detected: ${domain}.\nAvoid entering passwords or banking details.`
        );
      }
    }

    return scanItem;
  } catch (error) {
    console.error("URL scan failed:", error);
    throw error;
  }
}

/**
 * Performs an email phishing scan by contacting the Flask backend.
 */
async function performEmailScan(text) {
  const settings = await getSettings();
  const apiEndpoint = `${settings.backendUrl}/predict-email`;
  
  const storageData = await chrome.storage.local.get("activeEmail");
  const email = storageData.activeEmail || null;

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, email: email })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const result = await response.json();

    const scanItem = {
      type: "email",
      source: truncateText(text, 60),
      prediction: result.prediction,
      confidence: result.confidence,
      riskScore: result.risk_score,
      explanation: result.explanation,
      user_email: result.user_email || email,
      timestamp: Date.now()
    };

    // Save to history and update cumulative statistics
    await addScanToHistory(scanItem);
    await updateCumulativeStats("email", result.prediction);

    return scanItem;
  } catch (error) {
    console.error("Email scan failed:", error);
    throw error;
  }
}

/**
 * Updates the extension's badge text and color based on scan results.
 */
function updateBadge(tabId, scanItem) {
  if (!tabId) return;

  if (!scanItem) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  const isPhishing = scanItem.prediction === "Phishing";
  const badgeText = isPhishing ? "RISK" : "SAFE";
  const badgeColor = isPhishing ? "#ff0055" : "#00ffcc"; // Neon pinkish red or Neon cyan/green

  chrome.action.setBadgeText({ tabId, text: badgeText });
  chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
}

/**
 * Updates cumulative statistics in local storage.
 */
async function updateCumulativeStats(type, prediction) {
  return new Promise((resolve) => {
    chrome.storage.local.get("cumulativeStats", (data) => {
      const stats = data.cumulativeStats || {
        totalScans: 0,
        urlScans: 0,
        emailScans: 0,
        phishingBlocked: 0,
        safeScans: 0
      };

      stats.totalScans += 1;
      if (type === "url") stats.urlScans += 1;
      if (type === "email") stats.emailScans += 1;

      if (prediction === "Phishing") {
        stats.phishingBlocked += 1;
      } else {
        stats.safeScans += 1;
      }

      chrome.storage.local.set({ cumulativeStats: stats }, () => {
        resolve(stats);
      });
    });
  });
}

/**
 * Displays a Chrome desktop notification.
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: title,
    message: message,
    priority: 2
  });
}

/**
 * Helper to show the scan result of a context menu trigger via Desktop Notifications.
 */
function showContextMenuResult(scanItem) {
  const isPhishing = scanItem.prediction === "Phishing";
  const targetName = scanItem.type === "url" ? "URL Link" : "Email Block";
  const title = isPhishing ? "⚠ KALKI Threat Detected" : "🟢 KALKI Scan Passed";
  const message = `Prediction: ${scanItem.prediction}\nConfidence: ${scanItem.confidence}%\nThreat Score: ${scanItem.riskScore}/100\nType: ${targetName}`;
  showNotification(title, message);
}

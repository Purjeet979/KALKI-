/**
 * KALKI - Shared Utility Functions
 */

// Default configuration settings
const DEFAULT_SETTINGS = {
  enableNotifications: true,
  enableFloatingBadge: true,
  enableAutoScan: true,
  darkTheme: true,
  backendUrl: "https://kalki-j5z4.onrender.com"
};

/**
 * Extracts the base domain name from a full URL.
 * @param {string} urlStr 
 * @returns {string} Domain name (e.g., example.com)
 */
function getDomain(urlStr) {
  try {
    if (!urlStr || urlStr.startsWith("about:") || urlStr.startsWith("chrome:") || urlStr.startsWith("chrome-extension:")) {
      return "Internal Browser Page";
    }
    const url = new URL(urlStr);
    let domain = url.hostname;
    if (domain.startsWith("www.")) {
      domain = domain.substring(4);
    }
    return domain;
  } catch (e) {
    return urlStr || "Unknown Origin";
  }
}

/**
 * Formats a timestamp into a human-readable date string.
 * @param {number|string} timestamp 
 * @returns {string} Formatted date (e.g., "Jul 25, 18:02")
 */
function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    const options = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString(undefined, options);
  } catch (e) {
    return "Just Now";
  }
}

/**
 * Truncates long strings to a specified length and appends an ellipsis.
 * @param {string} text 
 * @param {number} limit 
 * @returns {string} Truncated string
 */
function truncateText(text, limit = 50) {
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "...";
}

/**
 * Retrieves the settings from chrome.storage.local, falling back to defaults if not set.
 * @returns {Promise<object>} Current settings object
 */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get("settings", (data) => {
      if (data && data.settings) {
        let merged = { ...DEFAULT_SETTINGS, ...data.settings };
        if (merged.backendUrl === "http://127.0.0.1:5000" || merged.backendUrl === "http://localhost:5000") {
            merged.backendUrl = "https://kalki-j5z4.onrender.com";
        }
        resolve(merged);
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    });
  });
}

/**
 * Saves settings to chrome.storage.local.
 * @param {object} settings 
 * @returns {Promise<void>}
 */
function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, () => {
      resolve();
    });
  });
}

/**
 * Adds a new scan log item to the scan history in local storage.
 * Keeps only the last 20 scans.
 * @param {object} scanItem { type, source, prediction, confidence, riskScore, timestamp }
 * @returns {Promise<array>} Updated history array
 */
function addScanToHistory(scanItem) {
  return new Promise((resolve) => {
    chrome.storage.local.get("scanHistory", (data) => {
      let history = data.scanHistory || [];
      
      // Add the new item to the beginning of the list
      history.unshift(scanItem);
      
      // Limit list to last 20 scans
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
      
      chrome.storage.local.set({ scanHistory: history }, () => {
        resolve(history);
      });
    });
  });
}

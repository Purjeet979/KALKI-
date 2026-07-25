/**
 * KALKI - Options & Configurations Controller Script
 */

document.addEventListener("DOMContentLoaded", () => {
  // Input fields
  const chkAutoScan = document.getElementById("chk-auto-scan");
  const chkFloatingBadge = document.getElementById("chk-floating-badge");
  const chkNotifications = document.getElementById("chk-notifications");
  const txtBackendUrl = document.getElementById("txt-backend-url");

  // Admin Action Buttons
  const btnExportLogs = document.getElementById("btn-export-logs");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnResetStats = document.getElementById("btn-reset-stats");

  // Telemetry Blocks
  const statTotalScans = document.getElementById("stat-total-scans");
  const statPhishingBlocked = document.getElementById("stat-phishing-blocked");
  const statSafeScans = document.getElementById("stat-safe-scans");
  const statUrlScans = document.getElementById("stat-url-scans");
  const statEmailScans = document.getElementById("stat-email-scans");

  // Toast indicator
  const toast = document.getElementById("settings-toast");

  /* =========================================================================
     Load Settings & Telemetry Stats
     ========================================================================= */
  function loadConfigurations() {
    // 1. Fetch preferences
    getSettings().then((settings) => {
      chkAutoScan.checked = settings.enableAutoScan;
      chkFloatingBadge.checked = settings.enableFloatingBadge;
      chkNotifications.checked = settings.enableNotifications;
      txtBackendUrl.value = settings.backendUrl;
    });

    // 2. Fetch cumulative telemetry stats
    chrome.storage.local.get("cumulativeStats", (data) => {
      const stats = data.cumulativeStats || {
        totalScans: 0,
        urlScans: 0,
        emailScans: 0,
        phishingBlocked: 0,
        safeScans: 0
      };

      statTotalScans.textContent = stats.totalScans;
      statPhishingBlocked.textContent = stats.phishingBlocked;
      statSafeScans.textContent = stats.safeScans;
      statUrlScans.textContent = stats.urlScans;
      statEmailScans.textContent = stats.emailScans;
    });
  }

  /* =========================================================================
     Save Settings handlers
     ========================================================================= */
  function saveCurrentConfig() {
    const updatedSettings = {
      enableAutoScan: chkAutoScan.checked,
      enableFloatingBadge: chkFloatingBadge.checked,
      enableNotifications: chkNotifications.checked,
      backendUrl: txtBackendUrl.value.trim() || "https://kalki-j5z4.onrender.com"
    };

    saveSettings(updatedSettings).then(() => {
      showToast("Configuration Saved Successfully.");
    });
  }

  // Trigger save when checkboxes or inputs are altered
  chkAutoScan.addEventListener("change", saveCurrentConfig);
  chkFloatingBadge.addEventListener("change", saveCurrentConfig);
  chkNotifications.addEventListener("change", saveCurrentConfig);
  txtBackendUrl.addEventListener("blur", saveCurrentConfig); // Saves when cursor focus leaves the input field
  txtBackendUrl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveCurrentConfig();
      txtBackendUrl.blur();
    }
  });

  /* =========================================================================
     Administrative Actions
     ========================================================================= */
  
  // Action: Export scan logs as JSON file
  btnExportLogs.addEventListener("click", () => {
    chrome.storage.local.get("scanHistory", (data) => {
      const history = data.scanHistory || [];
      if (history.length === 0) {
        alert("There are no scan history records to export.");
        return;
      }

      // Format as pretty JSON string
      const fileData = JSON.stringify(history, null, 2);
      const blob = new Blob([fileData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger browser download
      const tempAnchor = document.createElement("a");
      tempAnchor.href = url;
      tempAnchor.download = `kalki_scan_history_export_${Date.now()}.json`;
      document.body.appendChild(tempAnchor);
      tempAnchor.click();
      
      // Cleanup
      document.body.removeChild(tempAnchor);
      URL.revokeObjectURL(url);

      showToast("Scan History Exported Successfully.");
    });
  });

  // Action: Erase scan history array
  btnClearHistory.addEventListener("click", () => {
    if (confirm("Are you sure you want to completely erase the scan logs? This cannot be undone.")) {
      chrome.storage.local.set({ scanHistory: [] }, () => {
        showToast("Scan Log History Cleared.");
      });
    }
  });

  // Action: Reset stats counters
  btnResetStats.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the cumulative threat metrics? Stats will start back at zero.")) {
      const zeroStats = {
        totalScans: 0,
        urlScans: 0,
        emailScans: 0,
        phishingBlocked: 0,
        safeScans: 0
      };
      
      chrome.storage.local.set({ cumulativeStats: zeroStats }, () => {
        loadConfigurations(); // Refresh view elements
        showToast("Telemetry Statistics Reset.");
      });
    }
  });

  /* =========================================================================
     UI Helpers
     ========================================================================= */
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    
    // Clear toast after 2.5 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // Load everything on start
  loadConfigurations();
});

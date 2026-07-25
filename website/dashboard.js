import { db } from "./firebase_config.js";
import {
    collection,
    query,
    orderBy,
    limit,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("auth-modal");
    const btnConnect = document.getElementById("btn-connect");
    const btnCancel = document.getElementById("btn-auth-cancel");
    const btnSubmit = document.getElementById("btn-auth-submit");
    const emailInput = document.getElementById("auth-email");

    const accountList = document.getElementById("account-list");
    const feedList = document.getElementById("feed-list");
    const feedTitle = document.getElementById("feed-title");

    const statScans = document.getElementById("stat-scans");
    const statBlocked = document.getElementById("stat-blocked");
    const statAccounts = document.getElementById("stat-accounts");

    const normalizeEmail = (email) => (email || "").trim().toLowerCase();
    let localAccounts = JSON.parse(localStorage.getItem("kalkiAccounts")) || [];

    if (localAccounts.length === 0) {
        window.location.href = "login.html";
        return;
    }

    let activeProfileEmail = normalizeEmail(localStorage.getItem("kalkiActiveEmail")) || normalizeEmail(localAccounts[0] && localAccounts[0].email);
    let selectedEmailFilter = null;
    let unsubscribeFeed = null;

    function exposeActiveProfileToExtension() {
        if (!activeProfileEmail) return;
        localStorage.setItem("kalkiActiveEmail", activeProfileEmail);
        document.body.setAttribute("data-kalki-account-email", activeProfileEmail);
        window.postMessage({ type: "KALKI_SYNC_ACCOUNTS", email: activeProfileEmail }, window.location.origin);
    }

    exposeActiveProfileToExtension();
    setTimeout(exposeActiveProfileToExtension, 500);

    function subscribeToGlobalStats() {
        const threatsRef = collection(db, "threats");
        onSnapshot(threatsRef, (snapshot) => {
            let total = snapshot.size;
            let blocked = 0;
            snapshot.forEach((docSnap) => {
                const threat = docSnap.data();
                const pred = (threat.prediction || "").toLowerCase();
                if (pred.includes("phishing")) {
                    blocked++;
                }
            });
            if (statScans) statScans.textContent = total;
            if (statBlocked) statBlocked.textContent = blocked;
        });
    }

    function subscribeToAccounts() {
        onSnapshot(collection(db, "accounts"), (snapshot) => {
            accountList.innerHTML = "";
            statAccounts.textContent = snapshot.size;

            const isAllActive = selectedEmailFilter === null;
            accountList.innerHTML += `
                <div class="account-item ${isAllActive ? "active-filter" : ""}" data-email="all" style="cursor:pointer; ${isAllActive ? "border-color: rgba(0, 255, 204, 0.4);" : ""}">
                    <div class="account-icon" style="background:#0a0f1e; display:flex; align-items:center; justify-content:center;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#00ffcc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.25z"/></svg>
                    </div>
                    <div class="account-details">
                        <h4>All Accounts (Combined)</h4>
                        <p>Showing global stream</p>
                    </div>
                </div>
            `;

            snapshot.forEach((docSnap) => {
                const acc = docSnap.data();
                const accountEmail = normalizeEmail(acc.email);
                if (!accountEmail) return;

                const isActive = selectedEmailFilter === accountEmail;
                accountList.innerHTML += `
                    <div class="account-item ${isActive ? "active-filter" : ""}" data-email="${accountEmail}" style="cursor:pointer; ${isActive ? "border-color: rgba(0, 255, 204, 0.4);" : ""}">
                        <div class="account-icon">
                            ${acc.picture
                                ? `<img src="${acc.picture}" style="width:32px;height:32px;border-radius:50%;" />`
                                : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`
                            }
                        </div>
                        <div class="account-details">
                            <h4>${acc.name || accountEmail}</h4>
                            <p>${accountEmail}</p>
                            <p>Status: <span style="color:#00ffcc">Monitoring Active</span></p>
                        </div>
                    </div>
                `;
            });

            document.querySelectorAll(".account-item").forEach((item) => {
                item.addEventListener("click", () => {
                    const email = normalizeEmail(item.getAttribute("data-email"));
                    selectedEmailFilter = email === "all" ? null : email;

                    document.querySelectorAll(".account-item").forEach((el) => {
                        el.classList.remove("active-filter");
                        el.style.borderColor = "";
                    });
                    item.classList.add("active-filter");
                    item.style.borderColor = "rgba(0, 255, 204, 0.4)";

                    if (unsubscribeFeed) {
                        unsubscribeFeed();
                        unsubscribeFeed = null;
                    }
                    subscribeToFirebaseThreats();
                });
            });
        });
    }

    function getThreatEmail(threat) {
        return normalizeEmail(
            threat.user_email ||
            threat.email ||
            threat.account_email ||
            threat.target_email ||
            threat.user
        );
    }

    function renderThreatSnapshot(snapshot) {
        let allThreatsHtml = "";
        let renderedCount = 0;

        snapshot.forEach((docSnap) => {
            const threat = docSnap.data();
            const targetEmail = getThreatEmail(threat);

            if (selectedEmailFilter && targetEmail !== selectedEmailFilter) {
                return;
            }

            renderedCount++;
            const prediction = threat.prediction || "UNKNOWN";
            const isPhishing = prediction.includes("PHISHING") || prediction.includes("Phishing");

            let badgesHtml = "";
            if (Array.isArray(threat.heuristics)) {
                threat.heuristics.forEach((h) => {
                    const weightClass = h.weight || "low";
                    badgesHtml += `<span class="heuristic-badge ${weightClass}">[${weightClass.toUpperCase()}] ${h.factor}: ${h.value}</span>`;
                });
            }

            allThreatsHtml += `
                <div class="threat-item ${isPhishing ? "" : "safe"}">
                    <div class="threat-top">
                        <span><strong>Target:</strong> ${targetEmail || "Global Stream"}</span>
                        <span style="color:#00ffcc; font-weight:bold;">LIVE (Firebase)</span>
                    </div>
                    <div class="threat-title">${threat.subject || "Scanned URL"}</div>
                    <div class="threat-snippet">"${threat.snippet || ""}"</div>
                    <div style="margin-bottom: 12px; font-weight:700; font-size:12px; color: ${isPhishing ? "#ff0055" : "#00ffcc"}">
                        STATUS: ${prediction} (Risk Score: ${threat.risk_score || 0}%)
                    </div>
                    <div class="heuristics-list">
                        ${badgesHtml}
                    </div>
                </div>
            `;
        });

        if (renderedCount === 0) {
            feedList.innerHTML = `<div style="text-align:center; padding: 40px; color: #8892b0;">No threats logged yet for ${selectedEmailFilter || "any account"}. Scan a URL!</div>`;
        } else {
            feedList.innerHTML = allThreatsHtml;
        }
    }

    function subscribeToFirebaseThreats() {
        if (feedTitle) {
            feedTitle.textContent = selectedEmailFilter ? `Threat Feed: ${selectedEmailFilter}` : "Combined Threat Feed";
        }
        feedList.innerHTML = `<div style="text-align:center; padding: 20px; color: #00ffcc;">Syncing with KALKI Firebase Core...</div>`;

        const threatsRef = collection(db, "threats");
        const threatQuery = selectedEmailFilter
            ? query(threatsRef, where("user_email", "==", selectedEmailFilter), orderBy("timestamp", "desc"), limit(25))
            : query(threatsRef, orderBy("timestamp", "desc"), limit(25));

        unsubscribeFeed = onSnapshot(threatQuery, renderThreatSnapshot, (error) => {
            console.error("Firebase filtered query failed, falling back to client filter:", error);
            const fallbackQuery = query(threatsRef, orderBy("timestamp", "desc"), limit(100));
            unsubscribeFeed = onSnapshot(fallbackQuery, renderThreatSnapshot);
        });
    }

    function renderDashboard() {
        subscribeToAccounts();
        subscribeToGlobalStats();
        if (!unsubscribeFeed) {
            subscribeToFirebaseThreats();
        }
    }

    btnConnect.addEventListener("click", () => {
        modal.style.display = "flex";
        emailInput.value = "";
        emailInput.focus();
    });

    btnCancel.addEventListener("click", () => {
        modal.style.display = "none";
    });

    btnSubmit.addEventListener("click", () => {
        const email = normalizeEmail(emailInput.value);
        if (!email || !email.includes("@")) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!localAccounts.find((account) => normalizeEmail(account.email) === email)) {
            localAccounts.push({ email });
            localStorage.setItem("kalkiAccounts", JSON.stringify(localAccounts));
        }

        activeProfileEmail = email;
        localStorage.setItem("kalkiActiveEmail", activeProfileEmail);
        exposeActiveProfileToExtension();

        window.open("http://localhost:5000/auth/google", "_blank");
        modal.style.display = "none";
    });

    // Theme Toggle Functionality
    const themeToggle = document.getElementById("theme-toggle");
    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");

    if (themeToggle) {
        const updateIcons = (theme) => {
            if (theme === "light") {
                if (sunIcon) sunIcon.style.display = "block";
                if (moonIcon) moonIcon.style.display = "none";
            } else {
                if (sunIcon) sunIcon.style.display = "none";
                if (moonIcon) moonIcon.style.display = "block";
            }
        };

        // Initialize icons based on current theme
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        updateIcons(currentTheme);

        themeToggle.addEventListener("click", () => {
            const activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = activeTheme === "dark" ? "light" : "dark";
            
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("kalkiTheme", newTheme);
            updateIcons(newTheme);
        });
    }

    // Initial render
    renderDashboard();
});

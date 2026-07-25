import { db } from "./firebase_config.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("auth-modal");
    const btnConnect = document.getElementById("btn-connect");
    const btnCancel = document.getElementById("btn-auth-cancel");
    const btnSubmit = document.getElementById("btn-auth-submit");
    const emailInput = document.getElementById("auth-email");
    
    const accountList = document.getElementById("account-list");
    const feedList = document.getElementById("feed-list");
    
    const statScans = document.getElementById("stat-scans");
    const statBlocked = document.getElementById("stat-blocked");
    const statAccounts = document.getElementById("stat-accounts");

    // State management
    let accounts = JSON.parse(localStorage.getItem("kalkiAccounts")) || [];
    
    // Auth Gate: Redirect to login if no accounts exist
    if (accounts.length === 0) {
        window.location.href = "login.html";
        return;
    }

    let stats = JSON.parse(localStorage.getItem("kalkiStats")) || { scans: 432, blocked: 89 };

    let unsubscribeFeed = null;
    
    function subscribeToFirebaseThreats() {
        if (accounts.length === 0) return;
        
        feedList.innerHTML = `<div style="text-align:center; padding: 20px; color: #00ffcc;">Syncing with KALKI Firebase Core...</div>`;
        
        const q = query(collection(db, "threats"), orderBy("timestamp", "desc"), limit(25));
        
        unsubscribeFeed = onSnapshot(q, (snapshot) => {
            let allThreatsHtml = "";
            
            if (snapshot.empty) {
                feedList.innerHTML = `<div style="text-align:center; padding: 40px; color: #8892b0;">No threats logged yet in Firebase. Scan a URL with the KALKI Extension!</div>`;
                return;
            }
            
            snapshot.forEach((doc) => {
                const threat = doc.data();
                const isPhishing = threat.prediction.includes("PHISHING") || threat.prediction.includes("Phishing");
                
                let badgesHtml = "";
                if (threat.heuristics) {
                    threat.heuristics.forEach(h => {
                        const weightClass = h.weight; 
                        badgesHtml += `<span class="heuristic-badge ${weightClass}">[${h.weight.toUpperCase()}] ${h.factor}: ${h.value}</span>`;
                    });
                }
                
                allThreatsHtml += `
                    <div class="threat-item ${isPhishing ? '' : 'safe'}">
                        <div class="threat-top">
                            <span><strong>Target:</strong> Global Stream</span>
                            <span style="color:#00ffcc; font-weight:bold;">● LIVE (Firebase)</span>
                        </div>
                        <div class="threat-title">${threat.subject}</div>
                        <div class="threat-snippet">"${threat.snippet}"</div>
                        <div style="margin-bottom: 12px; font-weight:700; font-size:12px; color: ${isPhishing ? '#ff0055' : '#00ffcc'}">
                            STATUS: ${threat.prediction} (Risk Score: ${threat.risk_score}%)
                        </div>
                        <div class="heuristics-list">
                            ${badgesHtml}
                        </div>
                    </div>
                `;
            });
            feedList.innerHTML = allThreatsHtml;
        }, (error) => {
            console.error("Firebase listen error:", error);
            feedList.innerHTML = `<div style="text-align:center; padding: 40px; color: #ff0055;">Database Error: ${error.message}</div>`;
        });
    }

    async function renderDashboard() {
        // Update Stats
        statAccounts.textContent = accounts.length;
        statScans.textContent = stats.scans;
        statBlocked.textContent = stats.blocked;

        // Render Accounts
        accountList.innerHTML = "";
        accounts.forEach(acc => {
            accountList.innerHTML += `
                <div class="account-item">
                    <div class="account-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </div>
                    <div class="account-details">
                        <h4>${acc.email}</h4>
                        <p>Status: <span style="color:#00ffcc">Monitoring Active</span></p>
                    </div>
                </div>
            `;
        });

        // Render Feed
        if (accounts.length === 0) {
            feedList.innerHTML = `<div style="text-align:center; padding: 40px; color: #8892b0;">No accounts linked yet. Connect your Gmail to start scanning.</div>`;
            return;
        }

        feedList.innerHTML = `<div style="text-align:center; padding: 20px; color: #00ffcc;">Syncing with KALKI AI Core...</div>`;
        
        // Start live Firebase listener
        if (!unsubscribeFeed) {
            subscribeToFirebaseThreats();
        }
    }

    // Modal logic
    btnConnect.addEventListener("click", () => {
        modal.style.display = "flex";
        emailInput.value = "";
        emailInput.focus();
    });

    btnCancel.addEventListener("click", () => {
        modal.style.display = "none";
    });

    btnSubmit.addEventListener("click", () => {
        const email = emailInput.value.trim();
        if (!email || !email.includes("@")) {
            alert("Please enter a valid email address.");
            return;
        }

        // Simulate OAuth processing delay
        btnSubmit.textContent = "Authenticating with Google...";
        btnSubmit.style.opacity = "0.7";
        
        setTimeout(() => {
            // Add account
            accounts.push({ email: email });
            stats.scans += 145; // simulate historical scan bump
            stats.blocked += 12; // simulate historically blocked threats bump
            
            localStorage.setItem("kalkiAccounts", JSON.stringify(accounts));
            localStorage.setItem("kalkiStats", JSON.stringify(stats));
            
            modal.style.display = "none";
            btnSubmit.textContent = "Authorize via Google OAuth";
            btnSubmit.style.opacity = "1";
            
            renderDashboard();
        }, 1200);
    });

    // Initial render
    renderDashboard();
});

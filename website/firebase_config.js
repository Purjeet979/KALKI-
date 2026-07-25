// KALKI Firebase Configuration
// Saved for post-hackathon implementation

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvu7vArO7S8hUrr4V9VUxJ1n692U3HfX4",
  authDomain: "snehsaathi-hackathon.firebaseapp.com",
  projectId: "snehsaathi-hackathon",
  storageBucket: "snehsaathi-hackathon.firebasestorage.app",
  messagingSenderId: "22059620360",
  appId: "1:22059620360:web:8375621b9b4a0fc1cc19bd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

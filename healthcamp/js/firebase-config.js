// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyD1VBPr1Kz5hIQthvIKsreIfG36tsJK2Cc",
  authDomain: "healthcamp-12082003.firebaseapp.com",
  projectId: "healthcamp-12082003",
  storageBucket: "healthcamp-12082003.appspot.com",
  messagingSenderId: "658782433182",
  appId: "1:658782433182:web:22d8bdb7a5060755ca708f",
  measurementId: "G-1Y1C3K4M2N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

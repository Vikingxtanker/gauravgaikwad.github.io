// Import Firebase scripts in your HTML first
// Example in register.html:
/*
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
*/

const firebaseConfig = {
    apiKey: "AIzaSyD1VBPr1Kz5hIQthvIKsreIfG36tsJK2Cc",
    authDomain: "healthcamp-12082003.firebaseapp.com",
    projectId: "healthcamp-12082003",
    storageBucket: "healthcamp-12082003.firebasestorage.app",
    messagingSenderId: "658782433182",
    appId: "1:658782433182:web:22d8bdb7a5060755ca708f",
    measurementId: "G-1Y1C3K4M2N"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

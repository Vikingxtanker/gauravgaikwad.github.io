// js/register.js
// Module script. Uses modular Firestore functions and reads currentUser from localStorage
// so behavior matches station.html's auth check (shows SweetAlert, then redirects).

import { db } from "./firebase-config.js"; // your modular firebase-config.js must export { db }
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const formContainer = document.querySelector(".form-container");
  const form = document.getElementById("registrationForm");
  const clearBtn = document.getElementById("clearAllBtn");

  const dobInput = document.getElementById("dob");
  const ageInput = document.getElementById("age");
  const heightInput = document.getElementById("height");
  const weightInput = document.getElementById("weight");
  const bmiInput = document.getElementById("bmi");
  const allergySelect = document.getElementById("allergy");
  const allergyDetail = document.getElementById("allergyDetail");
  const allergyLabel = document.querySelector("label[for='allergyDetail']");

  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");

  // Hide form by default; we'll show after role check
  formContainer.style.display = "none";

  // ---------- AUTH CHECK (same approach as station.html) ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "registration")) {
    // Show popup then redirect
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in to access this page.",
      confirmButtonText: "OK"
    }).then(() => {
      window.location.href = "health-screening.html";
    });
    return;
  }

  // User allowed — show navbar info and form
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };

  formContainer.style.display = "block";

  // ---------- Age calculation ----------
  dobInput.addEventListener("change", () => {
    const d = new Date(dobInput.value);
    const now = new Date();
    if (isNaN(d)) {
      ageInput.value = "";
      return;
    }
    let yrs = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) yrs--;
    ageInput.value = yrs >= 0 ? yrs : "";
  });

  // ---------- BMI calculation ----------
  function calculateBMI() {
    const h = parseFloat(heightInput.value);
    const w = parseFloat(weightInput.value);
    if (h > 0 && w > 0) {
      const bmi = w / ((h / 100) ** 2);
      bmiInput.value = bmi.toFixed(1);
    } else {
      bmiInput.value = "";
    }
  }
  heightInput.addEventListener("input", calculateBMI);
  weightInput.addEventListener("input", calculateBMI);

  // ---------- Allergy toggle ----------
  allergySelect.addEventListener("change", () => {
    if (allergySelect.value === "Yes") {
      allergyDetail.style.display = "block";
      allergyLabel.style.display = "block";
      allergyDetail.required = true;
    } else {
      allergyDetail.style.display = "none";
      allergyLabel.style.display = "none";
      allergyDetail.required = false;
      allergyDetail.value = "";
    }
  });

  // ---------- Clear form ----------
  clearBtn.addEventListener("click", () => {
    form.reset();
    ageInput.value = "";
    bmiInput.value = "";
    allergyDetail.style.display = "none";
    allergyLabel.style.display = "none";
  });

  // ---------- Submit handler ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect values
    const name = document.getElementById("name").value.trim();
    const dob = dobInput.value;
    const age = ageInput.value;
    const gender = document.getElementById("gender").value;
    const height = document.getElementById("height").value;
    const weight = document.getElementById("weight").value;
    const bmi = bmiInput.value;
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const tobacco = document.getElementById("tobacco").value;
    const smoking = document.getElementById("smoking").value;
    const alcohol = document.getElementById("alcohol").value;
    const married = document.getElementById("married").value;
    const allergy = allergySelect.value;
    const allergyDetails = allergyDetail.value.trim();
    const pastMedical = document.getElementById("pastMedical").value.trim();
    const pastMedication = document.getElementById("pastMedication").value.trim();

    // Validate phone (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      Swal.fire({ icon: "error", title: "Invalid Phone", text: "Phone number must be 10 digits" });
      return;
    }

    // Patient ID: first 3 letters (no spaces) + 3 random digits
    const firstThree = name.toLowerCase().replace(/\s+/g, "").slice(0, 3) || "unk";
    let randomDigits = Math.floor(100 + Math.random() * 900);
    let patientId = firstThree + randomDigits;

    try {
      // Ensure patientId not colliding (try up to 5 times)
      let tries = 0;
      while (tries < 5) {
        const existing = await getDoc(doc(db, "patients", patientId));
        if (!existing.exists()) break;
        randomDigits = Math.floor(100 + Math.random() * 900);
        patientId = firstThree + randomDigits;
        tries++;
      }

      // Save patient data
      await setDoc(doc(db, "patients", patientId), {
        name,
        dob,
        age,
        gender,
        height,
        weight,
        bmi,
        phone,
        address,
        tobacco,
        smoking,
        alcohol,
        married,
        allergy,
        allergyDetails,
        pastMedical,
        pastMedication,
        timestamp: serverTimestamp()
      });

      await Swal.fire({
        icon: "success",
        title: "Registered successfully!",
        text: `Patient ID: ${patientId}`,
        confirmButtonColor: "#3085d6"
      });

      // Reset form
      form.reset();
      ageInput.value = "";
      bmiInput.value = "";
      allergyDetail.style.display = "none";
      allergyLabel.style.display = "none";

    } catch (error) {
      console.error("❌ Firebase error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: "An error occurred. Please try again."
      });
    }
  });
});

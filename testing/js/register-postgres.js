// js/register-postgrest.js
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "https://postgrest-latest-iplb.onrender.com/patients";

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

  formContainer.style.display = "none";

  // ---------- AUTH CHECK ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "registration")) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in to access this page.",
    }).then(() => (window.location.href = "health-screening.html"));
    return;
  }

  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };

  formContainer.style.display = "block";

  // ---------- Helpers ----------
  dobInput.addEventListener("change", () => {
    const d = new Date(dobInput.value);
    const now = new Date();
    if (isNaN(d)) return (ageInput.value = "");
    let yrs = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) yrs--;
    ageInput.value = yrs >= 0 ? yrs : "";
  });

  function calculateBMI() {
    const h = parseFloat(heightInput.value);
    const w = parseFloat(weightInput.value);
    bmiInput.value = h > 0 && w > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : "";
  }
  heightInput.addEventListener("input", calculateBMI);
  weightInput.addEventListener("input", calculateBMI);

  allergySelect.addEventListener("change", () => {
    const yes = allergySelect.value === "Yes";
    allergyDetail.style.display = yes ? "block" : "none";
    allergyLabel.style.display = yes ? "block" : "none";
    allergyDetail.required = yes;
    if (!yes) allergyDetail.value = "";
  });

  clearBtn.addEventListener("click", () => {
    form.reset();
    ageInput.value = "";
    bmiInput.value = "";
    allergyDetail.style.display = "none";
    allergyLabel.style.display = "none";
  });

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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

    if (!/^\d{10}$/.test(phone)) {
      return Swal.fire({ icon: "error", title: "Invalid Phone", text: "Phone number must be 10 digits" });
    }

    // Create Patient ID
    const patientId = name.toLowerCase().replace(/\s+/g, "").slice(0, 3) + Math.floor(100 + Math.random() * 900);

    const payload = [{
      id: patientId,
      name,
      dob,
      age: age ? parseInt(age) : null,
      gender,
      phone,
      address,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      bmi: bmi ? parseFloat(bmi) : null,
      tobacco,
      smoking,
      alcohol,
      married,
      allergy,
      allergy_details: allergyDetails,
      past_medical: pastMedical,
      past_medication: pastMedication,
      created_at: new Date().toISOString()
    }];

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      await Swal.fire({
        icon: "success",
        title: "Registered successfully!",
        text: `Patient ID: ${patientId}`,
        confirmButtonColor: "#3085d6"
      });

      form.reset();
      ageInput.value = "";
      bmiInput.value = "";
      allergyDetail.style.display = "none";
      allergyLabel.style.display = "none";

    } catch (err) {
      console.error("❌ Error:", err);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: "An error occurred while submitting data. Please try again."
      });
    }
  });
});

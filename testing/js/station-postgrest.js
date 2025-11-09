// js/station-postgrest.js
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// ---------- LOGIN CHECK ----------
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "station")) {
  Swal.fire({
    icon: "error",
    title: "Access Denied",
    text: "You must be logged in to access this page.",
    confirmButtonText: "OK"
  }).then(() => window.location.href = "health-screening.html");
}

// Navbar setup
const loggedInfo = document.getElementById("loggedInfo");
const authBtn = document.getElementById("authBtn");
if (currentUser) {
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };
} else {
  loggedInfo.textContent = "";
  authBtn.textContent = "Login";
}

// ---------- ELEMENTS ----------
const verifyForm = document.getElementById("verifyForm");
const patientIDInput = document.getElementById("patientID");
const stationSection = document.getElementById("stationSection");
const patientName = document.getElementById("patientName");
const patientAge = document.getElementById("patientAge");
const patientGender = document.getElementById("patientGender");
const stationSelect = document.getElementById("stationSelect");

const changePatientBtn = document.createElement("button");
const verifyContainer = verifyForm.parentElement;
changePatientBtn.textContent = "Change Patient";
changePatientBtn.className = "btn btn-secondary my-3";
changePatientBtn.style.display = "none";
changePatientBtn.onclick = () => location.reload();
verifyContainer.appendChild(changePatientBtn);

const sections = {
  hb: document.getElementById("hbFormSection"),
  rbg: document.getElementById("rbgFormSection"),
  fev: document.getElementById("fevFormSection"),
  bp: document.getElementById("bpFormSection"),
  counseling: document.getElementById("counselingFormSection")
};

let currentPatient = null;

// ---------- VERIFY PATIENT ----------
verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = patientIDInput.value.trim();
  if (!id) return;

  try {
    const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`, {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (data.length === 0) {
      Swal.fire("Invalid ID", "No patient found with this ID.", "error");
      return;
    }

    currentPatient = data[0];
    patientName.textContent = currentPatient.name || "N/A";
    patientAge.textContent = currentPatient.age || "N/A";
    patientGender.textContent = currentPatient.gender || "N/A";

    await Swal.fire("Patient Verified", "Patient ID is valid.", "success");
    stationSection.style.display = "block";
    verifyForm.style.display = "none";
    changePatientBtn.style.display = "inline-block";
  } catch (err) {
    console.error("Verification error:", err);
    Swal.fire("Error", "Something went wrong verifying the patient.", "error");
  }
});

// ---------- STATION SELECT ----------
stationSelect.addEventListener("change", () => {
  const selected = stationSelect.value;
  Object.values(sections).forEach(s => s.style.display = "none");
  if (!selected || !currentPatient) return;

  sections[selected].style.display = "block";

  if (selected === "hb" && currentPatient.hemoglobin != null)
    document.getElementById("hemoglobin").value = currentPatient.hemoglobin;
  if (selected === "rbg" && currentPatient.rbg != null)
    document.getElementById("rbg").value = currentPatient.rbg;
  if (selected === "fev" && currentPatient.fev != null)
    document.getElementById("fev").value = currentPatient.fev;
  if (selected === "bp" && currentPatient.systolic != null)
    document.getElementById("systolic").value = currentPatient.systolic,
    document.getElementById("diastolic").value = currentPatient.diastolic;
  if (selected === "counseling" && currentPatient.counseling_points != null)
    document.getElementById("counselingPoints").value = currentPatient.counseling_points;
});

// ---------- UPDATE FIELD ----------
async function updatePatientField(id, payload, successMsg, errorMsg) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const updated = await res.json();
    currentPatient = updated[0];
    Swal.fire("Success", successMsg, "success");
  } catch (err) {
    console.error("Update error:", err);
    Swal.fire("Error", errorMsg, "error");
  }
}

// ---------- FORM HANDLERS ----------
document.getElementById("hbForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("hemoglobin").value);
  updatePatientField(currentPatient.id, { hemoglobin: val }, "Hemoglobin saved!", "Failed to save Hemoglobin.");
});

document.getElementById("rbgForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("rbg").value);
  updatePatientField(currentPatient.id, { rbg: val }, "RBG saved!", "Failed to save RBG.");
});

document.getElementById("fevForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("fev").value);
  updatePatientField(currentPatient.id, { fev: val }, "FEV saved!", "Failed to save FEV.");
});

document.getElementById("bpForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const sys = parseInt(document.getElementById("systolic").value);
  const dia = parseInt(document.getElementById("diastolic").value);
  updatePatientField(currentPatient.id, { systolic: sys, diastolic: dia }, "Blood Pressure saved!", "Failed to save BP.");
});

document.getElementById("counselingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("counselingPoints").value.trim();
  updatePatientField(currentPatient.id, { counseling_points: text }, "Counseling saved!", "Failed to save counseling points.");
});

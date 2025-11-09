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

// ---------- NAVBAR DISPLAY ----------
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
      headers: { Accept: "application/json" }
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

    loadTestHistory(); // Load all previous test records
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
});

// ---------- SAVE NEW TEST ENTRY ----------
async function saveTestEntry(payload, successMsg) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Server response:", errData);
      throw new Error(`Server error ${res.status}`);
    }

    await res.json();
    Swal.fire("Success", successMsg, "success");
    loadTestHistory(); // Refresh history table
  } catch (err) {
    console.error("Error saving test entry:", err);
    Swal.fire("Error", "Failed to save test entry.", "error");
  }
}

// ---------- FORM HANDLERS ----------
document.getElementById("hbForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("hemoglobin").value);
  const payload = { patient_id: currentPatient.id, hemoglobin: val };
  saveTestEntry(payload, "Hemoglobin test saved!");
  e.target.reset();
});

document.getElementById("rbgForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseInt(document.getElementById("rbg").value);
  const payload = { patient_id: currentPatient.id, rbg: val };
  saveTestEntry(payload, "RBG test saved!");
  e.target.reset();
});

document.getElementById("fevForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("fev").value);
  const payload = { patient_id: currentPatient.id, fev: val };
  saveTestEntry(payload, "FEV test saved!");
  e.target.reset();
});

document.getElementById("bpForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const sys = parseInt(document.getElementById("systolic").value);
  const dia = parseInt(document.getElementById("diastolic").value);
  const payload = { patient_id: currentPatient.id, systolic: sys, diastolic: dia };
  saveTestEntry(payload, "Blood Pressure test saved!");
  e.target.reset();
});

document.getElementById("counselingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("counselingPoints").value.trim();
  const payload = { patient_id: currentPatient.id, counseling_points: text };
  saveTestEntry(payload, "Counseling saved!");
  e.target.reset();
});

// ---------- LOAD TEST HISTORY ----------
async function loadTestHistory() {
  let historyTable = document.getElementById("testHistoryTable");
  if (!historyTable) {
    // Create table dynamically if it doesn't exist
    historyTable = document.createElement("table");
    historyTable.id = "testHistoryTable";
    historyTable.className = "table table-bordered mt-4";
    historyTable.innerHTML = `
      <thead>
        <tr>
          <th>Date/Time</th>
          <th>Test</th>
          <th>Result</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody id="testHistoryBody"></tbody>
    `;
    stationSection.appendChild(historyTable);
  }

  const historyBody = document.getElementById("testHistoryBody");
  historyBody.innerHTML = "";

  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${currentPatient.id}&order=created_at.desc`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const tests = await res.json();

    if (tests.length === 0) {
      historyBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No test records found</td></tr>`;
      return;
    }

    tests.forEach(t => {
      const date = new Date(t.created_at).toLocaleString();

      if (t.hemoglobin)
        addRow(date, "Hemoglobin", t.hemoglobin, "g/dL");
      if (t.rbg)
        addRow(date, "Random Blood Glucose", t.rbg, "mg/dL");
      if (t.fev)
        addRow(date, "FEV", t.fev, "L");
      if (t.systolic && t.diastolic)
        addRow(date, "Blood Pressure", `${t.systolic}/${t.diastolic}`, "mmHg");
      if (t.counseling_points)
        addRow(date, "Counseling", t.counseling_points, "-");
    });

    function addRow(date, test, value, unit) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${date}</td><td>${test}</td><td>${value}</td><td>${unit}</td>`;
      historyBody.appendChild(row);
    }
  } catch (err) {
    console.error("Error loading test history:", err);
  }
}

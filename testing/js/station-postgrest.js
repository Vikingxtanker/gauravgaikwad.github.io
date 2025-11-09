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

// ---------- NAVBAR SETUP ----------
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
const testHistorySection = document.getElementById("testHistorySection");
const testHistoryBody = document.getElementById("testHistoryBody");
const patientName = document.getElementById("patientName");
const patientAge = document.getElementById("patientAge");
const patientGender = document.getElementById("patientGender");
const stationSelect = document.getElementById("stationSelect");

const changePatientBtn = document.createElement("button");
changePatientBtn.textContent = "Change Patient";
changePatientBtn.className = "btn btn-secondary my-3";
changePatientBtn.style.display = "none";
changePatientBtn.onclick = () => location.reload();
verifyForm.parentElement.appendChild(changePatientBtn);

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

    // ✅ Load previous tests
    loadTestHistory(currentPatient.id);
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

// ---------- LOAD TEST HISTORY ----------
async function loadTestHistory(patientId) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${patientId}&order=recorded_at.desc`, {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const tests = await res.json();

    if (tests.length === 0) {
      testHistoryBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No test records found.</td></tr>`;
    } else {
      testHistoryBody.innerHTML = "";
      tests.forEach(t => {
        const tr = document.createElement("tr");
        const date = new Date(t.recorded_at).toLocaleString("en-GB");
        tr.innerHTML = `
          <td>${date}</td>
          <td>${t.test_type || "N/A"}</td>
          <td>${t.hemoglobin ?? ""}</td>
          <td>${t.rbg ?? ""}</td>
          <td>${t.fev ?? ""}</td>
          <td>${t.systolic && t.diastolic ? `${t.systolic}/${t.diastolic}` : ""}</td>
          <td>${t.counseling_points ?? ""}</td>
        `;
        testHistoryBody.appendChild(tr);
      });
    }

    testHistorySection.style.display = "block";
  } catch (err) {
    console.error("Error loading test history:", err);
    Swal.fire("Error", "Failed to load patient test history.", "error");
  }
}

// ---------- ADD NEW TEST ENTRY ----------
async function addTestEntry(payload, successMsg, errorMsg) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    Swal.fire("Success", successMsg, "success");
    loadTestHistory(currentPatient.id); // ✅ Refresh table instantly
  } catch (err) {
    console.error("Insert error:", err);
    Swal.fire("Error", errorMsg, "error");
  }
}

// ---------- FORM HANDLERS ----------
document.getElementById("hbForm").addEventListener("submit", e => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("hemoglobin").value);
  addTestEntry(
    { patient_id: currentPatient.id, hemoglobin: val, test_type: "hemoglobin", recorded_at: new Date().toISOString() },
    "Hemoglobin record saved!", "Failed to save Hemoglobin."
  );
});

document.getElementById("rbgForm").addEventListener("submit", e => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("rbg").value);
  addTestEntry(
    { patient_id: currentPatient.id, rbg: val, test_type: "rbg", recorded_at: new Date().toISOString() },
    "RBG record saved!", "Failed to save RBG."
  );
});

document.getElementById("fevForm").addEventListener("submit", e => {
  e.preventDefault();
  const val = parseFloat(document.getElementById("fev").value);
  addTestEntry(
    { patient_id: currentPatient.id, fev: val, test_type: "fev", recorded_at: new Date().toISOString() },
    "FEV record saved!", "Failed to save FEV."
  );
});

document.getElementById("bpForm").addEventListener("submit", e => {
  e.preventDefault();
  const sys = parseInt(document.getElementById("systolic").value);
  const dia = parseInt(document.getElementById("diastolic").value);
  addTestEntry(
    { patient_id: currentPatient.id, systolic: sys, diastolic: dia, test_type: "bp", recorded_at: new Date().toISOString() },
    "BP record saved!", "Failed to save BP."
  );
});

document.getElementById("counselingForm").addEventListener("submit", e => {
  e.preventDefault();
  const text = document.getElementById("counselingPoints").value.trim();
  addTestEntry(
    { patient_id: currentPatient.id, counseling_points: text, test_type: "counseling", recorded_at: new Date().toISOString() },
    "Counseling record saved!", "Failed to save counseling points."
  );
});

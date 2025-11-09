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

// ---------- Navbar Setup ----------
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

// ---------- Elements ----------
const verifyForm = document.getElementById("verifyForm");
const patientIDInput = document.getElementById("patientID");
const stationSection = document.getElementById("stationSection");
const testHistorySection = document.getElementById("testHistorySection");
const testHistoryBody = document.getElementById("testHistoryBody");
const patientName = document.getElementById("patientName");
const patientAge = document.getElementById("patientAge");
const patientGender = document.getElementById("patientGender");
const stationSelect = document.getElementById("stationSelect");

const sections = {
  hb: document.getElementById("hbFormSection"),
  rbg: document.getElementById("rbgFormSection"),
  fev: document.getElementById("fevFormSection"),
  bp: document.getElementById("bpFormSection"),
  counseling: document.getElementById("counselingFormSection")
};

let currentPatient = null;

// ---------- Verify Patient ----------
verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = patientIDInput.value.trim();
  if (!id) return;

  try {
    const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`);
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

    // Load previous test history
    await loadTestHistory(id);
  } catch (err) {
    console.error("Verification error:", err);
    Swal.fire("Error", "Something went wrong verifying the patient.", "error");
  }
});

// ---------- Load Test History ----------
async function loadTestHistory(patientId) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${patientId}&order=test_timestamp.desc`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const tests = await res.json();

    if (tests.length === 0) {
      testHistoryBody.innerHTML = "<tr><td colspan='6' class='text-center'>No test records found</td></tr>";
    } else {
      testHistoryBody.innerHTML = tests.map(t => `
        <tr>
          <td>${new Date(t.test_timestamp).toLocaleString()}</td>
          <td>${t.hemoglobin ?? "-"}</td>
          <td>${t.rbg ?? "-"}</td>
          <td>${t.fev ?? "-"}</td>
          <td>${t.systolic && t.diastolic ? `${t.systolic}/${t.diastolic}` : "-"}</td>
          <td>${t.counseling_points ?? "-"}</td>
        </tr>
      `).join("");
    }

    testHistorySection.style.display = "block";
  } catch (err) {
    console.error("History load error:", err);
    Swal.fire("Error", "Failed to load test history", "error");
  }
}

// ---------- Insert New Test ----------
async function insertPatientTest(patientId, payload, successMsg, errorMsg) {
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ patient_id: patientId, ...payload })
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    await Swal.fire("Success", successMsg, "success");
    await loadTestHistory(patientId); // refresh history
  } catch (err) {
    console.error("Insert error:", err);
    Swal.fire("Error", errorMsg, "error");
  }
}

// ---------- Form Submissions ----------
document.getElementById("hbForm").addEventListener("submit", e => {
  e.preventDefault();
  insertPatientTest(currentPatient.id, { hemoglobin: parseFloat(document.getElementById("hemoglobin").value) }, "Hemoglobin saved!", "Failed to save Hemoglobin.");
});

document.getElementById("rbgForm").addEventListener("submit", e => {
  e.preventDefault();
  insertPatientTest(currentPatient.id, { rbg: parseFloat(document.getElementById("rbg").value) }, "RBG saved!", "Failed to save RBG.");
});

document.getElementById("fevForm").addEventListener("submit", e => {
  e.preventDefault();
  insertPatientTest(currentPatient.id, { fev: parseFloat(document.getElementById("fev").value) }, "FEV saved!", "Failed to save FEV.");
});

document.getElementById("bpForm").addEventListener("submit", e => {
  e.preventDefault();
  insertPatientTest(currentPatient.id, {
    systolic: parseInt(document.getElementById("systolic").value),
    diastolic: parseInt(document.getElementById("diastolic").value)
  }, "Blood Pressure saved!", "Failed to save BP.");
});

document.getElementById("counselingForm").addEventListener("submit", e => {
  e.preventDefault();
  insertPatientTest(currentPatient.id, {
    counseling_points: document.getElementById("counselingPoints").value.trim()
  }, "Counseling saved!", "Failed to save counseling points.");
});

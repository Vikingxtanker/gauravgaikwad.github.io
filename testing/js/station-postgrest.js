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
}

// ---------- ELEMENTS ----------
const verifyForm = document.getElementById("verifyForm");
const patientIDInput = document.getElementById("patientID");
const stationSection = document.getElementById("stationSection");
const historyTableBody = document.getElementById("historyTableBody");
const stationSelect = document.getElementById("stationSelect");
const testFormSection = document.getElementById("testFormSection");
const testFormTitle = document.getElementById("testFormTitle");
const testInputContainer = document.getElementById("testInputContainer");
const testForm = document.getElementById("testForm");

let currentPatient = null;

// ---------- VERIFY PATIENT ----------
verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = patientIDInput.value.trim();
  if (!id) return;

  try {
    // Verify patient exists
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
    document.getElementById("patientName").textContent = currentPatient.name || "N/A";
    document.getElementById("patientAge").textContent = currentPatient.age || "N/A";
    document.getElementById("patientGender").textContent = currentPatient.gender || "N/A";

    await Swal.fire("Patient Verified", "Patient ID is valid.", "success");
    stationSection.style.display = "block";
    verifyForm.style.display = "none";

    loadTestHistory();
  } catch (err) {
    console.error("Verification error:", err);
    Swal.fire("Error", "Something went wrong verifying the patient.", "error");
  }
});

// ---------- LOAD TEST HISTORY ----------
async function loadTestHistory() {
  historyTableBody.innerHTML = "";
  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${currentPatient.id}&order=created_at.desc`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const tests = await res.json();

    if (tests.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No test records found</td></tr>`;
      return;
    }

    tests.forEach(t => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(t.created_at).toLocaleString()}</td>
        <td>${t.test_type}</td>
        <td>${t.value_numeric ?? t.value_text ?? "-"}</td>
        <td>${t.unit ?? ""}</td>
      `;
      historyTableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading test history:", err);
  }
}

// ---------- STATION SELECT ----------
stationSelect.addEventListener("change", () => {
  const selected = stationSelect.value;
  testFormSection.style.display = "none";
  testInputContainer.innerHTML = "";
  if (!selected || !currentPatient) return;

  testFormTitle.textContent = `${selected} Test Entry`;
  testFormSection.style.display = "block";

  if (selected === "Hemoglobin") {
    testInputContainer.innerHTML = `<input type="number" step="0.1" id="testValue" class="form-control mb-2" placeholder="Hemoglobin (g/dL)" required>`;
  } else if (selected === "RBG") {
    testInputContainer.innerHTML = `<input type="number" id="testValue" class="form-control mb-2" placeholder="RBG (mg/dL)" required>`;
  } else if (selected === "FEV") {
    testInputContainer.innerHTML = `<input type="number" step="0.01" id="testValue" class="form-control mb-2" placeholder="FEV (L)" required>`;
  } else if (selected === "BP") {
    testInputContainer.innerHTML = `
      <input type="number" id="sys" class="form-control mb-2" placeholder="Systolic (mmHg)" required>
      <input type="number" id="dia" class="form-control mb-2" placeholder="Diastolic (mmHg)" required>
    `;
  } else if (selected === "Counseling") {
    testInputContainer.innerHTML = `<textarea id="counselingText" rows="4" class="form-control mb-2" placeholder="Enter counseling points" required></textarea>`;
  }
});

// ---------- SAVE NEW TEST ENTRY ----------
testForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = stationSelect.value;
  if (!type || !currentPatient) return;

  let payload = { patient_id: currentPatient.id, test_type: type };

  if (type === "Hemoglobin")
    payload.value_numeric = parseFloat(document.getElementById("testValue").value), payload.unit = "g/dL";
  if (type === "RBG")
    payload.value_numeric = parseFloat(document.getElementById("testValue").value), payload.unit = "mg/dL";
  if (type === "FEV")
    payload.value_numeric = parseFloat(document.getElementById("testValue").value), payload.unit = "L";
  if (type === "BP") {
    const sys = document.getElementById("sys").value;
    const dia = document.getElementById("dia").value;
    payload.value_text = `${sys}/${dia}`;
    payload.unit = "mmHg";
  }
  if (type === "Counseling")
    payload.value_text = document.getElementById("counselingText").value.trim();

  try {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    await res.json();
    Swal.fire("Success", "Test entry added successfully!", "success");
    testForm.reset();
    loadTestHistory();
  } catch (err) {
    console.error("Error saving test entry:", err);
    Swal.fire("Error", "Failed to save test entry.", "error");
  }
});

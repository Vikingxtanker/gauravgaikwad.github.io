import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";
const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

  // ----- Auth -----
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "station")) {
    Swal.fire({ icon: "error", title: "Access Denied", text: "You must be logged in." })
      .then(() => window.location.href = "health-screening.html");
    return;
  }
  loggedInfo.textContent = `Logged in as ${currentUser.username}`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => { localStorage.removeItem("currentUser"); location.reload(); };

  // ----- Elements -----
  const verifyForm = document.getElementById("verifyForm");
  const patientIDInput = document.getElementById("patientID");
  const stationSection = document.getElementById("stationSection");
  const patientName = document.getElementById("patientName");
  const patientAge = document.getElementById("patientAge");
  const patientGender = document.getElementById("patientGender");
  const stationSelect = document.getElementById("stationSelect");
  const testFormSection = document.getElementById("testFormSection");
  const testFormTitle = document.getElementById("testFormTitle");
  const testInputContainer = document.getElementById("testInputContainer");
  const historyTableBody = document.getElementById("historyTableBody");

  let currentPatient = null;
  let currentTest = null;

  // ----- Verify Patient -----
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim();
    if (!id) return;
    try {
      const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`);
      const data = await res.json();
      if (data.length === 0) {
        Swal.fire("Invalid ID", "No patient found.", "error");
        return;
      }
      currentPatient = data[0];
      stationSection.style.display = "block";
      patientName.textContent = currentPatient.name;
      patientAge.textContent = currentPatient.age;
      patientGender.textContent = currentPatient.gender;
      await Swal.fire("Verified", "Patient found.", "success");
      loadHistory();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Could not verify patient.", "error");
    }
  });

  // ----- Select Test -----
  stationSelect.addEventListener("change", () => {
    currentTest = stationSelect.value;
    testFormSection.style.display = currentTest ? "block" : "none";
    testFormTitle.textContent = currentTest.replace("_", " ").toUpperCase();

    const inputs = {
      hemoglobin: `<input type="number" step="0.1" id="hemoglobin" class="form-control mb-2" placeholder="Hemoglobin (g/dL)" required>`,
      rbg: `<input type="number" id="rbg" class="form-control mb-2" placeholder="RBG (mg/dL)" required>`,
      fev: `<input type="number" step="0.01" id="fev" class="form-control mb-2" placeholder="FEV (Liters)" required>`,
      bp: `<input type="number" id="systolic" class="form-control mb-2" placeholder="Systolic (mmHg)" required>
           <input type="number" id="diastolic" class="form-control mb-2" placeholder="Diastolic (mmHg)" required>`,
      counseling_points: `<textarea id="counseling_points" class="form-control mb-2" rows="4" placeholder="Enter counseling notes..." required></textarea>`
    };
    testInputContainer.innerHTML = inputs[currentTest] || "";
  });

  // ----- Submit Test -----
  document.getElementById("testForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient || !currentTest) return;
    let payload = { patient_id: currentPatient.id };

    if (currentTest === "hemoglobin") payload.hemoglobin = parseFloat(document.getElementById("hemoglobin").value);
    else if (currentTest === "rbg") payload.rbg = parseInt(document.getElementById("rbg").value);
    else if (currentTest === "fev") payload.fev = parseFloat(document.getElementById("fev").value);
    else if (currentTest === "bp") {
      payload.systolic = parseInt(document.getElementById("systolic").value);
      payload.diastolic = parseInt(document.getElementById("diastolic").value);
    } else if (currentTest === "counseling_points")
      payload.counseling_points = document.getElementById("counseling_points").value.trim();

    try {
      const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      Swal.fire("Saved", `${currentTest.replace("_", " ")} recorded!`, "success");
      e.target.reset();
      loadHistory();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save entry.", "error");
    }
  });

  // ----- Load Test History -----
  async function loadHistory() {
    historyTableBody.innerHTML = "";
    try {
      const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${currentPatient.id}&order=created_at.desc`);
      const tests = await res.json();
      if (!tests.length) {
        historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No tests yet</td></tr>`;
        return;
      }
      tests.forEach(t => {
        const date = new Date(t.created_at).toLocaleString();
        if (t.hemoglobin) addRow(date, "Hemoglobin", t.hemoglobin, "g/dL");
        if (t.rbg) addRow(date, "RBG", t.rbg, "mg/dL");
        if (t.fev) addRow(date, "FEV", t.fev, "L");
        if (t.systolic && t.diastolic) addRow(date, "Blood Pressure", `${t.systolic}/${t.diastolic}`, "mmHg");
        if (t.counseling_points) addRow(date, "Counseling", t.counseling_points, "-");
      });
    } catch (err) {
      console.error(err);
      historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading records</td></tr>`;
    }
  }

  function addRow(date, test, value, unit) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${test}</td><td>${value}</td><td>${unit}</td>`;
    historyTableBody.appendChild(tr);
  }
});

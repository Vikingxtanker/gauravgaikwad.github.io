import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";
const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // ---------- AUTH ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "station")) {
    Swal.fire({ icon: "error", title: "Access Denied", text: "You must be logged in." })
      .then(() => window.location.href = "health-screening.html");
    return;
  }
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => { localStorage.removeItem("currentUser"); location.reload(); };

  // ---------- ELEMENTS ----------
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

  // ---------- Warmup PostgREST (helps avoid 503 on first write) ----------
  (async () => {
    try { await fetch(`${POSTGREST_URL}/`, { headers: { Accept: "application/json" } }); } catch {}
  })();

  // ---------- Small helper: retry wrapper ----------
  async function fetchJSONWithRetry(url, options = {}, tries = 3, baseDelayMs = 400) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetch(url, options);
        if ([502, 503, 504].includes(res.status)) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) {
          // Try to read error json once (may fail if no body)
          let errBody = null;
          try { errBody = await res.json(); } catch {}
          const e = new Error(`HTTP ${res.status}`);
          e.body = errBody;
          throw e;
        }
        // Some endpoints return no JSON (e.g., return=minimal)
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) return await res.json();
        return null;
      } catch (err) {
        lastErr = err;
        // Backoff only for transient errors
        if (err.message?.startsWith("HTTP 50")) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
          continue;
        }
        break;
      }
    }
    throw lastErr;
  }

  // ---------- Verify Patient ----------
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim();
    if (!id) return;
    try {
      const data = await fetchJSONWithRetry(`${POSTGREST_URL}/patients?id=eq.${id}`, {
        headers: { Accept: "application/json" }
      });
      if (!data || data.length === 0) {
        Swal.fire("Invalid ID", "No patient found.", "error");
        return;
      }
      currentPatient = data[0];
      stationSection.style.display = "block";
      patientName.textContent = currentPatient.name ?? "N/A";
      patientAge.textContent = currentPatient.age ?? "N/A";
      patientGender.textContent = currentPatient.gender ?? "N/A";
      await Swal.fire("Verified", "Patient found.", "success");
      loadHistory();
    } catch (err) {
      console.error("Verify error:", err);
      Swal.fire("Error", `Could not verify patient. ${err.message || ""}`, "error");
    }
  });

  // ---------- Select Test (dynamic single form) ----------
  stationSelect.addEventListener("change", () => {
    currentTest = stationSelect.value;
    testFormSection.style.display = currentTest ? "block" : "none";
    testFormTitle.textContent = currentTest ? currentTest.replace("_", " ").toUpperCase() : "";

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

  // ---------- Submit New Test ----------
  document.getElementById("testForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient || !currentTest) return;

    // Build payload
    const payload = { patient_id: currentPatient.id };
    if (currentTest === "hemoglobin") payload.hemoglobin = parseFloat(document.getElementById("hemoglobin").value);
    else if (currentTest === "rbg") payload.rbg = parseInt(document.getElementById("rbg").value);
    else if (currentTest === "fev") payload.fev = parseFloat(document.getElementById("fev").value);
    else if (currentTest === "bp") {
      payload.systolic = parseInt(document.getElementById("systolic").value);
      payload.diastolic = parseInt(document.getElementById("diastolic").value);
    } else if (currentTest === "counseling_points") {
      payload.counseling_points = document.getElementById("counseling_points").value.trim();
    }

    try {
      // Use return=minimal to reduce work; then reload history
      await fetchJSONWithRetry(`${POSTGREST_URL}/patient_tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }, 4, 500);
      Swal.fire("Saved", `${currentTest.replace("_", " ")} recorded!`, "success");
      e.target.reset();
      loadHistory();
    } catch (err) {
      console.error("Save error:", err?.body || err);
      const msg = (err?.body && err.body.message) ? err.body.message : err.message || "Failed to save entry.";
      Swal.fire("Error", msg, "error");
    }
  });

  // ---------- Load Test History ----------
  async function loadHistory() {
    historyTableBody.innerHTML = "";
    try {
      const tests = await fetchJSONWithRetry(
        `${POSTGREST_URL}/patient_tests?patient_id=eq.${currentPatient.id}&order=created_at.desc`,
        { headers: { Accept: "application/json" } },
        3,
        400
      );
      if (!tests || !tests.length) {
        historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No tests yet</td></tr>`;
        return;
      }
      tests.forEach(t => {
        const date = new Date(t.created_at || t.test_timestamp).toLocaleString();
        if (t.hemoglobin != null) addRow(date, "Hemoglobin", t.hemoglobin, "g/dL");
        if (t.rbg != null) addRow(date, "RBG", t.rbg, "mg/dL");
        if (t.fev != null) addRow(date, "FEV", t.fev, "L");
        if (t.systolic != null && t.diastolic != null) addRow(date, "Blood Pressure", `${t.systolic}/${t.diastolic}`, "mmHg");
        if (t.counseling_points) addRow(date, "Counseling", t.counseling_points, "-");
      });
    } catch (err) {
      console.error("History error:", err);
      historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading records</td></tr>`;
    }
  }
  function addRow(date, test, value, unit) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${test}</td><td>${value}</td><td>${unit}</td>`;
    historyTableBody.appendChild(tr);
  }
});

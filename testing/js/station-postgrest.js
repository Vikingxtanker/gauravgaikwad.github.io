// js/station-postgrest.js
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // ---------- LOGIN CHECK ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "station")) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in to access this page.",
      confirmButtonText: "OK"
    }).then(() => (window.location.href = "health-screening.html"));
    return;
  }

  // ---------- NAVBAR ----------
  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };

  // ---------- ELEMENTS ----------
  const verifyForm = document.getElementById("verifyForm");
  const patientIDInput = document.getElementById("patientID");
  const stationSection = document.getElementById("stationSection");
  const patientName = document.getElementById("patientName");
  const patientAge = document.getElementById("patientAge");
  const patientGender = document.getElementById("patientGender");

  const stationSelect = document.getElementById("stationSelect");
  const testFormSection = document.getElementById("testFormSection");
  const testForm = document.getElementById("testForm");
  const testFormTitle = document.getElementById("testFormTitle");
  const testInputContainer = document.getElementById("testInputContainer");

  const historyBody = document.getElementById("historyTableBody");
  const changePatientBtn = document.getElementById("changePatientBtn");

  const toggleSummaryBtn = document.getElementById("toggleSummaryBtn");
  const dailySummaryCollapse = document.getElementById("dailySummaryCollapse");
  const dailySummaryForm = document.getElementById("dailySummaryForm");

  let currentPatient = null;
  let currentTest = null;

  // ---------- Collapse Toggle Button ----------
  function setSummaryToggleText(expanded) {
    toggleSummaryBtn.textContent = expanded
      ? "- Hide Daily Summary Form"
      : "+ Show Daily Summary Form";
  }
  if (dailySummaryCollapse) {
    dailySummaryCollapse.addEventListener("shown.bs.collapse", () => setSummaryToggleText(true));
    dailySummaryCollapse.addEventListener("hidden.bs.collapse", () => setSummaryToggleText(false));
    setSummaryToggleText(false);
  }

  // ---------- VERIFY PATIENT ----------
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim();
    if (!id) return;

    try {
      const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${encodeURIComponent(id)}`, {
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

      Swal.fire("Patient Verified", "Patient ID is valid.", "success");
      stationSection.style.display = "block";
      verifyForm.style.display = "none";

      await loadTestHistory();
    } catch (err) {
      console.error("Verification error:", err);
      Swal.fire("Error", "Something went wrong verifying the patient.", "error");
    }
  });

  // ---------- LOAD TEST HISTORY ----------
  async function loadTestHistory() {
    historyBody.innerHTML = "";
    if (!currentPatient) return;
    try {
      const res = await fetch(
        `${POSTGREST_URL}/patient_tests?patient_id=eq.${encodeURIComponent(
          currentPatient.id
        )}&order=created_at.desc`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const tests = await res.json();

      if (tests.length === 0) {
        historyBody.innerHTML =
          `<tr><td colspan="5" class="text-center text-muted">No test records found</td></tr>`;
        return;
      }

      tests.forEach((t) => {
        const date = new Date(t.created_at).toLocaleString();
        const value = t.value_numeric ?? t.value_text ?? "-";
        const unit = t.unit ?? "-";
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${date}</td>
          <td>${escapeHtml(t.test_type)}</td>
          <td>${escapeHtml(String(value))}</td>
          <td>${escapeHtml(String(unit))}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-secondary me-1 edit-btn" data-id="${t.id}">?? Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}">??? Delete</button>
          </td>`;
        historyBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading test history:", err);
      historyBody.innerHTML =
        `<tr><td colspan="5" class="text-center text-danger">Failed to load records</td></tr>`;
    }
  }

  // ---------- TEST INPUT MAP ----------
  const testFields = {
    Hemoglobin: `<input type="number" step="0.1" id="testValue" class="form-control" placeholder="Hemoglobin (g/dL)" required>`,
    RBG: `<input type="number" id="testValue" class="form-control" placeholder="Random Blood Glucose (mg/dL)" required>`,
    FBS: `<input type="number" id="testValue" class="form-control" placeholder="Fasting Blood Sugar (mg/dL)" required>`,
    PPBS: `<input type="number" id="testValue" class="form-control" placeholder="Post-Prandial Blood Sugar (mg/dL)" required>`,
    OGTT: `<input type="number" id="testValue" class="form-control" placeholder="Oral Glucose Tolerance Test (mg/dL)" required>`,
    HbA1c: `<input type="number" step="0.1" id="testValue" class="form-control" placeholder="HbA1c (%)" required>`,
    FEV: `<input type="number" step="0.01" id="testValue" class="form-control" placeholder="FEV (Liters)" required>`,
    BP: `
      <input type="number" id="sys" class="form-control mb-2" placeholder="Systolic (mmHg)" required>
      <input type="number" id="dia" class="form-control" placeholder="Diastolic (mmHg)" required>`,
    Counseling: `<textarea id="testText" rows="3" class="form-control" placeholder="Enter counseling notes..." required></textarea>`
  };

  // ---------- STATION SELECT ----------
  stationSelect.addEventListener("change", () => {
    const selected = stationSelect.value;
    currentTest = selected;
    testFormSection.style.display = "none";
    testInputContainer.innerHTML = "";
    if (!selected) return;
    testFormSection.style.display = "block";
    testFormTitle.textContent = `${selected} Test Entry`;
    testInputContainer.innerHTML = testFields[selected] || "";
  });

  // ---------- SAVE SINGLE TEST ----------
  testForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient || !currentTest) return;

    let payload = { patient_id: currentPatient.id, test_type: currentTest };

    if (currentTest === "BP") {
      const sys = document.getElementById("sys").value;
      const dia = document.getElementById("dia").value;
      payload.value_text = `${sys}/${dia}`;
      payload.unit = "mmHg";
    } else if (currentTest === "Counseling") {
      payload.value_text = document.getElementById("testText").value.trim();
      payload.unit = "-";
    } else {
      payload.value_numeric = parseFloat(document.getElementById("testValue").value);
      payload.unit =
        currentTest === "Hemoglobin" ? "g/dL" :
        ["RBG", "FBS", "PPBS", "OGTT"].includes(currentTest) ? "mg/dL" :
        currentTest === "HbA1c" ? "%" :
        currentTest === "FEV" ? "L" : "-";
    }

    try {
      await saveTest(payload);
      Swal.fire("Success", `${currentTest} entry saved!`, "success");
      e.target.reset();
      await loadTestHistory();
    } catch (err) {
      console.error("Error saving test:", err);
      Swal.fire("Error", "Failed to save test entry.", "error");
    }
  });

  // ---------- SAVE DAILY SUMMARY ----------
  dailySummaryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient) return;

    const tests = [];
    const addTest = (type, numeric, text, unit) => {
      if (numeric !== null && !isNaN(numeric))
        tests.push({ patient_id: currentPatient.id, test_type: type, value_numeric: numeric, unit });
      else if (text)
        tests.push({ patient_id: currentPatient.id, test_type: type, value_text: text, unit });
    };

    const hemo = parseFloat(document.getElementById("hemoglobin").value);
    const rbg = parseFloat(document.getElementById("rbg").value);
    const fbs = parseFloat(document.getElementById("fbs").value);
    const ppbs = parseFloat(document.getElementById("ppbs").value);
    const ogtt = parseFloat(document.getElementById("ogtt").value);
    const hba1c = parseFloat(document.getElementById("hba1c").value);
    const fev = parseFloat(document.getElementById("fev").value);
    const sys = document.getElementById("bpSys").value;
    const dia = document.getElementById("bpDia").value;
    const counseling = document.getElementById("counseling").value.trim();

    if (!isNaN(hemo)) addTest("Hemoglobin", hemo, null, "g/dL");
    if (!isNaN(rbg)) addTest("RBG", rbg, null, "mg/dL");
    if (!isNaN(fbs)) addTest("FBS", fbs, null, "mg/dL");
    if (!isNaN(ppbs)) addTest("PPBS", ppbs, null, "mg/dL");
    if (!isNaN(ogtt)) addTest("OGTT", ogtt, null, "mg/dL");
    if (!isNaN(hba1c)) addTest("HbA1c", hba1c, null, "%");
    if (!isNaN(fev)) addTest("FEV", fev, null, "L");
    if (sys && dia) addTest("BP", null, `${sys}/${dia}`, "mmHg");
    if (counseling) addTest("Counseling", null, counseling, "-");

    if (tests.length === 0) {
      Swal.fire("No Data", "Please enter at least one value.", "info");
      return;
    }

    try {
      for (const t of tests) await saveTest(t, false);
      Swal.fire("Success", "All tests saved successfully!", "success");
      e.target.reset();
      await loadTestHistory();
    } catch (err) {
      console.error("Daily summary save error:", err);
      Swal.fire("Error", "Failed to save daily summary.", "error");
    }
  });

  // ---------- CHANGE PATIENT ----------
  changePatientBtn.addEventListener("click", () => {
    Swal.fire({
      title: "Change Patient?",
      text: "Unsaved data will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, change"
    }).then((result) => {
      if (result.isConfirmed) {
        stationSection.style.display = "none";
        verifyForm.style.display = "block";
        patientIDInput.value = "";
        verifyForm.reset();
        testForm.reset();
        if (dailySummaryForm) dailySummaryForm.reset();
        testFormSection.style.display = "none";
        historyBody.innerHTML =
          `<tr><td colspan="5" class="text-center text-muted">No data loaded</td></tr>`;
        currentPatient = null;

        const collapseInstance = bootstrap.Collapse.getOrCreateInstance(dailySummaryCollapse, { toggle: false });
        collapseInstance.hide();
      }
    });
  });

  // ---------- EDIT & DELETE ----------
  historyBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    if (!editBtn && !deleteBtn) return;
    const id = (editBtn || deleteBtn).getAttribute("data-id");
    if (!id) return;
    if (deleteBtn) onDeleteRecord(id);
    else if (editBtn) onEditRecord(id);
  });

  async function onEditRecord(recordId) {
    try {
      const rec = await fetchOneTest(recordId);
      if (!rec) {
        Swal.fire("Not found", "Record no longer exists.", "info");
        await loadTestHistory();
        return;
      }
      const { html, preConfirm } = buildEditDialog(rec);
      const result = await Swal.fire({
        title: `Edit ${rec.test_type}`,
        html,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Save Changes",
        preConfirm
      });
      if (!result.isConfirmed) return;
      const payload = result.value;
      ["value_numeric", "value_text", "unit"].forEach((k) => {
        if (payload[k] === undefined || payload[k] === null || payload[k] === "") delete payload[k];
      });
      if (Object.keys(payload).length === 0) {
        Swal.fire("No changes", "Nothing to update.", "info");
        return;
      }
      const ok = await patchTest(recordId, payload);
      if (!ok) throw new Error("Patch failed");
      Swal.fire("Updated", "Record updated successfully.", "success");
      await loadTestHistory();
    } catch (err) {
      console.error("Edit error:", err);
      Swal.fire("Error", "Failed to update record.", "error");
    }
  }

  async function onDeleteRecord(id) {
    const res = await Swal.fire({
      title: "Delete record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete"
    });
    if (!res.isConfirmed) return;
    try {
      const ok = await deleteTest(id);
      if (!ok) throw new Error("Delete failed");
      Swal.fire("Deleted", "Record removed.", "success");
      await loadTestHistory();
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire("Error", "Failed to delete record.", "error");
    }
  }

  // ---------- API HELPERS ----------
  async function saveTest(payload, throwOnError = true) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      if (throwOnError) throw new Error(`HTTP ${res.status}`);
      return false;
    }
    return true;
  }

  async function fetchOneTest(id) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows[0] ? rows[0] : null;
  }

  async function patchTest(id, payload) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  async function deleteTest(id) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return res.ok;
  }

  // ---------- UTILS ----------
  function parseBp(text) {
    if (!text) return { sys: null, dia: null };
    const parts = String(text).split("/");
    if (parts.length !== 2) return { sys: null, dia: null };
    return { sys: parts[0].trim(), dia: parts[1].trim() };
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});

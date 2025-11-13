// js/station-postgrest.js
// Modified to save Systolic and Diastolic as separate test_type entries
// (and also saves BP combined as value_text for backward compatibility).

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

  const dailySummaryCollapse = document.getElementById("dailySummaryCollapse");
  const dailySummaryForm = document.getElementById("dailySummaryForm");
  const toggleSummaryBtn = document.getElementById("toggleSummaryBtn");

  let currentPatient = null;
  let currentTest = null;

  // ---------- COLLAPSE TOGGLE ----------
  function setSummaryToggleText(expanded) {
    toggleSummaryBtn.textContent = expanded
      ? "− Hide Daily Summary Form"
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
            <button class="btn btn-sm btn-outline-secondary me-1 edit-btn" data-id="${t.id}">✏️ Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}">🗑️ Delete</button>
          </td>`;
        historyBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading test history:", err);
      historyBody.innerHTML =
        `<tr><td colspan="5" class="text-center text-danger">Failed to load records</td></tr>`;
    }
  }

  // ---------- TEST TYPE SELECTION ----------
  stationSelect.addEventListener("change", () => {
    const selected = stationSelect.value;
    currentTest = selected;
    testFormSection.style.display = "none";
    testInputContainer.innerHTML = "";

    if (!selected) return;
    testFormSection.style.display = "block";
    testFormTitle.textContent = `${selected} Test Entry`;

    const tests = {
      Hemoglobin: { unit: "g/dL", placeholder: "Hemoglobin (g/dL)" },
      RBG: { unit: "mg/dL", placeholder: "Random Blood Glucose (mg/dL)" },
      FBS: { unit: "mg/dL", placeholder: "Fasting Blood Sugar (mg/dL)" },
      PPBS: { unit: "mg/dL", placeholder: "Post-Prandial Blood Sugar (mg/dL)" },
      OGTT: { unit: "mg/dL", placeholder: "OGTT (mg/dL)" },
      HbA1c: { unit: "%", placeholder: "HbA1c (%)" },
      "Heart Rate": { unit: "/min", placeholder: "Heart Rate (/min)" },
      Temperature: { unit: "°C", placeholder: "Temperature (°C)" },
      SpO2: { unit: "%", placeholder: "SpO₂ (%)" },
      "Target Weight": { unit: "kg", placeholder: "Target Weight (kg)" },
      FEV: { unit: "L", placeholder: "FEV (L)" },
      BP: { unit: "mmHg", placeholder: "Systolic/Diastolic (mmHg)" },
      Counseling: { unit: "-", placeholder: "Counseling / Notes" }
    };

    const config = tests[selected];

    if (selected === "BP") {
      // render separate systolic/diastolic inputs
      testInputContainer.innerHTML = `
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label">Systolic (mmHg)</label>
            <input id="sys" class="form-control" type="number" min="0" />
          </div>
          <div class="col-6">
            <label class="form-label">Diastolic (mmHg)</label>
            <input id="dia" class="form-control" type="number" min="0" />
          </div>
        </div>
      `;
    } else if (selected === "Counseling") {
      testInputContainer.innerHTML = `
        <div>
          <label class="form-label">Notes</label>
          <textarea id="testText" class="form-control" rows="3" placeholder="${escapeHtml(config.placeholder)}"></textarea>
        </div>
      `;
    } else {
      testInputContainer.innerHTML = `
        <div>
          <label class="form-label">Value (${escapeHtml(config.unit)})</label>
          <input id="testNumeric" class="form-control" type="number" step="any" />
        </div>
      `;
    }
  });

  // ---------- SUBMIT SINGLE TEST ----------
  testForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient) return Swal.fire("No Patient","Verify a patient first","info");

    const payloads = [];

    if (currentTest === "BP") {
      const sys = document.getElementById("sys").value.trim();
      const dia = document.getElementById("dia").value.trim();
      if (!sys || !dia) return Swal.fire("Incomplete","Enter both systolic & diastolic","warning");
      // Save separate numeric entries
      payloads.push({ patient_id: currentPatient.id, test_type: "Systolic", value_numeric: parseFloat(sys), unit: "mmHg" });
      payloads.push({ patient_id: currentPatient.id, test_type: "Diastolic", value_numeric: parseFloat(dia), unit: "mmHg" });
      // Also save combined BP text for compatibility
      payloads.push({ patient_id: currentPatient.id, test_type: "BP", value_text: `${sys}/${dia}`, unit: "mmHg" });
    } else if (currentTest === "Counseling") {
      const text = document.getElementById("testText").value.trim();
      if (!text) return Swal.fire("Empty","Please enter notes","warning");
      payloads.push({ patient_id: currentPatient.id, test_type: "Counseling", value_text: text, unit: "-" });
    } else {
      const val = document.getElementById("testNumeric").value;
      if (val === "" || isNaN(parseFloat(val))) return Swal.fire("Invalid","Enter a valid numeric value","warning");
      const configUnit = {
        Hemoglobin: "g/dL",
        RBG: "mg/dL",
        FBS: "mg/dL",
        PPBS: "mg/dL",
        OGTT: "mg/dL",
        HbA1c: "%",
        "Heart Rate": "/min",
        Temperature: "°C",
        SpO2: "%",
        "Target Weight": "kg",
        FEV: "L"
      }[currentTest] || "-";
      payloads.push({
        patient_id: currentPatient.id,
        test_type: currentTest,
        value_numeric: parseFloat(val),
        unit: configUnit
      });
    }

    try {
      for (const p of payloads) {
        const ok = await saveTest(p, false);
        if (!ok) throw new Error("Save failed");
      }
      Swal.fire("Saved", `${currentTest} saved successfully`, "success");
      testForm.reset();
      await loadTestHistory();
    } catch (err) {
      console.error("Error saving test:", err);
      Swal.fire("Error", "Failed to save test entry.", "error");
    }
  });

  // ---------- DAILY SUMMARY SAVE ----------
  if (dailySummaryForm) {
    dailySummaryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentPatient) return Swal.fire("No Patient","Verify a patient first","info");

      const getVal = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : NaN;
      };

      const testsToSave = [];
      const addTest = (type, value, text, unit) => {
        if (!isNaN(value)) testsToSave.push({ patient_id: currentPatient.id, test_type: type, value_numeric: value, unit });
        else if (text) testsToSave.push({ patient_id: currentPatient.id, test_type: type, value_text: text, unit });
      };

      addTest("Hemoglobin", getVal("hemoglobin"), null, "g/dL");
      addTest("RBG", getVal("rbg"), null, "mg/dL");
      addTest("FBS", getVal("fbs"), null, "mg/dL");
      addTest("PPBS", getVal("ppbs"), null, "mg/dL");
      addTest("OGTT", getVal("ogtt"), null, "mg/dL");
      addTest("HbA1c", getVal("hba1c"), null, "%");
      addTest("Heart Rate", getVal("heartRate"), null, "/min");
      addTest("Temperature", getVal("temperature"), null, "°C");
      addTest("SpO2", getVal("spo2"), null, "%");
      addTest("Target Weight", getVal("targetWeight"), null, "kg");
      addTest("FEV", getVal("fev"), null, "L");

      // BP: collect systolic & diastolic and save separately + combined BP
      const sys = document.getElementById("bpSys").value.trim();
      const dia = document.getElementById("bpDia").value.trim();
      if (sys && dia) {
        testsToSave.push({ patient_id: currentPatient.id, test_type: "Systolic", value_numeric: parseFloat(sys), unit: "mmHg" });
        testsToSave.push({ patient_id: currentPatient.id, test_type: "Diastolic", value_numeric: parseFloat(dia), unit: "mmHg" });
        testsToSave.push({ patient_id: currentPatient.id, test_type: "BP", value_text: `${sys}/${dia}`, unit: "mmHg" });
      }

      const counseling = (document.getElementById("counseling")?.value || "").trim();
      if (counseling) testsToSave.push({ patient_id: currentPatient.id, test_type: "Counseling", value_text: counseling, unit: "-" });

      if (testsToSave.length === 0) {
        Swal.fire("No Data", "Please enter at least one test value.", "info");
        return;
      }

      try {
        for (const t of testsToSave) await saveTest(t, false);
        Swal.fire("Success", "All tests saved successfully!", "success");
        e.target.reset();
        await loadTestHistory();
      } catch (err) {
        console.error("Daily summary error:", err);
        Swal.fire("Error", "Failed to save daily summary.", "error");
      }
    });
  }

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

  // ---------- EDIT / DELETE ----------
  historyBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    if (!editBtn && !deleteBtn) return;

    const id = (editBtn || deleteBtn).getAttribute("data-id");
    if (!id) return;

    if (deleteBtn) return onDeleteRecord(id);
    if (editBtn) return onEditRecord(id);
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
        if (!payload[k]) delete payload[k];
      });

      const ok = await patchTest(recordId, payload);
      if (!ok) throw new Error("Patch failed");
      Swal.fire("Updated", "Record updated successfully.", "success");
      await loadTestHistory();
    } catch (err) {
      console.error("Edit error:", err);
      Swal.fire("Error", "Failed to update record.", "error");
    }
  }

  function buildEditDialog(rec) {
    const safeUnit = rec.unit ?? "-";
    if (rec.test_type === "BP") {
      const { sys, dia } = parseBp(rec.value_text);
      const html = `
        <div class="text-start">
          <label>Systolic (mmHg)</label>
          <input type="number" id="editSys" class="swal2-input" value="${sys ?? ""}">
          <label>Diastolic (mmHg)</label>
          <input type="number" id="editDia" class="swal2-input" value="${dia ?? ""}">
        </div>`;
      const preConfirm = () => {
        const s = document.getElementById("editSys").value;
        const d = document.getElementById("editDia").value;
        if (!s || !d) {
          Swal.showValidationMessage("Please enter both systolic and diastolic.");
          return;
        }
        return { value_text: `${s}/${d}`, unit: "mmHg" };
      };
      return { html, preConfirm };
    } else if (rec.test_type === "Counseling") {
      const html = `<textarea id="editText" class="swal2-textarea">${rec.value_text ?? ""}</textarea>`;
      const preConfirm = () => {
        const t = document.getElementById("editText").value.trim();
        if (!t) {
          Swal.showValidationMessage("Please enter notes.");
          return;
        }
        return { value_text: t, unit: "-" };
      };
      return { html, preConfirm };
    } else {
      const html = `
        <label>Value</label>
        <input type="number" id="editNumeric" class="swal2-input" value="${rec.value_numeric ?? ""}">
        <label>Unit</label>
        <input type="text" id="editUnit" class="swal2-input" value="${safeUnit}">`;
      const preConfirm = () => {
        const v = document.getElementById("editNumeric").value;
        const u = document.getElementById("editUnit").value.trim();
        if (v === "" || isNaN(parseFloat(v))) {
          Swal.showValidationMessage("Please enter valid value.");
          return;
        }
        return { value_numeric: parseFloat(v), unit: u || "-" };
      };
      return { html, preConfirm };
    }
  }

  async function onDeleteRecord(recordId) {
    const res = await Swal.fire({
      title: "Delete record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete"
    });
    if (!res.isConfirmed) return;

    try {
      const ok = await deleteTest(recordId);
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
    return { sys: parts[0]?.trim(), dia: parts[1]?.trim() };
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

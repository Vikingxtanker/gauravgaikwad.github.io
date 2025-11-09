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
    }).then(() => window.location.href = "health-screening.html");
    return;
  }

  // ---------- NAVBAR SETUP ----------
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
  const dateFilter = document.getElementById("dateFilter");

  const toggleSummaryBtn = document.getElementById("toggleSummaryBtn");
  const dailySummaryCollapse = document.getElementById("dailySummaryCollapse");
  const dailySummaryForm = document.getElementById("dailySummaryForm");

  let currentPatient = null;
  let currentTest = null;

  // ---------- SUMMARY TOGGLE BUTTON ----------
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
      const data = await res.json();

      if (!res.ok || data.length === 0) {
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
  async function loadTestHistory(filter = "all") {
    historyBody.innerHTML = "";
    if (!currentPatient) return;

    try {
      const res = await fetch(
        `${POSTGREST_URL}/patient_tests?patient_id=eq.${encodeURIComponent(
          currentPatient.id
        )}&order=created_at.desc`,
        { headers: { Accept: "application/json" } }
      );
      const tests = await res.json();
      if (!res.ok || tests.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No test records found</td></tr>`;
        return;
      }

      const now = new Date();
      const filtered = tests.filter((t) => {
        const date = new Date(t.created_at);
        if (filter === "today") return date.toDateString() === now.toDateString();
        else if (filter === "7days") return date >= new Date(now - 7 * 24 * 60 * 60 * 1000);
        else if (filter === "30days") return date >= new Date(now - 30 * 24 * 60 * 60 * 1000);
        return true;
      });

      if (filtered.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No records found for selected filter</td></tr>`;
        return;
      }

      filtered.forEach((t) => {
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
      historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load records</td></tr>`;
    }
  }

  // ---------- DATE FILTER ----------
  if (dateFilter) {
    dateFilter.addEventListener("change", () => {
      loadTestHistory(dateFilter.value);
    });
  }

  // ---------- STATION SELECT ----------
  stationSelect.addEventListener("change", () => {
    const selected = stationSelect.value;
    currentTest = selected;
    testFormSection.style.display = "none";
    testInputContainer.innerHTML = "";
    if (!selected) return;

    testFormSection.style.display = "block";
    testFormTitle.textContent = `${selected} Test Entry`;

    const testFields = {
      Hemoglobin: `<input type="number" step="0.1" id="testValue" class="form-control" placeholder="Hemoglobin (g/dL)" required>`,
      RBG: `<input type="number" id="testValue" class="form-control" placeholder="Random Blood Glucose (mg/dL)" required>`,
      FBS: `<input type="number" id="testValue" class="form-control" placeholder="Fasting Blood Sugar (mg/dL)" required>`,
      PPBS: `<input type="number" id="testValue" class="form-control" placeholder="Post-Prandial Blood Sugar (mg/dL)" required>`,
      HbA1c: `<input type="number" step="0.1" id="testValue" class="form-control" placeholder="HbA1c (%)" required>`,
      FEV: `<input type="number" step="0.01" id="testValue" class="form-control" placeholder="FEV (Liters)" required>`,
      BP: `
        <input type="number" id="sys" class="form-control mb-2" placeholder="Systolic (mmHg)" required>
        <input type="number" id="dia" class="form-control" placeholder="Diastolic (mmHg)" required>`,
      Counseling: `<textarea id="testText" rows="3" class="form-control" placeholder="Enter counseling notes..." required></textarea>`
    };

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
        currentTest === "RBG" || currentTest === "FBS" || currentTest === "PPBS" ? "mg/dL" :
        currentTest === "HbA1c" ? "%" :
        currentTest === "FEV" ? "L" : "-";
    }

    try {
      await saveTest(payload);
      Swal.fire("Success", `${currentTest} entry saved!`, "success");
      e.target.reset();
      await loadTestHistory(dateFilter.value || "all");
    } catch {
      Swal.fire("Error", "Failed to save test entry.", "error");
    }
  });

  // ---------- SAVE DAILY SUMMARY ----------
  dailySummaryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatient) return;

    const tests = [];
    const addTest = (type, numeric, text, unit) => {
      if (numeric !== null && !isNaN(numeric)) {
        tests.push({ patient_id: currentPatient.id, test_type: type, value_numeric: numeric, unit });
      } else if (text) {
        tests.push({ patient_id: currentPatient.id, test_type: type, value_text: text, unit });
      }
    };

    const hemo = parseFloat(document.getElementById("hemoglobin").value);
    const rbg = parseFloat(document.getElementById("rbg").value);
    const fbs = parseFloat(document.getElementById("fbs").value);
    const ppbs = parseFloat(document.getElementById("ppbs").value);
    const hba1c = parseFloat(document.getElementById("hba1c").value);
    const fev = parseFloat(document.getElementById("fev").value);
    const sys = document.getElementById("bpSys").value;
    const dia = document.getElementById("bpDia").value;
    const counseling = document.getElementById("counseling").value.trim();

    if (!isNaN(hemo)) addTest("Hemoglobin", hemo, null, "g/dL");
    if (!isNaN(rbg)) addTest("RBG", rbg, null, "mg/dL");
    if (!isNaN(fbs)) addTest("FBS", fbs, null, "mg/dL");
    if (!isNaN(ppbs)) addTest("PPBS", ppbs, null, "mg/dL");
    if (!isNaN(hba1c)) addTest("HbA1c", hba1c, null, "%");
    if (!isNaN(fev)) addTest("FEV", fev, null, "L");
    if (sys && dia) addTest("BP", null, `${sys}/${dia}`, "mmHg");
    if (counseling) addTest("Counseling", null, counseling, "-");

    if (tests.length === 0) {
      Swal.fire("No Data", "Please enter at least one value.", "info");
      return;
    }

    try {
      for (const t of tests) await saveTest(t);
      Swal.fire("Success", "All tests saved successfully!", "success");
      e.target.reset();
      await loadTestHistory(dateFilter.value || "all");
    } catch (err) {
      console.error(err);
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
    }).then((r) => {
      if (r.isConfirmed) {
        stationSection.style.display = "none";
        verifyForm.style.display = "block";
        verifyForm.reset();
        testForm.reset();
        if (dailySummaryForm) dailySummaryForm.reset();
        testFormSection.style.display = "none";
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No data loaded</td></tr>`;
        currentPatient = null;
        bootstrap.Collapse.getOrCreateInstance(dailySummaryCollapse, { toggle: false }).hide();
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
    if (deleteBtn) onDeleteRecord(id);
    else onEditRecord(id);
  });

  async function onEditRecord(id) {
    try {
      const rec = await fetchOneTest(id);
      if (!rec) return Swal.fire("Not found", "Record no longer exists.", "info");
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
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] == null) delete payload[k];
      });
      if (Object.keys(payload).length === 0) return Swal.fire("No changes", "Nothing updated.", "info");
      const ok = await patchTest(id, payload);
      if (!ok) throw new Error();
      Swal.fire("Updated", "Record updated successfully.", "success");
      await loadTestHistory(dateFilter.value || "all");
    } catch {
      Swal.fire("Error", "Failed to update record.", "error");
    }
  }

  function buildEditDialog(rec) {
    const safeUnit = rec.unit ?? "-";
    if (rec.test_type === "BP") {
      const { sys, dia } = parseBp(rec.value_text);
      const html = `
        <label>Systolic (mmHg)</label>
        <input id="editSys" class="swal2-input" value="${sys ?? ""}">
        <label>Diastolic (mmHg)</label>
        <input id="editDia" class="swal2-input" value="${dia ?? ""}">
        <label>Unit</label>
        <input id="editUnit" class="swal2-input" value="${safeUnit}">`;
      const preConfirm = () => {
        const s = document.getElementById("editSys").value;
        const d = document.getElementById("editDia").value;
        const u = document.getElementById("editUnit").value || "mmHg";
        if (!s || !d) return Swal.showValidationMessage("Both values required");
        return { value_text: `${s}/${d}`, unit: u };
      };
      return { html, preConfirm };
    } else if (rec.test_type === "Counseling") {
      const html = `
        <label>Notes</label>
        <textarea id="editText" class="swal2-textarea">${rec.value_text ?? ""}</textarea>
        <label>Unit</label>
        <input id="editUnit" class="swal2-input" value="${safeUnit}">`;
      const preConfirm = () => {
        const t = document.getElementById("editText").value.trim();
        const u = document.getElementById("editUnit").value || "-";
        if (!t) return Swal.showValidationMessage("Please enter notes");
        return { value_text: t, unit: u };
      };
      return { html, preConfirm };
    } else {
      const html = `
        <label>Value</label>
        <input id="editNumeric" class="swal2-input" type="number" value="${rec.value_numeric ?? ""}">
        <label>Unit</label>
        <input id="editUnit" class="swal2-input" value="${safeUnit}">`;
      const preConfirm = () => {
        const v = document.getElementById("editNumeric").value;
        const u = document.getElementById("editUnit").value || "-";
        if (!v || isNaN(parseFloat(v))) return Swal.showValidationMessage("Invalid number");
        return { value_numeric: parseFloat(v), unit: u };
      };
      return { html, preConfirm };
    }
  }

  async function onDeleteRecord(id) {
    const res = await Swal.fire({
      title: "Delete record?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete"
    });
    if (!res.isConfirmed) return;
    const ok = await deleteTest(id);
    if (ok) {
      Swal.fire("Deleted", "Record removed.", "success");
      await loadTestHistory(dateFilter.value || "all");
    } else Swal.fire("Error", "Failed to delete record.", "error");
  }

  // ---------- API HELPERS ----------
  async function saveTest(payload) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  async function fetchOneTest(id) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${id}`, {
      headers: { Accept: "application/json" }
    });
    const rows = await res.json();
    return rows?.[0] || null;
  }

  async function patchTest(id, payload) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  async function deleteTest(id) {
    const res = await fetch(`${POSTGREST_URL}/patient_tests?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    return res.ok;
  }

  // ---------- UTILS ----------
  function parseBp(text) {
    if (!text) return { sys: null, dia: null };
    const [sys, dia] = text.split("/");
    return { sys, dia };
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

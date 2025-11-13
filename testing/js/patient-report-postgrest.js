// js/patient-report-postgrest.js
// Uses Neon/PostgREST schema (patients, patient_tests) — aligned with station-postgrest.js
// Replace the previous file with this. Make sure report_DMv3.pdf is in the same public folder.
// (Adjust COORDS for PDF positioning if needed.)

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// --- Editable coordinates (x, y) for each field on your PDF template ---
const COORDS = {
  name:        { x: 126,  y: 675 },
  age:         { x: 408,  y: 675 },
  phone:       { x: 82,   y: 655 },
  gender:      { x: 423,  y: 655 },
  patientId:   { x: 106,  y: 635 },
  pulse:       { x: 230,  y: 655 },
  spo2:        { x: 320,  y: 655 },
  bmi:         { x: 409,  y: 635 },
  temp:        { x: 300,  y: 619 },
  date:        { x: 74,   y: 619 },

  fbs:         { x: 200,  y: 540 },
  rbs:         { x: 200,  y: 506 },
  ppbs:        { x: 200,  y: 472 },

  bp:          { x: 222.5,y: 385 },

  counseling:  { x: 41,   y: 245 },

  textSize:    10,
  counselingLineHeight: 12
};

// Utility: escape HTML for table or text insertion if ever needed
function escapeHtml(str) {
  return String(str ?? "").replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  // ---------- AUTH ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "station" && currentUser.role !== "documentation")) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in with Admin, Station, or Documentation role.",
      confirmButtonText: "OK"
    }).then(() => (window.location.href = "health-screening.html"));
    return;
  }

  // Navbar auth labels (same pattern as other pages)
  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");
  if (loggedInfo) loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  if (authBtn) {
    authBtn.textContent = "Logout";
    authBtn.onclick = () => {
      localStorage.removeItem("currentUser");
      window.location.href = "health-screening.html";
    };
  }

  // ---------- Elements ----------
  const formContainer = document.querySelector(".form-container");
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  // Preview DOM fields (IDs must match those in patient-report.html)
  const setIf = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = (value === undefined || value === null) ? "N/A" : value;
  };

  formContainer && (formContainer.style.display = "block");

  // ---------- FETCH PATIENT ----------  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idRaw = patientIDInput.value.trim();
    if (!idRaw) return;
    const id = encodeURIComponent(idRaw);

    try {
      // Fetch patient record (same as station)
      const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`, {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const rows = await res.json();
      if (!rows || rows.length === 0) {
        Swal.fire("Invalid ID", "No patient found with this ID.", "error");
        reportSection.style.display = "none";
        return;
      }

      const p = rows[0];
      window.currentPatient = p;

      // Basic patient fields (from patients table)
      setIf("name", p.name ?? "N/A");
      setIf("age", p.age ?? "N/A");
      setIf("gender", p.gender ?? "N/A");
      setIf("phone", p.phone ?? p.mobile ?? "N/A");
      setIf("address", p.address ?? "N/A");
      setIf("patientIdDisplay", p.id ?? idRaw);
      setIf("bmi", p.bmi ?? "N/A");

      // Default placeholders for tests until we fetch latest test entries
      setIf("hemoglobin", "N/A");
      setIf("rbg", "N/A");
      setIf("fev", "N/A");
      setIf("bp", "N/A");
      setIf("counselingPoints", "N/A");

      // NEW fields placeholders
      setIf("pulseRate", "N/A");
      setIf("temp", "N/A");
      setIf("spo2", "N/A");
      setIf("date", p.date ?? "N/A"); // p.date is used per your choice (Option B)
      setIf("fbs", "N/A");
      setIf("rbs", "N/A");
      setIf("ppbs", "N/A");

      // Show section
      reportSection.style.display = "block";
      Swal.fire("Patient Verified", "Report loaded successfully.", "success");

      // Now fetch latest patient_tests for this patient and populate preview values
      await populateLatestTestsForPatient(p);

    } catch (err) {
      console.error("Fetch patient error:", err);
      Swal.fire("Error", "Failed to fetch patient data.", "error");
      reportSection.style.display = "none";
    }
  });

  // ---------- Load latest tests and map them to preview fields ----------
  async function populateLatestTestsForPatient(p) {
    if (!p || !p.id) return;
    try {
      // Fetch all tests ordered descending by created_at (latest first)
      const res = await fetch(
        `${POSTGREST_URL}/patient_tests?patient_id=eq.${encodeURIComponent(p.id)}&order=created_at.desc`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const tests = await res.json();

      if (!tests || tests.length === 0) {
        // No test entries found — leave placeholders
        return;
      }

      // We will take the first (latest) entry for each test_type
      const latest = {}; // map test_type -> record
      for (const t of tests) {
        const type = (t.test_type ?? "").trim();
        if (!type) continue;
        if (!latest[type]) latest[type] = t;
      }

      // Helper to read numeric / text values
      const readValue = (rec) => {
        if (!rec) return null;
        if (rec.value_numeric !== undefined && rec.value_numeric !== null) return rec.value_numeric;
        if (rec.value_text !== undefined && rec.value_text !== null) return rec.value_text;
        return null;
      };

      // Map station test_type names -> preview fields
      // Station uses: Hemoglobin, RBG, FBS, PPBS, Heart Rate, Temperature, SpO2, BP, FEV, Counseling, etc.
      const map = {
        Hemoglobin: () => setIf("hemoglobin", readValue(latest["Hemoglobin"]) ?? "N/A"),
        RBG: () => setIf("rbg", readValue(latest["RBG"]) ?? "N/A"),
        FBS: () => setIf("fbs", readValue(latest["FBS"]) ?? "N/A"),
        PPBS: () => setIf("ppbs", readValue(latest["PPBS"]) ?? "N/A"),
        "Heart Rate": () => setIf("pulseRate", readValue(latest["Heart Rate"]) ?? "N/A"),
        Temperature: () => setIf("temp", readValue(latest["Temperature"]) ?? "N/A"),
        SpO2: () => setIf("spo2", readValue(latest["SpO2"]) ?? "N/A"),
        BP: () => {
          const rec = latest["BP"];
          const bpVal = rec?.value_text ?? readValue(rec) ?? "N/A";
          setIf("bp", bpVal);
        },
        FEV: () => setIf("fev", readValue(latest["FEV"]) ?? "N/A"),
        Counseling: () => setIf("counselingPoints", readValue(latest["Counseling"]) ?? "N/A"),
        OGTT: () => {} // not used in preview, but present in station
      };

      // Run map functions for known keys found in latest
      Object.keys(latest).forEach((k) => {
        if (map[k]) map[k]();
      });

      // Some redundancy / alternative keys:
      // Some records might be stored under other close names (e.g., "SpO₂" vs "SpO2"), try tolerant lookups:
      if (!latest["SpO2"] && latest["SpO₂"]) {
        setIf("spo2", readValue(latest["SpO₂"]) ?? "N/A");
      }
      if (!latest["Heart Rate"] && latest["HeartRate"]) {
        setIf("pulseRate", readValue(latest["HeartRate"]) ?? "N/A");
      }
      // Also map RBG -> rbs fallback if necessary
      if (!latest["RBS"] && latest["RBG"]) {
        setIf("rbs", readValue(latest["RBG"]) ?? "N/A");
      }

      // If patient object contains a saved BMI or date, prioritize that (date: p.date per your choice)
      if (p.bmi) setIf("bmi", p.bmi);
      if (p.date) setIf("date", p.date);

    } catch (err) {
      console.error("Error loading tests:", err);
      // leave placeholders; show error only in console
    }
  }

  // ---------- PDF GENERATION ----------
  document.getElementById("generatePDF").addEventListener("click", async () => {
    const p = window.currentPatient;
    if (!p) {
      Swal.fire("Error", "No patient data available", "error");
      return;
    }

    try {
      // fetch the template you uploaded: report_DMv3.pdf
      const res = await fetch("report_DMv3.pdf");
      if (!res.ok) throw new Error("PDF template not found (report_DMv3.pdf)");
      const pdfBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[0];

      const draw = (value, coord, size = COORDS.textSize) => {
        const text = (value === undefined || value === null) ? "" : String(value);
        page.drawText(text, { x: coord.x, y: coord.y, size, font });
      };

      const drawMultiline = (text, coord, size = COORDS.textSize, lineHeight = COORDS.counselingLineHeight) => {
        if (!text) return;
        const lines = String(text).split(/\r?\n/);
        let y = coord.y;
        for (const line of lines) {
          page.drawText(line, { x: coord.x, y, size, font });
          y -= lineHeight;
        }
      };

      // Gather preview values (read from DOM to make sure what user sees is exported)
      const getDom = (id) => {
        const el = document.getElementById(id);
        return el ? (el.innerText || "") : "";
      };

      draw(getDom("name") || p.name || "N/A", COORDS.name);
      draw(getDom("age") || p.age || "N/A", COORDS.age);
      draw(getDom("phone") || p.phone || p.mobile || "N/A", COORDS.phone);
      draw(getDom("gender") || p.gender || "N/A", COORDS.gender);
      draw(getDom("patientIdDisplay") || p.id || "N/A", COORDS.patientId);

      draw(getDom("pulseRate") || "N/A", COORDS.pulse);
      draw(getDom("spo2") || "N/A", COORDS.spo2);
      draw(getDom("bmi") || p.bmi || "N/A", COORDS.bmi);
      draw(getDom("temp") || "N/A", COORDS.temp);

      const dateDom = getDom("date") || p.date || (new Date().toLocaleDateString("en-GB"));
      draw(dateDom, COORDS.date);

      draw(getDom("fbs") || "N/A", COORDS.fbs);
      draw(getDom("rbs") || getDom("rbg") || "N/A", COORDS.rbs);
      draw(getDom("ppbs") || "N/A", COORDS.ppbs);

      draw(getDom("bp") || "N/A", COORDS.bp);

      const counselingText = getDom("counselingPoints") || p.counseling_points || p.counseling || "Results are subjected to clinical correlation. Please consult your physician/pharmacist.";
      drawMultiline(counselingText, COORDS.counseling, COORDS.textSize, COORDS.counselingLineHeight);

      // finalize & download
      const finalPdf = await pdfDoc.save();
      const blob = new Blob([finalPdf], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Patient_Report_${(p.id ?? "report")}.pdf`;
      link.click();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      Swal.fire("Error", "Could not generate PDF report", "error");
    }
  });

}); // DOMContentLoaded end

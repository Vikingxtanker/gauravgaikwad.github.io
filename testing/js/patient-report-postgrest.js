// js/patient-report-postgrest.js
// Updated to draw: patient name, age, phone, gender, patient id, BMI, pulse, temp, SpO2, date,
// FBS, RBS, PPBS, Blood Pressure, Counseling Point
// Template PDF used: report_DMv3.pdf
// (Adjust COORDS below as needed to align text visually on your template.)

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// --- Editable coordinates (x, y) for each field ---
// You can change these numbers to align text on the PDF visually.
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

  // Lab test positions (FBS / RBS / PPBS) — adjust vertical spacing if needed
  fbs:         { x: 200,  y: 540 },
  rbs:         { x: 200,  y: 506 },
  ppbs:        { x: 200,  y: 472 },

  // Blood pressure (systolic/diastolic)
  bp:          { x: 222.5,y: 385 },

  // Counseling (multi-line)
  counseling:  { x: 41,   y: 245 },

  // text size and line height for multiline counseling
  textSize:    10,
  counselingLineHeight: 12
};

document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.querySelector(".form-container");
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");

  // ---------- AUTH ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "documentation" && currentUser.role !== "station")) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in with Admin, Station, or Documentation role.",
      confirmButtonText: "OK"
    }).then(() => (window.location.href = "health-screening.html"));
    return;
  }

  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };

  formContainer.style.display = "block";

  // ---------- FETCH PATIENT ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim().toLowerCase();
    if (!id) return;

    try {
      const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${id}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      if (data.length === 0) {
        Swal.fire("Invalid ID", "No patient found with this ID.", "error");
        reportSection.style.display = "none";
        return;
      }

      const p = data[0];
      window.currentPatient = p;

      await Swal.fire("Patient Verified", "Report loaded successfully.", "success");

      // Populate whatever DOM fields exist (non-blocking if element missing)
      const setIf = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value ?? "N/A";
      };

      setIf("name", p.name ?? "N/A");
      setIf("age", p.age ?? "N/A");
      setIf("gender", p.gender ?? "N/A");
      setIf("phone", p.phone ?? "N/A");
      setIf("address", p.address ?? "N/A");
      setIf("bmi", p.bmi ?? "N/A");
      setIf("hemoglobin", p.hemoglobin ?? "Not Recorded");
      setIf("rbg", p.rbg ?? p.rbs ?? "Not Recorded"); // backward tolerance
      setIf("fev", p.fev ?? "Not Recorded");
      setIf("bp", (p.systolic && p.diastolic) ? `${p.systolic}/${p.diastolic}` : "Not Recorded");
      setIf("counselingPoints", p.counseling_points ?? p.counseling ?? "Not Recorded");
      setIf("patientIdDisplay", p.id ?? id);

      // store extra fields into window.currentPatient for PDF routine
      // tolerate different field names: rbs/rbg, ppbs/ppg, pulse/heart_rate, temp/temperature, spo2/spo_2
      p._pulse = p.pulse ?? p.heart_rate ?? p.pulse_rate ?? p.pulseRate ?? p.pulse_rate;
      p._temp = p.temp ?? p.temperature ?? p.body_temp ?? p.bodyTemperature;
      p._spo2 = p.spo2 ?? p.spO2 ?? p.sp_o2 ?? p.sp_o_2;
      p._fbs = p.fbs ?? p.fasting_blood_sugar;
      p._rbs = p.rbs ?? p.rbg ?? p.random_blood_sugar;
      p._ppbs = p.ppbs ?? p.ppg ?? p.post_prandial_blood_sugar ?? p.postprandial;

      reportSection.style.display = "block";
    } catch (err) {
      console.error("Error fetching patient:", err);
      Swal.fire("Error", "Failed to fetch patient data.", "error");
    }
  });

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

      // helper to draw simple single-line values
      const draw = (value, coord, size = COORDS.textSize) => {
        const text = (value === undefined || value === null) ? "" : String(value);
        page.drawText(text, { x: coord.x, y: coord.y, size, font });
      };

      // helper to draw multi-line counseling text (wrap by newline; simple approach)
      const drawMultiline = (text, coord, size = COORDS.textSize, lineHeight = COORDS.counselingLineHeight) => {
        if (!text) return;
        const lines = String(text).split(/\r?\n/);
        let y = coord.y;
        for (const line of lines) {
          page.drawText(line, { x: coord.x, y, size, font });
          y -= lineHeight;
        }
      };

      // Draw fields using COORDS (fall back to "N/A" for empty clinical values if you want)
      draw(p.name ?? "N/A", COORDS.name);
      draw(p.age ?? "N/A", COORDS.age);
      draw(p.phone ?? "N/A", COORDS.phone);
      draw(p.gender ?? "N/A", COORDS.gender);
      draw(p.id ?? p.patient_id ?? p.patientId ?? "N/A", COORDS.patientId);

      // vitals
      draw(p._pulse ?? p.pulse ?? "N/A", COORDS.pulse);
      draw(p._spo2 ?? p.spo2 ?? "N/A", COORDS.spo2);
      draw(p.bmi ?? "N/A", COORDS.bmi);
      draw(p._temp ?? p.temp ?? "N/A", COORDS.temp);

      // date (format dd/mm/yyyy)
      const dateStr = new Date().toLocaleDateString("en-GB");
      draw(dateStr, COORDS.date);

      // Lab tests (FBS, RBS, PPBS) - use prioritized fields if available
      draw(p._fbs ?? p.fbs ?? "N/A", COORDS.fbs);
      draw(p._rbs ?? p.rbs ?? p.rbg ?? "N/A", COORDS.rbs);
      draw(p._ppbs ?? p.ppbs ?? "N/A", COORDS.ppbs);

      // Blood pressure: prefer systolic/diastolic fields
      const bpText = (p.systolic && p.diastolic) ? `${p.systolic}/${p.diastolic}` :
                     p.bp ?? p.blood_pressure ?? "N/A";
      draw(bpText, COORDS.bp);

      // Counseling points (multi-line)
      const counselingText = p.counseling_points ?? p.counseling ?? p.counselingPoints ?? "Results are subjected to clinical co-relation. Kindly contact your pharmacist or doctor for further suggestions.";
      drawMultiline(counselingText, COORDS.counseling, COORDS.textSize, COORDS.counselingLineHeight);

      // finalize
      const finalPdf = await pdfDoc.save();
      const blob = new Blob([finalPdf], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Patient_Report_${(p.id ?? p.patient_id ?? "report")}.pdf`;
      link.click();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      Swal.fire("Error", "Could not generate PDF report", "error");
    }
  });
});

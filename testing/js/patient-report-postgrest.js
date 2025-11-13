// FINAL – patient-report-postgrest.js
// Fully aligned to your Neon test_type list (BP, Counseling, FBS, etc.)

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

/* PDF COORDINATES */
const COORDS = {
  name:   { x:126,  y:675 },
  age:    { x:408,  y:675 },
  phone:  { x:82,   y:655 },
  gender: { x:423,  y:655 },
  patientId: { x:106, y:635 },
  pulse:  { x:230,  y:655 },
  spo2:   { x:320,  y:655 },
  bmi:    { x:409,  y:635 },
  temp:   { x:300,  y:619 },
  date:   { x:74,   y:619 },

  fbs:  { x:200, y:540 },
  rbs:  { x:200, y:506 },
  ppbs: { x:200, y:472 },

  bp:  { x:222.5, y:385 },

  counseling: { x:41, y:245 },

  textSize: 10,
  counselingLineHeight: 12
};

// Utility
const setText = (id, val) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = (val === null || val === undefined || val === "") ? "N/A" : val;
};

document.addEventListener("DOMContentLoaded", () => {
  
  /* AUTH CHECK */
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !["admin","station","documentation"].includes(currentUser.role)) {
    Swal.fire("Access Denied","Login as Admin/Station/Documentation","error")
    .then(()=>window.location="health-screening.html");
    return;
  }

  document.getElementById("loggedInfo").innerText =
    `Logged in as ${currentUser.username} (${currentUser.role})`;
  document.getElementById("authBtn").innerText = "Logout";
  document.getElementById("authBtn").onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href="health-screening.html";
  };

  const formContainer = document.querySelector(".form-container");
  formContainer.style.display = "block";

  const form = document.getElementById("reportForm");
  const reportSection = document.getElementById("reportSection");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pid = document.getElementById("patientID").value.trim();
    if (!pid) return;

    /* Fetch patient */
    const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${pid}`);
    const data = await res.json();
    if (data.length === 0) {
      Swal.fire("Invalid ID","No patient found","error");
      return;
    }

    const p = data[0];
    window.currentPatient = p;

    // Basic fields
    setText("name", p.name);
    setText("age", p.age);
    setText("gender", p.gender);
    setText("phone", p.phone ?? p.mobile);
    setText("address", p.address);
    setText("patientIdDisplay", p.id);
    setText("bmi", p.bmi);
    setText("date", p.date);  // Your choice: Option B (from DB)

    // Reset all dynamic fields
    setText("pulseRate", "N/A");
    setText("temp", "N/A");
    setText("spo2", "N/A");
    setText("fbs", "N/A");
    setText("rbs", "N/A");
    setText("ppbs", "N/A");
    setText("rbg", "N/A");
    setText("hemoglobin", "N/A");
    setText("fev", "N/A");
    setText("bp", "N/A");
    setText("counselingPoints", "N/A");

    reportSection.style.display = "block";

    await loadLatestTests(p.id);
  });
});

/* Load patient_tests (latest first) */
async function loadLatestTests(patientID) {
  const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${patientID}&order=created_at.desc`);
  const tests = await res.json();

  // Helper: find latest by exact test_type
  const get = (type) => tests.find(t => t.test_type === type);

  /* MAP EXACTLY AS PER YOUR DATABASE */

  // Pulse
  const pulse = get("Heart Rate");
  setText("pulseRate", pulse?.value_numeric ?? pulse?.value_text);

  // Temp
  const temp = get("Temperature");
  setText("temp", temp?.value_numeric ?? temp?.value_text);

  // SpO2
  const spo2 = get("SpO2");
  setText("spo2", spo2?.value_numeric ?? spo2?.value_text);

  // FBS
  const fbs = get("FBS");
  setText("fbs", fbs?.value_numeric ?? fbs?.value_text);

  // RBG
  const rbg = get("RBG");
  setText("rbg", rbg?.value_numeric ?? rbg?.value_text);
  setText("rbs", rbg?.value_numeric ?? rbg?.value_text); // keep both synced

  // PPBS
  const ppbs = get("PPBS");
  setText("ppbs", ppbs?.value_numeric ?? ppbs?.value_text);

  // Hemoglobin
  const hgb = get("Hemoglobin");
  setText("hemoglobin", hgb?.value_numeric ?? hgb?.value_text);

  // FEV
  const fev = get("FEV");
  setText("fev", fev?.value_numeric ?? fev?.value_text);

  // Blood Pressure (EXACT)
  const bp = get("BP");
  setText("bp", bp?.value_text ?? bp?.value_numeric);

  // Counseling (EXACT)
  const counseling = get("Counseling");
  setText("counselingPoints", counseling?.value_text ?? counseling?.value_numeric);
}

/* PDF GENERATION */
document.addEventListener("click", async (e) => {
  if (e.target.id !== "generatePDF") return;

  const p = window.currentPatient;
  if (!p) return Swal.fire("Error","No patient loaded","error");

  const file = await fetch("report_DMv3.pdf");
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  const draw = (value, coord, size = COORDS.textSize) => {
    if (!value || value === "N/A") return;
    page.drawText(String(value), { x: coord.x, y: coord.y, size, font });
  };

  const drawMulti = (txt, coord, size=10, lh=12) => {
    if (!txt || txt==="N/A") return;
    const lines = txt.split("\n");
    let y = coord.y;
    for (let line of lines) {
      page.drawText(line, { x: coord.x, y, size, font });
      y -= lh;
    }
  };

  // Pull values from HTML (guaranteed accurate)
  const val = id => document.getElementById(id).innerText;

  draw(val("name"), COORDS.name);
  draw(val("age"), COORDS.age);
  draw(val("phone"), COORDS.phone);
  draw(val("gender"), COORDS.gender);
  draw(val("patientIdDisplay"), COORDS.patientId);

  draw(val("pulseRate"), COORDS.pulse);
  draw(val("spo2"), COORDS.spo2);
  draw(val("bmi"), COORDS.bmi);
  draw(val("temp"), COORDS.temp);

  draw(val("date"), COORDS.date);

  draw(val("fbs"), COORDS.fbs);
  draw(val("rbs"), COORDS.rbs);
  draw(val("ppbs"), COORDS.ppbs);

  draw(val("bp"), COORDS.bp);

  drawMulti(val("counselingPoints"), COORDS.counseling);

  const finalPdf = await pdfDoc.save();
  const blob = new Blob([finalPdf], { type:"application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Patient_Report_${p.id}.pdf`;
  link.click();
});

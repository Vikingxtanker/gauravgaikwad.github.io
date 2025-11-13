// js/patient-report-postgrest.js
// Reads Systolic and Diastolic separately (if present) and combines as "sys/dia" for HTML preview and PDF.
// Falls back to BP (combined) if separate values missing. Reads Counseling from exact "Counseling".

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

/* PDF COORDS (tweak if needed) */
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

const setText = (id, val) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = (val === null || val === undefined || val === "") ? "N/A" : String(val);
};

document.addEventListener("DOMContentLoaded", () => {
  // auth
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !["admin","station","documentation"].includes(currentUser.role)) {
    Swal.fire("Access Denied","Login as Admin/Station/Documentation","error").then(()=>window.location="health-screening.html");
    return;
  }
  document.getElementById("loggedInfo").innerText = `Logged in as ${currentUser.username} (${currentUser.role})`;
  document.getElementById("authBtn").innerText = "Logout";
  document.getElementById("authBtn").onclick = () => { localStorage.removeItem("currentUser"); window.location.href="health-screening.html"; };

  const formContainer = document.querySelector(".form-container");
  formContainer && (formContainer.style.display = "block");

  const form = document.getElementById("reportForm");
  const reportSection = document.getElementById("reportSection");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pid = document.getElementById("patientID").value.trim();
    if (!pid) return;

    try {
      const res = await fetch(`${POSTGREST_URL}/patients?id=eq.${encodeURIComponent(pid)}`, { headers:{ Accept:"application/json" }});
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const rows = await res.json();
      if (!rows || rows.length === 0) {
        Swal.fire("Invalid ID","No patient found with this ID.","error");
        reportSection.style.display = "none";
        return;
      }
      const p = rows[0];
      window.currentPatient = p;

      // populate basic patient fields
      setText("name", p.name);
      setText("age", p.age);
      setText("gender", p.gender);
      setText("phone", p.phone ?? p.mobile);
      setText("address", p.address);
      setText("patientIdDisplay", p.id);
      setText("bmi", p.bmi);
      setText("date", p.date ?? "N/A");

      // placeholders
      ["pulseRate","temp","spo2","fbs","rbs","ppbs","rbg","hemoglobin","fev","bp","counselingPoints"].forEach(id => setText(id, "N/A"));

      reportSection.style.display = "block";
      Swal.fire("Patient Verified","Report loaded successfully.","success");

      // load tests and populate
      await populateLatestTestsForPatient(p.id, p);
    } catch (err) {
      console.error("Load patient error:", err);
      Swal.fire("Error","Failed to fetch patient data.","error");
      reportSection.style.display = "none";
    }
  });

  async function populateLatestTestsForPatient(patientID, patientRow) {
    if (!patientID) return;
    try {
      const res = await fetch(`${POSTGREST_URL}/patient_tests?patient_id=eq.${encodeURIComponent(patientID)}&order=created_at.desc`, { headers:{ Accept:"application/json"}});
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const tests = await res.json();
      if (!tests || tests.length === 0) {
        console.log("No patient_tests found for", patientID);
        // if patient row already has stored systolic/diastolic use them
        if (patientRow?.systolic && patientRow?.diastolic) {
          setText("bp", `${patientRow.systolic}/${patientRow.diastolic}`);
        }
        setText("counselingPoints", patientRow?.counseling_points ?? patientRow?.counseling ?? "N/A");
        return;
      }

      // helper findByType exact
      const find = (type) => tests.find(t => t.test_type === type);

      // Heart Rate -> pulseRate
      const hr = find("Heart Rate");
      if (hr) setText("pulseRate", hr.value_numeric ?? hr.value_text);

      // Temperature
      const tmp = find("Temperature");
      if (tmp) setText("temp", tmp.value_numeric ?? tmp.value_text);

      // SpO2
      const sp = find("SpO2");
      if (sp) setText("spo2", sp.value_numeric ?? sp.value_text);

      // Hemoglobin
      const h = find("Hemoglobin");
      if (h) setText("hemoglobin", h.value_numeric ?? h.value_text);

      // RBG (use for both rbg & rbs fallback)
      const rbg = find("RBG");
      if (rbg) {
        const v = rbg.value_numeric ?? rbg.value_text;
        setText("rbg", v);
        setText("rbs", v);
      }

      // FBS
      const f = find("FBS");
      if (f) setText("fbs", f.value_numeric ?? f.value_text);

      // PPBS
      const pp = find("PPBS");
      if (pp) setText("ppbs", pp.value_numeric ?? pp.value_text);

      // FEV
      const fev = find("FEV");
      if (fev) setText("fev", fev.value_numeric ?? fev.value_text);

      // Counseling (exact)
      const counsel = find("Counseling");
      if (counsel) {
        setText("counselingPoints", counsel.value_text ?? counsel.value_numeric ?? "N/A");
      } else {
        // fallback to patient row fields
        setText("counselingPoints", patientRow?.counseling_points ?? patientRow?.counseling ?? "N/A");
      }

      // ---------- BLOOD PRESSURE HANDLING ----------
      // Try Systolic + Diastolic exact types first
      const syst = find("Systolic");
      const diast = find("Diastolic");
      if (syst && diast) {
        const sVal = syst.value_numeric ?? syst.value_text;
        const dVal = diast.value_numeric ?? diast.value_text;
        setText("bp", `${sVal ?? "N/A"}/${dVal ?? "N/A"}`);
      } else {
        // fallback to combined BP record
        const bpRec = find("BP");
        if (bpRec) {
          const val = bpRec.value_text ?? bpRec.value_numeric;
          setText("bp", val);
        } else if (patientRow?.systolic && patientRow?.diastolic) {
          setText("bp", `${patientRow.systolic}/${patientRow.diastolic}`);
        } else {
          setText("bp", "N/A");
        }
      }

    } catch (err) {
      console.error("Error loading tests:", err);
    }
  }

  // ---------- PDF generation ----------
  document.getElementById("generatePDF").addEventListener("click", async () => {
    const p = window.currentPatient;
    if (!p) {
      Swal.fire("Error","No patient data available","error");
      return;
    }

    try {
      const res = await fetch("report_DMv3.pdf");
      if (!res.ok) throw new Error("PDF template not found (report_DMv3.pdf)");
      const pdfBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[0];

      const draw = (value, coord, size = COORDS.textSize) => {
        if (!value || value === "N/A") return;
        page.drawText(String(value), { x: coord.x, y: coord.y, size, font });
      };

      const drawMultiline = (txt, coord, size = COORDS.textSize, lh = COORDS.counselingLineHeight) => {
        if (!txt || txt === "N/A") return;
        const lines = String(txt).split(/\r?\n/);
        let y = coord.y;
        for (const line of lines) {
          if (line.trim() !== "") page.drawText(line, { x: coord.x, y, size, font });
          y -= lh;
        }
      };

      const getDom = (id) => {
        const el = document.getElementById(id);
        return el ? (el.innerText || "") : "";
      };

      // Build final BP for PDF: prefer DOM (which already combined) else combine Systolic+Diastolic from tests/patient row
      let bpVal = getDom("bp");
      if (!bpVal || bpVal === "N/A") {
        // try patient row
        if (p.systolic && p.diastolic) bpVal = `${p.systolic}/${p.diastolic}`;
      }

      const payload = {
        name: getDom("name") || p.name || "",
        age: getDom("age") || p.age || "",
        phone: getDom("phone") || p.phone || p.mobile || "",
        gender: getDom("gender") || p.gender || "",
        patientId: getDom("patientIdDisplay") || p.id || "",
        pulse: getDom("pulseRate") || "",
        spo2: getDom("spo2") || "",
        bmi: getDom("bmi") || p.bmi || "",
        temp: getDom("temp") || "",
        date: getDom("date") || p.date || (new Date().toLocaleDateString("en-GB")),
        fbs: getDom("fbs") || "",
        rbs: getDom("rbs") || getDom("rbg") || "",
        ppbs: getDom("ppbs") || "",
        bp: bpVal || "",
        counseling: getDom("counselingPoints") || p.counseling_points || p.counseling || ""
      };

      console.log("PDF payload:", payload);

      draw(payload.name, COORDS.name);
      draw(payload.age, COORDS.age);
      draw(payload.phone, COORDS.phone);
      draw(payload.gender, COORDS.gender);
      draw(payload.patientId, COORDS.patientId);

      draw(payload.pulse, COORDS.pulse);
      draw(payload.spo2, COORDS.spo2);
      draw(payload.bmi, COORDS.bmi);
      draw(payload.temp, COORDS.temp);

      draw(payload.date, COORDS.date);

      draw(payload.fbs, COORDS.fbs);
      draw(payload.rbs, COORDS.rbs);
      draw(payload.ppbs, COORDS.ppbs);

      draw(payload.bp, COORDS.bp);

      drawMultiline(payload.counseling, COORDS.counseling);

      const finalPdf = await pdfDoc.save();
      const blob = new Blob([finalPdf], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Patient_Report_${p.id}.pdf`;
      link.click();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      Swal.fire("Error", "Could not generate PDF report", "error");
    }
  });
});

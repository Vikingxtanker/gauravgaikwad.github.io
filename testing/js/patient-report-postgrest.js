// js/patient-report-postgrest.js
// More robust PostgREST patient report loader - tolerant test_type lookup and BP/counseling handling.
// Replace prior file with this. Ensure report_DMv3.pdf exists and POSTGREST_URL is correct.

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// Editable coordinates (x, y) for each field on your PDF template
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

// small helper to safely set DOM text
const setText = (id, value) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = (value === undefined || value === null || value === "") ? "N/A" : String(value);
};

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

  const formContainer = document.querySelector(".form-container");
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  if (formContainer) formContainer.style.display = "block";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idRaw = patientIDInput.value.trim();
    if (!idRaw) return;
    const id = encodeURIComponent(idRaw);

    try {
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

      // populate patient basic fields
      setText("name", p.name ?? "N/A");
      setText("age", p.age ?? "N/A");
      setText("gender", p.gender ?? "N/A");
      setText("phone", p.phone ?? p.mobile ?? "N/A");
      setText("address", p.address ?? "N/A");
      setText("patientIdDisplay", p.id ?? idRaw);
      setText("bmi", p.bmi ?? "N/A");

      // placeholders
      setText("hemoglobin", "N/A");
      setText("rbg", "N/A");
      setText("fev", "N/A");
      setText("bp", "N/A");
      setText("counselingPoints", p.counseling_points ?? p.counseling ?? "N/A");

      // new placeholders
      setText("pulseRate", "N/A");
      setText("temp", "N/A");
      setText("spo2", "N/A");
      setText("date", p.date ?? "N/A");
      setText("fbs", "N/A");
      setText("rbs", "N/A");
      setText("ppbs", "N/A");

      reportSection.style.display = "block";
      Swal.fire("Patient Verified", "Report loaded successfully.", "success");

      // fetch and populate tests
      await populateLatestTestsForPatient(p);
    } catch (err) {
      console.error("Fetch patient error:", err);
      Swal.fire("Error", "Failed to fetch patient data.", "error");
      reportSection.style.display = "none";
    }
  });

  // ===== robust lookup helpers =====
  function normalizeType(t) {
    if (!t) return "";
    return String(t).trim().toLowerCase();
  }

  function findFirstMatch(tests, candidates) {
    // candidates: array of strings or regex; returns first matching test record
    for (const c of candidates) {
      for (const t of tests) {
        const tt = normalizeType(t.test_type);
        if (typeof c === "string") {
          if (tt === c.toLowerCase() || tt.includes(c.toLowerCase())) return t;
        } else if (c instanceof RegExp) {
          if (c.test(tt)) return t;
        }
      }
    }
    return null;
  }

  function readValue(rec) {
    if (!rec) return null;
    if (rec.value_numeric !== undefined && rec.value_numeric !== null) return rec.value_numeric;
    if (rec.value_text !== undefined && rec.value_text !== null) return rec.value_text;
    return null;
  }

  async function populateLatestTestsForPatient(p) {
    if (!p || !p.id) return;
    try {
      const res = await fetch(
        `${POSTGREST_URL}/patient_tests?patient_id=eq.${encodeURIComponent(p.id)}&order=created_at.desc`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const tests = await res.json();
      if (!tests || tests.length === 0) {
        console.log("No patient_tests found for", p.id);
        return;
      }

      // quick map by normalized type for visibility
      const typesSeen = [...new Set(tests.map(t => normalizeType(t.test_type)))];
      console.log("patient_tests typesSeen (latest-first):", typesSeen.slice(0,40));

      // tolerant lookups for important fields
      // Pulse / Heart Rate
      const pulseCandidates = ["heart rate", "heart_rate", "pulse", "pulse rate", "heartrate", /^hr$/];
      const pulseRec = findFirstMatch(tests, pulseCandidates);
      if (pulseRec) {
        setText("pulseRate", readValue(pulseRec) ?? "N/A");
        console.log("Found pulse record:", pulseRec);
      }

      // Temperature
      const tempCandidates = ["temperature", "temp", "body temperature", "body_temp"];
      const tempRec = findFirstMatch(tests, tempCandidates);
      if (tempRec) {
        setText("temp", readValue(tempRec) ?? "N/A");
        console.log("Found temp record:", tempRec);
      }

      // SpO2
      const spo2Candidates = ["spo2", "sp o2", "sp o₂", "sp02", "oxygen saturation", /spo/i];
      const spo2Rec = findFirstMatch(tests, spo2Candidates);
      if (spo2Rec) {
        setText("spo2", readValue(spo2Rec) ?? "N/A");
        console.log("Found spo2 record:", spo2Rec);
      }

      // Hemoglobin (common)
      const hemoRec = findFirstMatch(tests, ["hemoglobin", "hb", "hbg"]);
      if (hemoRec) {
        setText("hemoglobin", readValue(hemoRec) ?? "N/A");
        console.log("Found hemoglobin record:", hemoRec);
      }

      // RBG / RBS (random)
      const rbgRec = findFirstMatch(tests, ["rbg", "rbs", "random blood glucose", "random_glucose"]);
      if (rbgRec) {
        setText("rbg", readValue(rbgRec) ?? "N/A");
        // also populate rbs field if it exists separately
        if (!document.getElementById("rbs").innerText || document.getElementById("rbs").innerText === "N/A") {
          setText("rbs", readValue(rbgRec) ?? "N/A");
        }
        console.log("Found rbg/rbs record:", rbgRec);
      }

      // FBS
      const fbsRec = findFirstMatch(tests, ["fbs", "fasting blood sugar", "fasting_glucose"]);
      if (fbsRec) {
        setText("fbs", readValue(fbsRec) ?? "N/A");
        console.log("Found fbs record:", fbsRec);
      }

      // PPBS
      const ppbsRec = findFirstMatch(tests, ["ppbs", "ppg", "post prandial", "post-prandial", "postprandial"]);
      if (ppbsRec) {
        setText("ppbs", readValue(ppbsRec) ?? "N/A");
        console.log("Found ppbs record:", ppbsRec);
      }

      // FEV
      const fevRec = findFirstMatch(tests, ["fev", "fev1", "fev_1"]);
      if (fevRec) {
        setText("fev", readValue(fevRec) ?? "N/A");
        console.log("Found fev record:", fevRec);
      }

      // Blood Pressure: try multiple patterns
      // 1) Systolic + Diastolic stored separately
      const sysRec = findFirstMatch(tests, ["systolic", "systolic bp", "systolic_pressure"]);
      const diaRec = findFirstMatch(tests, ["diastolic", "diastolic bp", "diastolic_pressure"]);
      if (sysRec && diaRec) {
        const s = readValue(sysRec);
        const d = readValue(diaRec);
        setText("bp", `${s ?? "N/A"}/${d ?? "N/A"}`);
        console.log("Found separate systolic and diastolic", sysRec, diaRec);
      } else {
        // 2) single BP-like record (names: bp, blood pressure, bp_mm_hg, pressure)
        const bpRec = findFirstMatch(tests, ["bp", "blood pressure", "blood_pressure", "bp (mmhg)", /blood.*press/]);
        if (bpRec) {
          // if record has value_text like "120/80" use it, else numeric may be present
          const v = bpRec.value_text ?? readValue(bpRec);
          setText("bp", v ?? "N/A");
          console.log("Found single BP record:", bpRec);
        } else {
          // 3) maybe stored as "systolic/diastolic" within a text record under some other name; try to parse any value_text that contains '/'
          const slashRec = tests.find(t => String(t.value_text ?? "").includes("/"));
          if (slashRec) {
            setText("bp", slashRec.value_text);
            console.log("Found slash BP in other record:", slashRec);
          }
        }
      }

      // Counseling / Advice - tolerant lookups
      const counselRec = findFirstMatch(tests, ["counsel", "counselling", "counseling", "advice", "recommendation", "remarks", "notes"]);
      if (counselRec) {
        setText("counselingPoints", readValue(counselRec) ?? "N/A");
        console.log("Found counseling record:", counselRec);
      } else {
        // fallback to patient table fields
        const pCoun = p.counseling_points ?? p.counseling ?? p.advice ?? p.remarks;
        if (pCoun) {
          setText("counselingPoints", pCoun);
          console.log("Found counseling in patient row:", pCoun);
        }
      }

      // if patient has date stored prefer that; else, keep existing DOM date (already set to p.date earlier)
      if (p.date) setText("date", p.date);

    } catch (err) {
      console.error("Error loading tests:", err);
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
      const res = await fetch("report_DMv3.pdf");
      if (!res.ok) throw new Error("PDF template not found (report_DMv3.pdf)");
      const pdfBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[0];

      const draw = (value, coord, size = COORDS.textSize) => {
        const text = (value === undefined || value === null) ? "" : String(value);
        if (!text) return;
        page.drawText(text, { x: coord.x, y: coord.y, size, font });
      };

      const drawMultiline = (text, coord, size = COORDS.textSize, lineHeight = COORDS.counselingLineHeight) => {
        if (!text) return;
        const lines = String(text).split(/\r?\n/);
        let y = coord.y;
        for (const line of lines) {
          if (line.trim() !== "") page.drawText(line, { x: coord.x, y, size, font });
          y -= lineHeight;
        }
      };

      const getDom = (id) => {
        const el = document.getElementById(id);
        return el ? (el.innerText || "").trim() : "";
      };

      // debug: log what we'll place into PDF
      const debugPayload = {
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
        bp: getDom("bp") || "",
        counseling: getDom("counselingPoints") || p.counseling_points || p.counseling || ""
      };
      console.log("PDF payload:", debugPayload);

      draw(debugPayload.name, COORDS.name);
      draw(debugPayload.age, COORDS.age);
      draw(debugPayload.phone, COORDS.phone);
      draw(debugPayload.gender, COORDS.gender);
      draw(debugPayload.patientId, COORDS.patientId);

      draw(debugPayload.pulse, COORDS.pulse);
      draw(debugPayload.spo2, COORDS.spo2);
      draw(debugPayload.bmi, COORDS.bmi);
      draw(debugPayload.temp, COORDS.temp);

      draw(debugPayload.date, COORDS.date);

      draw(debugPayload.fbs, COORDS.fbs);
      draw(debugPayload.rbs, COORDS.rbs);
      draw(debugPayload.ppbs, COORDS.ppbs);

      draw(debugPayload.bp, COORDS.bp);

      drawMultiline(debugPayload.counseling, COORDS.counseling);

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

// js/patient-report.js
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.querySelector(".form-container");
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  const loggedInfo = document.getElementById("loggedInfo");
  const authBtn = document.getElementById("authBtn");

  // Hide content until auth passes
  formContainer.style.display = "none";

  // ---------- AUTH CHECK ----------
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "documentation")) {
    Swal.fire({
      icon: "error",
      title: "Access Denied",
      text: "You must be logged in with Admin or Documentation role to access this page.",
      confirmButtonText: "OK"
    }).then(() => {
      window.location.href = "health-screening.html";
    });
    return;
  }

  // User allowed
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.onclick = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  };

  formContainer.style.display = "block";

  // ---------- PATIENT FETCH ----------
  patientIDInput.value = "";
  window.currentPatient = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim().toLowerCase();
    if (!id) return;

    try {
      const snap = await getDoc(doc(db, "patients", id));
      if (!snap.exists()) {
        Swal.fire("Invalid ID", "No patient found with this ID", "error");
        reportSection.style.display = "none";
        return;
      }

      const data = snap.data();
      window.currentPatient = { id, ...data };

      await Swal.fire("Patient Verified", "Report loaded successfully.", "success");

      document.getElementById("name").innerText = data.name ?? "N/A";
      document.getElementById("age").innerText = data.age ?? "N/A";
      document.getElementById("gender").innerText = data.gender ?? "N/A";
      document.getElementById("phone").innerText = data.phone ?? "N/A";
      document.getElementById("address").innerText = data.address ?? "N/A";
      document.getElementById("hemoglobin").innerText = data.hemoglobin ?? "Not Recorded";
      document.getElementById("rbg").innerText = data.rbg ?? data.randomBloodGlucose ?? "Not Recorded";
      document.getElementById("fev").innerText = data.fev ?? "Not Recorded";
      document.getElementById("bp").innerText =
        (data.systolic && data.diastolic)
          ? `${data.systolic}/${data.diastolic}`
          : data.bloodPressure ?? "Not Recorded";
      document.getElementById("bmi").innerText = data.bmi ?? "N/A";
      document.getElementById("counselingPoints").innerText = data.counselingPoints ?? "Not Recorded";
      document.getElementById("patientIdDisplay").innerText = id;

      reportSection.style.display = "block";
    } catch (err) {
      console.error("Error fetching patient:", err);
      Swal.fire("Error", "Could not fetch patient data", "error");
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
      const res = await fetch("report_hss.pdf"); // ensure filename matches your project
      if (!res.ok) throw new Error("PDF template not found");

      const pdfBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[0];

      const draw = (text, x, y) =>
        page.drawText(text?.toString() ?? "", { x, y, size: 10, font });

      draw(p.name ?? "", 126, 675);
      draw(p.age ?? "", 408, 675);
      draw(p.phone ?? "", 82, 657);
      draw(p.gender ?? "", 423, 657);
      draw(p.id ?? "", 106, 638);
      draw(p.bmi ?? "", 409, 638);
      draw(new Date().toLocaleDateString("en-GB"), 74, 619);

      draw(p.hemoglobin ?? "N/A", 222.5, 535);
      draw(p.fev ?? "N/A", 222.5, 422);
      draw(p.rbg ?? p.randomBloodGlucose ?? "N/A", 222.5, 461);
      draw(
        (p.systolic && p.diastolic)
          ? `${p.systolic}/${p.diastolic}`
          : p.bloodPressure ?? "N/A",
        222.5,
        385
      );

      draw(p.counselingPoints ?? "N/A", 41, 245);

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

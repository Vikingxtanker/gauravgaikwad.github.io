// js/certificate.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("participantName");
  const verifyBtn = document.getElementById("verifyBtn");
  const container = document.getElementById("certificateContainer");
  const downloadBtn = document.getElementById("downloadBtn");

  let generatedPdfBytes = null;

  verifyBtn.addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) {
      Swal.fire("Input Required", "Please enter your registered name.", "warning");
      return;
    }

    Swal.fire({ title: "Verifying...", text: "Please wait...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      // Check participant in Firestore
      const participantsRef = collection(db, "participants");
      const q = query(participantsRef, where("name", "==", name));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Swal.fire("Not Found", "No participant found with this name.", "error");
        return;
      }

      const participant = snapshot.docs[0].data();
      container.classList.remove("d-none");

      // Load PDF template
      const res = await fetch("assets/healthcamp_certificate_template.pdf");
      if (!res.ok) throw new Error("PDF template not found or path is incorrect");

      const templateBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      const fontBytes = await fetch("assets/fonts/AlexBrush-Regular.ttf").then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // Draw participant name (adjust X,Y as needed)
      page.drawText(participant.name.toUpperCase(), {
        x: 250,
        y: 285.5,
        size: 36,
        font,
        color: PDFLib.rgb(0, 0, 0),
      });

      generatedPdfBytes = await pdfDoc.save();

      Swal.fire("Success!", "Certificate generated! Click download to save.", "success");

    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not generate certificate.", "error");
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!generatedPdfBytes) {
      Swal.fire("Error", "No certificate generated yet.", "warning");
      return;
    }

    const blob = new Blob([generatedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Certificate_${input.value}.pdf`;
    a.click();
  });
});

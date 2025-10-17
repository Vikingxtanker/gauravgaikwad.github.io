// js/certificate.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

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

    Swal.fire({
      title: "Verifying...",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

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
      if (!res.ok) throw new Error("PDF template not found");
      const templateBytes = await res.arrayBuffer();

      // Load PDF document
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);

      // Register fontkit (UMD version from window)
      pdfDoc.registerFontkit(window.fontkit);

      // Embed custom font
      const fontBytes = await fetch("assets/fonts/AlexBrush-Regular.ttf").then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // Draw participant name centered horizontally
      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const fontSize = 36;
      const text = participant.name;

      // Measure text width
      const textWidth = customFont.widthOfTextAtSize(text, fontSize);

      // Calculate X coordinate for center alignment
      const x = (pageWidth - textWidth) / 2;

      page.drawText(text, {
        x: x,
        y: 285.5, // Vertical position
        size: fontSize,
        font: customFont,
        color: PDFLib.rgb(0, 0, 0)
      });

      // Save PDF
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
    a.download = `Certificate_${input.value.trim()}.pdf`;
    a.click();
  });
});

// js/certificate.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("participantName");
  const verifyBtn = document.getElementById("verifyBtn");
  const container = document.getElementById("certificateContainer");
  const downloadBtn = document.getElementById("downloadBtn");
  const canvas = document.getElementById("certificateCanvas");
  const ctx = canvas.getContext("2d");

  let generatedPdfBytes = null;

  verifyBtn.addEventListener("click", async () => {
    const inputValue = input.value.trim();
    if (!inputValue) {
      Swal.fire("Input Required", "Please enter your registered name or phone number.", "warning");
      return;
    }

    Swal.fire({
      title: "Verifying...",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const participantsRef = collection(db, "participants");

      // Search by name first, then by phone
      let snapshot = await getDocs(query(participantsRef, where("name", "==", inputValue)));
      if (snapshot.empty) {
        snapshot = await getDocs(query(participantsRef, where("phone", "==", inputValue)));
      }
      if (snapshot.empty) {
        Swal.fire("Not Found", "No participant found with this name or phone number.", "error");
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
      pdfDoc.registerFontkit(window.fontkit);

      // Embed custom font
      const fontBytes = await fetch("assets/fonts/AlexBrush-Regular.ttf").then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // Prepare name with prefix
      const prefix = participant.prefix ?? "";
      const text = `${prefix} ${participant.name}`.trim();

      // Draw participant name centered horizontally
      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const textWidth = customFont.widthOfTextAtSize(text, 36);
      const x = (pageWidth - textWidth) / 2;

      page.drawText(text, { x, y: 285.5, size: 36, font: customFont, color: PDFLib.rgb(0,0,0) });

      generatedPdfBytes = await pdfDoc.save();

      // Render PDF to canvas using PDF.js
      const pdfData = new Uint8Array(generatedPdfBytes);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const pdfPage = await pdf.getPage(1);

      const viewport = pdfPage.getViewport({ scale: canvas.width / pdfPage.getViewport({scale:1}).width });
      canvas.height = viewport.height;

      const renderCtx = {
        canvasContext: ctx,
        viewport: viewport
      };
      await pdfPage.render(renderCtx).promise;

      Swal.fire("Success!", "Certificate generated! You can see it above and download it.", "success");
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

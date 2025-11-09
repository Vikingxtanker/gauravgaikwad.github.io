// js/certificate.js
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("participantName");
  const verifyBtn = document.getElementById("verifyBtn");
  const container = document.getElementById("certificateContainer");
  const canvas = document.getElementById("certificateCanvas");
  const ctx = canvas.getContext("2d");
  const downloadBtn = document.getElementById("downloadBtn");

  let generatedPdfBytes = null;
  let verifiedName = "";

  // ✅ Helper: Adjust canvas scale to fit screen
  function fitCanvasToContainer() {
    const maxWidth = window.innerWidth * 0.9;
    const scale = Math.min(maxWidth / 1000, 1);
    canvas.style.width = `${1000 * scale}px`;
    canvas.style.height = `${700 * scale}px`;
  }

  window.addEventListener("resize", fitCanvasToContainer);
  fitCanvasToContainer();

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
      const snapshot = await getDocs(participantsRef);

      let participant = null;
      const inputLower = inputValue.toLowerCase();

      // ✅ Case-insensitive match by name or phone
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dbName = data.name?.toLowerCase().trim();
        const dbPhone = data.phone?.trim();
        if (dbName === inputLower || dbPhone === inputValue) {
          participant = data;
        }
      });

      if (!participant) {
        Swal.fire("Not Found", "No participant found with this name or phone number.", "error");
        return;
      }

      verifiedName = `${participant.prefix ?? ""} ${participant.name}`.trim();
      container.classList.remove("d-none");

      // ✅ Load PDF template
      const res = await fetch("assets/healthcamp_certificate_template.pdf");
      if (!res.ok) throw new Error("PDF template not found");
      const templateBytes = await res.arrayBuffer();

      // ✅ Load PDF using PDF-lib
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);

      // Register fontkit
      pdfDoc.registerFontkit(window.fontkit);

      // ✅ Embed custom font (Alex Brush)
      const fontBytes = await fetch("assets/fonts/AlexBrush-Regular.ttf").then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      // ✅ Draw participant name in center
      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const fontSize = 36;
      const textWidth = customFont.widthOfTextAtSize(verifiedName, fontSize);
      const x = (pageWidth - textWidth) / 2;
      const y = 285.5;

      page.drawText(verifiedName, {
        x,
        y,
        size: fontSize,
        font: customFont,
        color: PDFLib.rgb(0, 0, 0),
      });

      generatedPdfBytes = await pdfDoc.save();

      // ✅ Render PDF to canvas using PDF.js
      const pdf = await pdfjsLib.getDocument({ data: generatedPdfBytes }).promise;
      const pdfPage = await pdf.getPage(1);
      const viewport = pdfPage.getViewport({ scale: canvas.width / pdfPage.getViewport({ scale: 1 }).width });
      canvas.height = viewport.height;
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      fitCanvasToContainer();

      Swal.fire("Success!", "Certificate generated successfully!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not generate certificate.", "error");
    }
  });

  // ✅ Download certificate
  downloadBtn.addEventListener("click", () => {
    if (!generatedPdfBytes) {
      Swal.fire("Error", "No certificate generated yet.", "warning");
      return;
    }

    const blob = new Blob([generatedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = verifiedName.replace(/\s+/g, "_") || "Participant";
    a.href = url;
    a.download = `Certificate_${safeName}.pdf`;
    a.click();
  });
});

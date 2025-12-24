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
      const snapshot = await getDocs(collection(db, "participants"));
      let participant = null;
      const inputLower = inputValue.toLowerCase();

      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.name?.toLowerCase() === inputLower || d.phone === inputValue) {
          participant = d;
        }
      });

      if (!participant) {
        Swal.fire("Not Found", "No participant found with this name or phone number.", "error");
        return;
      }

      verifiedName = `${participant.prefix ?? ""} ${participant.name}`.trim();
      container.classList.remove("d-none");

      const res = await fetch("assets/healthcamp_certificate_template.pdf");
      const pdfDoc = await PDFLib.PDFDocument.load(await res.arrayBuffer());
      pdfDoc.registerFontkit(window.fontkit);

      const font = await pdfDoc.embedFont(
        await fetch("assets/fonts/AlexBrush-Regular.ttf").then(r => r.arrayBuffer())
      );

      const page = pdfDoc.getPages()[0];
      const fontSize = 36;
      const textWidth = font.widthOfTextAtSize(verifiedName, fontSize);
      const x = (page.getWidth() - textWidth) / 2;

      page.drawText(verifiedName, {
        x,
        y: 285.5,
        size: fontSize,
        font,
        color: PDFLib.rgb(0, 0, 0)
      });

      generatedPdfBytes = await pdfDoc.save();

      /* ---------- High-DPI Canvas Render ---------- */
      const pdf = await pdfjsLib.getDocument({ data: generatedPdfBytes }).promise;
      const pdfPage = await pdf.getPage(1);

      const dpr = window.devicePixelRatio || 1;
      const base = pdfPage.getViewport({ scale: 1 });
      const cssWidth = Math.min(window.innerWidth * 0.9, 1000);
      const scale = cssWidth / base.width;

      const viewport = pdfPage.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      Swal.fire("Success!", "Certificate generated successfully!", "success");

    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not generate certificate.", "error");
    }
  });

  /* ---------- Download + Popup ---------- */
  downloadBtn.addEventListener("click", () => {
    if (!generatedPdfBytes) {
      Swal.fire("Error", "No certificate generated yet.", "warning");
      return;
    }

    const blob = new Blob([generatedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Certificate_${verifiedName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: "success",
      title: "Certificate downloaded successfully!",
      text: "Please check your downloads on your device.",
      confirmButtonColor: "#198754"
    });
  });
});

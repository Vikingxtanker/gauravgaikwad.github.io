// js/wdd2025.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

  // Helper: log to Firestore collection "WDDlogger"
  async function logToFirestore(name) {
    try {
      const colRef = collection(db, "WDDlogger");
      await addDoc(colRef, {
        name: name || "N/A",
        timestamp: serverTimestamp()
      });
      // Optionally return true/false or the docRef if needed in future
      return true;
    } catch (err) {
      console.error("Failed to log to Firestore (WDDlogger):", err);
      return false;
    }
  }

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
      /* ===============================
         🔵 FIRESTORE VERIFICATION
         =============================== */
      const participantsRef = collection(db, "wddparticipants2025");
      const snapshot = await getDocs(participantsRef);

      let participant = null;
      const inputLower = inputValue.toLowerCase();

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

      /* ===============================
         🔵 LOAD WDD 2025 PDF TEMPLATE
         =============================== */
      const res = await fetch("assets/wdd2025_certificate_template.pdf");
      if (!res.ok) throw new Error("WDD 2025 certificate template not found");
      const templateBytes = await res.arrayBuffer();

      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      pdfDoc.registerFontkit(window.fontkit);

      const fontBytes = await fetch("assets/fonts/AlexBrush-Regular.ttf").then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const fontSize = 36;
      const textWidth = customFont.widthOfTextAtSize(verifiedName, fontSize);
      const x = (pageWidth - textWidth) / 2;
      const y = 300; // Adjust if template layout changes

      page.drawText(verifiedName, {
        x,
        y,
        size: fontSize,
        font: customFont,
        color: PDFLib.rgb(0, 0, 0),
      });

      generatedPdfBytes = await pdfDoc.save();

      /* ===============================
         🔵 CRISP CANVAS PREVIEW FIX
         (DevicePixelRatio aware)
         =============================== */
      const pdf = await pdfjsLib.getDocument({ data: generatedPdfBytes }).promise;
      const pdfPage = await pdf.getPage(1);

      const dpr = window.devicePixelRatio || 1;

      const baseViewport = pdfPage.getViewport({ scale: 1 });

      // Desired CSS width (matches your design)
      const cssWidth = Math.min(window.innerWidth * 0.9, 1000);
      const scale = cssWidth / baseViewport.width;

      const viewport = pdfPage.getViewport({
        scale: scale * dpr
      });

      // Set internal resolution
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Set CSS size
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      // Reset transform before rendering
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      await pdfPage.render({
        canvasContext: ctx,
        viewport
      }).promise;

      Swal.fire("Success!", "World Diabetes Day 2025 certificate generated!", "success");

    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not generate certificate.", "error");
    }
  });

  /* ===============================
     🔵 DOWNLOAD PDF (now with Firestore logging)
     =============================== */
  downloadBtn.addEventListener("click", async () => {
    if (!generatedPdfBytes) {
      Swal.fire("Error", "No certificate generated yet.", "warning");
      return;
    }

    const blob = new Blob([generatedPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (verifiedName || "Participant").replace(/\s+/g, "_");

    a.href = url;
    a.download = `WDD2025_Certificate_${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Attempt to log to Firestore
    const logged = await logToFirestore(verifiedName);

    // Feedback to user — success regardless of log result, but warn if logging failed
    if (logged) {
      Swal.fire({
        icon: "success",
        title: "Certificate downloaded successfully!",
        text: "Your certificate download has been recorded.",
        confirmButtonColor: "#0077c8"
      });
    } else {
      Swal.fire({
        icon: "warning",
        title: "Downloaded — but logging failed",
        text: "Certificate downloaded, but we couldn't record the download. It may be a network issue.",
        confirmButtonColor: "#f39c12"
      });
    }
  });
});

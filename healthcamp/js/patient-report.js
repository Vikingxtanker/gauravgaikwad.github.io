document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  patientIDInput.value = "";
  window.currentPatient = null;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = patientIDInput.value.trim().toLowerCase();
    if (!id) return;

    try {
      const docSnap = await db.collection("patients").doc(id).get();

      if (!docSnap.exists) {
        Swal.fire("Invalid ID", "No patient found with this ID", "error");
        reportSection.style.display = "none";
        return;
      }

      const data = docSnap.data();
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
      document.getElementById("bp").innerText = (data.systolic && data.diastolic)
        ? `${data.systolic}/${data.diastolic}`
        : data.bloodPressure ?? "Not Recorded";
      document.getElementById("bmi").innerText = data.bmi ?? "N/A";
      document.getElementById("patientIdDisplay").innerText = id;

      reportSection.style.display = "block";

    } catch (error) {
      console.error("Error fetching patient:", error);
      Swal.fire("Error", "Could not fetch patient data", "error");
    }
  });

  // ✅ PDF generation
  document.getElementById("generatePDF").addEventListener("click", async () => {
    const p = window.currentPatient;
    if (!p) return;

    try {
      const res = await fetch("pdftest.pdf");
      if (!res.ok) throw new Error(`Failed to fetch PDF template: ${res.statusText}`);

      const blob = await res.blob();
      if (blob.type !== "application/pdf") throw new Error(`Expected PDF, got ${blob.type}`);

      const pdfBytes = await blob.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const draw = (text, x, y) => {
        firstPage.drawText(text.toString(), { x, y, size: 10, font });
      };

      draw(p.name ?? "", 136, 633);
      draw(p.age ?? "", 320, 633);
      draw(p.phone ?? "", 94.5, 617);
      draw(p.gender ?? "", 342, 617);
      draw(p.id ?? "", 117, 604.64);
      draw(p.bmi ?? "", 321, 604.64);
      draw(new Date().toLocaleDateString("en-GB"), 87, 590.64);

      draw(p.hemoglobin ?? "N/A", 222.5, 511.74);
      draw(p.fev ?? "N/A", 222.5, 440.24);
      draw(p.rbg ?? p.randomBloodGlucose ?? "N/A", 222.5, 456.14);
      draw((p.systolic && p.diastolic)
        ? `${p.systolic}/${p.diastolic}`
        : p.bloodPressure ?? "N/A", 222.5, 411.64);

      const pdfFinalBytes = await pdfDoc.save();
      const blobFinal = new Blob([pdfFinalBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blobFinal);
      link.download = `Patient_Report_${p.id}.pdf`;
      link.click();

    } catch (err) {
      console.error("PDF Generation Error:", err);
      Swal.fire("Error", "Could not generate PDF report", "error");
    }
  });
});

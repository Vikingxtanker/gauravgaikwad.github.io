document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();
  const form = document.getElementById("reportForm");
  const patientIDInput = document.getElementById("patientID");
  const reportSection = document.getElementById("reportSection");

  patientIDInput.value = "";
  window.currentPatient = null;

  // Fetch patient data
  form.addEventListener("submit", async (e) => {
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
      document.getElementById("bp").innerText =
        (data.systolic && data.diastolic)
          ? `${data.systolic}/${data.diastolic}`
          : data.bloodPressure ?? "Not Recorded";
      document.getElementById("bmi").innerText = data.bmi ?? "N/A";

      // ? Added counseling
      document.getElementById("counseling").innerText = data.counseling ?? "Not Recorded";

      document.getElementById("patientIdDisplay").innerText = id;
      reportSection.style.display = "block";
    } catch (err) {
      console.error("Error fetching patient:", err);
      Swal.fire("Error", "Could not fetch patient data", "error");
    }
  });

  // ? PDF Generation
  document.getElementById("generatePDF").addEventListener("click", async () => {
    const p = window.currentPatient;
    if (!p) {
      Swal.fire("Error", "No patient data available", "error");
      return;
    }
    try {
      const res = await fetch("reporttemplate2.pdf");
      if (!res.ok) throw new Error("PDF template not found");

      const pdfBytes = await res.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[0];

      const draw = (text, x, y) =>
        page.drawText(text?.toString() ?? "", { x, y, size: 10, font });

      // existing fields …
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
      draw(
        (p.systolic && p.diastolic)
          ? `${p.systolic}/${p.diastolic}`
          : p.bloodPressure ?? "N/A",
        222.5,
        411.64
      );

      // ? Counseling at given coordinates
      draw(p.counseling ?? "N/A", 539.6, 299.5);

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

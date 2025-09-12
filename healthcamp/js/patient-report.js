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
      document.getElementById("counselingPoints").innerText = data.counselingPoints ?? "Not Recorded";

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
      draw(p.name ?? "", 136, 675);
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

      // ? Counseling at given coordinates
      draw(p.counselingPoints ?? "N/A", 41, 252);
5
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

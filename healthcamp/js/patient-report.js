document.getElementById('reportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    if (!id) return;

    try {
        const docSnap = await db.collection('patients').doc(id).get();
        if (!docSnap.exists) {
            Swal.fire('Invalid ID', 'No patient found with this ID', 'error');
            document.getElementById('reportSection').style.display = 'none';
            return;
        }

        const data = docSnap.data();
        window.currentPatient = { id, ...data };  // Store for PDF use

        document.getElementById('name').innerText = data.name ?? '';
        document.getElementById('age').innerText = data.age ?? '';
        document.getElementById('gender').innerText = data.gender ?? '';
        document.getElementById('phone').innerText = data.phone ?? '';
        document.getElementById('address').innerText = data.address ?? '';
        document.getElementById('hemoglobin').innerText = data.hemoglobin ?? 'Not Recorded';
        document.getElementById('rbg').innerText = data.randomBloodGlucose ?? 'Not Recorded';
        document.getElementById('fev').innerText = data.fev ?? 'Not Recorded';
        document.getElementById('bp').innerText = data.bloodPressure ?? 'Not Recorded';
        document.getElementById('bmi').innerText = data.bmi ?? '';
        document.getElementById('patientIdDisplay').innerText = id;

        document.getElementById('reportSection').style.display = 'block';

    } catch (error) {
        console.error("Error fetching patient:", error);
        Swal.fire('Error', 'Could not fetch patient data', 'error');
    }
});

document.getElementById('generatePDF').addEventListener('click', async () => {
    const p = window.currentPatient;
    if (!p) return;

    const templateUrl = 'reporttemplate.pdf';  // Ensure this path is correct
    const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());

    const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Place patient data using exact coordinates
    firstPage.drawText(p.name ?? '', { x: 132, y: 206, size: 10, font });
    firstPage.drawText((p.age ?? '').toString(), { x: 318, y: 206, size: 10, font });
    firstPage.drawText(p.phone ?? '', { x: 91, y: 220, size: 10, font });
    firstPage.drawText(p.gender ?? '', { x: 317, y: 220, size: 10, font });
    firstPage.drawText(p.id ?? '', { x: 112, y: 224, size: 10, font });
    firstPage.drawText((p.bmi ?? '').toString(), { x: 316, y: 234, size: 10, font });
    firstPage.drawText(new Date().toLocaleDateString(), { x: 83, y: 248, size: 10, font });

    firstPage.drawText((p.hemoglobin ?? 'N/A').toString(), { x: 225, y: 324, size: 10, font });
    firstPage.drawText((p.fev ?? 'N/A').toString(), { x: 225, y: 307, size: 10, font });
    firstPage.drawText((p.randomBloodGlucose ?? 'N/A').toString(), { x: 225, y: 380, size: 10, font });
    firstPage.drawText(p.bloodPressure ?? 'N/A', { x: 225, y: 425, size: 10, font });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Patient_Report_${p.id}.pdf`;
    link.click();
});

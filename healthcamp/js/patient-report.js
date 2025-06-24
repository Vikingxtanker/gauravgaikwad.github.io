const { jsPDF } = window.jspdf;

document.getElementById('reportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    if (!id) return;

    try {
        const doc = await db.collection('patients').doc(id).get();
        if (!doc.exists) {
            Swal.fire('Invalid ID', 'No patient found with this ID', 'error');
            document.getElementById('reportSection').style.display = 'none';
            return;
        }

        const data = doc.data();
        document.getElementById('name').innerText = data.name || '';
        document.getElementById('age').innerText = data.age || '';
        document.getElementById('gender').innerText = data.gender || '';
        document.getElementById('phone').innerText = data.phone || '';
        document.getElementById('address').innerText = data.address || '';
        document.getElementById('hemoglobin').innerText = data.hemoglobin ?? 'Not Recorded';
        document.getElementById('rbg').innerText = data.randomBloodGlucose ?? 'Not Recorded';
        document.getElementById('fev').innerText = data.fev ?? 'Not Recorded';
        document.getElementById('bp').innerText = data.bloodPressure ?? 'Not Recorded';

        document.getElementById('reportSection').style.display = 'block';

    } catch (error) {
        console.error("Error fetching patient:", error);
        Swal.fire('Error', 'Could not fetch patient data', 'error');
    }
});

document.getElementById('generatePDF').addEventListener('click', () => {
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Health Camp - Patient Report", 20, 20);
    doc.setFontSize(12);

    let y = 40;
    doc.text(`Patient ID: ${id}`, 20, y);
    y += 10;
    doc.text(`Name: ${document.getElementById('name').innerText}`, 20, y);
    y += 10;
    doc.text(`Age: ${document.getElementById('age').innerText}`, 20, y);
    y += 10;
    doc.text(`Gender: ${document.getElementById('gender').innerText}`, 20, y);
    y += 10;
    doc.text(`Phone: ${document.getElementById('phone').innerText}`, 20, y);
    y += 10;
    doc.text(`Address: ${document.getElementById('address').innerText}`, 20, y);
    y += 15;
    doc.text("Test Results:", 20, y);
    y += 10;
    doc.text(`Hemoglobin: ${document.getElementById('hemoglobin').innerText}`, 20, y);
    y += 10;
    doc.text(`Random Blood Glucose: ${document.getElementById('rbg').innerText}`, 20, y);
    y += 10;
    doc.text(`Forced Expiratory Volume: ${document.getElementById('fev').innerText}`, 20, y);
    y += 10;
    doc.text(`Blood Pressure: ${document.getElementById('bp').innerText}`, 20, y);

    doc.save(`Patient_Report_${id}.pdf`);
});

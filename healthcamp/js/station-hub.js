document.getElementById('verifyForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('patientID').value.trim().toUpperCase();
    if (!id) return;

    try {
        const doc = await db.collection('patients').doc(id).get();

        if (doc.exists) {
            const data = doc.data();
            Swal.fire({
                icon: 'success',
                title: 'Correct Patient ID',
                text: `Patient found: ${data.name}`
            }).then(() => {
                document.getElementById('patientName').innerText = data.name;
                document.getElementById('patientAge').innerText = data.age;
                document.getElementById('patientGender').innerText = data.gender;
                document.getElementById('stationSection').style.display = 'block';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Incorrect Patient ID',
                text: 'No patient found with this ID.'
            });
            document.getElementById('stationSection').style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error checking ID:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong while verifying.'
        });
    }
});

document.getElementById('stationSelect').addEventListener('change', async function() {

    document.getElementById('hbFormSection').style.display = 'none';
    document.getElementById('rbgFormSection').style.display = 'none';
    document.getElementById('fevFormSection').style.display = 'none';
    document.getElementById('bpFormSection').style.display = 'none';

    const selection = this.value;
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    if (!selection || !id) return;

    try {
        const doc = await db.collection('patients').doc(id).get();
        if (!doc.exists) return;

        const data = doc.data();

        if (selection === "hb") {
            document.getElementById('hbFormSection').style.display = 'block';
            document.getElementById('hemoglobin').value = data.hemoglobin ?? '';
        }
        if (selection === "rbg") {
            document.getElementById('rbgFormSection').style.display = 'block';
            document.getElementById('rbg').value = data.randomBloodGlucose ?? '';
        }
        if (selection === "fev") {
            document.getElementById('fevFormSection').style.display = 'block';
            document.getElementById('fev').value = data.fev ?? '';
        }
        if (selection === "bp") {
            document.getElementById('bpFormSection').style.display = 'block';
            
            if (data.bloodPressure) {
                const [sys, dia] = data.bloodPressure.split('/');
                document.getElementById('systolic').value = sys || '';
                document.getElementById('diastolic').value = dia || '';
            } else {
                document.getElementById('systolic').value = '';
                document.getElementById('diastolic').value = '';
            }
        }

    } catch (error) {
        console.error("Error fetching patient for pre-fill:", error);
    }
});

// Save Hemoglobin
document.getElementById('hbForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const hb = parseFloat(document.getElementById('hemoglobin').value);
    if (isNaN(hb)) return;

    await db.collection('patients').doc(id).update({
        hemoglobin: hb,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    Swal.fire('Saved', 'Hemoglobin saved.', 'success');
    this.reset();
    document.getElementById('hbFormSection').style.display = 'none';
});

// Save RBG
document.getElementById('rbgForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const rbg = parseFloat(document.getElementById('rbg').value);
    if (isNaN(rbg)) return;

    await db.collection('patients').doc(id).update({
        randomBloodGlucose: rbg,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    Swal.fire('Saved', 'Random Blood Glucose saved.', 'success');
    this.reset();
    document.getElementById('rbgFormSection').style.display = 'none';
});

// Save FEV
document.getElementById('fevForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const fev = parseFloat(document.getElementById('fev').value);
    if (isNaN(fev)) return;

    await db.collection('patients').doc(id).update({
        fev: fev,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    Swal.fire('Saved', 'FEV saved.', 'success');
    this.reset();
    document.getElementById('fevFormSection').style.display = 'none';
});

// Save BP
document.getElementById('bpForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const systolic = parseFloat(document.getElementById('systolic').value);
    const diastolic = parseFloat(document.getElementById('diastolic').value);
    if (isNaN(systolic) || isNaN(diastolic)) return;

    await db.collection('patients').doc(id).update({
        bloodPressure: `${systolic}/${diastolic}`,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    Swal.fire('Saved', 'Blood Pressure saved.', 'success');
    this.reset();
    document.getElementById('bpFormSection').style.display = 'none';
});

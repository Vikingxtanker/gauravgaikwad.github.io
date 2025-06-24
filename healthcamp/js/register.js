function generateCustomPatientID(name) {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
}

async function getUniquePatientID(name) {
    let uniqueID;
    let exists = true;

    while (exists) {
        uniqueID = generateCustomPatientID(name);
        const doc = await db.collection('patients').doc(uniqueID).get();
        exists = doc.exists;
    }
    return uniqueID;
}

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const dobRaw = document.getElementById('dob').value.trim();
    let dob = "";
    if (dobRaw) {
        const [year, month, day] = dobRaw.split("-");
        dob = `${day}/${month}/${year}`;
    }
    const age = parseInt(document.getElementById('age').value.trim());
    const gender = document.getElementById('gender').value.trim();
    const height = parseFloat(document.getElementById('height').value.trim());
    const weight = parseFloat(document.getElementById('weight').value.trim());
    const bmi = parseFloat(document.getElementById('bmi').value.trim());
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();

    const tobacco = document.getElementById('tobacco').value.trim();
    const smoking = document.getElementById('smoking').value.trim();
    const allergy = document.getElementById('allergy').value.trim();
    const allergyDetails = document.getElementById('allergyDetails').value.trim();
    const married = document.getElementById('married').value.trim();
    const alcohol = document.getElementById('alcohol').value.trim();

    const pastMedicalHistory = document.getElementById('pastMedicalHistory').value.trim();
    const pastMedicationHistory = document.getElementById('pastMedicationHistory').value.trim();

    if (!name || !dob || !age || !gender || !height || !weight || !phone || !address || !tobacco || !smoking || !allergy || !married || !alcohol) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Form',
            text: 'Please fill all required fields.'
        });
        return;
    }

    try {
        const patientID = await getUniquePatientID(name);

        await db.collection('patients').doc(patientID).set({
            patientID,
            name,
            dob,
            age,
            gender,
            height,
            weight,
            bmi,
            phone,
            address,
            socialHistory: {
                tobacco,
                smoking,
                allergy,
                allergyDetails: (allergy === 'Yes') ? allergyDetails : '',
                married,
                alcohol
            },
            pastMedicalHistory,
            pastMedicationHistory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            title: 'Registration Successful!',
            text: `Patient ID: ${patientID}`,
            icon: 'success',
            confirmButtonText: 'OK',
            customClass: {
                popup: 'animate__animated animate__fadeInDown'
            }
        }).then(() => {
            document.getElementById('registrationForm').reset();
            document.getElementById('bmi').value = '';
            document.getElementById('age').value = '';
            document.getElementById('allergyDetailsDiv').style.display = 'none';
        });

    } catch (error) {
        console.error("Error saving data:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error Occurred',
            text: 'An error occurred while saving. Please try again.'
        });
    }
});

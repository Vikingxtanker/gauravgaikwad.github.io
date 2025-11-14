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
                document.getElementById('hbSection').style.display = 'block';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Incorrect Patient ID',
                text: 'No patient found with this ID.'
            });
            document.getElementById('hbSection').style.display = 'none';
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


document.getElementById('hbForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('patientID').value.trim().toUpperCase();
    const hb = parseFloat(document.getElementById('hemoglobin').value);

    if (!id || isNaN(hb)) return;

    try {
        await db.collection('patients').doc(id).update({
            hemoglobin: hb,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            icon: 'success',
            title: 'Hemoglobin Saved',
            text: `Hemoglobin value saved for Patient ID: ${id}`
        });

        document.getElementById('hbForm').reset();
        document.getElementById('hbSection').style.display = 'none';
        document.getElementById('verifyForm').reset();

    } catch (error) {
        console.error("Error saving hemoglobin:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not save hemoglobin value.'
        });
    }
});

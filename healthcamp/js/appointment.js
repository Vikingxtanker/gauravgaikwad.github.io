// Uses global `db` from firebase-config.js

document.getElementById('appointmentForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const organization = document.getElementById('organization').value.trim();
    const appointmentDate = document.getElementById('appointmentDate').value;
    const timeslot = document.getElementById('timeslot').value;

    if (!name || !phone || !organization || !appointmentDate || !timeslot) {
        Swal.fire('Error', 'Please fill in all fields', 'error');
        return;
    }

    try {
        await db.collection('appointments').add({
            name,
            phone,
            organization,
            appointmentDate,
            timeslot,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            icon: 'success',
            title: 'Appointment Booked!',
            text: 'Your blood sample collection is scheduled.',
            confirmButtonText: 'OK'
        }).then(() => {
            document.getElementById('appointmentForm').reset();
        });

    } catch (error) {
        console.error("Error saving appointment:", error);
        Swal.fire('Error', 'Could not submit appointment. Try again.', 'error');
    }
});

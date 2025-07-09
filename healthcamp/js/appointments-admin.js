// Uses db from firebase-config.js
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginButton = document.getElementById('loginButton');
const filterDate = document.getElementById('filterDate');
const filterSlot = document.getElementById('filterSlot');
const tableBody = document.querySelector('#appointmentsTable tbody');

const ADMIN_PASSWORD = "admin123";

loginButton.addEventListener('click', () => {
    const inputPass = document.getElementById('adminPassword').value.trim();
    if (inputPass === ADMIN_PASSWORD) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        renderAppointments(); // Start live listener
    } else {
        alert("Incorrect password.");
    }
});

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year} ${time}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function matchesFilters(data) {
    const selectedSlot = filterSlot.value;
    const selectedDate = filterDate.value;

    let match = true;

    if (selectedSlot && data.timeslot !== selectedSlot) {
        match = false;
    }

    if (selectedDate && data.appointmentDate) {
        match = match && data.appointmentDate === selectedDate;
    }

    return match;
}

function renderAppointments() {
    db.collection('appointments')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
        tableBody.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!matchesFilters(data)) return;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.phone}</td>
                <td>${data.organization}</td>
                <td>${formatDate(data.appointmentDate)}</td>
                <td>${data.timeslot}</td>
                <td>${formatTimestamp(data.timestamp)}</td>
            `;
            tableBody.appendChild(row);
        });
      });
}

// Filters trigger re-render
filterDate.addEventListener('change', renderAppointments);
filterSlot.addEventListener('change', renderAppointments);

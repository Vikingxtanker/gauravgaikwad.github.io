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
        renderAppointments(); // Start after login
    } else {
        alert("Incorrect password.");
    }
});

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString();
}

function matchesFilters(data) {
    const selectedSlot = filterSlot.value;
    const selectedDate = filterDate.value;

    let match = true;

    if (selectedSlot && data.timeslot !== selectedSlot) {
        match = false;
    }

    if (selectedDate && data.timestamp) {
        const recordDate = data.timestamp.toDate().toISOString().split("T")[0];
        if (recordDate !== selectedDate) {
            match = false;
        }
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
                <td>${data.timeslot}</td>
                <td>${formatTimestamp(data.timestamp)}</td>
            `;
            tableBody.appendChild(row);
        });
      });
}

// Re-render on filter change
filterDate.addEventListener('change', renderAppointments);
filterSlot.addEventListener('change', renderAppointments);

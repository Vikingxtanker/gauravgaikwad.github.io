const ADMIN_PASSWORD = "12345";  // Change this to your desired admin password

document.getElementById('loginBtn').addEventListener('click', () => {
    const pass = document.getElementById('adminPassword').value.trim();
    if (pass === ADMIN_PASSWORD) {
        Swal.fire('Access Granted', 'Welcome Admin', 'success');
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dataSection').style.display = 'block';
        fetchData();
    } else {
        Swal.fire('Access Denied', 'Incorrect password', 'error');
    }
});

async function fetchData() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    try {
        const snapshot = await db.collection('patients').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `<tr>
                <td>${doc.id}</td>
                <td>${data.name || ''}</td>
                <td>${data.age || ''}</td>
                <td>${data.gender || ''}</td>
                <td>${data.phone || ''}</td>
                <td>${data.address || ''}</td>
                <td>${data.hemoglobin ?? ''}</td>
                <td>${data.randomBloodGlucose ?? ''}</td>
                <td>${data.fev ?? ''}</td>
                <td>${data.bloodPressure ?? ''}</td>
                <td>${data.updatedAt?.toDate().toLocaleString() ?? ''}</td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire('Error', 'Could not load records', 'error');
    }
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    let csv = "Patient ID,Name,Age,Gender,Phone,Address,Hemoglobin,RBG,FEV,BP,Last Updated\n";
    const rows = document.querySelectorAll("#dataTable tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        const values = Array.from(cols).map(td => `"${td.innerText}"`);
        csv += values.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Patient_Records.csv";
    link.click();
});

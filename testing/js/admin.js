// js/admin.js

const dataSection = document.getElementById('dataSection');
const dataTableBody = document.querySelector('#dataTable tbody');
const downloadBtn = document.getElementById('downloadBtn');
const authBtn = document.getElementById('authBtn');
const loggedInfo = document.getElementById('loggedInfo');

// Fetch data from Firestore
async function fetchData() {
  try {
    dataTableBody.innerHTML = '';
    const snapshot = await db.collection('patients').get();
    if (snapshot.empty) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="11" class="text-center">No records found</td>`;
      dataTableBody.appendChild(row);
      return;
    }

    snapshot.forEach(doc => {
      const patient = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.id}</td>
        <td>${patient.name || ''}</td>
        <td>${patient.age || ''}</td>
        <td>${patient.gender || ''}</td>
        <td>${patient.phone || ''}</td>
        <td>${patient.address || ''}</td>
        <td>${patient.hemoglobin || ''}</td>
        <td>${patient.rbg || ''}</td>
        <td>${patient.fev || ''}</td>
        <td>${patient.bp || ''}</td>
        <td>${patient.lastUpdated ? new Date(patient.lastUpdated.seconds * 1000).toLocaleString() : ''}</td>
      `;
      dataTableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Error fetching patient records:', err);
    Swal.fire('Error', 'Could not load patient records', 'error');
  }
}

// Download CSV
function downloadCSV() {
  let csv = [];
  document.querySelectorAll('#dataTable tr').forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(col => rowData.push('"' + col.innerText.replace(/"/g, '""') + '"'));
    csv.push(rowData.join(','));
  });
  const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
  const downloadLink = document.createElement('a');
  downloadLink.download = `patient_records_${new Date().toISOString()}.csv`;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

if (downloadBtn) downloadBtn.addEventListener('click', downloadCSV);

// Admin authentication
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await userbase.init({ appId: '2412fcb4-520f-4d6d-9484-242c47e19cb4' });
    const currentUser = session?.user;

    if (!currentUser || currentUser.data?.role !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'Admin access only'
      }).then(() => window.location.href = 'health-screening.html');
      return;
    }

    loggedInfo.textContent = `Logged in as: ${currentUser.username} (${currentUser.data?.role})`;
    authBtn.textContent = 'Sign Out';
    dataSection.style.display = 'block';
    fetchData();

    authBtn.addEventListener('click', async () => {
      await userbase.signOut();
      Swal.fire('Signed Out', 'You have been signed out.', 'info')
           .then(() => window.location.href = 'health-screening.html');
    });

  } catch (err) {
    console.error('Admin init error:', err);
    Swal.fire('Error', 'Could not initialize admin panel', 'error')
         .then(() => window.location.href = 'health-screening.html');
  }
});

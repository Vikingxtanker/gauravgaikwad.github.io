// admin.js
(function() {
  const dbInstance = firebase.firestore();

  async function fetchData() {
    const tbody = document.querySelector('#dataTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
      const snapshot = await dbInstance.collection('patients').get();
      if (snapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center">No patient records found</td></tr>`;
        return;
      }

      snapshot.forEach(doc => {
        const d = doc.data();
        const row = `
          <tr>
            <td>${doc.id}</td>
            <td>${d.name || ''}</td>
            <td>${d.age || ''}</td>
            <td>${d.gender || ''}</td>
            <td>${d.phone || ''}</td>
            <td>${d.address || ''}</td>
            <td>${d.hemoglobin ?? ''}</td>
            <td>${d.rbg ?? ''}</td>
            <td>${d.fev ?? ''}</td>
            <td>${d.systolic ?? ''}</td>
            <td>${d.diastolic ?? ''}</td>
            <td>${d.updatedAt ? d.updatedAt.toDate().toLocaleString() : ''}</td>
          </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error loading patient records</td></tr>`;
      Swal.fire('Error', 'Could not load patient records', 'error');
    }
  }

  // CSV export
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      let csv = "Patient ID,Name,Age,Gender,Phone,Address,Hemoglobin,RBG,FEV,Systolic,Diastolic,Last Updated\n";
      const rows = document.querySelectorAll("#dataTable tbody tr");
      rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        csv += Array.from(cols).map(td => `"${td.innerText}"`).join(",") + "\n";
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "Patient_Records.csv";
      link.click();
    });
  }

  // Fetch data on page load regardless of login
  window.addEventListener("load", fetchData);

  window.fetchData = fetchData;
})();

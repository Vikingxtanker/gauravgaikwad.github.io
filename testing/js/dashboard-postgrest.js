// js/dashboard-postgrest.js
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

// ---------- CONFIG ----------
const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// Navbar elements
const authBtn = document.getElementById("authBtn");
const loggedInfo = document.getElementById("loggedInfo");

// Load current user
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

// ----------- ADMIN CHECK -----------
if (!currentUser || currentUser.role !== "admin") {
  Swal.fire({
    icon: "error",
    title: "Access Denied",
    text: "You must be logged in as admin to access this page.",
    confirmButtonText: "OK"
  }).then(() => {
    window.location.href = "health-screening.html";
  });
} else {
  // Update navbar info
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  });

  // Elements
  const tableBody = document.querySelector("#patientsTable tbody");
  const downloadBtn = document.getElementById("downloadCsvBtn");
  let patientData = [];

  // Helper: format ISO timestamps nicely
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const options = {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true
    };
    return new Intl.DateTimeFormat("en-GB", options).format(d);
  }

  // ---------- FETCH PATIENTS FROM POSTGREST ----------
  async function loadPatients() {
    tableBody.innerHTML = "";
    patientData = [];

    try {
      const res = await fetch(`${POSTGREST_URL}/patients?order=created_at.desc.nullslast`, {
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      let srNo = 1;
      data.forEach(p => {
        const formattedTimestamp = formatDate(p.created_at);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${srNo}</td>
          <td>${p.id || ""}</td>
          <td>${p.name || ""}</td>
          <td>${p.age || ""}</td>
          <td>${p.gender || ""}</td>
          <td>${p.phone || ""}</td>
          <td>${p.hemoglobin || ""}</td>
          <td>${p.rbg || ""}</td>
          <td>${p.fev || ""}</td>
          <td>${p.systolic || ""}/${p.diastolic || ""}</td>
          <td>${formattedTimestamp}</td>
        `;
        tableBody.appendChild(tr);

        patientData.push([
          srNo,
          p.id || "",
          p.name || "",
          p.age || "",
          p.gender || "",
          p.phone || "",
          p.hemoglobin || "",
          p.rbg || "",
          p.fev || "",
          `${p.systolic || ""}/${p.diastolic || ""}`,
          formattedTimestamp
        ]);

        srNo++;
      });
    } catch (err) {
      console.error("❌ Error loading patients:", err);
      Swal.fire("Error", "Failed to load patient data.", "error");
    }
  }

  // ---------- CSV DOWNLOAD ----------
  downloadBtn.addEventListener("click", () => {
    if (patientData.length === 0) {
      Swal.fire("No Data", "No patient data available for download.", "info");
      return;
    }

    const headers = [
      "Sr. No.","Patient ID","Name","Age","Gender","Phone","Hemoglobin","RBG","FEV","BP (Sys/Dia)","Last Updated"
    ];
    let csv = headers.join(",") + "\n";
    patientData.forEach(row => {
      csv += row.map(val => `"${val}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patients_database.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Load on startup
  loadPatients();
}

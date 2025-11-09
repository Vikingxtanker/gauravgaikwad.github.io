// js/dashboard-postgrest.js
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

const POSTGREST_URL = "https://postgrest-latest-iplb.onrender.com";

// Navbar setup
const authBtn = document.getElementById("authBtn");
const loggedInfo = document.getElementById("loggedInfo");
const dateFilter = document.getElementById("dateFilter");
const testFilter = document.getElementById("testFilter");

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || currentUser.role !== "admin") {
  Swal.fire({
    icon: "error",
    title: "Access Denied",
    text: "You must be logged in as admin to access this page.",
  }).then(() => (window.location.href = "health-screening.html"));
} else {
  loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
  authBtn.textContent = "Logout";
  authBtn.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "health-screening.html";
  });

  const tableBody = document.querySelector("#patientsTable tbody");
  const downloadBtn = document.getElementById("downloadCsvBtn");
  let patientData = [];

  // Format date
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d)
      ? ""
      : d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  }

  // ---------- LOAD PATIENTS ----------
  async function loadPatients() {
    tableBody.innerHTML = "";
    patientData = [];

    try {
      const resPatients = await fetch(`${POSTGREST_URL}/patients?order=created_at.desc`, {
        headers: { Accept: "application/json" },
      });
      const patients = resPatients.ok ? await resPatients.json() : [];

      let srNo = 1;
      for (const p of patients) {
        const resTests = await fetch(
          `${POSTGREST_URL}/patient_tests?patient_id=eq.${p.id}&order=created_at.desc&limit=20`,
          { headers: { Accept: "application/json" } }
        );
        const tests = resTests.ok ? await resTests.json() : [];

        // Filter by date
        const now = new Date();
        const filteredTests = tests.filter((t) => {
          const date = new Date(t.created_at);
          if (dateFilter.value === "today") return date.toDateString() === now.toDateString();
          if (dateFilter.value === "7days") return date >= new Date(now - 7 * 86400000);
          if (dateFilter.value === "30days") return date >= new Date(now - 30 * 86400000);
          return true;
        });

        const latestByType = {};
        filteredTests.forEach((t) => {
          if (!latestByType[t.test_type]) latestByType[t.test_type] = t;
        });

        const hb = latestByType["Hemoglobin"]?.value_numeric ?? "";
        const rbg = latestByType["RBG"]?.value_numeric ?? "";
        const fbs = latestByType["FBS"]?.value_numeric ?? "";
        const ppbs = latestByType["PPBS"]?.value_numeric ?? "";
        const hba1c = latestByType["HbA1c"]?.value_numeric ?? "";
        const fev = latestByType["FEV"]?.value_numeric ?? "";
        const bp = latestByType["BP"]?.value_text ?? "";

        // Filter by test type
        if (testFilter.value !== "all" && !latestByType[testFilter.value]) continue;

        const lastUpdated = filteredTests.length ? formatDate(filteredTests[0].created_at) : "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${srNo}</td>
          <td>${p.id}</td>
          <td>${p.name || ""}</td>
          <td>${p.age || ""}</td>
          <td>${p.gender || ""}</td>
          <td>${p.phone || ""}</td>
          <td>${hb}</td>
          <td>${rbg}</td>
          <td>${fbs}</td>
          <td>${ppbs}</td>
          <td>${hba1c}</td>
          <td>${fev}</td>
          <td>${bp}</td>
          <td>${lastUpdated}</td>
        `;
        tableBody.appendChild(tr);

        patientData.push([
          srNo,
          p.id,
          p.name || "",
          p.age || "",
          p.gender || "",
          p.phone || "",
          hb,
          rbg,
          fbs,
          ppbs,
          hba1c,
          fev,
          bp,
          lastUpdated,
        ]);

        srNo++;
      }
    } catch (err) {
      console.error("Error loading:", err);
      Swal.fire("Error", "Failed to load patient data.", "error");
    }
  }

  // ---------- FILTER EVENTS ----------
  dateFilter.addEventListener("change", loadPatients);
  testFilter.addEventListener("change", loadPatients);

  // ---------- CSV DOWNLOAD ----------
  downloadBtn.addEventListener("click", () => {
    if (!patientData.length)
      return Swal.fire("No Data", "No records to download.", "info");

    const headers = [
      "Sr. No.",
      "Patient ID",
      "Name",
      "Age",
      "Gender",
      "Phone",
      "Hemoglobin",
      "RBG",
      "FBS",
      "PPBS",
      "HbA1c",
      "FEV",
      "BP (Sys/Dia)",
      "Last Updated",
    ];

    let csv = headers.join(",") + "\n";
    patientData.forEach((row) => (csv += row.map((v) => `"${v}"`).join(",") + "\n"));

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient_dashboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  // ---------- SORTABLE COLUMNS WITH ARROWS ----------
  const tableHeaders = document.querySelectorAll(".sortable");
  tableHeaders.forEach((header, index) => {
    let asc = true;
    const baseTitle = header.textContent.trim();

    header.style.cursor = "pointer";
    header.innerHTML = `${baseTitle} <span class="sort-arrow text-secondary" style="font-size:0.8rem;"></span>`;

    header.addEventListener("click", () => {
      const rows = [...tableBody.rows];
      rows.sort((a, b) => {
        const aText = a.cells[index].textContent.trim();
        const bText = b.cells[index].textContent.trim();
        return asc
          ? aText.localeCompare(bText, undefined, { numeric: true })
          : bText.localeCompare(aText, undefined, { numeric: true });
      });

      // Remove all other arrows
      document.querySelectorAll(".sort-arrow").forEach((el) => (el.textContent = ""));
      // Set arrow for current column
      const arrow = header.querySelector(".sort-arrow");
      arrow.textContent = asc ? "▲" : "▼";

      asc = !asc;
      tableBody.innerHTML = "";
      rows.forEach((r) => tableBody.appendChild(r));
    });
  });

  // ---------- INIT ----------
  loadPatients();
}

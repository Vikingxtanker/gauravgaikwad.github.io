// js/DMappointments-admin.js
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginButton = document.getElementById("loginButton");
const filterDate = document.getElementById("filterDate");
const filterDateDisplay = document.getElementById("filterDateDisplay");
const filterSlot = document.getElementById("filterSlot");
const tableBody = document.querySelector("#appointmentsTable tbody");

const ADMIN_PASSWORD = "admin123";

// Login
loginButton.addEventListener("click", () => {
  const inputPass = document.getElementById("adminPassword").value.trim();
  if (inputPass === ADMIN_PASSWORD) {
    loginSection.style.display = "none";
    dashboardSection.style.display = "block";
    renderAppointments(); // start live listener
  } else {
    Swal.fire("Error", "Incorrect password.", "error");
  }
});

// Format Firestore timestamp (serverTimestamp)
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${day}/${month}/${year} ${time}`;
  } catch (e) {
    return "";
  }
}

// Filter matching (compares appointmentDate saved as DD/MM/YYYY string)
function matchesFilters(data) {
  const selectedSlot = filterSlot.value;
  const selectedDate = filterDate.value;

  if (selectedSlot && data.timeslot !== selectedSlot) return false;

  if (selectedDate && data.appointmentDate) {
    const [year, month, day] = selectedDate.split("-");
    const formatted = `${day}/${month}/${year}`;
    if (data.appointmentDate !== formatted) return false;
  }

  return true;
}

// Render appointments live from DMAppointments collection
function renderAppointments() {
  const q = query(collection(db, "DMAppointments"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!matchesFilters(data)) return;

      const row = document.createElement("tr");

      const fastingText = data.fasting ? "Yes" : "No";

      row.innerHTML = `
        <td>${data.name || ""}</td>
        <td>${data.email || ""}</td>
        <td>${data.phone || ""}</td>
        <td>${data.organization || ""}</td>
        <td>${data.appointmentDate || ""}</td>
        <td>${data.timeslot || data.timeslot_display || data.timeslot_value || ""}</td>
        <td>${fastingText}</td>
        <td>${formatTimestamp(data.timestamp)}</td>
        <td class="action-btns"></td>
      `;

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
      editBtn.className = "btn btn-sm btn-warning me-2 edit-btn";
      editBtn.dataset.id = docSnap.id;

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
      deleteBtn.className = "btn btn-sm btn-danger delete-btn";
      deleteBtn.dataset.id = docSnap.id;

      row.querySelector("td:last-child").appendChild(editBtn);
      row.querySelector("td:last-child").appendChild(deleteBtn);

      tableBody.appendChild(row);
    });

    attachActionListeners();
  }, (err) => {
    console.error("Snapshot error:", err);
    Swal.fire("Error", "Could not load DM appointments.", "error");
  });
}

// Attach listeners to dynamic Edit/Delete buttons
function attachActionListeners() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const confirmed = await Swal.fire({
        icon: "warning",
        title: "Delete Appointment?",
        text: "This cannot be undone!",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it",
      });
      if (confirmed.isConfirmed) {
        await deleteDoc(doc(db, "DMAppointments", id));
        Swal.fire("Deleted!", "Appointment has been removed.", "success");
      }
    };
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const docSnap = await getDoc(doc(db, "DMAppointments", id));
      if (!docSnap.exists()) {
        Swal.fire("Error", "Document not found.", "error");
        return;
      }
      const data = docSnap.data();

      // Show edit modal (Swal) with fields matching DM appointment
      const { value: formValues } = await Swal.fire({
        title: "Edit DM Appointment",
        html: `
          <input id="swalName" class="swal2-input" placeholder="Name" value="${escapeHtml(data.name || "")}">
          <input id="swalEmail" class="swal2-input" placeholder="Email" value="${escapeHtml(data.email || "")}">
          <input id="swalPhone" class="swal2-input" placeholder="Phone" value="${escapeHtml(data.phone || "")}">
          <input id="swalOrg" class="swal2-input" placeholder="Organization" value="${escapeHtml(data.organization || "")}">
          <input id="swalDate" class="swal2-input" placeholder="DD/MM/YYYY" value="${escapeHtml(data.appointmentDate || "")}">
          <select id="swalSlot" class="swal2-input">
            <option ${ (data.timeslot||"").includes("09:00") ? "selected" : ""}>Morning (09:00 AM - 11:00 AM)</option>
            <option ${ (data.timeslot||"").includes("12:30") ? "selected" : ""}>Afternoon (12:30 PM - 3:30 PM)</option>
          </select>
          <div style="text-align:left; padding: 6px 0;">
            <label style="display:flex; gap:8px; align-items:center;">
              <input id="swalFasting" type="checkbox" ${data.fasting ? "checked" : ""}> Fasting (yes)
            </label>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => ({
          name: document.getElementById("swalName").value.trim(),
          email: document.getElementById("swalEmail").value.trim(),
          phone: document.getElementById("swalPhone").value.trim(),
          organization: document.getElementById("swalOrg").value.trim(),
          appointmentDate: document.getElementById("swalDate").value.trim(),
          timeslot: document.getElementById("swalSlot").value,
          fasting: document.getElementById("swalFasting").checked,
        }),
      });

      if (formValues) {
        const updateData = {
          name: formValues.name,
          email: formValues.email,
          phone: formValues.phone,
          organization: formValues.organization,
          appointmentDate: formValues.appointmentDate,
          timeslot: formValues.timeslot,
          fasting: !!formValues.fasting,
        };
        await updateDoc(doc(db, "DMAppointments", id), updateData);
        Swal.fire("Updated!", "Appointment has been edited.", "success");
      }
    };
  });
}

// small helper to avoid XSS when inserting into HTML template strings
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Filter display and re-render (listener triggers renderAppointments via onSnapshot, but re-run to refresh)
filterDate.addEventListener("change", () => {
  const value = filterDate.value;
  if (value) {
    const [year, month, day] = value.split("-");
    filterDateDisplay.value = `Selected: ${day}/${month}/${year}`;
  } else {
    filterDateDisplay.value = "";
  }
  // re-rendering is handled by live listener; we can force a UI update by calling renderAppointments (it sets up another listener,
  // but it's fine since login triggers only once). For simplicity just let onSnapshot handle filtering on next snapshot.
});

filterSlot.addEventListener("change", () => {
  // no-op; onSnapshot callback uses matchesFilters() which reads filterSlot value
  // Force a tiny UI refresh by toggling hidden; simplest is to call renderAppointments again:
  renderAppointments();
});

// js/appointments-admin.js
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
    renderAppointments(); // Start live listener
  } else {
    alert("Incorrect password.");
  }
});

// Format Firestore timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day}/${month}/${year} ${time}`;
}

// Filter matching
function matchesFilters(data) {
  const selectedSlot = filterSlot.value;
  const selectedDate = filterDate.value;

  let match = true;

  if (selectedSlot && data.timeslot !== selectedSlot) {
    match = false;
  }

  if (selectedDate && data.appointmentDate) {
    const [year, month, day] = selectedDate.split("-");
    const formatted = `${day}/${month}/${year}`;
    if (data.appointmentDate !== formatted) {
      match = false;
    }
  }

  return match;
}

// Render appointments
function renderAppointments() {
  const q = query(collection(db, "appointments"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!matchesFilters(data)) return;

      const row = document.createElement("tr");

      // Create Edit button
      const editBtn = document.createElement("button");
      editBtn.innerHTML = '<i class="bi bi-pencil-square"></i>';
      editBtn.className = "btn btn-sm btn-warning me-2 edit-btn";
      editBtn.dataset.id = docSnap.id;

      // Create Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
      deleteBtn.className = "btn btn-sm btn-danger delete-btn";
      deleteBtn.dataset.id = docSnap.id;

      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.phone}</td>
        <td>${data.organization}</td>
        <td>${data.appointmentDate}</td>
        <td>${data.timeslot}</td>
        <td>${formatTimestamp(data.timestamp)}</td>
        <td></td>
      `;

      // Append buttons to last cell
      row.querySelector("td:last-child").appendChild(editBtn);
      row.querySelector("td:last-child").appendChild(deleteBtn);

      tableBody.appendChild(row);
    });

    attachActionListeners();
  });
}

// Attach Edit/Delete actions
function attachActionListeners() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirmed = await Swal.fire({
        icon: "warning",
        title: "Delete Appointment?",
        text: "This cannot be undone!",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it",
      });
      if (confirmed.isConfirmed) {
        await deleteDoc(doc(db, "appointments", id));
        Swal.fire("Deleted!", "Appointment has been removed.", "success");
      }
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const docSnap = await getDoc(doc(db, "appointments", id));
      const data = docSnap.data();

      const { value: formValues } = await Swal.fire({
        title: "Edit Appointment",
        html: `
          <input id="swalName" class="swal2-input" placeholder="Name" value="${data.name}">
          <input id="swalPhone" class="swal2-input" placeholder="Phone" value="${data.phone}">
          <input id="swalOrg" class="swal2-input" placeholder="Organization" value="${data.organization}">
          <input id="swalDate" class="swal2-input" type="text" placeholder="DD/MM/YYYY" value="${data.appointmentDate}">
          <select id="swalSlot" class="swal2-input">
            <option ${data.timeslot === "Morning (10 AM - 12 PM)" ? "selected" : ""}>Morning (10 AM - 12 PM)</option>
            <option ${data.timeslot === "Afternoon (2 PM - 5 PM)" ? "selected" : ""}>Afternoon (2 PM - 5 PM)</option>
          </select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => ({
          name: document.getElementById("swalName").value.trim(),
          phone: document.getElementById("swalPhone").value.trim(),
          organization: document.getElementById("swalOrg").value.trim(),
          appointmentDate: document.getElementById("swalDate").value.trim(),
          timeslot: document.getElementById("swalSlot").value,
        }),
      });

      if (formValues) {
        await updateDoc(doc(db, "appointments", id), formValues);
        Swal.fire("Updated!", "Appointment has been edited.", "success");
      }
    });
  });
}

// Filter display
filterDate.addEventListener("change", () => {
  const value = filterDate.value;
  if (value) {
    const [year, month, day] = value.split("-");
    filterDateDisplay.value = `Selected: ${day}/${month}/${year}`;
  } else {
    filterDateDisplay.value = "";
  }
  renderAppointments();
});

filterSlot.addEventListener("change", renderAppointments);

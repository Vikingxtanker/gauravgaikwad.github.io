// js/DMappointment.js
import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

emailjs.init("k7gs9IDv1Gd2sGt4q"); // your EmailJS public key

const form = document.getElementById("appointmentForm");
const fbsCheckbox = document.getElementById("fbsCheckbox");
const timeslotSelect = document.getElementById("timeslot");
const fastingNote = document.getElementById("fastingNote");

// lock/unlock 9 AM slot
function updateFastingUI() {
  if (fbsCheckbox.checked) {
    fastingNote.style.display = "block";
    timeslotSelect.value = "Morning (09:00 AM - 11:00 AM)";
    timeslotSelect.disabled = true;
  } else {
    fastingNote.style.display = "none";
    timeslotSelect.disabled = false;
    timeslotSelect.value = "";
  }
}
fbsCheckbox.addEventListener("change", updateFastingUI);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const organization = document.getElementById("organization").value.trim();
  const timeslot = fbsCheckbox.checked ? "Morning (09:00 AM - 11:00 AM)" : timeslotSelect.value;
  const appointmentDate = "14/11/2025";
  const fasting = fbsCheckbox.checked;

  if (!name || !email || !phone || !timeslot) {
    Swal.fire("Error", "Please fill all required fields.", "error");
    return;
  }

  Swal.fire({
    title: "Please wait...",
    text: "Booking your appointment.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const ref = doc(db, "DMAppointments", name);
    await setDoc(ref, {
      name,
      email,
      phone,
      organization,
      appointmentDate,
      timeslot,
      fasting,
      timestamp: serverTimestamp(),
    });

    const mailParams = {
      to_name: name,
      to_email: email,
      appointment_date: appointmentDate,
      timeslot,
      fasting_text: fasting
        ? "Come fasting (no food/drink except water) at 9 AM and return after 2 hours for post-prandial test."
        : "No fasting required.",
    };

    await emailjs.send("service_fvowxi8", "template_dra21lu", mailParams);

    Swal.fire({
      icon: "success",
      title: "Appointment Booked!",
      html: `
        <p>World Diabetes Day – 14 Nov 2025</p>
        <p><strong>Slot:</strong> ${timeslot}</p>
        ${fasting ? "<p>Please arrive fasting at 9 AM and return at 11 AM.</p>" : ""}
      `,
    }).then(() => {
      form.reset();
      updateFastingUI();
    });
  } catch (err) {
    console.error("Error saving appointment:", err);
    Swal.fire("Error", "Something went wrong. Try again.", "error");
  }
});

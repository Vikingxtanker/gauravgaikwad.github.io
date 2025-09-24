// js/appointment.js

import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Initialize EmailJS
emailjs.init("k7gs9IDv1Gd2sGt4q");

document.getElementById("appointmentForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const organization = document.getElementById("organization").value.trim();
  const timeslot = document.getElementById("timeslot").value;

  // ✅ Fixed Healthcamp Date
  const appointmentDate = "25/09/2025";

  if (!name || !email || !phone || !organization || !timeslot) {
    Swal.fire("Error", "Please fill in all fields", "error");
    return;
  }

  // ✅ Show "Please wait..." popup immediately
  Swal.fire({
    title: "Please wait...",
    text: "We are booking your appointment.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // ✅ Use name as document ID
    const appointmentRef = doc(db, "appointments", name);
    await setDoc(appointmentRef, {
      name,
      email,
      phone,
      organization,
      appointmentDate,
      timeslot,
      timestamp: serverTimestamp(),
    });

    // ✅ Send confirmation email via EmailJS
    const templateParams = {
      to_name: name,
      to_email: email,
      phone,
      organization,
      appointment_date: appointmentDate,
      timeslot,
    };

    await emailjs.send("service_fvowxi8", "template_n6j8enq", templateParams);

    // ✅ Close "Please wait..." and show success
    Swal.fire({
      icon: "success",
      title: "Appointment Booked!",
      text: "Your appointment is scheduled for 25 September 2025. A confirmation email has been sent and a WhatsApp message will be sent shortly.",
    }).then(() => {
      document.getElementById("appointmentForm").reset();
    });

  } catch (error) {
    console.error("Error submitting appointment:", error);

    // ✅ Close "Please wait..." and show error
    Swal.fire("Error", "Something went wrong. Try again.", "error");
  }
});

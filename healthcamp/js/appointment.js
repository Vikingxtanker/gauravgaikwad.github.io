// Initialize EmailJS
emailjs.init("k7gs9IDv1Gd2sGt4q");

document.getElementById("appointmentForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const organization = document.getElementById("organization").value.trim();
  const rawDate = document.getElementById("appointmentDate").value;
  const timeslot = document.getElementById("timeslot").value;

  if (!name || !email || !phone || !organization || !rawDate || !timeslot) {
    Swal.fire("Error", "Please fill in all fields", "error");
    return;
  }

  // Convert date to DD/MM/YYYY
  const [year, month, day] = rawDate.split("-");
  const appointmentDate = `${day}/${month}/${year}`;

  try {
    // Save to Firestore
    await db.collection("appointments").add({
      name,
      email,
      phone,
      organization,
      appointmentDate,
      timeslot,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Send confirmation email via EmailJS
    const templateParams = {
      to_name: name,
      to_email: email,
      phone,
      organization,
      appointment_date: appointmentDate,
      timeslot,
    };

    await emailjs.send("service_fvowxi8", "template_n6j8enq", templateParams);

    // Success alert
    Swal.fire({
      icon: "success",
      title: "Appointment Booked!",
      text: "Your blood sample collection is scheduled. A confirmation email has been sent.",
    }).then(() => {
      document.getElementById("appointmentForm").reset();
    });

  } catch (error) {
    console.error("Error submitting appointment:", error);
    Swal.fire("Error", "Something went wrong. Try again.", "error");
  }
});

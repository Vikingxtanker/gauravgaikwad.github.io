document.addEventListener("DOMContentLoaded", () => {
  const db = firebase.firestore();

  const verifyForm = document.getElementById("verifyForm");
  const patientIDInput = document.getElementById("patientID");
  const stationSection = document.getElementById("stationSection");
  const patientName = document.getElementById("patientName");
  const patientAge = document.getElementById("patientAge");
  const patientGender = document.getElementById("patientGender");
  const stationSelect = document.getElementById("stationSelect");

  const changePatientBtn = document.createElement("button");
  const verifyContainer = document.getElementById("verifyForm").parentElement;

  const sections = {
    hb: document.getElementById("hbFormSection"),
    rbg: document.getElementById("rbgFormSection"),
    fev: document.getElementById("fevFormSection"),
    bp: document.getElementById("bpFormSection"),
    counseling: document.getElementById("counselingFormSection")
  };

  let currentPatientId = null;

  patientIDInput.value = "";

  changePatientBtn.textContent = "Change Patient";
  changePatientBtn.className = "btn btn-secondary my-3";
  changePatientBtn.style.display = "none";
  changePatientBtn.onclick = () => location.reload();
  verifyContainer.appendChild(changePatientBtn);

  // ✅ Patient ID verification
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = patientIDInput.value.trim();

    try {
      const doc = await db.collection("patients").doc(id).get();
      if (!doc.exists) {
        Swal.fire("Invalid ID", "No patient found with this ID.", "error");
        return;
      }

      currentPatientId = id;
      const data = doc.data();

      patientName.textContent = data.name || "N/A";
      patientAge.textContent = data.age || "N/A";
      patientGender.textContent = data.gender || "N/A";

      await Swal.fire("Patient Verified", "Patient ID is valid.", "success");

      stationSection.style.display = "block";
      verifyForm.style.display = "none";
      changePatientBtn.style.display = "inline-block";

    } catch (err) {
      console.error("Verification error:", err);
      Swal.fire("Error", "Something went wrong verifying the patient.", "error");
    }
  });

  // ✅ Station selection
  stationSelect.addEventListener("change", async () => {
    const selected = stationSelect.value;
    Object.values(sections).forEach(s => s.style.display = "none");
    if (!selected || !currentPatientId) return;

    sections[selected].style.display = "block";

    const doc = await db.collection("patients").doc(currentPatientId).get();
    const data = doc.data();

    if (selected === "hb" && data.hemoglobin !== undefined)
      document.getElementById("hemoglobin").value = data.hemoglobin;
    if (selected === "rbg" && data.rbg !== undefined)
      document.getElementById("rbg").value = data.rbg;
    if (selected === "fev" && data.fev !== undefined)
      document.getElementById("fev").value = data.fev;
    if (selected === "bp" && data.systolic !== undefined && data.diastolic !== undefined) {
      document.getElementById("systolic").value = data.systolic;
      document.getElementById("diastolic").value = data.diastolic;
    }
    if (selected === "counseling" && data.counselingPoints !== undefined)
      document.getElementById("counselingPoints").value = data.counselingPoints;
  });

  // ✅ Save Hemoglobin
  document.getElementById("hbForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = parseFloat(document.getElementById("hemoglobin").value);
    try {
      await db.collection("patients").doc(currentPatientId).update({ hemoglobin: val });
      Swal.fire("Success", "Hemoglobin saved!", "success");
    } catch (err) {
      console.error("Error saving HB:", err);
      Swal.fire("Error", "Failed to save Hemoglobin.", "error");
    }
  });

  // ✅ Save RBG
  document.getElementById("rbgForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = parseFloat(document.getElementById("rbg").value);
    try {
      await db.collection("patients").doc(currentPatientId).update({ rbg: val });
      Swal.fire("Success", "RBG saved!", "success");
    } catch (err) {
      console.error("Error saving RBG:", err);
      Swal.fire("Error", "Failed to save RBG.", "error");
    }
  });

  // ✅ Save FEV
  document.getElementById("fevForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = parseFloat(document.getElementById("fev").value);
    try {
      await db.collection("patients").doc(currentPatientId).update({ fev: val });
      Swal.fire("Success", "FEV saved!", "success");
    } catch (err) {
      console.error("Error saving FEV:", err);
      Swal.fire("Error", "Failed to save FEV.", "error");
    }
  });

  // ✅ Save BP
  document.getElementById("bpForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sys = parseInt(document.getElementById("systolic").value);
    const dia = parseInt(document.getElementById("diastolic").value);
    try {
      await db.collection("patients").doc(currentPatientId).update({
        systolic: sys,
        diastolic: dia
      });
      Swal.fire("Success", "Blood Pressure saved!", "success");
    } catch (err) {
      console.error("Error saving BP:", err);
      Swal.fire("Error", "Failed to save Blood Pressure.", "error");
    }
  });

  // ✅ Save Counseling Points
  document.getElementById("counselingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const points = document.getElementById("counselingPoints").value.trim();
    try {
      await db.collection("patients").doc(currentPatientId).update({ counselingPoints: points });
      Swal.fire("Success", "Counseling points saved!", "success");
    } catch (err) {
      console.error("Error saving counseling:", err);
      Swal.fire("Error", "Failed to save counseling points.", "error");
    }
  });
});

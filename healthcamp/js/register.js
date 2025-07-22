document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registrationForm");

  const dobInput = document.getElementById("dob");
  const ageInput = document.getElementById("age");
  const heightInput = document.getElementById("height");
  const weightInput = document.getElementById("weight");
  const bmiInput = document.getElementById("bmi");
  const allergySelect = document.getElementById("allergy");
  const allergyDetail = document.getElementById("allergyDetail");
  const allergyLabel = document.querySelector("label[for='allergyDetail']");
  const clearBtn = document.getElementById("clearAllBtn");

  // ✅ Auto-calculate age
  dobInput.addEventListener("change", () => {
    const dob = new Date(dobInput.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    ageInput.value = age >= 0 ? age : "";
  });

  // ✅ Auto-calculate BMI
  function calculateBMI() {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);
    if (height > 0 && weight > 0) {
      const bmi = weight / ((height / 100) ** 2);
      bmiInput.value = bmi.toFixed(1);
    } else {
      bmiInput.value = "";
    }
  }

  heightInput.addEventListener("input", calculateBMI);
  weightInput.addEventListener("input", calculateBMI);

  // ✅ Show/hide allergy detail
  allergySelect.addEventListener("change", () => {
    if (allergySelect.value === "Yes") {
      allergyDetail.style.display = "block";
      allergyLabel.style.display = "block";
    } else {
      allergyDetail.style.display = "none";
      allergyLabel.style.display = "none";
      allergyDetail.value = "";
    }
  });

  // ✅ Clear form
  clearBtn.addEventListener("click", () => {
    form.reset();
    ageInput.value = "";
    bmiInput.value = "";
    allergyDetail.style.display = "none";
    allergyLabel.style.display = "none";
  });

  // ✅ Submit form
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const dob = dobInput.value;
    const age = ageInput.value;
    const gender = document.getElementById("gender").value;
    const height = heightInput.value;
    const weight = weightInput.value;
    const bmi = bmiInput.value;
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const tobacco = document.getElementById("tobacco").value;
    const smoking = document.getElementById("smoking").value;
    const alcohol = document.getElementById("alcohol").value;
    const married = document.getElementById("married").value;
    const allergy = allergySelect.value;
    const allergyDetails = allergyDetail.value.trim();
    const pastMedical = document.getElementById("pastMedical").value.trim();
    const pastMedication = document.getElementById("pastMedication").value.trim();

    // ✅ New patient ID format
    const firstThree = name.toLowerCase().replace(/\s+/g, '').slice(0, 3);
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const patientId = firstThree + randomDigits;

    try {
      await db.collection("patients").doc(patientId).set({
        name,
        dob,
        age,
        gender,
        height,
        weight,
        bmi,
        phone,
        address,
        tobacco,
        smoking,
        alcohol,
        married,
        allergy,
        allergyDetails,
        pastMedical,
        pastMedication,
        timestamp: new Date()
      });

      Swal.fire({
        icon: "success",
        title: "Registered successfully!",
        text: `Patient ID: ${patientId}`,
        confirmButtonColor: "#3085d6"
      });

      form.reset();
      ageInput.value = "";
      bmiInput.value = "";
      allergyDetail.style.display = "none";
      allergyLabel.style.display = "none";

    } catch (error) {
      console.error("❌ Firebase error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: "An error occurred. Please try again."
      });
    }
  });
});

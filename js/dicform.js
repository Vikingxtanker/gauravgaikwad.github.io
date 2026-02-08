// js/dicform.js
// Open for all users
// Saves to Firestore collection: dicform
// Document ID = requesterName + timestamp (SAFE UNIQUE)

import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("dicForm");
  const clearBtn = document.getElementById("clearAllBtn");

  // -------- Fields ----------
  const requesterName = document.getElementById("requesterName");
  const designation = document.getElementById("designation");
  const deptUnit = document.getElementById("deptUnit");
  const contactNo = document.getElementById("contactNo");
  const communicationMode = document.getElementById("communicationMode");

  const patientAge = document.getElementById("patientAge");
  const patientGender = document.getElementById("patientGender");
  const diagnosis = document.getElementById("diagnosis");
  const currentMedication = document.getElementById("currentMedication");
  const relevantHistory = document.getElementById("relevantHistory");

  const categoryIds = [
    "category1","category2","category3","category4",
    "category5","category6","category7","category8"
  ];
  const otherCategory = document.getElementById("otherCategory");

  const specificQuery = document.getElementById("specificQuery");
  const urgencyLevel = document.getElementById("urgencyLevel");
  const requestDateTime = document.getElementById("requestDateTime");
  const sign = document.getElementById("sign");

  const receivedBy = document.getElementById("receivedBy");
  const dicCommMode = document.getElementById("dicCommMode");
  const assuredDateTime = document.getElementById("assuredDateTime");
  const answeredBy = document.getElementById("answeredBy");
  const sources = document.getElementById("sources");
  const remark = document.getElementById("remark");

  // -------- Clear button --------
  clearBtn?.addEventListener("click", () => {
    form.reset();
  });

  // -------- Submit form --------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Phone validation
    const contact = contactNo.value.trim();
    if (contact && !/^\d{10}$/.test(contact)) {
      Swal.fire({
        icon: "error",
        title: "Invalid phone number",
        text: "Contact number must be 10 digits"
      });
      return;
    }

    // Categories
    const categories = [];
    categoryIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.checked) categories.push(el.value);
    });

    if (otherCategory && otherCategory.value.trim()) {
      categories.push(otherCategory.value.trim());
    }

    // -------- Data object --------
    const data = {
      requesterName: requesterName.value.trim(),
      designation: designation.value.trim(),
      deptUnit: deptUnit.value.trim(),
      contactNo: contact,
      communicationMode: communicationMode.value,

      patientAge: patientAge.value ? Number(patientAge.value) : "",
      patientGender: patientGender.value,
      diagnosis: diagnosis.value.trim(),
      currentMedication: currentMedication.value.trim(),
      relevantHistory: relevantHistory.value.trim(),

      categories: categories,
      specificQuery: specificQuery.value.trim(),
      urgencyLevel: urgencyLevel.value,
      requestDateTime: requestDateTime.value || "",
      sign: sign.value.trim(),

      receivedBy: receivedBy.value.trim(),
      dicCommMode: dicCommMode.value.trim(),
      assuredDateTime: assuredDateTime.value || "",
      answeredBy: answeredBy.value.trim(),
      sources: sources.value.trim(),
      remark: remark.value.trim(),

      timestamp: serverTimestamp()
    };

    try {

      // ⭐ SAFE UNIQUE DOCUMENT ID
      let namePart = requesterName.value.trim();
      namePart = namePart.replace(/\s+/g, "_");      // space → _
      namePart = namePart.replace(/[^\w\-]/g, "");   // remove special chars
      if (!namePart) namePart = "unknown";

      const uniqueTime = Date.now(); // timestamp
      const docId = `${namePart}_${uniqueTime}`;

      // Save to firestore
      await setDoc(doc(db, "dicform", docId), data);

      Swal.fire({
        icon: "success",
        title: "Submitted Successfully",
        text: "DIC request saved to database",
        confirmButtonColor: "#3085d6"
      });

      form.reset();

    } catch (error) {
      console.error("Error saving DIC form:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to submit form"
      });
    }
  });

});

// ==========================
// Shared Navbar Login/Logout Handling
// ==========================

// Elements
const loginNav = document.getElementById("loginNav");   // Login button/link
const logoutNav = document.getElementById("logoutNav"); // Logout button container
const logoutBtn = document.getElementById("logoutBtn"); // Logout button inside logoutNav
const loginForm = document.getElementById("loginForm"); // Login form (if exists)

// Example valid users
const validUsers = [
  { username: "admin", password: "admin123" },
  { username: "doctor1", password: "docpass" },
  { username: "nurse1", password: "nursepass" }
];

// ==========================
// Render Navbar based on login state
// ==========================
function renderNavbar() {
  const user = localStorage.getItem("loggedInUser");

  if (user) {
    // Logged in
    if (loginNav) loginNav.style.display = "none";
    if (logoutNav) {
      logoutNav.style.display = "block";
      logoutBtn.textContent = `Logout (${user})`; // Show username
    }
  } else {
    // Not logged in
    if (loginNav) loginNav.style.display = "block";
    if (logoutNav) logoutNav.style.display = "none";
  }
}

// ==========================
// Logout handling
// ==========================
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    renderNavbar();
    Swal.fire({
      icon: "success",
      title: "Logged out",
      timer: 1000,
      showConfirmButton: false
    });
  });
}

// ==========================
// Login modal handling
// ==========================
if (loginForm) {
  loginForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const match = validUsers.find(u => u.username === username && u.password === password);

    if (match) {
      localStorage.setItem("loggedInUser", username.toLowerCase());
      Swal.fire({
        icon: "success",
        title: "Login successful",
        showConfirmButton: false,
        timer: 1200
      }).then(() => {
        renderNavbar();
        // Hide modal if exists
        const modalEl = document.getElementById("loginModal");
        if (modalEl) {
          const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          instance.hide();
        }
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Invalid credentials",
        text: "Please try again."
      });
    }
  });
}

// ==========================
// Run on page load
// ==========================
window.addEventListener("load", renderNavbar);

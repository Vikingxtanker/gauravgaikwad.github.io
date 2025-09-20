// ========================
// js/userbase.js
// Userbase authentication & role-based access
// ========================

userbase.init({ appId: '2412fcb4-520f-4d6d-9484-242c47e19cb4' }); // Replace with your Userbase App ID

const accessControl = {
  "admin": ["admin.html","register.html","station.html","patient-report.html"],
  "dataenterer": ["register.html","station.html","patient-report.html"],
  "doctor": ["patient-report.html"],
  "nurse": ["station.html"]
};

const loginNav = document.getElementById("loginNav");
const logoutNav = document.getElementById("logoutNav");
const logoutBtn = document.getElementById("logoutBtn");

async function renderNavbar() {
  try {
    const currentUser = await userbase.getCurrentUser();
    if (currentUser) {
      const username = currentUser.username;
      const role = currentUser.data?.role || 'dataenterer';
      localStorage.setItem('loggedInUser', username);
      localStorage.setItem('userRole', role);

      loginNav.style.display = 'none';
      logoutNav.style.display = 'block';
      logoutBtn.textContent = `Logout (${username})`;
      logoutBtn.style.color = "red";

      // Page access check
      const page = window.location.pathname.split("/").pop();
      if (!accessControl[role]?.includes(page) && role !== 'admin') {
        Swal.fire({
          icon:'error',
          title:'Access Denied',
          text:'You are not authorized.',
          timer:1500,
          showConfirmButton:false
        }).then(() => window.location.href='health-screening.html');
      }

    } else {
      loginNav.style.display = 'block';
      logoutNav.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
}

// Logout button
logoutBtn.addEventListener("click", async () => {
  await userbase.signOut();
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userRole");
  renderNavbar();
  Swal.fire({
    icon: 'success',
    title: 'Logged out',
    timer: 1000,
    showConfirmButton: false
  });
});

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    try {
      const user = await userbase.signIn({ username, password });
      localStorage.setItem('loggedInUser', user.username);
      localStorage.setItem('userRole', user.data.role || 'dataenterer');
      Swal.fire({
        icon: 'success',
        title: 'Login successful',
        timer: 1200,
        showConfirmButton: false
      }).then(() => {
        const modalEl = document.getElementById('loginModal');
        const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        instance.hide();
        renderNavbar();
      });
    } catch(err) {
      Swal.fire({ icon: 'error', title: 'Login Failed', text: err.message });
    }
  });
}

// Initialize on page load
window.addEventListener("load", renderNavbar);

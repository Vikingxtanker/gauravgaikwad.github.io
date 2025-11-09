// ========================
// js/userbase.js
// Userbase authentication & role-based access
// ========================

userbase.init({ appId: '2412fcb4-520f-4d6d-9484-242c47e19cb4' });

// Role-based page access
const rolesAccess = {
  "admin": ["dashboard.html", "register.html", "station.html", "patient-report.html"],
  "registration": ["register.html"],
  "station": ["station.html"],
  "documentation": ["patient-report.html", "station.html", "dashboard.html"]
};

// Pages that are completely public
const publicPages = ["health-screening.html"];

// Update navbar login/logout
async function renderNavbar() {
  const loginNav = document.getElementById("loginNav");
  const logoutNav = document.getElementById("logoutNav");
  const logoutBtn = document.getElementById("logoutBtn");

  try {
    const currentUser = await userbase.getCurrentUser();

    if (currentUser) {
      const username = currentUser.username;
      const role = currentUser.data?.role || 'user';
      localStorage.setItem('loggedInUser', username);
      localStorage.setItem('userRole', role);

      if (loginNav) loginNav.style.display = 'none';
      if (logoutNav) logoutNav.style.display = 'block';
      if (logoutBtn) {
        logoutBtn.textContent = `Logout (${username})`;
        logoutBtn.style.color = "red";
      }

      await hideUnauthorizedLinks(currentUser);
    } else {
      if (loginNav) loginNav.style.display = 'block';
      if (logoutNav) logoutNav.style.display = 'none';
    }

  } catch (err) {
    console.error('Navbar render error:', err);
  }
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
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
}

// Login form handling
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const user = await userbase.signIn({ username, password });
      localStorage.setItem('loggedInUser', user.username);
      localStorage.setItem('userRole', user.data.role || 'user');
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

// Check access to the current page
async function checkPageAccess() {
  const page = window.location.pathname.split("/").pop();

  // Public page → no restriction
  if (publicPages.includes(page)) return true;

  try {
    const currentUser = await userbase.getCurrentUser();

    if (!currentUser) {
      // Not logged in → redirect
      Swal.fire({
        icon: 'error',
        title: 'Login Required',
        text: 'You must log in to access this page.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => window.location.href = 'health-screening.html');
      return false;
    }

    const role = currentUser.data?.role || 'user';

    if (!rolesAccess[role]?.includes(page)) {
      // Logged in but no permission → redirect
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You are not authorized to view this page.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => window.location.href = 'health-screening.html');
      return false;
    }

    return true; // allowed

  } catch (err) {
    console.error('Access check error:', err);
    return false;
  }
}

// Hide navbar links for pages the user cannot access
async function hideUnauthorizedLinks(currentUser) {
  const role = currentUser?.data?.role || 'user';
  const navLinks = document.querySelectorAll('a.nav-link');

  navLinks.forEach(link => {
    const page = link.getAttribute('href');
    if (page && !rolesAccess[role]?.includes(page) && !publicPages.includes(page)) {
      link.style.display = 'none';
    }
  });
}

// Initialize on page load
window.addEventListener("load", async () => {
  await renderNavbar();
  await checkPageAccess();
});

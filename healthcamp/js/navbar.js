// navbar.js
document.addEventListener("DOMContentLoaded", function() {
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return;

  function renderNavbar() {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const existingAuthItem = document.getElementById("authLink");
    if (existingAuthItem) existingAuthItem.remove();

    const li = document.createElement("li");
    li.classList.add("nav-item");
    li.id = "authLink";

    if (loggedInUser) {
      li.innerHTML = `<a class="nav-link fw-semibold text-danger" href="#" id="logoutBtn">Logout (${loggedInUser})</a>`;
      navLinks.appendChild(li);

      document.getElementById("logoutBtn").addEventListener("click", function(e) {
        e.preventDefault();
        localStorage.removeItem("loggedInUser");
        Swal.fire({
          icon: 'success',
          title: 'Logged Out',
          text: 'You have been successfully logged out.',
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.href = "health-screening.html";
        });
      });
    } else {
      // If we're on the homepage and the modal exists, open it. Else link to homepage.
      const loginModalEl = document.getElementById("loginModal");
      if (loginModalEl) {
        li.innerHTML = `<a class="nav-link fw-semibold" href="#" id="loginLink">Login</a>`;
        navLinks.appendChild(li);
        document.getElementById("loginLink").addEventListener("click", function(e) {
          e.preventDefault();
          const modal = new bootstrap.Modal(loginModalEl);
          modal.show();
        });
      } else {
        li.innerHTML = `<a class="nav-link fw-semibold" href="health-screening.html">Login</a>`;
        navLinks.appendChild(li);
      }
    }
  }

  // expose globally so pages can re-render after login
  window.renderNavbar = renderNavbar;
  renderNavbar();

  // ✅ Protect only specific pages
  const currentPage = window.location.pathname.split("/").pop().toLowerCase();
  const protectedPages = [
    "register.html",
    "station.html",
    "patient-report.html",
    "admin.html"
  ];

  if (protectedPages.includes(currentPage) && !localStorage.getItem("loggedInUser")) {
    Swal.fire({
      icon: 'warning',
      title: 'Login Required',
      text: 'You must log in to access this page.',
      confirmButtonText: 'Go to Login'
    }).then(() => {
      window.location.href = "health-screening.html";
    });
  }
});

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
      li.innerHTML = `<a class="nav-link fw-semibold" href="health-screening.html">Login</a>`;
      navLinks.appendChild(li);
    }
  }

  renderNavbar();

  // Optional: redirect if login required
  const requiresLogin = document.body.getAttribute("data-login-required") === "true";
  if (requiresLogin && !localStorage.getItem("loggedInUser")) {
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

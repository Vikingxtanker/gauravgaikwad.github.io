// js/firebase-auth.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";

// Navbar elements
const authBtn = document.getElementById('authBtn');
const loggedInfo = document.getElementById('loggedInfo');

// Load current user from localStorage
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Function to update navbar display
const updateNavbar = () => {
  if (currentUser) {
    loggedInfo.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
    authBtn.textContent = 'Logout';
  } else {
    loggedInfo.textContent = '';
    authBtn.textContent = 'Login';
  }
};

// Handle login/logout click
authBtn.addEventListener('click', async () => {
  if (currentUser) {
    // Logout
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateNavbar();
    Swal.fire({
      icon: 'success',
      title: 'Logged Out',
      text: 'You have successfully logged out.',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.reload();
    });
  } else {
    // Login prompt
    const { value: formValues } = await Swal.fire({
      title: 'Login',
      html:
        `<input id="swal-username" class="swal2-input" placeholder="Username">` +
        `<input id="swal-password" type="password" class="swal2-input" placeholder="Password">`,
      focusConfirm: false,
      preConfirm: () => {
        const username = document.getElementById('swal-username').value.trim();
        const password = document.getElementById('swal-password').value.trim();
        if (!username || !password) {
          Swal.showValidationMessage(`Please enter both username and password`);
        }
        return { username, password };
      }
    });

    if (formValues) {
      const { username, password } = formValues;
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Swal.fire('Error', 'User not found', 'error');
          return;
        }

        let userData;
        snapshot.forEach(doc => {
          userData = doc.data();
        });

        if (userData.password !== password) {
          Swal.fire('Error', 'Incorrect password', 'error');
          return;
        }

        // Save user to localStorage
        currentUser = {
          username: userData.username,
          role: userData.role
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateNavbar();

        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: `Welcome, ${currentUser.username}!`,
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.reload();
        });

      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to login. Please try again.', 'error');
      }
    }
  }
});

// Initialize navbar on page load
updateNavbar();

// js/auth.js
document.addEventListener("DOMContentLoaded", () => {

  const APP_ID = '2412fcb4-520f-4d6d-9484-242c47e19cb4';
  let currentUser = null;

  const authBtn = document.getElementById('authBtn');
  const loggedInfo = document.getElementById('loggedInfo');

  function renderAuthButton() {
    if (!authBtn || !loggedInfo) return;
    if (currentUser) {
      authBtn.textContent = 'Sign Out';
      loggedInfo.textContent = `Logged in as: ${currentUser.username} (${currentUser.profile?.role || 'user'})`;
    } else {
      authBtn.textContent = 'Sign In';
      loggedInfo.textContent = '';
    }
  }

  async function initUserbase() {
    try {
      const session = await userbase.init({ appId: APP_ID });
      if (session && session.user) {
        currentUser = session.user;
      }
    } catch (err) {
      console.error("Error initializing Userbase:", err);
    }
    renderAuthButton();
  }

  authBtn.addEventListener('click', async () => {
    if (!currentUser) {
      // Sign In Flow
      const { value: creds } = await Swal.fire({
        title: 'Sign In',
        html:
          '<input id="swal-username" class="swal2-input" placeholder="Username">' +
          '<input id="swal-password" type="password" class="swal2-input" placeholder="Password">',
        focusConfirm: false,
        preConfirm: () => {
          const u = document.getElementById('swal-username').value;
          const p = document.getElementById('swal-password').value;
          if (!u || !p) Swal.showValidationMessage('Please fill both fields');
          return { username: u, password: p };
        }
      });
      if (!creds) return;

      try {
        const user = await userbase.signIn({
          username: creds.username,
          password: creds.password,
          rememberMe: 'local'
        });
        // user is the object returned from signIn
        currentUser = user;
        renderAuthButton();
        Swal.fire('Success', `Welcome ${currentUser.username}`, 'success');
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }

    } else {
      // Sign Out Flow
      try {
        await userbase.signOut();
        currentUser = null;
        renderAuthButton();
        Swal.fire('Signed Out', 'You have been signed out.', 'info');
      } catch (err) {
        console.error("Error during sign out:", err);
      }
    }
  });

  // Kick off
  initUserbase();
});

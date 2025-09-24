// js/auth.js

// Initialize Userbase app
const appId = '2412fcb4-520f-4d6d-9484-242c47e19cb4'; // Replace with your Userbase App ID

// Initialize Userbase only once
async function initUserbase() {
  try {
    await userbase.init({ appId });
  } catch (err) {
    console.error('Userbase init error:', err);
  }
}

// Get current user
export async function authInit() {
  await initUserbase();

  let currentUser = null;
  try {
    currentUser = await userbase.getCurrentUser();
  } catch (err) {
    console.error('Auth init error:', err);
  }

  // If already logged in, save in localStorage for persistent session
  if (currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return currentUser;
  } else {
    localStorage.removeItem('currentUser');
    return null;
  }
}

// Sign in user
export async function signInUser() {
  await initUserbase();

  // Check localStorage first
  let storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    return JSON.parse(storedUser);
  }

  try {
    const user = await userbase.signIn({
      username: prompt('Enter username:'),
      password: prompt('Enter password:'),
    });

    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  } catch (err) {
    if (err.name === 'UserAlreadySignedIn') {
      // Already signed in, get current user
      const user = await userbase.getCurrentUser();
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.message,
      });
      return null;
    }
  }
}

// Sign out user
export async function signOutUser() {
  try {
    await userbase.signOut();
    localStorage.removeItem('currentUser');
    return null;
  } catch (err) {
    console.error('Sign out error:', err);
    return null;
  }
}

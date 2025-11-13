// js/role-guard.js
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm";
import { checkUserRole } from './firebase-auth.js';

/**
 * Call this on restricted pages to enforce role-based access
 * @param {string[]} allowedRoles - array of allowed roles, e.g. ['admin']
 */
export async function enforceRole(allowedRoles = []) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        // Not logged in
        Swal.fire('Access Denied', 'Please login to access this page.', 'warning')
            .then(() => { window.location.href = 'health-screening.html'; });
        return false;
    }

    try {
        const role = await checkUserRole();
        if (!role || !allowedRoles.includes(role)) {
            // Logged in but role not allowed
            Swal.fire('Access Denied', 'You do not have permission to access this page.', 'error')
                .then(() => { window.location.href = 'health-screening.html'; });
            return false;
        }
        // Access granted
        return true;
    } catch (err) {
        console.error('Role guard error:', err);
        Swal.fire('Error', 'Something went wrong.', 'error')
            .then(() => { window.location.href = 'health-screening.html'; });
        return false;
    }
}

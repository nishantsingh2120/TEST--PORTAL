// Authentication State
let isLoggedIn = false;
let currentUserRole = "";

// Page Navigation with Auth Protection
function showPage(pageId) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.remove('hidden');
    }
}

// Protected Dashboard Opening
function openDashboard() {
    if (!isLoggedIn) {
        showToast("⚠️ Pehle Login karein!");
        showPage('login-page');
        return;
    }
    showPage('dashboard-page');
}

// Handle Form Submission & Set Dynamic Data
function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('userRole').value;
    const username = document.getElementById('username').value;
    
    isLoggedIn = true;
    currentUserRole = role;

    // Update Dashboard UI dynamically
    document.getElementById('welcome-text').innerText = `Welcome back, ${username} (${role.toUpperCase()})`;
    
    if (role === 'admin') {
        document.getElementById('stat-candidates').innerText = '128';
        document.getElementById('stat-tests').innerText = '14';
    } else {
        document.getElementById('stat-candidates').innerText = '1';
        document.getElementById('stat-tests').innerText = '3';
    }

    showToast(`Logged in successfully as ${role.toUpperCase()}`);
    showPage('dashboard-page');
}

// Handle Logout
function handleLogout() {
    isLoggedIn = false;
    currentUserRole = "";
    document.getElementById('loginForm').reset();
    document.getElementById('stat-candidates').innerText = '0';
    document.getElementById('stat-tests').innerText = '0';
    showToast("Logged out successfully");
    showPage('login-page');
}

// Copy Link & Trigger Toast Message
function copyLink(urlToCopy) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(urlToCopy).then(() => {
            showToast("✨ Link successfully copied to clipboard!");
        }).catch(() => {
            fallbackCopyText(urlToCopy);
        });
    } else {
        fallbackCopyText(urlToCopy);
    }
}

// Fallback method for copy
function fallbackCopyText(text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast("✨ Link successfully copied!");
}

// Glowing Toast Popup Notification
function showToast(message) {
    const toast = document.getElementById("copyToast");
    if (!toast) return;

    toast.innerText = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 3000);
}

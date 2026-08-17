// Function to switch between pages
function showPage(pageId) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.remove('hidden');
    }
}

// Handle Form Submission
function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('userRole').value;
    
    showToast(`Logged in successfully as ${role.toUpperCase()}`);
    showPage('dashboard-page');
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

// Fallback method for older browsers
function fallbackCopyText(text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast("✨ Link successfully copied!");
}

// Function to Show Glowing Toast Popup Notification
function showToast(message) {
    const toast = document.getElementById("copyToast");
    if (!toast) return;

    toast.innerText = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 3000);
}

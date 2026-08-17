// Global Utility & Navigation Logic

function showView(viewId) {
    // Hide all view sections
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => {
        view.classList.add('hidden');
    });

    // Show target view section
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        console.error("View not found: " + viewId);
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Navigation Events
document.addEventListener('DOMContentLoaded', () => {
    // Brand link to home
    const brand = document.querySelector('.navbar-brand');
    if (brand) {
        brand.addEventListener('click', () => showView('view-welcome'));
    }

    // Logout Button Event
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            document.getElementById('logout-btn').classList.add('hidden');
            document.getElementById('nav-admin-login-btn').classList.remove('hidden');
            showToast("Logged out successfully", "info");
            showView('view-welcome');
        });
    }
});

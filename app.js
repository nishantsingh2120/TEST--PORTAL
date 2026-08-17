// Global Application State Controller
const App = {
    currentView: null,
    queryParams: {},

    init() {
        this.parseQueryParams();
        this.setupEventListeners();
        
        // Detect view based on URL parameter ?test=SHARECODE
        if (this.queryParams.test) {
            CandidateExam.init(this.queryParams.test);
        } else {
            Admin.init();
        }
    },

    parseQueryParams() {
        const params = new URLSearchParams(window.location.search);
        for (const [key, value] of params.entries()) {
            this.queryParams[key] = value;
        }
    },

    switchView(viewId) {
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            this.currentView = viewId;
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    },

    setupEventListeners() {
        document.getElementById('nav-admin-login-btn')?.addEventListener('click', () => {
            App.switchView('view-admin-login');
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            Admin.logout();
        });
    }
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

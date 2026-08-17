// Global Portal Data State
let isLoggedIn = false;
let currentUserRole = "";

// Dynamic Data Arrays
let testsData = [
    { id: 1, title: "Full Mock Test - 01", duration: 90 },
    { id: 2, title: "Aptitude & Logical Reasoning", duration: 45 }
];

let candidatesData = [
    { id: "CAND-101", name: "Rahul Sharma", status: "Active" },
    { id: "CAND-102", name: "Priya Patel", status: "Active" },
    { id: "CAND-103", name: "Amit Kumar", status: "Active" }
];

// Page Navigation
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
        showToast("⚠️ Please login first to access the dashboard!");
        showPage('login-page');
        return;
    }
    showPage('dashboard-page');
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('userRole').value;
    const username = document.getElementById('username').value;
    
    isLoggedIn = true;
    currentUserRole = role;

    document.getElementById('welcome-text').innerText = `Welcome back, ${username} (${role.toUpperCase()})`;

    // Show/Hide Role Specific Modules
    const adminSection = document.getElementById('admin-test-section');
    const candidateSection = document.getElementById('candidates-directory-section');

    if (role === 'admin') {
        adminSection.classList.remove('hidden');
        candidateSection.classList.remove('hidden');
    } else {
        adminSection.classList.add('hidden');
        candidateSection.classList.remove('hidden');
    }

    renderPortalData();
    showToast(`Logged in successfully as ${role.toUpperCase()}`);
    showPage('dashboard-page');
}

// Render Dynamic Stats & Modules
function renderPortalData() {
    // 1. Render Stats
    document.getElementById('stat-candidates').innerText = candidatesData.length;
    document.getElementById('stat-tests').innerText = testsData.length;

    // 2. Render Tests List (For Admin & Candidates)
    const testContainer = document.getElementById('test-list-container');
    testContainer.innerHTML = '';

    if (testsData.length === 0) {
        testContainer.innerHTML = '<p style="text-align:left;">No tests published yet.</p>';
    } else {
        testsData.forEach((test, index) => {
            const testRow = document.createElement('div');
            testRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 8px; border-radius: 8px;";
            
            let deleteBtnHtml = currentUserRole === 'admin' 
                ? `<button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 4px 10px !important; font-size: 0.8rem;" onclick="deleteTest(${test.id})">Delete</button>` 
                : '';

            testRow.innerHTML = `
                <div>
                    <strong>${test.title}</strong>
                    <div style="font-size: 0.85rem; color: #94a3b8;">Duration: ${test.duration} Mins</div>
                </div>
                ${deleteBtnHtml}
            `;
            testContainer.appendChild(testRow);
        });
    }

    // 3. Render Candidate Directory Table
    const tableBody = document.getElementById('candidate-table-body');
    tableBody.innerHTML = '';

    candidatesData.forEach(cand => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        row.innerHTML = `
            <td style="padding: 10px;">${cand.id}</td>
            <td style="padding: 10px;">${cand.name}</td>
            <td style="padding: 10px;"><span style="color: #4ade80;">● ${cand.status}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// Admin: Create New Test
function handleCreateTest(event) {
    event.preventDefault();
    const title = document.getElementById('testTitle').value;
    const duration = document.getElementById('testDuration').value;

    const newTest = {
        id: Date.now(),
        title: title,
        duration: duration
    };

    testsData.push(newTest);
    document.getElementById('createTestForm').reset();
    renderPortalData();
    showToast("✅ New Test set successfully!");
}

// Admin: Delete Test
function deleteTest(testId) {
    testsData = testsData.filter(t => t.id !== testId);
    renderPortalData();
    showToast("🗑️ Test removed!");
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

// Copy Link & Trigger Toast
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

// Glowing Toast Popup
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

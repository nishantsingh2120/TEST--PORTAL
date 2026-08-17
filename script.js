// Global Portal Data State
let isLoggedIn = false;
let currentUserRole = "";

// Dynamic Data Arrays (Initially Empty)
let testsData = [];
let registeredCandidates = [];

// FIXED ADMIN CREDENTIALS
const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

// Page Navigation
function showPage(pageId) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.add('hidden');
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

// Candidate Registration Handler
function handleCandidateRegister(event) {
    event.preventDefault();
    const fullname = document.getElementById('regFullname').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;

    // Check if username already exists
    const exists = registeredCandidates.some(c => c.username === username);
    if (exists) {
        showToast("❌ Username already taken! Choose another.");
        return;
    }

    // Save candidate registration
    const newCandidate = {
        id: `CAND-${100 + registeredCandidates.length + 1}`,
        name: fullname,
        username: username,
        password: password,
        status: "Active"
    };

    registeredCandidates.push(newCandidate);
    document.getElementById('registerForm').reset();
    showToast("✅ Registration successful! Please login.");
    showPage('login-page');
}

// Handle Secure Login
function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('userRole').value;
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // 1. Admin Verification Guard
    if (role === 'admin') {
        if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Username or Password!");
            return;
        }
    } 

    // 2. Candidate Verification Guard
    if (role === 'candidate') {
        const foundCandidate = registeredCandidates.find(
            c => c.username === username.toLowerCase() && c.password === password
        );
        
        if (!foundCandidate) {
            showToast("❌ Invalid Username or Password! Register first if new.");
            return;
        }
    }

    // Success Authentication
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
    showToast(`✅ Logged in successfully as ${role.toUpperCase()}`);
    showPage('dashboard-page');
}

// Render Dynamic Stats & Modules
function renderPortalData() {
    // 1. Render Stats dynamically
    document.getElementById('stat-candidates').innerText = registeredCandidates.length;
    document.getElementById('stat-tests').innerText = testsData.length;

    // 2. Render Tests List
    const testContainer = document.getElementById('test-list-container');
    testContainer.innerHTML = '';

    if (testsData.length === 0) {
        testContainer.innerHTML = '<p style="text-align:left; color:#94a3b8;">No tests set yet. Create a test above.</p>';
    } else {
        testsData.forEach((test) => {
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
    const emptyMsg = document.getElementById('no-candidate-msg');
    tableBody.innerHTML = '';

    if (registeredCandidates.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        registeredCandidates.forEach(cand => {
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.innerHTML = `
                <td style="padding: 10px;">${cand.id}</td>
                <td style="padding: 10px;">${cand.name}</td>
                <td style="padding: 10px;">${cand.username}</td>
                <td style="padding: 10px;"><span style="color: #4ade80;">● ${cand.status}</span></td>
            `;
            tableBody.appendChild(row);
        });
    }
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

// Global Portal Data State - Loaded from LocalStorage
let isLoggedIn = false;
let currentUserRole = "";

// Dynamic Data Arrays with Permanent LocalStorage Persistence
let testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
let registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
let tempQuestionsBatch = [];

// FIXED ADMIN CREDENTIALS
const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

// Password Toggle & Animated Monkey Tracking Handler
function togglePasswordVisibility(inputId, emojiId, trackerId) {
    const inputField = document.getElementById(inputId);
    const emojiSpan = document.getElementById(emojiId);
    const trackerSpan = document.getElementById(trackerId);

    if (!inputField || !emojiSpan) return;

    if (inputField.type === "password") {
        inputField.type = "text";
        emojiSpan.innerText = "🐵"; // Open Eyes Monkey
        emojiSpan.classList.add("emoji-peek-anim");

        if (trackerSpan) {
            trackerSpan.classList.remove("hidden");
            updateTrackerPos(inputId, trackerId);
        }
    } else {
        inputField.type = "password";
        emojiSpan.innerText = "🙈"; // Closed Eyes Monkey
        emojiSpan.classList.add("emoji-peek-anim");

        if (trackerSpan) {
            trackerSpan.classList.add("hidden");
        }
    }

    setTimeout(() => {
        emojiSpan.classList.remove("emoji-peek-anim");
    }, 300);
}

// Dynamic Cursor Tracker Calculation
function updateTrackerPos(inputId, trackerId) {
    const inputField = document.getElementById(inputId);
    const trackerSpan = document.getElementById(trackerId);

    if (!inputField || !trackerSpan || trackerSpan.classList.contains("hidden")) return;

    const text = inputField.value;
    const font = window.getComputedStyle(inputField).font;

    const canvas = document.getElementById("textWidthCanvas") || document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;

    const textWidth = context.measureText(text).width;
    
    const paddingLeft = 16; 
    const maxOffset = inputField.clientWidth - 70;
    const calculatedPos = Math.min(paddingLeft + textWidth, maxOffset);

    trackerSpan.style.transform = `translateX(${calculatedPos}px)`;
}

// Dynamic Working Link Generator for GitHub Pages
function copyCandidateLink() {
    const liveUrl = window.location.href.split('#')[0];
    const candidateRegLink = `${liveUrl}#register`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(candidateRegLink).then(() => {
            showToast("✨ Candidate Registration Link Copied!");
        }).catch(() => {
            fallbackCopyText(candidateRegLink);
        });
    } else {
        fallbackCopyText(candidateRegLink);
    }
}

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

// Candidate Registration Handler (Saves to Permanent Storage)
function handleCandidateRegister(event) {
    event.preventDefault();
    const fullname = document.getElementById('regFullname').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value.trim();

    // Latest LocalStorage Check
    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];

    const exists = registeredCandidates.some(c => c.username === username);
    if (exists) {
        showToast("❌ Username already taken! Choose another.");
        return;
    }

    const newCandidate = {
        id: `CAND-${100 + registeredCandidates.length + 1}`,
        name: fullname,
        username: username,
        password: password,
        status: "Active"
    };

    registeredCandidates.push(newCandidate);
    
    // Save permanently in browser storage
    localStorage.setItem('portal_candidates', JSON.stringify(registeredCandidates));

    document.getElementById('registerForm').reset();
    showToast("✅ Registration successful! Please login.");
    
    // Auto switch to candidate login view
    document.getElementById('userRole').value = 'candidate';
    document.getElementById('username').value = username;
    showPage('login-page');
}

// Handle Secure Login
function handleLogin(event) {
    event.preventDefault();
    const role = document.getElementById('userRole').value;
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();

    if (role === 'admin') {
        const rawUsername = document.getElementById('username').value.trim();
        if (rawUsername !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Username or Password!");
            return;
        }
    } 

    if (role === 'candidate') {
        // Fetch fresh candidate data from LocalStorage
        registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];

        const foundCandidate = registeredCandidates.find(
            c => c.username.toLowerCase() === username && c.password === password
        );
        
        if (!foundCandidate) {
            showToast("❌ Invalid Username or Password!");
            return;
        }
    }

    isLoggedIn = true;
    currentUserRole = role;

    document.getElementById('welcome-text').innerText = `Welcome back, ${username} (${role.toUpperCase()})`;

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

// Add Question to Draft Batch
function addQuestionToCurrentBatch() {
    const qText = document.getElementById('qText').value.trim();
    const optA = document.getElementById('optA').value.trim();
    const optB = document.getElementById('optB').value.trim();
    const optC = document.getElementById('optC').value.trim();
    const optD = document.getElementById('optD').value.trim();
    const correctOpt = document.getElementById('correctOpt').value;

    if (!qText || !optA || !optB || !optC || !optD) {
        showToast("⚠️ Please fill question and all 4 options!");
        return;
    }

    tempQuestionsBatch.push({
        question: qText,
        options: { A: optA, B: optB, C: optC, D: optD },
        answer: correctOpt
    });

    document.getElementById('qText').value = '';
    document.getElementById('optA').value = '';
    document.getElementById('optB').value = '';
    document.getElementById('optC').value = '';
    document.getElementById('optD').value = '';

    document.getElementById('draft-questions-preview').innerText = `✓ ${tempQuestionsBatch.length} question(s) added to this draft test.`;
    showToast("✅ Question added to draft!");
}

// Admin: Create New Test (Saves to Storage)
function handleCreateTest(event) {
    event.preventDefault();
    const title = document.getElementById('testTitle').value;
    const duration = document.getElementById('testDuration').value;

    const newTest = {
        id: Date.now(),
        title: title,
        duration: duration,
        questions: [...tempQuestionsBatch]
    };

    testsData.push(newTest);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));

    tempQuestionsBatch = [];
    document.getElementById('draft-questions-preview').innerText = '';
    document.getElementById('createTestForm').reset();

    renderPortalData();
    showToast("✅ Test published with questions!");
}

// Render Dynamic Stats & Modules
function renderPortalData() {
    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];

    document.getElementById('stat-candidates').innerText = registeredCandidates.length;
    document.getElementById('stat-tests').innerText = testsData.length;

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
                    <div style="font-size: 0.85rem; color: #94a3b8;">Duration: ${test.duration} Mins | Questions: ${test.questions ? test.questions.length : 0}</div>
                </div>
                ${deleteBtnHtml}
            `;
            testContainer.appendChild(testRow);
        });
    }

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

// Admin: Delete Test
function deleteTest(testId) {
    testsData = testsData.filter(t => t.id !== testId);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));
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

// Fallback Copy Function
function fallbackCopyText(text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast("✨ Link successfully copied!");
}

// Toast Popup
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

// Auto open candidate registration if hash exists in URL
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#register') {
        showPage('register-page');
    }
});

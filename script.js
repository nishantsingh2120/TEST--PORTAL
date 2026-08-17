// Global Portal Data State
let isLoggedIn = false;
let currentUserRole = "";

// Dynamic Data Arrays
let testsData = [];
let registeredCandidates = [];
let tempQuestionsBatch = [];

// FIXED ADMIN CREDENTIALS
const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

// Password Toggle & Animated Emoji Handler
function togglePasswordVisibility(inputId, emojiId) {
    const inputField = document.getElementById(inputId);
    const emojiSpan = document.getElementById(emojiId);

    if (!inputField || !emojiSpan) return;

    if (inputField.type === "password") {
        inputField.type = "text";
        emojiSpan.innerText = "👁️"; // Eyes watching
        emojiSpan.classList.add("emoji-peek-anim");
    } else {
        inputField.type = "password";
        emojiSpan.innerText = "🙈"; // Eyes covered
        emojiSpan.classList.add("emoji-peek-anim");
    }

    setTimeout(() => {
        emojiSpan.classList.remove("emoji-peek-anim");
    }, 300);
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

// Candidate Registration Handler
function handleCandidateRegister(event) {
    event.preventDefault();
    const fullname = document.getElementById('regFullname').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;

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

    if (role === 'admin') {
        if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Username or Password!");
            return;
        }
    } 

    if (role === 'candidate') {
        const foundCandidate = registeredCandidates.find(
            c => c.username === username.toLowerCase() && c.password === password
        );
        
        if (!foundCandidate) {
            showToast("❌ Invalid Username or Password! Register first if new.");
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

// Admin: Create New Test
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
    tempQuestionsBatch = [];
    document.getElementById('draft-questions-preview').innerText = '';
    document.getElementById('createTestForm').reset();

    renderPortalData();
    showToast("✅ Test published with questions!");
}

// Render Dynamic Stats & Modules
function renderPortalData() {
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

// Copy Link
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

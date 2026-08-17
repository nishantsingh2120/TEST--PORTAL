let isLoggedIn = false;
let currentUserRole = "";

let testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
let registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
let tempQuestionsBatch = [];

const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

function togglePasswordVisibility(inputId, emojiId, trackerId) {
    const inputField = document.getElementById(inputId);
    const emojiSpan = document.getElementById(emojiId);
    const trackerSpan = document.getElementById(trackerId);

    if (!inputField || !emojiSpan) return;

    if (inputField.type === "password") {
        inputField.type = "text";
        emojiSpan.innerText = "🐵";
        emojiSpan.classList.add("emoji-peek-anim");

        if (trackerSpan) {
            trackerSpan.classList.remove("hidden");
            updateTrackerPos(inputId, trackerId);
        }
    } else {
        inputField.type = "password";
        emojiSpan.innerText = "🙈";
        emojiSpan.classList.add("emoji-peek-anim");

        if (trackerSpan) {
            trackerSpan.classList.add("hidden");
        }
    }

    setTimeout(() => {
        emojiSpan.classList.remove("emoji-peek-anim");
    }, 300);
}

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

function showPage(pageId) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.remove('hidden');
    }
}

function openDashboard() {
    if (!isLoggedIn) {
        showToast("⚠️ Please login first to access the dashboard!");
        showPage('login-page');
        return;
    }
    showPage('dashboard-page');
}

// CANDIDATE REGISTRATION HANDLER
function handleCandidateRegister(event) {
    if (event) event.preventDefault();

    const fullname = document.getElementById('regFullname').value.trim();
    const usernameInput = document.getElementById('regUsername').value.trim();
    const passwordInput = document.getElementById('regPassword').value.trim();

    if (!fullname || !usernameInput || !passwordInput) {
        showToast("⚠️ Please fill all fields!");
        return;
    }

    // Direct LocalStorage Pull
    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];

    const usernameLower = usernameInput.toLowerCase();
    const exists = registeredCandidates.some(c => c.username.toLowerCase() === usernameLower);

    if (exists) {
        showToast("❌ Username already taken! Choose another.");
        return;
    }

    const newCandidate = {
        id: `CAND-${100 + registeredCandidates.length + 1}`,
        name: fullname,
        username: usernameInput, // Stores original casing
        password: passwordInput,
        status: "Active"
    };

    registeredCandidates.push(newCandidate);
    localStorage.setItem('portal_candidates', JSON.stringify(registeredCandidates));

    document.getElementById('registerForm').reset();
    showToast("✅ Registration successful! Directing to Login...");

    // Auto set candidate dropdown and prefill username in Login screen
    document.getElementById('userRole').value = 'candidate';
    document.getElementById('username').value = usernameInput;
    document.getElementById('password').value = '';

    showPage('login-page');
}

// SECURE LOGIN HANDLER
function handleLogin(event) {
    if (event) event.preventDefault();

    const role = document.getElementById('userRole').value;
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    if (!usernameInput || !passwordInput) {
        showToast("⚠️ Enter both Username and Password!");
        return;
    }

    if (role === 'admin') {
        if (usernameInput !== ADMIN_CREDENTIALS.username || passwordInput !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Username or Password!");
            return;
        }
    } 

    if (role === 'candidate') {
        // Refresh local storage array
        registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];

        const foundCandidate = registeredCandidates.find(
            c => c.username.toLowerCase() === usernameInput.toLowerCase() && c.password === passwordInput
        );
        
        if (!foundCandidate) {
            showToast("❌ Invalid Candidate Credentials! Verify Username/Password.");
            return;
        }
    }

    isLoggedIn = true;
    currentUserRole = role;

    document.getElementById('welcome-text').innerText = `Welcome back, ${usernameInput} (${role.toUpperCase()})`;

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

function handleCreateTest(event) {
    if (event) event.preventDefault();
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

function deleteTest(testId) {
    testsData = testsData.filter(t => t.id !== testId);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));
    renderPortalData();
    showToast("🗑️ Test removed!");
}

function handleLogout() {
    isLoggedIn = false;
    currentUserRole = "";
    document.getElementById('loginForm').reset();
    showToast("Logged out successfully");
    showPage('login-page');
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

window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#register') {
        showPage('register-page');
    }
});

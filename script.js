let isLoggedIn = false;
let currentUserRole = "";
let currentLoggedInUser = null;

let testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
let registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
let examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];
let tempQuestionsBatch = [];

let activeExamTest = null;
let pendingExamTestId = null;
let examTimerInterval = null;
let examTimeRemaining = 0;

const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

function showPage(pageId) {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');
    document.getElementById('exam-attempt-page').classList.add('hidden');
    document.getElementById('exam-result-page').classList.add('hidden');

    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('hidden');
}

function openDashboard() {
    if (!isLoggedIn) {
        showToast("⚠️ Please login first!");
        showPage('login-page');
        return;
    }
    showPage('dashboard-page');
}

function toggleQuestionTypeInputs() {
    const qType = document.getElementById('qType').value;
    const mcqWrapper = document.getElementById('mcq-options-wrapper');
    const nonMcqWrapper = document.getElementById('non-mcq-answer-wrapper');

    if (qType === 'mcq') {
        mcqWrapper.classList.remove('hidden');
        nonMcqWrapper.classList.add('hidden');
    } else {
        mcqWrapper.classList.add('hidden');
        nonMcqWrapper.classList.remove('hidden');
    }
}

function addQuestionToCurrentBatch() {
    const qType = document.getElementById('qType').value;
    const qText = document.getElementById('qText').value.trim();
    const qMarks = parseInt(document.getElementById('qMarks').value) || 1;

    if (!qText) {
        showToast("⚠️ Question statement is required!");
        return;
    }

    let questionObj = {
        id: Date.now(),
        type: qType,
        question: qText,
        marks: qMarks
    };

    if (qType === 'mcq') {
        const optA = document.getElementById('optA').value.trim();
        const optB = document.getElementById('optB').value.trim();
        const optC = document.getElementById('optC').value.trim();
        const optD = document.getElementById('optD').value.trim();
        const correctOpt = document.getElementById('correctOpt').value;

        if (!optA || !optB || !optC || !optD) {
            showToast("⚠️ Please fill all MCQ options!");
            return;
        }

        questionObj.options = { A: optA, B: optB, C: optC, D: optD };
        questionObj.answer = correctOpt;
    } else {
        const textAns = document.getElementById('textCorrectAns').value.trim();
        questionObj.answer = textAns;
    }

    tempQuestionsBatch.push(questionObj);

    document.getElementById('qText').value = '';
    document.getElementById('optA').value = '';
    document.getElementById('optB').value = '';
    document.getElementById('optC').value = '';
    document.getElementById('optD').value = '';
    document.getElementById('textCorrectAns').value = '';

    document.getElementById('draft-questions-preview').innerText = `✓ ${tempQuestionsBatch.length} question(s) added to paper.`;
    showToast("✅ Question added!");
}

function handleCreateTest(event) {
    if (event) event.preventDefault();
    const title = document.getElementById('testTitle').value.trim();
    const duration = document.getElementById('testDuration').value;

    if (tempQuestionsBatch.length === 0) {
        showToast("⚠️ Add at least one question!");
        return;
    }

    const newTest = {
        id: 'test_' + Date.now(),
        title: title,
        duration: parseInt(duration),
        questions: [...tempQuestionsBatch]
    };

    testsData.push(newTest);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));

    tempQuestionsBatch = [];
    document.getElementById('draft-questions-preview').innerText = '';
    document.getElementById('createTestForm').reset();

    renderPortalData();
    showToast("✅ Exam Published Successfully!");
}

function renderPortalData() {
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
    examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];

    document.getElementById('stat-tests').innerText = testsData.length;
    document.getElementById('stat-candidates').innerText = registeredCandidates.length;
    document.getElementById('stat-submissions').innerText = examSubmissions.length;

    const testContainer = document.getElementById('test-list-container');
    testContainer.innerHTML = '';

    if (testsData.length === 0) {
        testContainer.innerHTML = '<p style="text-align:left; color:#94a3b8;">No exams set yet.</p>';
    } else {
        testsData.forEach((test) => {
            const testRow = document.createElement('div');
            testRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: 8px;";
            
            testRow.innerHTML = `
                <div>
                    <strong style="font-size: 1.05rem;">${test.title}</strong>
                    <div style="font-size: 0.85rem; color: #94a3b8;">Duration: ${test.duration} Mins | Questions: ${test.questions ? test.questions.length : 0}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" style="padding: 5px 10px !important; font-size: 0.8rem;" onclick="copyDirectExamLink('${test.id}')">📋 Copy Exam Link</button>
                    <button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 5px 10px !important; font-size: 0.8rem;" onclick="deleteTest('${test.id}')">Delete</button>
                </div>
            `;
            testContainer.appendChild(testRow);
        });
    }

    // Render Submissions Table for Admin
    const subTableBody = document.getElementById('submissions-table-body');
    subTableBody.innerHTML = '';
    
    if (examSubmissions.length === 0) {
        subTableBody.innerHTML = '<tr><td colspan="5" style="padding:10px; color:#94a3b8;">No candidate submissions recorded yet.</td></tr>';
    } else {
        examSubmissions.forEach(sub => {
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            row.innerHTML = `
                <td style="padding: 10px;"><strong>${sub.candidateName}</strong></td>
                <td style="padding: 10px;">${sub.examTitle}</td>
                <td style="padding: 10px; color: #4ade80; font-weight: bold;">${sub.score} / ${sub.totalMarks}</td>
                <td style="padding: 10px;">${sub.attemptedCount} / ${sub.totalQuestions}</td>
                <td style="padding: 10px; font-size: 0.85rem; color: #94a3b8;">${sub.timestamp}</td>
            `;
            subTableBody.appendChild(row);
        });
    }
}

function copyDirectExamLink(testId) {
    const liveUrl = window.location.href.split('#')[0];
    const directExamLink = `${liveUrl}#take-test=${testId}`;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(directExamLink).then(() => {
            showToast("✨ Direct Exam Link Copied for Candidates!");
        });
    } else {
        fallbackCopyText(directExamLink);
    }
}

// START EXAM WITH COUNTDOWN TIMER
function startExamProcess(testId) {
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
    activeExamTest = testsData.find(t => t.id === testId);

    if (!activeExamTest) {
        alert("Exam link is invalid or has been deleted by Admin.");
        return;
    }

    document.getElementById('main-navbar').style.display = 'none';

    document.getElementById('exam-paper-title').innerText = activeExamTest.title;
    document.getElementById('exam-paper-info').innerText = `Candidate: ${currentLoggedInUser.name} | Total Questions: ${activeExamTest.questions.length}`;

    const qContainer = document.getElementById('exam-questions-container');
    qContainer.innerHTML = '';

    activeExamTest.questions.forEach((q, idx) => {
        const qCard = document.createElement('div');
        qCard.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 18px; border-radius: 10px; margin-bottom: 20px;";

        let inputHtml = "";

        if (q.type === 'mcq') {
            inputHtml = `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                    <label style="font-weight: normal; cursor: pointer;"><input type="radio" name="q_${q.id}" value="A"> A) ${q.options.A}</label>
                    <label style="font-weight: normal; cursor: pointer;"><input type="radio" name="q_${q.id}" value="B"> B) ${q.options.B}</label>
                    <label style="font-weight: normal; cursor: pointer;"><input type="radio" name="q_${q.id}" value="C"> C) ${q.options.C}</label>
                    <label style="font-weight: normal; cursor: pointer;"><input type="radio" name="q_${q.id}" value="D"> D) ${q.options.D}</label>
                </div>
            `;
        } else if (q.type === 'oneword') {
            inputHtml = `<input type="text" name="q_${q.id}" placeholder="Type one-word answer" style="margin-top: 10px;">`;
        } else if (q.type === 'short') {
            inputHtml = `<input type="text" name="q_${q.id}" placeholder="Type short answer" style="margin-top: 10px;">`;
        } else if (q.type === 'long') {
            inputHtml = `<textarea name="q_${q.id}" rows="4" placeholder="Type detailed long answer..." style="width: 100%; margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;"></textarea>`;
        }

        qCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="color: #cbd5e1;">Q${idx + 1}. ${q.question}</h4>
                <span style="font-size: 0.8rem; background: rgba(129, 140, 248, 0.2); color: #818cf8; padding: 2px 8px; border-radius: 12px;">${q.marks} Mark(s)</span>
            </div>
            ${inputHtml}
        `;
        qContainer.appendChild(qCard);
    });

    // Initialize Timer
    examTimeRemaining = activeExamTest.duration * 60;
    runExamTimer();

    showPage('exam-attempt-page');
}

function runExamTimer() {
    clearInterval(examTimerInterval);
    const timerDisplay = document.getElementById('exam-timer-display');
    timerDisplay.classList.remove('timer-warning');

    examTimerInterval = setInterval(() => {
        examTimeRemaining--;

        let minutes = Math.floor(examTimeRemaining / 60);
        let seconds = examTimeRemaining % 60;

        let displayMin = minutes < 10 ? '0' + minutes : minutes;
        let displaySec = seconds < 10 ? '0' + seconds : seconds;

        timerDisplay.innerText = `⏱️ ${displayMin}:${displaySec}`;

        // Red and Pop animation in last 20 Seconds
        if (examTimeRemaining <= 20) {
            timerDisplay.classList.add('timer-warning');
        }

        if (examTimeRemaining <= 0) {
            clearInterval(examTimerInterval);
            showToast("⏰ Time is up! Submitting exam automatically...");
            submitCandidateExam(null, true);
        }
    }, 1000);
}

// SUBMIT EXAM & SHOW DETAILED RESULT
function submitCandidateExam(event, isAutoSubmit = false) {
    if (event) event.preventDefault();
    clearInterval(examTimerInterval);

    const formData = new FormData(document.getElementById('candidateExamForm'));

    let totalMarks = 0;
    let scoredMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let breakdownHtml = "";

    activeExamTest.questions.forEach((q, idx) => {
        totalMarks += q.marks;
        const candAns = (formData.get(`q_${q.id}`) || "").trim();
        let isAttempted = candAns.length > 0;
        let isCorrect = false;

        if (!isAttempted) {
            unattemptedCount++;
        } else {
            if (q.type === 'mcq') {
                if (candAns.toUpperCase() === q.answer.toUpperCase()) {
                    isCorrect = true;
                    scoredMarks += q.marks;
                    correctCount++;
                } else {
                    incorrectCount++;
                }
            } else if (q.type === 'oneword') {
                if (q.answer && candAns.toLowerCase() === q.answer.toLowerCase()) {
                    isCorrect = true;
                    scoredMarks += q.marks;
                    correctCount++;
                } else {
                    incorrectCount++;
                }
            }
        }

        let cardClass = "";
        let statusBadge = "";

        if (!isAttempted) {
            cardClass = "not-attempted-card";
            statusBadge = `<span style="color: #ef4444; font-weight: bold; background: rgba(239,68,68,0.2); padding: 3px 8px; border-radius: 4px;">⚠️ NOT ATTEMPTED</span>`;
        } else if (isCorrect) {
            cardClass = "correct-card";
            statusBadge = `<span style="color: #4ade80; font-weight: bold;">✔ Correct (+${q.marks})</span>`;
        } else {
            cardClass = "incorrect-card";
            statusBadge = `<span style="color: #ef4444; font-weight: bold;">✖ Incorrect (0/${q.marks})</span>`;
        }

        let correctDisplay = q.type === 'mcq' ? `Option ${q.answer} (${q.options[q.answer]})` : (q.answer || "Key answer specified by admin");

        breakdownHtml += `
            <div class="${cardClass}" style="padding: 15px; border-radius: 8px; margin-bottom: 12px; background: rgba(255,255,255,0.03);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Q${idx + 1}. ${q.question}</strong>
                    ${statusBadge}
                </div>
                <div style="font-size: 0.9rem; color: #cbd5e1; margin-top: 5px;">
                    <strong>Your Answer:</strong> ${isAttempted ? candAns : '<span style="color: #ef4444; font-weight: bold;">Not Attempted</span>'}
                </div>
                <div style="font-size: 0.9rem; color: #4ade80; margin-top: 6px; background: rgba(74, 222, 128, 0.1); padding: 6px 10px; border-radius: 4px;">
                    <strong>Correct Answer:</strong> ${correctDisplay}
                </div>
            </div>
        `;
    });

    // Save Submission Record for Admin
    examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];
    examSubmissions.push({
        candidateName: currentLoggedInUser.name,
        candidateUsername: currentLoggedInUser.username,
        examTitle: activeExamTest.title,
        score: scoredMarks,
        totalMarks: totalMarks,
        attemptedCount: activeExamTest.questions.length - unattemptedCount,
        totalQuestions: activeExamTest.questions.length,
        timestamp: new Date().toLocaleString()
    });
    localStorage.setItem('portal_submissions', JSON.stringify(examSubmissions));

    document.getElementById('result-cand-name').innerText = `${currentLoggedInUser.name} (${currentLoggedInUser.username})`;
    document.getElementById('result-total-score').innerText = `${scoredMarks} / ${totalMarks}`;
    document.getElementById('result-summary-stats').innerText = `Attempted: ${activeExamTest.questions.length - unattemptedCount} | Unattempted: ${unattemptedCount} | Correct: ${correctCount}`;
    document.getElementById('result-questions-breakdown').innerHTML = breakdownHtml;

    showPage('exam-result-page');
}

// LOGIN SYSTEM
function handleLogin(event) {
    if (event) event.preventDefault();
    const role = document.getElementById('userRole').value;
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    if (role === 'admin') {
        if (usernameInput !== ADMIN_CREDENTIALS.username || passwordInput !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Credentials!");
            return;
        }
        currentLoggedInUser = { name: "Admin", username: usernameInput };
    } else {
        registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
        const found = registeredCandidates.find(c => c.username.toLowerCase() === usernameInput.toLowerCase() && c.password === passwordInput);
        if (!found) { 
            showToast("❌ Invalid Candidate Credentials!"); 
            return; 
        }
        currentLoggedInUser = found;
    }

    isLoggedIn = true;
    currentUserRole = role;

    // Check if coming via shared exam link
    if (role === 'candidate' && pendingExamTestId) {
        startExamProcess(pendingExamTestId);
        pendingExamTestId = null;
        return;
    }

    document.getElementById('welcome-text').innerText = `Welcome back, ${currentLoggedInUser.name}`;
    
    if (role === 'admin') {
        document.getElementById('admin-test-section').classList.remove('hidden');
        document.getElementById('admin-submissions-section').classList.remove('hidden');
    }
    renderPortalData();
    showPage('dashboard-page');
}

function handleCandidateRegister(event) {
    if (event) event.preventDefault();
    const fullname = document.getElementById('regFullname').value.trim();
    const usernameInput = document.getElementById('regUsername').value.trim();
    const passwordInput = document.getElementById('regPassword').value.trim();

    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
    registeredCandidates.push({ name: fullname, username: usernameInput, password: passwordInput });
    localStorage.setItem('portal_candidates', JSON.stringify(registeredCandidates));

    showToast("✅ Registered successfully! Redirecting...");
    document.getElementById('userRole').value = 'candidate';
    document.getElementById('username').value = usernameInput;
    showPage('login-page');
}

function handleLogout() {
    isLoggedIn = false;
    currentLoggedInUser = null;
    showPage('login-page');
}

function deleteTest(testId) {
    testsData = testsData.filter(t => t.id !== testId);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));
    renderPortalData();
    showToast("🗑️ Test deleted!");
}

function showToast(msg) {
    const toast = document.getElementById("copyToast");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); toast.classList.add("hidden"); }, 3000);
}

function togglePasswordVisibility(inputId, emojiId) {
    const inputField = document.getElementById(inputId);
    const emojiSpan = document.getElementById(emojiId);
    if (!inputField || !emojiSpan) return;
    inputField.type = inputField.type === "password" ? "text" : "password";
    emojiSpan.innerText = inputField.type === "password" ? "🙈" : "🐵";
}

function fallbackCopyText(text) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast("✨ Link copied!");
}

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#take-test=')) {
        pendingExamTestId = hash.split('=')[1];
        document.getElementById('userRole').value = 'candidate';
        showToast("🔒 Please login as candidate to begin test.");
        showPage('login-page');
    } else if (hash === '#register') {
        showPage('register-page');
    }
});

let isLoggedIn = false;
let currentUserRole = "";
let currentLoggedInUser = null;

let testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
let registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
let examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];
let tempQuestionsBatch = [];
let parsedBulkBatch = [];

let activeExamTest = null;
let pendingExamTestId = null;
let examTimerInterval = null;
let examTimeRemaining = 0;
let examStartTimeStamp = null;

let tabSwitchCount = 0;
const MAX_ALLOWED_TAB_SWITCHES = 3;
let autoSaveInterval = null;
let canvasContext = null;
let isDrawing = false;

const ADMIN_CREDENTIALS = {
    username: "Nishantsingh@21",
    password: "Nikki812616"
};

// NAV & PAGE ROUTING
function showPage(pageId) {
    ['login-page', 'register-page', 'admin-dashboard-page', 'candidate-dashboard-page', 'exam-attempt-page', 'exam-result-page'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const activePage = document.getElementById(pageId);
    if (activePage) activePage.classList.remove('hidden');
}

function openDashboard() {
    if (!isLoggedIn) {
        showToast("⚠️ Please login first!");
        showPage('login-page');
        return;
    }

    if (currentUserRole === 'admin') {
        showPage('admin-dashboard-page');
        renderAdminData();
    } else {
        showPage('candidate-dashboard-page');
        renderCandidateHistory();
    }
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

// SINGLE QUESTION MANUAL ADDITION
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

    document.getElementById('draft-questions-preview').innerText = `✓ ${tempQuestionsBatch.length} question(s) added to paper draft.`;
    showToast("✅ Question added to draft!");
}

// SMART BULK QUESTION PARSER
function previewBulkEntries() {
    const rawText = document.getElementById('bulkQuestionsInput').value.trim();
    if (!rawText) {
        showToast("⚠️ Please paste questions text first!");
        return;
    }

    parsedBulkBatch = parseBulkText(rawText);
    const previewContainer = document.getElementById('bulk-preview-container');

    if (parsedBulkBatch.length === 0) {
        previewContainer.innerHTML = '<p style="color: #ef4444; margin-top: 10px;">⚠️ No valid questions parsed. Verify your format.</p>';
        return;
    }

    let html = `<p style="color: #4ade80; margin-bottom: 12px; font-weight: bold;">✔ Parsed ${parsedBulkBatch.length} Question(s) successfully:</p>`;
    parsedBulkBatch.forEach((q, idx) => {
        let optionsHtml = '';
        if (q.type === 'mcq' && q.options) {
            optionsHtml = `<div style="font-size: 0.85rem; color: #94a3b8; margin: 6px 0;"><b>A:</b> ${q.options.A} | <b>B:</b> ${q.options.B} | <b>C:</b> ${q.options.C} | <b>D:</b> ${q.options.D}</div>`;
        }
        html += `
            <div class="parsed-q-card">
                <span class="parsed-q-type-badge">${q.type.toUpperCase()} | ${q.marks} Mark(s)</span>
                <p style="font-weight: 600; color: #f8fafc;">Q${idx + 1}. ${q.question}</p>
                ${optionsHtml}
                <p style="font-size: 0.85rem; color: #4ade80; margin-top: 4px;"><strong>Correct Answer:</strong> ${q.answer}</p>
            </div>
        `;
    });

    previewContainer.innerHTML = html;
    document.getElementById('confirmBulkBtn').classList.remove('hidden');
}

function parseBulkText(text) {
    const blocks = text.split(/\n\s*\n+/);
    const questions = [];

    blocks.forEach((block) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let questionText = '';
        let options = { A: '', B: '', C: '', D: '' };
        let answer = '';
        let marks = 1;
        let isMcq = false;

        lines.forEach((line) => {
            const marksMatch = line.match(/(?:marks?|pts?|points?)\s*[:=-]\s*(\d+)/i);
            if (marksMatch) { marks = parseInt(marksMatch[1]) || 1; return; }

            const ansMatch = line.match(/(?:ans|answer|correct)\s*[:=-]\s*(.+)/i);
            if (ansMatch) { answer = ansMatch[1].trim(); return; }

            const optMatch = line.match(/^([A-D])[\.\)\:-]\s*(.+)/i);
            if (optMatch) {
                isMcq = true;
                options[optMatch[1].toUpperCase()] = optMatch[2].trim();
                return;
            }

            if (!questionText) {
                questionText = line.replace(/^(?:Q|Q\.|Question|\d+[\.\)\:-])\s*/i, '').trim();
            } else {
                questionText += ' ' + line;
            }
        });

        if (questionText) {
            if (isMcq && options.A && options.B) {
                let formattedAns = answer.toUpperCase();
                if (!['A', 'B', 'C', 'D'].includes(formattedAns)) formattedAns = 'A';

                questions.push({
                    id: Date.now() + Math.random(),
                    type: 'mcq',
                    question: questionText,
                    options: options,
                    answer: formattedAns,
                    marks: marks
                });
            } else {
                questions.push({
                    id: Date.now() + Math.random(),
                    type: 'oneword',
                    question: questionText,
                    answer: answer || '',
                    marks: marks
                });
            }
        }
    });

    return questions;
}

function confirmAddBulkToExam() {
    if (parsedBulkBatch.length === 0) return;
    tempQuestionsBatch.push(...parsedBulkBatch);
    parsedBulkBatch = [];
    document.getElementById('bulkQuestionsInput').value = '';
    document.getElementById('bulk-preview-container').innerHTML = '';
    document.getElementById('confirmBulkBtn').classList.add('hidden');
    document.getElementById('draft-questions-preview').innerText = `✓ ${tempQuestionsBatch.length} question(s) added to paper draft.`;
    showToast(`✅ Added ${tempQuestionsBatch.length} questions to exam paper!`);
}

// CREATE TEST & ADMIN RENDER
function handleCreateTest(event) {
    if (event) event.preventDefault();
    const title = document.getElementById('testTitle').value.trim();
    const duration = document.getElementById('testDuration').value;

    if (tempQuestionsBatch.length === 0) {
        showToast("⚠️ Add at least one question!");
        return;
    }

    const testId = 'test_' + Date.now();
    const newTest = {
        id: testId,
        examKey: testId,
        title: title,
        duration: parseInt(duration),
        questions: [...tempQuestionsBatch]
    };

    testsData.push(newTest);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));

    tempQuestionsBatch = [];
    document.getElementById('draft-questions-preview').innerText = '';
    document.getElementById('createTestForm').reset();

    renderAdminData();
    showToast("✅ Exam Published Successfully!");
}

function renderAdminData() {
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
    examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];

    document.getElementById('stat-tests').innerText = testsData.length;
    document.getElementById('stat-candidates').innerText = registeredCandidates.length;
    document.getElementById('stat-submissions').innerText = examSubmissions.length;

    const testContainer = document.getElementById('test-list-container');
    testContainer.innerHTML = '';

    if (testsData.length === 0) {
        testContainer.innerHTML = '<p style="color:#94a3b8;">No exams created yet.</p>';
    } else {
        testsData.forEach((test) => {
            const row = document.createElement('div');
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: 8px;";
            row.innerHTML = `
                <div>
                    <strong>${test.title}</strong>
                    <div style="font-size: 0.85rem; color: #94a3b8;">Code: <b>${test.id}</b> | Duration: ${test.duration}m</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="copyDirectExamLink('${test.id}')">📋 Copy Link</button>
                    <button class="btn btn-outline" style="border-color: #ef4444; color: #ef4444; padding: 5px 10px; font-size: 0.8rem;" onclick="deleteTest('${test.id}')">Delete</button>
                </div>
            `;
            testContainer.appendChild(row);
        });
    }

    const subBody = document.getElementById('submissions-table-body');
    subBody.innerHTML = '';
    if (examSubmissions.length === 0) {
        subBody.innerHTML = '<tr><td colspan="4" style="color:#94a3b8;">No submissions recorded.</td></tr>';
    } else {
        examSubmissions.forEach(sub => {
            const tr = document.createElement('tr');
            tr.style.cursor = "pointer";
            tr.onclick = () => viewSubmissionDetails(sub, true);
            tr.innerHTML = `
                <td style="color: #818cf8; text-decoration: underline;"><strong>${sub.candidateName}</strong></td>
                <td>${sub.examTitle}</td>
                <td style="color: #4ade80; font-weight: bold;">${sub.score} / ${sub.totalMarks}</td>
                <td style="color: #94a3b8;">${sub.timeTaken || 'N/A'}</td>
            `;
            subBody.appendChild(tr);
        });
    }
}

// ANTI-CHEATING LOCKDOWN SYSTEM (EXAM.NET STYLE)
function activateExamLockdown() {
    tabSwitchCount = 0;
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    }
    window.addEventListener('blur', handleSecurityViolation);
    document.addEventListener('visibilitychange', handleSecurityViolation);
    document.addEventListener('contextmenu', preventDefaultAction);
    document.addEventListener('copy', preventDefaultAction);
    document.addEventListener('cut', preventDefaultAction);
    document.addEventListener('paste', preventDefaultAction);
    document.addEventListener('keydown', blockForbiddenKeys);
    autoSaveInterval = setInterval(autoSaveExamDraft, 5000);
}

function deactivateExamLockdown() {
    window.removeEventListener('blur', handleSecurityViolation);
    document.removeEventListener('visibilitychange', handleSecurityViolation);
    document.removeEventListener('contextmenu', preventDefaultAction);
    document.removeEventListener('copy', preventDefaultAction);
    document.removeEventListener('cut', preventDefaultAction);
    document.removeEventListener('paste', preventDefaultAction);
    document.removeEventListener('keydown', blockForbiddenKeys);
    clearInterval(autoSaveInterval);
}

function preventDefaultAction(e) { e.preventDefault(); showToast("⚠️ Security Action Blocked!"); }

function blockForbiddenKeys(e) {
    if (e.ctrlKey && ['c', 'v', 'a', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        showToast("⚠️ Shortcut disabled during exam!");
    }
}

function handleSecurityViolation() {
    if (document.hidden || !document.hasFocus()) {
        tabSwitchCount++;
        const remaining = MAX_ALLOWED_TAB_SWITCHES - tabSwitchCount;
        if (remaining > 0) {
            alert(`🚨 SECURITY WARNING! Navigated away from exam tab.\nWarnings Remaining: ${remaining}/${MAX_ALLOWED_TAB_SWITCHES}`);
        } else {
            alert("❌ MAXIMUM SECURITY VIOLATION! Auto-submitting exam now.");
            submitCandidateExam(null, true);
        }
    }
}

function autoSaveExamDraft() {
    if (!activeExamTest) return;
    const formData = new FormData(document.getElementById('candidateExamForm'));
    const draftData = {};
    for (let [key, val] of formData.entries()) draftData[key] = val;
    localStorage.setItem(`draft_${activeExamTest.id}_${currentLoggedInUser.username}`, JSON.stringify(draftData));
}

// START & SUBMIT EXAM
function startExamProcess(testId) {
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
    activeExamTest = testsData.find(t => t.id === testId);

    if (!activeExamTest) {
        alert("Exam code is invalid or has been deleted.");
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
                    <label style="cursor: pointer;"><input type="radio" name="q_${q.id}" value="A"> A) ${q.options.A}</label>
                    <label style="cursor: pointer;"><input type="radio" name="q_${q.id}" value="B"> B) ${q.options.B}</label>
                    <label style="cursor: pointer;"><input type="radio" name="q_${q.id}" value="C"> C) ${q.options.C}</label>
                    <label style="cursor: pointer;"><input type="radio" name="q_${q.id}" value="D"> D) ${q.options.D}</label>
                </div>
            `;
        } else {
            inputHtml = `<input type="text" name="q_${q.id}" class="form-control" style="margin-top: 10px;" placeholder="Type your answer...">`;
        }

        qCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4>Q${idx + 1}. ${q.question}</h4>
                <span style="font-size: 0.8rem; background: rgba(129, 140, 248, 0.2); color: #818cf8; padding: 2px 8px; border-radius: 12px;">${q.marks} Mark(s)</span>
            </div>
            ${inputHtml}
        `;
        qContainer.appendChild(qCard);
    });

    examTimeRemaining = activeExamTest.duration * 60;
    examStartTimeStamp = Date.now();
    runExamTimer();
    activateExamLockdown();
    showPage('exam-attempt-page');
}

function runExamTimer() {
    clearInterval(examTimerInterval);
    const timerDisplay = document.getElementById('exam-timer-display');
    timerDisplay.classList.remove('timer-warning');

    examTimerInterval = setInterval(() => {
        examTimeRemaining--;
        let min = Math.floor(examTimeRemaining / 60);
        let sec = examTimeRemaining % 60;
        timerDisplay.innerText = `⏱️ ${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;

        if (examTimeRemaining <= 30) timerDisplay.classList.add('timer-warning');
        if (examTimeRemaining <= 0) {
            clearInterval(examTimerInterval);
            showToast("⏰ Time expired! Submitting exam...");
            submitCandidateExam(null, true);
        }
    }, 1000);
}

function submitCandidateExam(event, isAutoSubmit = false) {
    if (event) event.preventDefault();
    clearInterval(examTimerInterval);
    deactivateExamLockdown();

    const timeSpent = Math.floor((Date.now() - examStartTimeStamp) / 1000);
    const timeTakenStr = `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`;
    const formData = new FormData(document.getElementById('candidateExamForm'));

    let totalMarks = 0, scoredMarks = 0, unattemptedCount = 0;
    let detailedAnswersList = [];

    activeExamTest.questions.forEach((q) => {
        totalMarks += q.marks;
        const candAns = (formData.get(`q_${q.id}`) || "").trim();
        let isAttempted = candAns.length > 0;
        let isCorrect = false;

        if (!isAttempted) {
            unattemptedCount++;
        } else {
            if (q.type === 'mcq' && candAns.toUpperCase() === q.answer.toUpperCase()) {
                isCorrect = true; scoredMarks += q.marks;
            } else if (q.type !== 'mcq' && q.answer && candAns.toLowerCase() === q.answer.toLowerCase()) {
                isCorrect = true; scoredMarks += q.marks;
            }
        }

        detailedAnswersList.push({
            questionText: q.question,
            marks: q.marks,
            candAnswer: candAns,
            isAttempted: isAttempted,
            isCorrect: isCorrect,
            correctDisplay: q.type === 'mcq' ? `Option ${q.answer}` : (q.answer || "Answer key specified by teacher")
        });
    });

    examSubmissions.push({
        candidateName: currentLoggedInUser.name,
        candidateUsername: currentLoggedInUser.username,
        examTitle: activeExamTest.title,
        score: scoredMarks,
        totalMarks: totalMarks,
        attemptedCount: activeExamTest.questions.length - unattemptedCount,
        totalQuestions: activeExamTest.questions.length,
        timeTaken: timeTakenStr,
        timestamp: new Date().toLocaleString(),
        detailedAnswers: detailedAnswersList
    });
    localStorage.setItem('portal_submissions', JSON.stringify(examSubmissions));

    renderSubmissionResultView(currentLoggedInUser.name, scoredMarks, totalMarks, activeExamTest.questions.length - unattemptedCount, unattemptedCount, timeTakenStr, detailedAnswersList, false);
    document.getElementById('main-navbar').style.display = 'flex';
    showPage('exam-result-page');
}

function renderSubmissionResultView(candName, score, total, attempted, unattempted, timeTaken, answers, isAdmin) {
    document.getElementById('result-cand-name').innerText = candName;
    document.getElementById('result-total-score').innerText = `${score} / ${total}`;
    document.getElementById('result-summary-stats').innerText = `Attempted: ${attempted} | Unattempted: ${unattempted} | Time Taken: ${timeTaken}`;

    let breakdownHtml = "";
    answers.forEach((ans, idx) => {
        let badge = !ans.isAttempted ? `<span style="color:#ef4444;">⚠️ NOT ATTEMPTED</span>` :
                    (ans.isCorrect ? `<span style="color:#4ade80;">✔ Correct (+${ans.marks})</span>` : `<span style="color:#ef4444;">✖ Incorrect</span>`);

        breakdownHtml += `
            <div style="padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>Q${idx + 1}. ${ans.questionText}</strong> ${badge}
                </div>
                <div style="font-size: 0.9rem; margin-top: 5px;">Your Answer: ${ans.isAttempted ? ans.candAnswer : 'N/A'}</div>
                <div style="font-size: 0.9rem; color: #4ade80; margin-top: 4px;">Correct Answer: ${ans.correctDisplay}</div>
            </div>
        `;
    });

    breakdownHtml += `
        <button class="btn btn-outline" style="width: 100%; margin-top: 15px;" onclick="${isAdmin ? "showPage('admin-dashboard-page'); renderAdminData();" : "openDashboard();"}">
            ← Back to Dashboard
        </button>
    `;

    document.getElementById('result-questions-breakdown').innerHTML = breakdownHtml;
}

function viewSubmissionDetails(sub, isAdmin) {
    renderSubmissionResultView(sub.candidateName, sub.score, sub.totalMarks, sub.attemptedCount, sub.totalQuestions - sub.attemptedCount, sub.timeTaken, sub.detailedAnswers, isAdmin);
    showPage('exam-result-page');
}

// ACCESS KEY & EXPORT TOOLS
function joinExamViaKey() {
    const key = document.getElementById('examKeyInput').value.trim();
    testsData = JSON.parse(localStorage.getItem('portal_tests')) || [];
    const target = testsData.find(t => t.id === key || t.examKey === key);
    if (target) startExamProcess(target.id);
    else showToast("❌ Invalid Exam Code!");
}

function exportSubmissionsToCSV() {
    examSubmissions = JSON.parse(localStorage.getItem('portal_submissions')) || [];
    if (examSubmissions.length === 0) { showToast("⚠️ No data to export!"); return; }

    let csv = "data:text/csv;charset=utf-8,Candidate Name,Username,Exam Title,Score,Total Marks,Time Taken,Date\n";
    examSubmissions.forEach(s => {
        csv += `"${s.candidateName}","${s.candidateUsername}","${s.examTitle}",${s.score},${s.totalMarks},"${s.timeTaken}","${s.timestamp}"\n`;
    });

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Exam_Results_${Date.now()}.csv`;
    link.click();
}

// CALCULATOR & CANVAS SCRATCHPAD
function toggleCalculator() { document.getElementById('exam-calculator-modal').classList.toggle('hidden'); }
function calcInput(v) {
    const d = document.getElementById('calcDisplay');
    if (v === 'C') d.value = '';
    else if (v === '=') { try { d.value = eval(d.value); } catch { d.value = 'Error'; } }
    else d.value += v;
}

function openCanvasModal() {
    const modal = document.getElementById('exam-canvas-modal');
    modal.classList.remove('hidden');
    const canvas = document.getElementById('drawingBoard');
    canvasContext = canvas.getContext('2d');
    canvas.onmousedown = (e) => { isDrawing = true; canvasContext.beginPath(); canvasContext.moveTo(e.offsetX, e.offsetY); };
    canvas.onmousemove = (e) => { if (isDrawing) { canvasContext.lineTo(e.offsetX, e.offsetY); canvasContext.stroke(); } };
    canvas.onmouseup = () => isDrawing = false;
}
function clearCanvas() { canvasContext.clearRect(0, 0, 500, 350); }
function closeCanvasModal() { document.getElementById('exam-canvas-modal').classList.add('hidden'); }

// AUTH & UTILS
function handleLogin(event) {
    if (event) event.preventDefault();
    const role = document.getElementById('userRole').value;
    const uInput = document.getElementById('username').value.trim();
    const pInput = document.getElementById('password').value.trim();

    if (role === 'admin') {
        if (uInput !== ADMIN_CREDENTIALS.username || pInput !== ADMIN_CREDENTIALS.password) {
            showToast("❌ Invalid Admin Credentials!"); return;
        }
        currentLoggedInUser = { name: "Admin", username: uInput };
    } else {
        registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
        const found = registeredCandidates.find(c => c.username.toLowerCase() === uInput.toLowerCase() && c.password === pInput);
        if (!found) { showToast("❌ Invalid Credentials!"); return; }
        currentLoggedInUser = found;
    }

    isLoggedIn = true;
    currentUserRole = role;

    if (role === 'candidate' && pendingExamTestId) {
        startExamProcess(pendingExamTestId);
        pendingExamTestId = null;
    } else {
        openDashboard();
    }
}

function handleCandidateRegister(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('regFullname').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    registeredCandidates = JSON.parse(localStorage.getItem('portal_candidates')) || [];
    registeredCandidates.push({ name, username, password });
    localStorage.setItem('portal_candidates', JSON.stringify(registeredCandidates));

    showToast("✅ Registration successful!");
    document.getElementById('userRole').value = 'candidate';
    document.getElementById('username').value = username;
    showPage('login-page');
}

function handleLogout() {
    isLoggedIn = false;
    currentLoggedInUser = null;
    document.getElementById('main-navbar').style.display = 'flex';
    showPage('login-page');
}

function deleteTest(testId) {
    testsData = testsData.filter(t => t.id !== testId);
    localStorage.setItem('portal_tests', JSON.stringify(testsData));
    renderAdminData();
    showToast("🗑️ Test deleted!");
}

function copyDirectExamLink(testId) {
    const link = `${window.location.href.split('#')[0]}#take-test=${testId}`;
    navigator.clipboard.writeText(link).then(() => showToast("✨ Link copied to clipboard!"));
}

function showToast(msg) {
    const toast = document.getElementById("copyToast");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

function togglePasswordVisibility(inputId, emojiId) {
    const input = document.getElementById(inputId);
    const emoji = document.getElementById(emojiId);
    input.type = input.type === "password" ? "text" : "password";
    emoji.innerText = input.type === "password" ? "🙈" : "🐵";
}

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#take-test=')) {
        pendingExamTestId = hash.split('=')[1];
        showToast("🔒 Please login as student to start exam.");
        showPage('login-page');
    }
});

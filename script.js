// Toggle Password Visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

// Handle Login Submission
function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user && pass) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        showToast("Login Successful! Welcome back.");
    } else {
        alert("Please enter credentials!");
    }
}

// Handle Logout
function handleLogout() {
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('importSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    showToast("Logged out successfully.");
}

// Navigation Switcher
function showSection(sectionId) {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('importSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');

    document.getElementById(sectionId).classList.remove('hidden');
}

// Show Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Smart Auto-Parser Function for Mixed Paper
function parseMixedExamPaper(rawText) {
    const lines = rawText.split('\n');
    let parsedQuestions = [];
    let currentSection = "GENERAL QUESTIONS";
    let currentQ = null;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Detect Section Header
        if (line.toUpperCase().includes("SECTION") || line.toUpperCase().includes("PART") || line.endsWith(":")) {
            if (currentQ) {
                parsedQuestions.push(currentQ);
                currentQ = null;
            }
            currentSection = line;
            return;
        }

        // Detect Question Start (e.g., "1.", "2)", "Q1:")
        const questionMatch = line.match(/^([0-9]+[\.\)]|Q[0-9]*[\.:])\s*(.*)/i);
        if (questionMatch) {
            if (currentQ) {
                parsedQuestions.push(currentQ);
            }
            currentQ = {
                section: currentSection,
                question: questionMatch[2],
                options: [],
                answer: "",
                type: "Short Answer"
            };
            return;
        }

        // Detect MCQ Options (e.g., "a)", "b.", etc.)
        const optionMatch = line.match(/^([a-dA-D][\)\.])\s*(.*)/);
        if (currentQ && optionMatch) {
            currentQ.options.push(line);
            currentQ.type = "MCQ";
            return;
        }

        // Detect Answer Field
        if (currentQ && (line.toLowerCase().startsWith("answer:") || line.toLowerCase().startsWith("ans:"))) {
            currentQ.answer = line.replace(/^(answer:|ans:)\s*/i, "").trim();
            return;
        }

        // Multi-line question text attachment
        if (currentQ && currentQ.options.length === 0 && !currentQ.answer) {
            currentQ.question += " " + line;
        }
    });

    if (currentQ) {
        parsedQuestions.push(currentQ);
    }

    // Auto-classify types if not explicitly specified
    parsedQuestions.forEach(q => {
        if (q.options.length > 0) {
            q.type = "MCQ";
        } else if (q.answer && q.answer.split(' ').length <= 2) {
            q.type = "One-Word";
        } else if (q.question.length > 100) {
            q.type = "Long Answer";
        } else {
            q.type = "Short Answer";
        }
    });

    return parsedQuestions;
}

// Handle Bulk Import Action
function handleBulkImport() {
    const rawText = document.getElementById('bulkQuestionInput').value;
    if (!rawText.trim()) {
        alert("Pehle kuch text toh paste karo!");
        return;
    }

    const processedData = parseMixedExamPaper(rawText);
    
    // Update Dashboard Count
    document.getElementById('totalCount').textContent = processedData.length;

    // Render results in UI
    const outputContainer = document.getElementById('parsedOutputList');
    outputContainer.innerHTML = "";

    processedData.forEach((q, index) => {
        let qCard = document.createElement('div');
        qCard.style.cssText = "background: rgba(255,255,255,0.03); padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);";
        
        qCard.innerHTML = `
            <small style="color: #818cf8; font-weight: bold;">[${q.section}] - Type: ${q.type}</small>
            <p style="margin: 5px 0; font-weight: 500;">Q${index + 1}: ${q.question}</p>
            ${q.options.length > 0 ? `<ul style="margin-left: 20px; font-size: 0.9rem; color: #cbd5e1;">${q.options.map(opt => `<li>${opt}</li>`).join('')}</ul>` : ''}
            ${q.answer ? `<p style="margin-top: 5px; font-size: 0.9rem; color: #34d399;"><strong>Answer:</strong> ${q.answer}</p>` : ''}
        `;
        outputContainer.appendChild(qCard);
    });

    document.getElementById('resultSection').classList.remove('hidden');
    showToast(`Successfully processed ${processedData.length} questions!`);
}

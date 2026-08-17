// Complete Admin Panel Logic & Data Management

document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin JS Loaded");
    
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }

    const btnNavAdmin = document.getElementById('nav-admin-login-btn');
    if (btnNavAdmin) {
        btnNavAdmin.addEventListener('click', () => showView('view-admin-login'));
    }

    const btnOpenCreate = document.getElementById('btn-open-create-test');
    if (btnOpenCreate) {
        btnOpenCreate.addEventListener('click', openCreateTestForm);
    }

    const testForm = document.getElementById('test-form');
    if (testForm) {
        testForm.addEventListener('submit', saveTestConfiguration);
    }

    const btnAddQuestion = document.getElementById('btn-add-question');
    if (btnAddQuestion) {
        btnAddQuestion.addEventListener('click', openQuestionModal);
    }

    const questionForm = document.getElementById('question-form');
    if (questionForm) {
        questionForm.addEventListener('submit', saveQuestion);
    }
});

let currentEditingTestId = null;

async function handleAdminLogin(e) {
    e.preventDefault();
    console.log("Login form submitted");

    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');

    if (!emailInput || !passwordInput) {
        alert("Email or Password input fields missing in HTML!");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!supabaseClient) {
        alert("Supabase client not initialized! Check config.js");
        if (typeof showToast === "function") showToast("Supabase configuration missing!", "danger");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ 
            email: email, 
            password: password 
        });

        if (error) {
            console.error("Supabase Auth Error:", error);
            alert("Login Failed: " + error.message);
            if (typeof showToast === "function") showToast(`Login Failed: ${error.message}`, "danger");
        } else {
            console.log("Login successful:", data);
            if (typeof showToast === "function") showToast("Authenticated successfully!", "success");
            
            // 1. Navigation Buttons Update
            const navBtn = document.getElementById('nav-admin-login-btn');
            const logoutBtn = document.getElementById('logout-btn');
            
            if (navBtn) navBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            
            // 2. Hide Login Window
            const loginView = document.getElementById('view-admin-login');
            if (loginView) {
                loginView.classList.add('hidden');
            }

            // 3. Show Dashboard & Load Data
            showView('view-admin-dashboard');
            loadAdminDashboardData();
        }
    } catch (err) {
        console.error("Unexpected Auth Error:", err);
        alert("Unexpected Login Error: " + err.message);
    }
}

async function loadAdminDashboardData() {
    if (!supabaseClient) return;

    try {
        // Fetch Tests
        const { data: tests, error: testErr } = await supabaseClient
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!testErr && tests) {
            renderTestsTable(tests);
            const totalElem = document.getElementById('stat-total-tests');
            const pubElem = document.getElementById('stat-published-tests');
            if (totalElem) totalElem.innerText = tests.length;
            if (pubElem) pubElem.innerText = tests.filter(t => t.is_published).length;
        } else if (testErr) {
            console.error("Fetch Tests Error:", testErr);
        }

        // Fetch Candidate Results
        const { data: results, error: resErr } = await supabaseClient
            .from('candidate_attempts')
            .select('*, tests(title)')
            .order('submitted_at', { ascending: false });

        if (!resErr && results) {
            renderResultsTable(results);
            const attElem = document.getElementById('stat-total-attempts');
            if (attElem) attElem.innerText = results.length;
        } else if (resErr) {
            console.error("Fetch Results Error:", resErr);
        }
    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
}

function renderTestsTable(tests) {
    const tbody = document.getElementById('tests-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    tests.forEach(test => {
        const tr = document.createElement('tr');
        // Direct test URL for candidates
        const shareUrl = `${window.location.origin}${window.location.pathname}?test_id=${test.id}`;

        tr.innerHTML = `
            <td><strong>${test.title}</strong></td>
            <td>${test.duration_minutes} Mins</td>
            <td>${test.total_questions || 0}</td>
            <td>${test.total_marks || 0}</td>
            <td>
                <span class="badge ${test.is_published ? 'badge-success' : 'badge-warning'}" 
                      style="cursor:pointer;" 
                      onclick="togglePublishStatus('${test.id}', ${test.is_published})" 
                      title="Click to toggle publish status">
                    ${test.is_published ? 'Published' : 'Draft (Click to Publish)'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="copyShareLink('${shareUrl}')">
                    📋 Copy Candidate Link
                </button>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTest('${test.id}')">Edit / Add Questions</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Quick Toggle Publish Function
async function togglePublishStatus(testId, currentStatus) {
    const newStatus = !currentStatus;
    const { error } = await supabaseClient
        .from('tests')
        .update({ is_published: newStatus })
        .eq('id', testId);

    if (error) {
        if (typeof showToast === "function") showToast("Failed to update publish status", "danger");
    } else {
        if (typeof showToast === "function") showToast(`Test ${newStatus ? 'Published' : 'Unpublished'}!`, "success");
        loadAdminDashboardData();
    }
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url);
    if (typeof showToast === "function") showToast("Candidate Link Copied to Clipboard!", "info");
    else alert("Link Copied!");
}

function renderResultsTable(results) {
    const tbody = document.getElementById('results-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${res.candidate_name}<br><small class="text-muted">${res.candidate_email || 'No email'}</small></td>
            <td>${res.tests ? res.tests.title : 'N/A'}</td>
            <td><strong>${res.score}</strong> / ${res.total_marks}</td>
            <td>${res.percentage}%</td>
            <td><span class="badge ${res.violation_count > 0 ? 'badge-danger' : 'badge-success'}">${res.violation_count} Violations</span></td>
            <td>${new Date(res.submitted_at).toLocaleString()}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="viewAttemptDetails('${res.id}')">Inspect</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function openCreateTestForm() {
    currentEditingTestId = null;
    const testForm = document.getElementById('test-form');
    if (testForm) testForm.reset();
    
    const testIdElem = document.getElementById('test-id');
    if (testIdElem) testIdElem.value = '';
    
    const titleElem = document.getElementById('builder-title');
    if (titleElem) titleElem.innerText = 'Create New Examination';
    
    const qSection = document.getElementById('question-management-section');
    if (qSection) qSection.classList.add('hidden');
    
    showView('view-test-builder');
}

async function saveTestConfiguration(e) {
    e.preventDefault();
    
    const id = document.getElementById('test-id').value;
    const title = document.getElementById('test-title').value;
    const duration = parseInt(document.getElementById('test-duration').value, 10);
    const description = document.getElementById('test-description').value;
    
    // Explicit Boolean mapping
    const negativeMarking = Boolean(document.getElementById('test-negative-marking').checked);
    const isPublished = Boolean(document.getElementById('test-is-published').checked);

    const testPayload = {
        title: title,
        duration_minutes: duration,
        description: description,
        negative_marking: negativeMarking,
        is_published: isPublished
    };

    let result = null;
    if (id && id.trim() !== '') {
        result = await supabaseClient.from('tests').update(testPayload).eq('id', id).select();
    } else {
        result = await supabaseClient.from('tests').insert([testPayload]).select();
    }

    if (result.error) {
        console.error("Save Test Error:", result.error);
        if (typeof showToast === "function") showToast(`Failed to save test: ${result.error.message}`, "danger");
        else alert(`Failed to save test: ${result.error.message}`);
    } else {
        if (typeof showToast === "function") showToast("Test settings saved successfully!", "success");
        else alert("Test settings saved successfully!");
        
        const savedTest = result.data[0];
        currentEditingTestId = savedTest.id;
        document.getElementById('test-id').value = savedTest.id;
        
        const qSection = document.getElementById('question-management-section');
        if (qSection) qSection.classList.remove('hidden');
        
        loadQuestionsForTest(savedTest.id);
    }
}

async function editTest(testId) {
    currentEditingTestId = testId;
    const { data: test, error } = await supabaseClient.from('tests').select('*').eq('id', testId).single();
    if (error || !test) {
        if (typeof showToast === "function") showToast("Failed to fetch test details", "danger");
        return;
    }

    document.getElementById('test-id').value = test.id;
    document.getElementById('test-title').value = test.title;
    document.getElementById('test-duration').value = test.duration_minutes;
    document.getElementById('test-description').value = test.description || '';
    document.getElementById('test-negative-marking').checked = Boolean(test.negative_marking);
    document.getElementById('test-is-published').checked = Boolean(test.is_published);

    document.getElementById('builder-title').innerText = `Edit: ${test.title}`;
    
    const qSection = document.getElementById('question-management-section');
    if (qSection) qSection.classList.remove('hidden');
    
    showView('view-test-builder');
    loadQuestionsForTest(testId);
}

async function loadQuestionsForTest(testId) {
    const { data: questions, error } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: true });

    const container = document.getElementById('questions-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (questions && questions.length > 0) {
        questions.forEach((q, idx) => {
            const card = document.createElement('div');
            card.className = 'card margin-top';
            card.innerHTML = `
                <div class="dashboard-header">
                    <h4>Q${idx + 1}. ${q.question_text}</h4>
                    <div>
                        <span class="badge badge-outline">${q.marks} Marks</span>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q.id}')">Delete</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = `<p class="text-muted">No questions added yet to this test.</p>`;
    }
}

function openQuestionModal() {
    const qForm = document.getElementById('question-form');
    if (qForm) qForm.reset();
    
    const qId = document.getElementById('q-id');
    if (qId) qId.value = '';
    
    const qCorrectSelect = document.getElementById('q-correct');
    if (qCorrectSelect) {
        qCorrectSelect.innerHTML = `
            <option value="A">Option A</option>
            <option value="B">Option B</option>
            <option value="C">Option C</option>
            <option value="D">Option D</option>
        `;
    }
    
    const modal = document.getElementById('modal-question');
    if (modal) modal.classList.remove('hidden');
}

async function saveQuestion(e) {
    e.preventDefault();
    if (!currentEditingTestId) return;

    const question_text = document.getElementById('q-text').value;
    const type = document.getElementById('q-type').value;
    const marks = parseFloat(document.getElementById('q-marks').value);
    const negative_marks = parseFloat(document.getElementById('q-neg-marks').value);
    const correct_answer = document.getElementById('q-correct').value;

    const options = {
        A: document.getElementById('q-op-a').value,
        B: document.getElementById('q-op-b').value,
        C: document.getElementById('q-op-c').value,
        D: document.getElementById('q-op-d').value
    };

    const payload = {
        test_id: currentEditingTestId,
        question_text: question_text,
        type: type,
        marks: marks,
        negative_marks: negative_marks,
        options: options,
        correct_answer: correct_answer
    };

    const { error } = await supabaseClient.from('questions').insert([payload]);

    if (error) {
        console.error("Save Question Error:", error);
        if (typeof showToast === "function") showToast(`Failed to add question: ${error.message}`, "danger");
        else alert(`Failed to add question: ${error.message}`);
    } else {
        if (typeof showToast === "function") showToast("Question added!", "success");
        
        const modal = document.getElementById('modal-question');
        if (modal) modal.classList.add('hidden');
        
        loadQuestionsForTest(currentEditingTestId);
    }
}

async function deleteQuestion(qId) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const { error } = await supabaseClient.from('questions').delete().eq('id', qId);
    if (!error) {
        if (typeof showToast === "function") showToast("Question deleted", "info");
        loadQuestionsForTest(currentEditingTestId);
    }
}

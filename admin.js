// Admin Panel Logic & Data Management

document.addEventListener('DOMContentLoaded', () => {
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
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    if (!supabaseClient) {
        showToast("Supabase is not configured properly.", "danger");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showToast(`Login Failed: ${error.message}`, "danger");
    } else {
        showToast("Authenticated successfully!", "success");
        document.getElementById('nav-admin-login-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        showView('view-admin-dashboard');
        loadAdminDashboardData();
    }
}

async function loadAdminDashboardData() {
    if (!supabaseClient) return;

    // Fetch Tests
    const { data: tests, error: testErr } = await supabaseClient.from('tests').select('*').order('created_at', { ascending: false });
    
    if (!testErr && tests) {
        renderTestsTable(tests);
        document.getElementById('stat-total-tests').innerText = tests.length;
        document.getElementById('stat-published-tests').innerText = tests.filter(t => t.is_published).length;
    }

    // Fetch Candidate Results
    const { data: results, error: resErr } = await supabaseClient
        .from('candidate_attempts')
        .select('*, tests(title)')
        .order('submitted_at', { ascending: false });

    if (!resErr && results) {
        renderResultsTable(results);
        document.getElementById('stat-total-attempts').innerText = results.length;
    }
}

function renderTestsTable(tests) {
    const tbody = document.getElementById('tests-table-body');
    tbody.innerHTML = '';

    tests.forEach(test => {
        const tr = document.createElement('tr');
        const shareUrl = `${window.location.origin}${window.location.pathname}?test_id=${test.id}`;

        tr.innerHTML = `
            <td><strong>${test.title}</strong></td>
            <td>${test.duration_minutes} Mins</td>
            <td>${test.total_questions || 0}</td>
            <td>${test.total_marks || 0}</td>
            <td><span class="badge ${test.is_published ? 'badge-success' : 'badge-warning'}">${test.is_published ? 'Published' : 'Draft'}</span></td>
            <td><button class="btn btn-sm btn-outline" onclick="copyShareLink('${shareUrl}')">📋 Copy Link</button></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTest('${test.id}')">Edit / Add Questions</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url);
    showToast("Exam Direct Link Copied to Clipboard!", "info");
}

function renderResultsTable(results) {
    const tbody = document.getElementById('results-table-body');
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
    document.getElementById('test-form').reset();
    document.getElementById('test-id').value = '';
    document.getElementById('builder-title').innerText = 'Create New Examination';
    document.getElementById('question-management-section').classList.add('hidden');
    showView('view-test-builder');
}

async function saveTestConfiguration(e) {
    e.preventDefault();
    const id = document.getElementById('test-id').value;
    const title = document.getElementById('test-title').value;
    const duration = parseInt(document.getElementById('test-duration').value, 10);
    const description = document.getElementById('test-description').value;
    
    // Explicit Boolean values
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
        showToast(`Failed to save test: ${result.error.message}`, "danger");
    } else {
        showToast("Test settings saved successfully!", "success");
        const savedTest = result.data[0];
        currentEditingTestId = savedTest.id;
        document.getElementById('test-id').value = savedTest.id;
        document.getElementById('question-management-section').classList.remove('hidden');
        loadQuestionsForTest(savedTest.id);
    }
}

async function editTest(testId) {
    currentEditingTestId = testId;
    const { data: test, error } = await supabaseClient.from('tests').select('*').eq('id', testId).single();
    if (error || !test) {
        showToast("Failed to fetch test details", "danger");
        return;
    }

    document.getElementById('test-id').value = test.id;
    document.getElementById('test-title').value = test.title;
    document.getElementById('test-duration').value = test.duration_minutes;
    document.getElementById('test-description').value = test.description || '';
    document.getElementById('test-negative-marking').checked = Boolean(test.negative_marking);
    document.getElementById('test-is-published').checked = Boolean(test.is_published);

    document.getElementById('builder-title').innerText = `Edit: ${test.title}`;
    document.getElementById('question-management-section').classList.remove('hidden');
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
    document.getElementById('question-form').reset();
    document.getElementById('q-id').value = '';
    const qCorrectSelect = document.getElementById('q-correct');
    qCorrectSelect.innerHTML = `
        <option value="A">Option A</option>
        <option value="B">Option B</option>
        <option value="C">Option C</option>
        <option value="D">Option D</option>
    `;
    document.getElementById('modal-question').classList.remove('hidden');
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
        showToast(`Failed to add question: ${error.message}`, "danger");
    } else {
        showToast("Question added!", "success");
        document.getElementById('modal-question').classList.add('hidden');
        loadQuestionsForTest(currentEditingTestId);
    }
}

async function deleteQuestion(qId) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const { error } = await supabaseClient.from('questions').delete().eq('id', qId);
    if (!error) {
        showToast("Question deleted", "info");
        loadQuestionsForTest(currentEditingTestId);
    }
}

// Admin Dashboard & Exam Authoring Module
const Admin = {
    activeTestId: null,
    questions: [],

    async init() {
        if (!supabaseClient) return;

        // Check authentication state
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.showDashboard(session.user);
        } else {
            App.switchView('view-admin-login');
        }

        this.bindEvents();
    },

    bindEvents() {
        // Admin Auth Form
        document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                App.showToast(`Login Failed: ${error.message}`, 'danger');
            } else {
                App.showToast('Login Successful', 'success');
                this.showDashboard(data.user);
            }
        });

        // Tab Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab).classList.add('active');
            });
        });

        // Test Form Submission
        document.getElementById('test-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTest();
        });

        // Open Create Test Screen
        document.getElementById('btn-open-create-test')?.addEventListener('click', () => {
            this.resetTestForm();
            App.switchView('view-test-builder');
        });

        document.getElementById('btn-back-dashboard')?.addEventListener('click', () => {
            this.loadDashboardData();
            App.switchView('view-admin-dashboard');
        });

        // Question Modal Bindings
        document.getElementById('btn-add-question')?.addEventListener('click', () => {
            this.openQuestionModal();
        });

        document.getElementById('btn-close-qmodal')?.addEventListener('click', () => this.closeQuestionModal());
        document.getElementById('btn-cancel-qmodal')?.addEventListener('click', () => this.closeQuestionModal());

        document.getElementById('q-type')?.addEventListener('change', (e) => {
            this.adjustQuestionTypeUI(e.target.value);
        });

        document.getElementById('question-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveQuestion();
        });

        document.getElementById('btn-close-attempt-modal')?.addEventListener('click', () => {
            document.getElementById('modal-attempt-details').classList.add('hidden');
        });
    },

    async logout() {
        await supabaseClient.auth.signOut();
        document.getElementById('user-display').classList.add('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
        document.getElementById('nav-admin-login-btn').classList.remove('hidden');
        App.switchView('view-admin-login');
    },

    async showDashboard(user) {
        document.getElementById('user-display').innerText = user.email;
        document.getElementById('user-display').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('nav-admin-login-btn').classList.add('hidden');

        App.switchView('view-admin-dashboard');
        await this.loadDashboardData();
    },

    async loadDashboardData() {
        // Fetch Tests Summary
        const { data: tests, error: testErr } = await supabaseClient
            .from('tests')
            .select('*')
            .order('created_at', { ascending: false });

        if (!testErr && tests) {
            document.getElementById('stat-total-tests').innerText = tests.length;
            document.getElementById('stat-published-tests').innerText = tests.filter(t => t.is_published).length;
            this.renderTestsTable(tests);
        }

        // Fetch Attempts Summary
        const { data: attempts, error: attErr } = await supabaseClient
            .from('attempts')
            .select('*, tests(title)')
            .order('started_at', { ascending: false });

        if (!attErr && attempts) {
            document.getElementById('stat-total-attempts').innerText = attempts.length;
            const avg = attempts.length ? (attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attempts.length).toFixed(1) : 0;
            document.getElementById('stat-avg-score').innerText = `${avg}%`;
            this.renderResultsTable(attempts);
        }
    },

    renderTestsTable(tests) {
        const tbody = document.getElementById('tests-table-body');
        tbody.innerHTML = '';

        tests.forEach(test => {
            const shareUrl = `${window.location.origin}/?test=${test.share_code}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${test.title}</strong></td>
                <td>${test.duration_minutes} mins</td>
                <td>-</td>
                <td>${test.total_marks}</td>
                <td><span class="badge ${test.is_published ? 'badge-success' : 'badge-warning'}">${test.is_published ? 'Published' : 'Draft'}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="Admin.copyShareLink('${shareUrl}')">Copy Link</button>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="Admin.editTest('${test.id}')">Edit</button>
                    <button class="btn btn-${test.is_published ? 'warning' : 'success'} btn-sm" onclick="Admin.togglePublish('${test.id}', ${test.is_published})">
                        ${test.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="Admin.deleteTest('${test.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderResultsTable(attempts) {
        const tbody = document.getElementById('results-table-body');
        tbody.innerHTML = '';

        attempts.forEach(att => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${att.candidate_name}</strong><br><small>${att.candidate_email || ''}</small></td>
                <td>${att.tests?.title || 'Exam'}</td>
                <td>${att.score}</td>
                <td>${att.percentage}%</td>
                <td><span class="badge ${att.violation_count > 0 ? 'badge-danger' : 'badge-success'}">${att.violation_count}</span></td>
                <td>${att.submitted_at ? new Date(att.submitted_at).toLocaleString() : 'In Progress'}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="Admin.viewAttemptDetails('${att.id}')">Inspect</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    copyShareLink(url) {
        navigator.clipboard.writeText(url);
        App.showToast('Exam Share Link copied to clipboard!', 'success');
    },

    // Create / Edit Test Operations
    resetTestForm() {
        this.activeTestId = null;
        document.getElementById('test-id').value = '';
        document.getElementById('test-title').value = '';
        document.getElementById('test-duration').value = '30';
        document.getElementById('test-description').value = '';
        document.getElementById('test-negative-marking').checked = false;
        document.getElementById('test-is-published').checked = false;
        document.getElementById('question-management-section').classList.add('hidden');
        document.getElementById('builder-title').innerText = 'Create New Examination';
    },

    async editTest(testId) {
        const { data: test, error } = await supabaseClient
            .from('tests')
            .select('*')
            .eq('id', testId)
            .single();

        if (error || !test) return App.showToast('Error loading test', 'danger');

        this.activeTestId = test.id;
        document.getElementById('test-id').value = test.id;
        document.getElementById('test-title').value = test.title;
        document.getElementById('test-duration').value = test.duration_minutes;
        document.getElementById('test-description').value = test.description || '';
        document.getElementById('test-negative-marking').checked = test.negative_marking;
        document.getElementById('test-is-published').checked = test.is_published;

        document.getElementById('builder-title').innerText = `Edit: ${test.title}`;
        document.getElementById('question-management-section').classList.remove('hidden');

        App.switchView('view-test-builder');
        await this.loadQuestions(test.id);
    },

    async saveTest() {
        const title = document.getElementById('test-title').value;
        const duration_minutes = parseInt(document.getElementById('test-duration').value);
        const description = document.getElementById('test-description').value;
        const negative_marking = document.getElementById('test-negative-marking').checked;
        const is_published = document.getElementById('test-is-published').checked;

        const payload = { title, duration_minutes, description, negative_marking, is_published };

        if (!this.activeTestId) {
            // Generate Secure Unique Share Code (Cryptographically Random 8-char string)
            const randomBytes = new Uint8Array(4);
            window.crypto.getRandomValues(randomBytes);
            payload.share_code = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

            const { data, error } = await supabaseClient.from('tests').insert([payload]).select().single();
            if (error) return App.showToast(`Creation Failed: ${error.message}`, 'danger');
            
            this.activeTestId = data.id;
            App.showToast('Test created successfully! You can now add questions.', 'success');
            document.getElementById('question-management-section').classList.remove('hidden');
        } else {
            const { error } = await supabaseClient.from('tests').update(payload).eq('id', this.activeTestId);
            if (error) return App.showToast(`Update Failed: ${error.message}`, 'danger');
            App.showToast('Test configuration updated.', 'success');
        }
    },

    async togglePublish(testId, currentStatus) {
        const { error } = await supabaseClient.from('tests').update({ is_published: !currentStatus }).eq('id', testId);
        if (error) App.showToast('Status update failed', 'danger');
        else {
            App.showToast(`Test ${!currentStatus ? 'Published' : 'Unpublished'}`, 'success');
            this.loadDashboardData();
        }
    },

    async deleteTest(testId) {
        if (!confirm('Are you sure you want to delete this test and all related questions/attempts?')) return;
        const { error } = await supabaseClient.from('tests').delete().eq('id', testId);
        if (error) App.showToast('Delete failed', 'danger');
        else {
            App.showToast('Test deleted', 'success');
            this.loadDashboardData();
        }
    },

    // QUESTION MANAGEMENT
    async loadQuestions(testId) {
        const { data, error } = await supabaseClient
            .from('questions')
            .select('*')
            .eq('test_id', testId)
            .order('question_order', { ascending: true });

        if (!error) {
            this.questions = data || [];
            this.renderQuestionsList();
        }
    },

    renderQuestionsList() {
        const container = document.getElementById('questions-list-container');
        container.innerHTML = '';

        if (this.questions.length === 0) {
            container.innerHTML = '<p class="text-muted">No questions added yet.</p>';
            return;
        }

        let totalMarks = 0;

        this.questions.forEach((q, idx) => {
            totalMarks += Number(q.marks);
            const card = document.createElement('div');
            card.className = 'card margin-top';
            card.innerHTML = `
                <div class="dashboard-header">
                    <h4>Q${idx + 1}. ${q.question_text}</h4>
                    <div>
                        <span class="badge badge-outline">${q.marks} Mark(s)</span>
                        <button class="btn btn-secondary btn-sm" onclick="Admin.editQuestion('${q.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="Admin.deleteQuestion('${q.id}')">Delete</button>
                    </div>
                </div>
                <small>Type: ${q.question_type} | Correct: <strong>${q.correct_answer}</strong></small>
            `;
            container.appendChild(card);
        });

        // Update total test marks dynamically
        supabaseClient.from('tests').update({ total_marks: totalMarks }).eq('id', this.activeTestId).then();
    },

    openQuestionModal(qId = null) {
        document.getElementById('q-id').value = '';
        document.getElementById('q-text').value = '';
        document.getElementById('q-type').value = 'MCQ';
        document.getElementById('q-marks').value = '1';
        document.getElementById('q-neg-marks').value = '0';
        document.getElementById('q-op-a').value = '';
        document.getElementById('q-op-b').value = '';
        document.getElementById('q-op-c').value = '';
        document.getElementById('q-op-d').value = '';

        this.adjustQuestionTypeUI('MCQ');
        document.getElementById('modal-question').classList.remove('hidden');
    },

    closeQuestionModal() {
        document.getElementById('modal-question').classList.add('hidden');
    },

    adjustQuestionTypeUI(type) {
        const mcqPanel = document.getElementById('mcq-options-panel');
        const correctSelect = document.getElementById('q-correct');
        correctSelect.innerHTML = '';

        if (type === 'MCQ') {
            mcqPanel.classList.remove('hidden');
            ['A', 'B', 'C', 'D'].forEach(opt => {
                correctSelect.innerHTML += `<option value="Option ${opt}">Option ${opt}</option>`;
            });
        } else {
            mcqPanel.classList.add('hidden');
            correctSelect.innerHTML = `
                <option value="True">True</option>
                <option value="False">False</option>
            `;
        }
    },

    async saveQuestion() {
        const id = document.getElementById('q-id').value;
        const question_text = document.getElementById('q-text').value;
        const question_type = document.getElementById('q-type').value;
        const marks = parseFloat(document.getElementById('q-marks').value);
        const negative_marks = parseFloat(document.getElementById('q-neg-marks').value);
        const correct_answer = document.getElementById('q-correct').value;

        const payload = {
            test_id: this.activeTestId,
            question_text,
            question_type,
            marks,
            negative_marks,
            correct_answer,
            option_a: question_type === 'MCQ' ? document.getElementById('q-op-a').value : null,
            option_b: question_type === 'MCQ' ? document.getElementById('q-op-b').value : null,
            option_c: question_type === 'MCQ' ? document.getElementById('q-op-c').value : null,
            option_d: question_type === 'MCQ' ? document.getElementById('q-op-d').value : null
        };

        let res;
        if (id) {
            res = await supabaseClient.from('questions').update(payload).eq('id', id);
        } else {
            payload.question_order = this.questions.length + 1;
            res = await supabaseClient.from('questions').insert([payload]);
        }

        if (res.error) {
            App.showToast(`Error: ${res.error.message}`, 'danger');
        } else {
            App.showToast('Question saved', 'success');
            this.closeQuestionModal();
            this.loadQuestions(this.activeTestId);
        }
    },

    async deleteQuestion(qId) {
        if (!confirm('Delete question?')) return;
        await supabaseClient.from('questions').delete().eq('id', qId);
        this.loadQuestions(this.activeTestId);
    },

    async viewAttemptDetails(attemptId) {
        const { data: att } = await supabaseClient.from('attempts').select('*, tests(title)').eq('id', attemptId).single();
        const { data: violations } = await supabaseClient.from('violations').select('*').eq('attempt_id', attemptId);
        const { data: answers } = await supabaseClient.from('answers').select('*, questions(question_text, correct_answer)').eq('attempt_id', attemptId);

        const modalBody = document.getElementById('attempt-modal-body');
        modalBody.innerHTML = `
            <div>
                <h4>Candidate: ${att.candidate_name} (${att.candidate_email || 'N/A'})</h4>
                <p>Exam: ${att.tests?.title} | Score: <strong>${att.score} (${att.percentage}%)</strong></p>
                <hr style="margin: 1rem 0;">
                
                <h5>Proctoring Violations Log (${violations?.length || 0})</h5>
                <ul style="margin-bottom: 1rem; font-size: 0.85rem;">
                    ${(violations || []).map(v => `<li><strong>[${new Date(v.timestamp).toLocaleTimeString()}]</strong> ${v.violation_type}: ${v.details || ''}</li>`).join('') || '<li>No violations recorded.</li>'}
                </ul>

                <h5>Submitted Answers Breakdown</h5>
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr><th>Question</th><th>Selected Answer</th><th>Correct Answer</th><th>Mark</th></tr>
                    </thead>
                    <tbody>
                        ${(answers || []).map(a => `
                            <tr>
                                <td>${a.questions?.question_text || 'Q'}</td>
                                <td>${a.selected_answer || '<i>Unanswered</i>'}</td>
                                <td>${a.questions?.correct_answer || ''}</td>
                                <td><span class="badge ${a.is_correct ? 'badge-success' : 'badge-danger'}">${a.marks_awarded}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('modal-attempt-details').classList.remove('hidden');
    }
};

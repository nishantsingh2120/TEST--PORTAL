// Candidate Exam Interface & Proctoring Coordinator Module
const CandidateExam = {
    shareCode: null,
    testData: null,
    questions: [],
    currentQuestionIndex: 0,
    answersMap: {}, // Indexed by question_id
    attemptId: null,
    timerInterval: null,
    secondsRemaining: 0,
    timeTakenSeconds: 0,
    violationCount: 0,

    async init(shareCode) {
        this.shareCode = shareCode;
        App.switchView('view-candidate-entry');
        await this.loadTestMetadata();
        this.bindEvents();
    },

    async loadTestMetadata() {
        if (!supabaseClient) return;

        // Fetch questions safely via Secure RPC (Strips correct_answer)
        const { data, error } = await supabaseClient.rpc('get_candidate_questions', { p_share_code: this.shareCode });

        if (error || !data || data.length === 0) {
            document.getElementById('entry-test-title').innerText = "Examination Unavailable or Unpublished";
            return;
        }

        this.questions = data;
        const meta = data[0];
        this.testData = {
            id: meta.test_id,
            title: meta.test_title,
            description: meta.test_description,
            duration: meta.duration_minutes,
            totalMarks: meta.total_marks
        };

        // Populate Candidate Entry View UI
        document.getElementById('entry-test-title').innerText = this.testData.title;
        document.getElementById('entry-test-description').innerText = this.testData.description || 'No special instructions.';
        document.getElementById('entry-duration').innerText = `${this.testData.duration} Mins`;
        document.getElementById('entry-questions-count').innerText = this.questions.length;
        document.getElementById('entry-total-marks').innerText = this.testData.totalMarks;
    },

    bindEvents() {
        document.getElementById('candidate-start-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.startExam();
        });

        document.getElementById('btn-prev-question')?.addEventListener('click', () => this.navigateQuestion(-1));
        document.getElementById('btn-next-question')?.addEventListener('click', () => this.navigateQuestion(1));
        document.getElementById('btn-submit-exam')?.addEventListener('click', () => {
            if (confirm("Are you sure you want to submit your examination?")) {
                this.submitExam();
            }
        });
    },

    async startExam() {
        const name = document.getElementById('candidate-name').value;
        const email = document.getElementById('candidate-email').value;

        // 1. Request Camera Access
        const cameraGranted = await ProctorCamera.initWebcam();
        if (!cameraGranted) {
            return alert("Camera permission is mandatory for proctored examinations. Please grant access to proceed.");
        }

        // 2. Request Fullscreen Mode
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen request declined or unsupported.");
        }

        // 3. Register Candidate Attempt Record
        const { data: attempt, error } = await supabaseClient.from('attempts').insert([{
            test_id: this.testData.id,
            candidate_name: name,
            candidate_email: email,
            status: 'IN_PROGRESS'
        }]).select().single();

        if (error || !attempt) {
            return App.showToast("Failed to initialize test session. Please try again.", "danger");
        }

        this.attemptId = attempt.id;

        // Load cached answers if recovering session
        const localSaved = localStorage.getItem(`attempt_${this.attemptId}`);
        if (localSaved) {
            this.answersMap = JSON.parse(localSaved);
        }

        // 4. Initialize Proctoring Listeners
        this.setupProctoringMonitors();
        ProctorCamera.startFaceDetection((violationType, details) => {
            this.recordViolation(violationType, details);
        });

        // 5. Start Countdown Timer
        this.secondsRemaining = this.testData.duration * 60;
        this.startTimer();

        // 6. Display Exam Workspace
        document.getElementById('exam-workspace-title').innerText = this.testData.title;
        document.getElementById('exam-workspace-candidate').innerText = name;
        App.switchView('view-exam-workspace');

        this.renderQuestion(0);
        this.renderPalette();
    },

    setupProctoringMonitors() {
        // TAB SWITCH / VISIBILITY DETECTION
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && App.currentView === 'view-exam-workspace') {
                this.recordViolation('TAB_SWITCH', 'Candidate switched browser tab or minimized window.');
            }
        });

        // FULLSCREEN EXIT DETECTION
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && App.currentView === 'view-exam-workspace') {
                this.recordViolation('FULLSCREEN_EXIT', 'Candidate exited fullscreen mode.');
            }
        });
    },

    async recordViolation(type, details) {
        this.violationCount++;
        document.getElementById('violation-count-badge').innerText = `${this.violationCount} / ${MAX_VIOLATION_LIMIT}`;
        
        App.showToast(`SECURITY WARNING (${this.violationCount}/${MAX_VIOLATION_LIMIT}): ${details}`, 'danger');

        // Log violation to Supabase database
        if (this.attemptId) {
            await supabaseClient.from('violations').insert([{
                attempt_id: this.attemptId,
                test_id: this.testData.id,
                candidate_name: document.getElementById('candidate-name').value,
                violation_type: type,
                details: details
            }]);
        }

        // Auto-submit if violation limit reached
        if (this.violationCount >= MAX_VIOLATION_LIMIT) {
            alert("Maximum allowed compliance violations exceeded. Your exam will now be submitted automatically.");
            this.submitExam(true);
        }
    },

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.secondsRemaining--;
            this.timeTakenSeconds++;

            const hours = Math.floor(this.secondsRemaining / 3600);
            const mins = Math.floor((this.secondsRemaining % 3600) / 60);
            const secs = this.secondsRemaining % 60;

            document.getElementById('exam-timer').innerText = 
                `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (this.secondsRemaining <= 0) {
                clearInterval(this.timerInterval);
                App.showToast("Time limit expired! Auto-submitting test...", "warning");
                this.submitExam();
            }
        }, 1000);
    },

    renderQuestion(index) {
        this.currentQuestionIndex = index;
        const q = this.questions[index];

        document.getElementById('question-number-badge').innerText = `Question ${index + 1} of ${this.questions.length}`;
        document.getElementById('question-marks-badge').innerText = `${q.marks} Mark(s)`;
        document.getElementById('question-text').innerText = q.question_text;

        const container = document.getElementById('options-container');
        container.innerHTML = '';

        const currentAnswer = this.answersMap[q.id] || '';

        if (q.question_type === 'MCQ') {
            const options = [
                { key: 'Option A', text: q.option_a },
                { key: 'Option B', text: q.option_b },
                { key: 'Option C', text: q.option_c },
                { key: 'Option D', text: q.option_d }
            ];

            options.forEach(opt => {
                if (!opt.text) return;
                const div = document.createElement('div');
                div.className = 'option-item';
                div.innerHTML = `
                    <input type="radio" name="option" value="${opt.key}" id="opt_${opt.key}" ${currentAnswer === opt.key ? 'checked' : ''}>
                    <label for="opt_${opt.key}" style="width:100%; cursor:pointer;"><strong>${opt.key}:</strong> ${opt.text}</label>
                `;
                div.addEventListener('click', () => {
                    this.selectOption(q.id, opt.key);
                    document.getElementById(`opt_${opt.key}`).checked = true;
                });
                container.appendChild(div);
            });
        } else {
            // True / False Options
            ['True', 'False'].forEach(val => {
                const div = document.createElement('div');
                div.className = 'option-item';
                div.innerHTML = `
                    <input type="radio" name="option" value="${val}" id="opt_${val}" ${currentAnswer === val ? 'checked' : ''}>
                    <label for="opt_${val}" style="width:100%; cursor:pointer;"><strong>${val}</strong></label>
                `;
                div.addEventListener('click', () => {
                    this.selectOption(q.id, val);
                    document.getElementById(`opt_${val}`).checked = true;
                });
                container.appendChild(div);
            });
        }

        // Toggle prev/next button states
        document.getElementById('btn-prev-question').disabled = index === 0;
        document.getElementById('btn-next-question').disabled = index === this.questions.length - 1;

        this.highlightPalette();
    },

    selectOption(questionId, value) {
        this.answersMap[questionId] = value;
        // Save state locally to prevent data loss on unintended reloads
        localStorage.setItem(`attempt_${this.attemptId}`, JSON.stringify(this.answersMap));
        this.renderPalette();
    },

    navigateQuestion(direction) {
        const nextIdx = this.currentQuestionIndex + direction;
        if (nextIdx >= 0 && nextIdx < this.questions.length) {
            this.renderQuestion(nextIdx);
        }
    },

    renderPalette() {
        const container = document.getElementById('question-palette');
        container.innerHTML = '';

        this.questions.forEach((q, idx) => {
            const btn = document.createElement('button');
            btn.className = `btn-palette ${this.answersMap[q.id] ? 'answered' : ''} ${idx === this.currentQuestionIndex ? 'active' : ''}`;
            btn.innerText = idx + 1;
            btn.addEventListener('click', () => this.renderQuestion(idx));
            container.appendChild(btn);
        });
    },

    highlightPalette() {
        document.querySelectorAll('.btn-palette').forEach((btn, idx) => {
            if (idx === this.currentQuestionIndex) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    },

    async submitExam(isDisqualified = false) {
        clearInterval(this.timerInterval);
        ProctorCamera.stopCamera();

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }

        // Format answers array payload for Database RPC
        const answersPayload = Object.keys(this.answersMap).map(qId => ({
            question_id: qId,
            selected_answer: this.answersMap[qId]
        }));

        // Execute Secure RPC Call to evaluate results server-side
        const { data, error } = await supabaseClient.rpc('submit_test_attempt', {
            p_attempt_id: this.attemptId,
            p_answers: answersPayload,
            p_time_taken: this.timeTakenSeconds,
            p_violations: this.violationCount
        });

        if (error) {
            App.showToast("Error processing exam evaluation", "danger");
            return;
        }

        const result = data[0];
        localStorage.removeItem(`attempt_${this.attemptId}`);

        // Populate Result Summary Page UI
        document.getElementById('result-score-text').innerText = `${result.score} / ${this.testData.totalMarks}`;
        document.getElementById('result-percentage-text').innerText = `${result.percentage}%`;
        document.getElementById('result-correct').innerText = result.correct_answers;
        document.getElementById('result-wrong').innerText = result.wrong_answers;
        document.getElementById('result-unanswered').innerText = result.unanswered;
        document.getElementById('result-time-taken').innerText = `${this.timeTakenSeconds}s`;

        if (isDisqualified) {
            document.getElementById('result-status-message').className = "alert-box alert-danger margin-top";
            document.getElementById('result-status-message').innerText = "DISQUALIFIED: Submission flagged due to critical proctoring compliance violations.";
        }

        App.switchView('view-result-summary');
    }
};

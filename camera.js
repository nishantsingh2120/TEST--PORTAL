// Proctored Camera & Vision Analytics Module
const ProctorCamera = {
    videoElement: null,
    stream: null,
    faceMesh: null,
    detectionInterval: null,
    onViolationCallback: null,
    noFaceCounter: 0,
    multipleFaceCounter: 0,

    async initWebcam() {
        this.videoElement = document.getElementById('webcam-preview');
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                audio: false
            });
            this.videoElement.srcObject = this.stream;
            return true;
        } catch (err) {
            console.error("Camera Access Error:", err);
            return false;
        }
    },

    startFaceDetection(violationCallback) {
        this.onViolationCallback = violationCallback;

        // Initialize MediaPipe Face Mesh for client-side processing
        if (typeof FaceMesh !== 'undefined') {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            this.faceMesh.setOptions({
                maxNumFaces: 2,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.processVisionResults(results));

            // Frame Processing Loop
            const cameraUtils = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.videoElement && !this.videoElement.paused) {
                        await this.faceMesh.send({ image: this.videoElement });
                    }
                },
                width: 320,
                height: 240
            });
            cameraUtils.start();
        } else {
            console.warn("MediaPipe FaceMesh uninitialized. Falling back to basic hardware active monitoring.");
        }
    },

    processVisionResults(results) {
        const warningOverlay = document.getElementById('proctor-overlay-warning');
        const facesCount = results.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;

        if (facesCount === 0) {
            this.noFaceCounter++;
            warningOverlay.classList.remove('hidden');
            warningOverlay.innerText = "⚠️ NO FACE DETECTED";

            // Trigger violation after sustained absence (~3 seconds)
            if (this.noFaceCounter === 30) {
                if (this.onViolationCallback) {
                    this.onViolationCallback('NO_FACE', 'Candidate face was not visible to the camera.');
                }
            }
        } else if (facesCount > 1) {
            this.multipleFaceCounter++;
            warningOverlay.classList.remove('hidden');
            warningOverlay.innerText = "⚠️ MULTIPLE FACES DETECTED";

            if (this.multipleFaceCounter === 15) {
                if (this.onViolationCallback) {
                    this.onViolationCallback('MULTIPLE_FACES', 'Multiple individuals detected in proctoring feed.');
                }
            }
        } else {
            // Single candidate face confirmed
            this.noFaceCounter = 0;
            this.multipleFaceCounter = 0;
            warningOverlay.classList.add('hidden');
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
    }
};

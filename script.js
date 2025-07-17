// MediaPipe 라이브러리 import
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// --- DOM 요소 및 전역 변수 초기화 ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("outputCanvas");
const canvasCtx = canvasElement?.getContext("2d");
const stopButton = document.getElementById("stopButton");
const instructionText = document.getElementById("instruction");
const statusText = document.getElementById("status");
const loadingDiv = document.getElementById("loading");

if (!video || !canvasElement || !stopButton || !instructionText || !statusText || !loadingDiv) {
    alert("필수 DOM 요소가 누락되었습니다. index.html 파일을 확인하세요.");
    throw new Error("필수 DOM 요소가 누락됨");
}

let handLandmarker;
let runningMode = "VIDEO";
let webcamRunning = false;
let lastVideoTime = -1;
let animationFrameId;
let drawingUtils;

// 운동 상태를 관리하는 객체
const exerciseState = {
    currentExercise: 'none', // 'none', 'fingerFold', 'circleDraw'
    isHandDetected: false,
    fingerFold: { stage: 0, lastSuccessTime: 0 },
    circleDraw: { lastSuccessTime: 0, completedCircles: 0 }
};

// --- 1. AI 모델 및 초기 설정 ---
async function initializeApp() {
    try {
        // WASM 파일 로딩 주소
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: runningMode,
            numHands: 1
        });
        drawingUtils = new DrawingUtils(canvasCtx);
        console.log("HandLandmarker 모델 로드 완료.");
        loadingDiv.style.display = 'none';
        startWebcam();
    } catch (error) {
        console.error("AI 모델 로딩 중 심각한 오류 발생:", error);
        loadingDiv.innerHTML = "AI 모델을 불러오는 데 실패했습니다.<br>인터넷 연결 또는 CDN 차단 여부를 확인하세요.";
        const spinner = loadingDiv.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
    }
}
initializeApp(); // 페이지 로드 시 바로 실행

// --- 2. 웹캠 제어 및 예측 루프 ---
function startWebcam() {
    if (webcamRunning) return; // 이미 실행 중이면 중복 실행 방지
    webcamRunning = true;
    loadingDiv.style.display = 'none';
    stopButton.style.display = 'block';

    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.onloadeddata = () => {
            predictWebcam();
            startExercise();
        };
    }).catch(err => {
        console.error("웹캠 접근 오류:", err);
        loadingDiv.style.display = 'flex';
        loadingDiv.innerHTML = "웹캠을 찾을 수 없거나 권한이 없습니다.<br>브라우저 권한 및 연결 상태를 확인하세요.";
        webcamRunning = false;
        stopButton.style.display = 'none';
    });
}

stopButton.addEventListener("click", () => {
    webcamRunning = false;
    stopButton.style.display = 'none';
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    resetExercise();
    instructionText.innerText = "체조가 중지되었습니다.";
});

async function predictWebcam() {
    if (!webcamRunning) return;
    if (!video.videoWidth || !video.videoHeight) {
        animationFrameId = requestAnimationFrame(predictWebcam);
        return;
    }
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime && handLandmarker) {
        lastVideoTime = video.currentTime;
        let results;
        try {
            results = await handLandmarker.detectForVideo(video, startTimeMs);
        } catch (e) {
            console.error("HandLandmarker 예측 오류:", e);
            statusText.innerText = "AI 예측 중 오류 발생";
            animationFrameId = requestAnimationFrame(predictWebcam);
            return;
        }
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        if (results.landmarks && results.landmarks.length > 0) {
            exerciseState.isHandDetected = true;
            for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
                drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", radius: 5 });
            }
            updateExercise(results.landmarks[0]);
        } else {
            exerciseState.isHandDetected = false;
            statusText.innerText = "손이 감지되지 않았습니다.";
        }
        canvasCtx.restore();
    }
    animationFrameId = requestAnimationFrame(predictWebcam);
}

// --- 3. 운동 로직 및 제스처 분석 ---
function startExercise() {
    resetExercise();
    exerciseState.currentExercise = 'fingerFold';
    instructionText.innerText = "1단계: 손가락 순서대로 접기";
}

function resetExercise() {
    exerciseState.currentExercise = 'none';
    exerciseState.fingerFold = { stage: 0, lastSuccessTime: 0 };
    exerciseState.circleDraw = { lastSuccessTime: 0, completedCircles: 0 };
    statusText.innerText = "-";
}

function updateExercise(landmarks) {
    if (!exerciseState.isHandDetected) {
        statusText.innerText = "웹캠에 손을 보여주세요.";
        return;
    }
    switch (exerciseState.currentExercise) {
        case 'fingerFold':
            checkFingerFold(landmarks);
            break;
        case 'circleDraw':
            checkCircleDraw(landmarks);
            break;
    }
}

// ★★★ 이 함수가 수정되었습니다 ★★★
function checkFingerFold(landmarks) {
    // Finger landmark IDs
    const tipIds = [4, 8, 12, 16, 20]; // 엄지, 검지, 중지, 약지, 새끼
    const pipIds = [3, 6, 10, 14, 18];
    const fingerNames = ["엄지", "검지", "중지", "약지", "새끼"];

    // 1. 먼저 엄지손가락이 펴져 있는지 확인합니다.
    const isThumbOut = landmarks[tipIds[0]].y < landmarks[pipIds[0]].y;
    if (!isThumbOut) {
        statusText.innerText = "엄지손가락을 펴주세요.";
        return; // 엄지가 접혀있으면 더 이상 진행하지 않음
    }

    // 2. 검지부터 새끼손가락까지 순서대로 접혔는지 확인합니다.
    let foldedFingers = 0;
    for (let i = 1; i < 5; i++) { // i=1 (검지) 부터 시작
        // 손가락 끝(tip)이 중간 마디(pip)보다 아래에 있으면 접힌 것으로 간주
        if (landmarks[tipIds[i]].y > landmarks[pipIds[i]].y) {
            foldedFingers++;
        } else {
            // 순서대로 접히지 않았으면 중단
            break;
        }
    }

    // 3. 상태에 따라 안내 메시지를 업데이트합니다.
    if (foldedFingers < 4) {
        // 다음에 접어야 할 손가락 안내 (foldedFingers: 0이면 검지, 1이면 중지...)
        const nextFingerIndex = foldedFingers + 1;
        statusText.innerText = `좋아요! 이제 ${fingerNames[nextFingerIndex]} 손가락을 접어주세요.`;
    } else {
        // 4개 손가락을 모두 접었을 때 성공 처리
        statusText.innerText = "성공! 다음 운동으로 넘어갑니다.";
        
        // 2초 딜레이 후 다음 운동(원 그리기)으로 전환
        if (Date.now() - exerciseState.fingerFold.lastSuccessTime > 2000) {
            exerciseState.fingerFold.lastSuccessTime = Date.now();
            exerciseState.currentExercise = 'circleDraw';
            instructionText.innerText = '2단계: 검지로 원 그리기';
            statusText.innerText = "검지 손가락으로 원을 3번 그려주세요. (완성: 0/3)";
        }
    }
}

function checkCircleDraw(landmarks) {
    let { completedCircles, lastSuccessTime } = exerciseState.circleDraw;
    if (!lastSuccessTime) exerciseState.circleDraw.lastSuccessTime = Date.now();
    if (Date.now() - lastSuccessTime > 3000) {
        completedCircles++;
        exerciseState.circleDraw.completedCircles = completedCircles;
        exerciseState.circleDraw.lastSuccessTime = Date.now();
        if (completedCircles < 3) {
            statusText.innerText = `잘했어요! (완성: ${completedCircles}/3)`;
        } else {
            statusText.innerText = `성공! 모든 체조를 마쳤습니다.`;
            instructionText.innerText = "참 잘하셨습니다!";
            exerciseState.currentExercise = 'none';
            setTimeout(() => {
                if (webcamRunning) stopButton.click();
            }, 3000);
        }
    }
}
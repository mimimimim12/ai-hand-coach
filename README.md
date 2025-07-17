AI 손 체조 코치 (AI Hand Coach)
웹캠을 통해 사용자의 손을 인식하고, 정해진 손 체조 동작을 올바르게 수행할 수 있도록 안내하는 AI 코칭 웹 애플리케이션입니다. MediaPipe의 Hand Landmarker 기술을 활용하여 실시간으로 손의 관절을 추적하고, 사용자의 동작을 분석하여 피드백을 제공합니다.


🌟 주요 기능
실시간 손 추적: MediaPipe를 활용하여 웹캠 화면에서 실시간으로 사용자의 손 모양과 관절 위치를 인식합니다.

양방향 운동 안내: '손가락 순서대로 접기', '검지로 원 그리기' 등 단계별 운동 미션을 제공합니다.

실시간 피드백: 사용자의 동작을 분석하여 "엄지손가락을 펴주세요", "좋아요!" 와 같은 즉각적인 피드백을 화면에 표시합니다.

반응형 UI: 웹 브라우저 환경에 맞게 화면 레이아웃이 조절됩니다.

🛠️ 기술 스택
Front-end: HTML, CSS, JavaScript (ESM)

AI/ML: Google MediaPipe (Hand Landmarker)

Build Tool: Vite

🏃‍♀️ 로컬에서 실행하기
이 저장소를 클론(clone)하거나 다운로드합니다.

Bash

git clone https://github.com/YOUR_USERNAME/ai-hand-coach.git
프로젝트 폴더로 이동합니다.

Bash

cd ai-hand-coach
필요한 라이브러리를 설치합니다.

Bash

npm install
Vite 개발 서버를 실행합니다.

Bash

npm run dev
터미널에 표시된 http://localhost:xxxx 주소로 접속합니다.

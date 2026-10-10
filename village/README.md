# 태희·세희 3D 마법마을 · Unity WebGL MVP

이 디렉터리는 기존 반짝 배움터의 문제은행·별 지갑과 Unity 빌드를 연결하는 웹 호스트입니다.

## 실행

- Unity 소스: 별도 비공개 GitHub 저장소 `01chungee10snu/sparkle-fairy-village`
- 에디터: Unity 6.3 LTS `6000.3.26f1`, Input System `1.20.1`
- 빌드: `Sparkle Village → 2. Build Web` 메뉴
- 산출물: Unity 프로젝트 `Builds/WebGL/Build/*`
- 개발 중인 웹앱의 `village/Build/`에 그 파일들을 복사한 뒤 기존 웹앱에서 `npm start`
- 브라우저: `http://127.0.0.1:4179/village/`

위의 `Build/`는 기본적으로 Git에서 제외되며, 검증한 바이너리는 Unity 저장소의 GitHub 사전 릴리스로 보관합니다. 운영 `main` 배포는 실기기 검사 이후 결정합니다.

## 데이터 무결성

- 개인 마을·공용 꽃밭: `sparkle-unity-village-v1`
- 기존 학습 데이터: `sparkle-learning-progress-v3`
- 기존 보상 데이터: `sparkle-rewards-v1`
- 기존 단위 정원: `fairy-math-garden-v1`
- Unity는 별을 직접 부여하지 않으며 기존 JavaScript 로직에 위임합니다.
- 가족 광장은 완료한 회차별 고유 이벤트만 기록하며, 별을 형제간 전송하지 않습니다.
- 개발 검증: `npm run check` 와 `scripts/check-village.mjs`

## 현재 범위

3D 임시 요정, 개인 마을, 공동 광장, 터치 이동, 기존 문제 및 해설 연동. 정식 모델·실제 iPhone/iPad/Android QA 및 접근성 검증은 후속 과제입니다.

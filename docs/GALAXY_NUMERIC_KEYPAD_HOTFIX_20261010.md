# 삼성 갤럭시 숫자 정답 키보드 입력 오류 수정 — 2026-10-10

## 현상·원인 경계

- 사용자 환경: 삼성 갤럭시 휴대전화에서 마법 마을의 숫자형 답안 입력창을 눌러도 키보드가 작동하지 않음.
- 기존 숫자형 UI: HTML `input[type=text][inputmode=numeric]` 하나를 Unity WebGL 캔버스 위 모달에 표시함.
- Unity WebGL 위의 Android 삼성 키보드 실행·포커스/뷰포트 변화에 의존하므로 일부 기기에서 입력 불능 가능성이 있음. **실제 갤럭시 삼성 키보드의 정확한 실패 원인은 아직 물리 기기에서 재현·진단하지 않았음.**

## 해결

1. 모든 숫자형 문제에 0–9 / 한 자리 삭제 / 전체 지우기의 터치 키패드를 직접 제공(앱 외부 키보드 불필요).
2. 터치 장치 기본 입력창은 `readonly + inputmode=none`으로 시작; `⌨️ 휴대전화 키보드 사용` 버튼을 통해 OS 키보드를 선택적으로 호출.
3. 정답 확인 버튼을 모달 하단에 고정해 스마트폰 세로/가로 화면에서도 아래로 길게 내려가지 않고 제출.
4. 숫자 값 유효성(0, 음수 최소값, 최대값, 7자리 한도), 전체폭 유니코드 숫자/마이너스 정규화 및 잘못된 빈 문자열 차단.
5. 채점·IRT·별 원장·문항 기록은 기존 `Progress.answerQuestion`을 그대로 사용; Unity 바이너리 재빌드나 데이터 마이그레이션 없음.
6. KMA 원본 공개판과 자체 제작 공개 연습판에 동일 코드 반영. 추후 개발본 `sparkle-learning-hub-quality-v2`에도 코드 동기화.

## 검증

- `node scripts/check-galaxy-numeric-keypad.mjs`: 갤럭시 S21 Android 15 Chrome 모의 환경 360×780 및 780×360, 연습판 390×844, PC 1280×800; 0–9 / Backspace / Clear / 상한 초과·중복 제출 / 음수 / 전각 숫자 / OS 키보드 선택 / Enter 제출.
- `node scripts/check-galaxy-real-unity-numeric.mjs`: 실제 Unity WebGL, 초1 심화 공개 KMA 시험지 1번, 숫자 정답 77을 터치 패드로 입력하고 기존 채점 결과가 정답임을 확인.
- `node scripts/check-kma-live-v06.mjs`: 45개 게임/IRT 색인 4,153개, 675개 원본 기출 문항/이미지 1,350개 경로, 태희/세희 완주 별 160/60 및 저장소 격리 검증.
- `npm run check`: 기존 학습앱 회귀 테스트 통과.
- 실제 삼성 Galaxy 장치의 물리 터치·Samsung Keyboard 실행 문제는 연결 장치에서 다른 세션이 진행 중이므로 방해하지 않고 진행했으며, 사용자의 실제 기기 재확인이 필요함.

## 배포 대상

- GitHub Pages: `https://01chungee10snu.github.io/sparkle-learning-hub/magic-village-kma-v06/village/`
- 공개 연습판: `https://01chungee10snu.github.io/sparkle-learning-hub/magic-village-v06/village/`
- 반짝 배움터 본편 숫자 문제는 **이미 자체 내장 터치 키패드**를 사용하므로 별도 코드 변경하지 않음.

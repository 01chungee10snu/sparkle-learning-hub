# 마법마을 웹 품질 검증 — 2026-10-10

현재 확인 결과: bridge 회귀검증 PASS, 최종 native UI·보상 6개 PNG 반영 후 Chrome headless DOM 36/36 항목 PASS, 새 Unity WebGL 10/10 항목 PASS, 각 모드 JavaScript pageerror 0건. DOM 실행 당시 index cache v20261010b, 카메라 보정 후 최종 WebGL 실행 당시 v20261010c·productVersion 0.2.0을 구분해 확인했다. 실제 휴대전화·태블릿 기기에서의 실행 결과가 아니다. DOM 검증은 Unity를 실행하지 않고 기존 UI 모듈에 실제 문항과 합성 응답을 연결했고, 별도 WebGL 검증은 실제 새 Unity 빌드를 실행했다.

## 검증 환경

- 기존 로컬 서버 http://127.0.0.1:4179 재사용. 새 서버를 시작하지 않음.
- Chrome /Applications/Google Chrome.app/Contents/MacOS/Google Chrome 실제 존재 확인.
- Playwright /Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js 실제 존재 확인, CommonJS default export를 사용.
- 모든 headless browser context는 별도 생성·종료. 기존 아이 학습기록·사용자 브라우저 프로필과 격리.
- 기본 reduced-motion 설정.
- 정상 검증은 CatDesk start_command로 한 번 시작하고 같은 job의 결과를 poll.
- 테스트 완료 뒤 CatDesk native read transport의 일시 실패를 관측해, 실제 발견한 Desktop Commander 기기에서 JSON·PNG를 읽어 결과를 재확인. 이후 CatDesk 구문검사 성공을 관측했다.

## bridge 회귀검증

/Users/01chungee10/Github/sparkle-learning-hub/scripts/check-village-quality.mjs 신규 파일.

실제 game.json과 실제 IRT bank를 이용한다. 점수·능력치를 임의로 대입하지 않는다.

| 동작 | 결과 |
|---|---|
| 동일 requestId의 순차·동시 START 재전송 | 같은 영수증 재응답, 회차·점수 중복 변경 없음 |
| 동일 requestId에 다른 payload | 거절, 학습기록 무변경 |
| 같은 SUBMIT 영수증 재전송 | 이전 earned 응답 유지, 실제 attempt 추가 없음 |
| 새로운 ID로 이미 제출한 답 재제출 | 거절 |
| NEXT 영수증 재전송 및 미응답 NEXT | 다음 문항으로 추가 진행 없음 |
| 실제 legacy 문항의 method hint fallback | 힌트 제공 |
| 힌트 후 정답 | attempt/firstAttempt assisted=true, IRT 독립증거 n 증가 없음 |
| 다음 문항의 독립 첫 응답 | IRT 독립증거 n이 1 증가 |
| 아이 변경 후 이전 회차·영수증 재전송 | 거절, 새 아이에게 이전 기록 반영 없음 |
| CANCEL 후 늦은 SUBMIT | 거절, 기록 무변경 |
| 기존 snack 문항의 public visual | 원본 visual 유지 |

## headless DOM 검증

/Users/01chungee10/Github/sparkle-learning-hub/scripts/village-browser-qa.mjs 신규 파일.

| 가상 화면 | 크기 | 검증 |
|---|---:|---:|
| 휴대전화 세로 | 390×844 | 9/9 PASS |
| 휴대전화 가로 | 844×390 | 9/9 PASS |
| 태블릿 | 1024×768 | 9/9 PASS |
| 데스크톱 | 1440×900 | 9/9 PASS |

각 화면에서 채점 후 쉬었다 이어하기를 feedback 화면으로 복구하고 NEXT가 한 번만 전송되는지 확인했다. 실제 snack-count-02의 귤 4개 및 aria-label, 대화창 화면내 위치, 가로 넘침 없음, modal Tab/Shift+Tab 순환과 쉬기 후 초점 복귀, 힌트 1회 표시·중복 클릭 차단, 대기/이미소비한 stale reply의 pause 이후 폐기, 다른 requestId 응답 무시, 빈 matching 기본값 -1·미완성 제출 차단·같은 우측항목 1개 소유, snack-count-12의 0개 그림에 가짜 쿠키 없음·6개 그림, build/numeric 답안 전송을 검사했다.

PNG 두 장을 실제로 읽어 세로 선택형과 가로 매칭 대화창을 시각적으로 확인했다. DOM fixture는 실제 문항의 자리표시자를 합성 이름·장소(세희·우리 배움터)로 미리 치환한다. 실제 production host의 personalize 처리를 통과한 캡처가 아니며, 실서비스의 개인화 설정을 입증하는 자료가 아니다.

## 결과·이미지 경로

검증 JSON:

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/qa-dom.json

PNG:

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/phone-portrait-choice.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/phone-portrait-matching.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/phone-landscape-choice.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/phone-landscape-matching.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/tablet-choice.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/tablet-matching.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/desktop-choice.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/desktop-matching.png

## 검증 명령

~~~bash
cd /Users/01chungee10/Github/sparkle-learning-hub
node scripts/check-village-quality.mjs
node scripts/village-browser-qa.mjs --dom-only
node --check scripts/check-village-quality.mjs
node --check scripts/village-browser-qa.mjs
~~~

## 실제 새 WebGL 빌드 검증

~~~bash
cd /Users/01chungee10/Github/sparkle-learning-hub
node scripts/village-browser-qa.mjs --webgl
~~~

Chrome headless software WebGL에서 태희 1280×800·세희 390×844 각각의 새 browser context를 생성했다. 기존 사용자 브라우저 프로필·학습 저장소를 사용하지 않았다. 실제 Progress.selectLearner로 아이를 선택한 뒤 Unity loader가 보내는 INIT를 기다렸다. 합성 host 응답·임의 점수·꽃 대입 없이 실제 UI의 답 제출 및 Unity COMPLETE_WORLD 흐름을 통과했다. 원본 문항의 정답을 읽어 입력하는 자동화이며 아이의 자발적 정답률이나 학습 효과를 측정한 실험은 아니다.

| 프로필 | 실제 놀이 | 문항 | 학습별 | 하루 완주별 | 사용 가능별 | 개인 꽃 | 가족 꽃 | 다른 아이 별 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 태희 | measure-lab | 5 | 50 | 3 | 53 | 1 | 1 | 0 |
| 세희 | snack-count | 3 | 30 | 3 | 33 | 1 | 1 | 0 |

각 아이마다 다음 5개 항목이 PASS(총 10/10, pageerror 0건)였다: 빈 기록·실제 선택 프로필 및 INIT, 정확히 5/3문항의 한 회차 완주, 첫 정답 10별×문항수+하루 완주 3별 및 꽃 정확히 1회·형제 기록 격리, 마을 복귀→가족 광장→내 마을 후 지갑/꽃/회차 완전 동일, 새로고침 및 다시 Unity 열기 후 선택 프로필·별·꽃·완료 회차 완전 동일. 태희 completedRounds.questionIds 길이는 5, 세희는 3이며 finishedRounds는 각각 1이다.

최종 DOM 36항목과 최종 WebGL 10항목의 UI/CSS/bridge 소스 및 native UI·보상 6개 PNG 해시는 동일하다. DOM 당시 index는 vB, 최종 WebGL index는 vC이며, QA 스크립트에는 카메라 초기 보간 1초 대기 및 실제 canvas 포인터 관측이 추가되었다. 실행 당시 각각의 SHA를 아래에 구분했다. 보정 전 bridge→DOM→WebGL job 4f24d002-acf7-4af0-a5c1-e564d8f3e886은 succeeded/exitCode0/cursor56/잔여출력없음이었다. 최종 보정 빌드의 WebGL job e52e4175-3049-4bd6-ad2d-bfd747ec7dba도 succeeded/exitCode0/cursor23/잔여출력없음이며 10/10 PASS·pageerror0을 다시 확인했다.

카메라 보정 후 세희 세로 월드 PNG를 실제 읽었다. 핵심 집·우체국·토끼·요정이 화면 안에 보이고 집 지붕은 HUD 아래에서 분리된다. 외곽 나무 일부 crop은 남는다. 보정 전에는 우체국이 오른쪽 밖으로 나가고 장미집 상단이 HUD에 가렸다. 그 당시 JSON·PNG8개·QA 문서 원본과 파일별 SHA/bytes는 /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/before-camera/ 및 backup-manifest.json에 보존했다. 세로 완료 대화창은 bloom 그림, 꽃 수, 내 이유 말하기 안내, 마을 복귀 버튼과 읽어줘가 화면 안에 보인다.

최종 스크립트는 각 아이의 모든 완료·보존 검사가 끝난 뒤 실제 Unity canvas 바닥에 headless mouse click을 전송하고 1초 뒤 PNG를 저장했다. 세희 사진에서 세계와 요정의 상대 위치 변화가 보인다. C# transform 좌표·이동 거리·실기기 touch를 측정한 것은 아니다. 원위치로 새로고침한 뒤 실제 토끼 hotspot에 canvas 클릭을 보내자 태희·세희 모두 snack-count 대화창이 열렸다. 활성 gameId를 실제 Progress에서 확인했고, 답안을 제출하지 않고 쉬기로 닫았다. 이 입력 관측으로 별이나 꽃이 추가되지 않았다. pointerObservations에 클릭 좌표·입력 종류·대화창 성공을 기록했다. 실제 모바일 GPU·터치 이동·음성 출력 품질은 검증하지 않았다.

## 추가 console·Unity 예외 관측

소스를 수정하지 않고 별도 격리 세희 browser context에서 실제 INIT→가족광장→내마을→문제열기→쉬기를 실행했다. job 0ec27c1b-24ab-4aa0-9f2d-20f973656211은 succeeded/exitCode0/cursor1/잔여출력없음이다. console error 0건, JavaScript pageerror 0건, NullReferenceException·MissingComponentException·MissingReferenceException·TypeLoadException·fatal/abort 관련 로그 0건이었다. software WebGL의 ReadPixels GPU stall warning 3건 및 loader/data URL의 net::ERR_ABORTED requestfailed 2건은 원본 JSON에 보존했다. 실제 Unity 시작과 문제 대화창은 성공했으며 요청 중단 원인까지 확정한 검사는 아니다.

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/qa-console.json

결과:

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/qa-webgl.json

실제 WebGL PNG:

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-world.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-completed-round.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-family-plaza.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-reloaded-world.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-floor-pointer-after-1s.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-tae-npc-pointer-question.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-world.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-completed-round.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-family-plaza.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-reloaded-world.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-floor-pointer-after-1s.png
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/webgl-se-npc-pointer-question.png

## 원본/현재 소스 — 수정하지 않음

- /Users/01chungee10/Github/sparkle-learning-hub/village/village-bridge.js
- /Users/01chungee10/Github/sparkle-learning-hub/village/village-ui.js
- /Users/01chungee10/Github/sparkle-learning-hub/village/village-ui.css
- /Users/01chungee10/Github/sparkle-learning-hub/village/index.html
- /Users/01chungee10/Github/sparkle-learning-hub/platform/irt.js
- /Users/01chungee10/Github/sparkle-learning-hub/games/measure-lab/game.json
- /Users/01chungee10/Github/sparkle-learning-hub/games/snack-count/game.json
- /Users/01chungee10/Github/sparkle-learning-hub/games/kind-dialogue/game.json
- /Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js

## 디렉터리

~~~text
/Users/01chungee10/Github/sparkle-learning-hub/
  scripts/check-village-quality.mjs
  scripts/village-browser-qa.mjs
  docs/VILLAGE_QUALITY_QA_20261010.md
/Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/
  qa-dom.json
  phone-portrait-choice.png
  phone-portrait-matching.png
  phone-landscape-choice.png
  phone-landscape-matching.png
  tablet-choice.png
  tablet-matching.png
  desktop-choice.png
  desktop-matching.png
  qa-webgl.json
  webgl-tae-world.png
  webgl-tae-completed-round.png
  webgl-tae-family-plaza.png
  webgl-tae-reloaded-world.png
  webgl-se-world.png
  webgl-se-completed-round.png
  webgl-se-family-plaza.png
  webgl-se-reloaded-world.png
  webgl-tae-floor-pointer-after-1s.png
  webgl-tae-npc-pointer-question.png
  webgl-se-floor-pointer-after-1s.png
  webgl-se-npc-pointer-question.png
  qa-console.json
  before-camera/qa-webgl.json
  before-camera/*.png (8)
  before-camera/VILLAGE_QUALITY_QA_20261010.md
  before-camera/backup-manifest.json
~~~

## 최종 native UI·보상 6개 자산 및 vC index SHA-256

~~~text
678a54e281bfaca82492ff09320da5958c4fa360726987e51ef6a2ae627a02bb  village/index.html
39b8b5f9fec708a48c687304f17bd9cd7065fe5c008efc7e4f796d2283c80628  village/assets/ui_mission_panel.png
4cfe2b9bf556c942e337249993e18fca8c44cbce551563d167202e0e28241ad4  village/assets/ui_star_pill.png
3a8b734f1460ae3c7f090f09847c221cfd4a78f97813ae27e21b9aa399e6dd75  village/assets/ui_button.png
1339b0adb2b66b80f71050d15f765df2bcf6898714ba0f4e80fd92934eabd0b1  village/assets/star_yellow.png
8f751d56534fca3efca213d8361ff50b6680bb439a091a2c8ab20bd74906b4cf  village/assets/sprout.png
822c49a1b4b81d67869c2ffe6b120ae0624829f49ee17587f980f92fde223d44  village/assets/bloom.png
~~~

## DOM 실행 당시 소스 SHA-256 (vB)

~~~json
{
  "village/village-ui.js": "deffb599b1522b5e91a06fa4a177be380bf1deb24839aa23c27843cdd55a7b4f",
  "village/village-bridge.js": "f452c21b5b025bc088559b8414d0e0996a6eeeed591ff037e56eac6a37dec2da",
  "village/village-ui.css": "d9187bcfe5622f96914b999f1d39c29937e9f7cc05c1450a1a7ec3b2ee18539c",
  "village/index.html": "d7c53254eae4fb86fc8165b859a1840d790956cd5e204cdc5056a0e3b51604c5",
  "village/village-state.js": "f1b8684dbb2ddcbfd9c1b9949cbcdd5cd09ec5804478df53ceaa0d2045ca1b71",
  "platform/progress.js": "cfba29c15e3e000cbfb252c45f3ca4bf15be8713ca73dc6ff12ee50304b2be6a",
  "platform/rewards.js": "fe49083c4212805fe95938ab6dbcb9b22a4f5c923978cd7dde638fdef50487b8",
  "platform/reward-catalog.js": "7d0fbb85d21433a15efacbe8267c5f36c516184423e78f37d22ec2986204bd21",
  "platform/irt.js": "5e9866910364b38fd314be17477493463a5e725a659ea233b691fd297316ee38",
  "games/catalog.json": "90f86693df31e705b2fc773c92e2cecb2329ec795572db09c2934490f8066fc3",
  "games/irt-bank.json": "82b1096d23e973d94c0ebd2d32737f0103f4ca59cca7f166dbc74eeb5a6f91f8",
  "games/snack-count/game.json": "e4b7b6d57405df14a028fc1ceaad3d5a22cd6cc2ac1c30e340a45c6757875990",
  "games/measure-lab/game.json": "dee09f8b494a1e8a43124b9d1b3536849203ff26373b96ca0de7ede96adbb84c",
  "games/kind-dialogue/game.json": "729611157ce17ff71499d5a9eecbcbe2cb8c3512e40e6961eec5ce141d4065d6",
  "scripts/village-browser-qa.mjs": "992dfa5f8d2e104a16da047cc0ef6be7700ab6636955ade6a3f312e7805b0f03",
  "village/assets/ui_mission_panel.png": "39b8b5f9fec708a48c687304f17bd9cd7065fe5c008efc7e4f796d2283c80628",
  "village/assets/ui_star_pill.png": "4cfe2b9bf556c942e337249993e18fca8c44cbce551563d167202e0e28241ad4",
  "village/assets/ui_button.png": "3a8b734f1460ae3c7f090f09847c221cfd4a78f97813ae27e21b9aa399e6dd75",
  "village/assets/star_yellow.png": "1339b0adb2b66b80f71050d15f765df2bcf6898714ba0f4e80fd92934eabd0b1",
  "village/assets/sprout.png": "8f751d56534fca3efca213d8361ff50b6680bb439a091a2c8ab20bd74906b4cf",
  "village/assets/bloom.png": "822c49a1b4b81d67869c2ffe6b120ae0624829f49ee17587f980f92fde223d44"
}
~~~

## 최종 WebGL 실행 당시 소스 SHA-256 (vC)

~~~json
{
  "village/village-ui.js": "deffb599b1522b5e91a06fa4a177be380bf1deb24839aa23c27843cdd55a7b4f",
  "village/village-bridge.js": "f452c21b5b025bc088559b8414d0e0996a6eeeed591ff037e56eac6a37dec2da",
  "village/village-ui.css": "d9187bcfe5622f96914b999f1d39c29937e9f7cc05c1450a1a7ec3b2ee18539c",
  "village/index.html": "678a54e281bfaca82492ff09320da5958c4fa360726987e51ef6a2ae627a02bb",
  "village/village-state.js": "f1b8684dbb2ddcbfd9c1b9949cbcdd5cd09ec5804478df53ceaa0d2045ca1b71",
  "platform/progress.js": "cfba29c15e3e000cbfb252c45f3ca4bf15be8713ca73dc6ff12ee50304b2be6a",
  "platform/rewards.js": "fe49083c4212805fe95938ab6dbcb9b22a4f5c923978cd7dde638fdef50487b8",
  "platform/reward-catalog.js": "7d0fbb85d21433a15efacbe8267c5f36c516184423e78f37d22ec2986204bd21",
  "platform/irt.js": "5e9866910364b38fd314be17477493463a5e725a659ea233b691fd297316ee38",
  "games/catalog.json": "90f86693df31e705b2fc773c92e2cecb2329ec795572db09c2934490f8066fc3",
  "games/irt-bank.json": "82b1096d23e973d94c0ebd2d32737f0103f4ca59cca7f166dbc74eeb5a6f91f8",
  "games/snack-count/game.json": "e4b7b6d57405df14a028fc1ceaad3d5a22cd6cc2ac1c30e340a45c6757875990",
  "games/measure-lab/game.json": "dee09f8b494a1e8a43124b9d1b3536849203ff26373b96ca0de7ede96adbb84c",
  "games/kind-dialogue/game.json": "729611157ce17ff71499d5a9eecbcbe2cb8c3512e40e6961eec5ce141d4065d6",
  "scripts/village-browser-qa.mjs": "a830aec46628214ea6f4bd4f8e3edad65199678509312db134fa3c56a9440e0d",
  "village/assets/ui_mission_panel.png": "39b8b5f9fec708a48c687304f17bd9cd7065fe5c008efc7e4f796d2283c80628",
  "village/assets/ui_star_pill.png": "4cfe2b9bf556c942e337249993e18fca8c44cbce551563d167202e0e28241ad4",
  "village/assets/ui_button.png": "3a8b734f1460ae3c7f090f09847c221cfd4a78f97813ae27e21b9aa399e6dd75",
  "village/assets/star_yellow.png": "1339b0adb2b66b80f71050d15f765df2bcf6898714ba0f4e80fd92934eabd0b1",
  "village/assets/sprout.png": "8f751d56534fca3efca213d8361ff50b6680bb439a091a2c8ab20bd74906b4cf",
  "village/assets/bloom.png": "822c49a1b4b81d67869c2ffe6b120ae0624829f49ee17587f980f92fde223d44"
}
~~~

## 보정 전 WebGL 빌드 SHA-256 — before-camera 원본

~~~json
{
  "village/Build/WebGL.loader.js": "59b7e452e45d35dba9e441069f7d058cade758e15f9cfe2a1686d953caef7f24",
  "village/Build/WebGL.data.unityweb": "b4b8ada8031f4780dc3c841eb1c56146b682288df95759c80380f98ba2820234",
  "village/Build/WebGL.framework.js.unityweb": "7a90566ab9764877e68d06d371017b373fde158d284628f01486ba079d3f7eb2",
  "village/Build/WebGL.wasm.unityweb": "78100396de587de0502a6869380eb327c2b07242477b3e7d94b951772958c1ab"
}
~~~

## 최종 카메라 보정 WebGL 빌드 SHA-256

~~~json
{
  "village/Build/WebGL.loader.js": "59b7e452e45d35dba9e441069f7d058cade758e15f9cfe2a1686d953caef7f24",
  "village/Build/WebGL.data.unityweb": "a03037268fdcc06bd5cbfdcb1c39dc19e7e30027372e002daaf2373b2e10d1c3",
  "village/Build/WebGL.framework.js.unityweb": "7a90566ab9764877e68d06d371017b373fde158d284628f01486ba079d3f7eb2",
  "village/Build/WebGL.wasm.unityweb": "87dadf29ea8ef303186ee00dc6e9aea5fb8c635417decc2b634381edd09eeaac"
}
~~~


## WebGL 검증 이후 추가된 START 아이 변경 방어 — Node 보완 검증

최종 브라우저 검증을 마친 뒤 root가 START의 await loadGame 직후, beginRound 전에 현재 아이를 다시 확인하는 조건·throw 두 줄을 추가했다(주변 const game 줄을 포함한 3줄 변경 구간). 게임 파일을 기다리는 동안 선택 아이가 바뀌면 새 아이에게 이전 아이의 회차 크기·응답을 붙이지 않고 요청을 거절한다.

~~~js
const game = await loadGame(gameId);
if (Progress.learner() !== who)
  throw new Error('아이가 바뀌었어요. 새로 미션을 열어 주세요.');
~~~

check-village-quality.mjs에 회귀 1개를 추가했다. 별도 host의 실제 kind-dialogue game.json fetch를 deferred promise로 멈춘 다음 태희→세희 선택을 변경하고 fetch를 풀었다. START 거절과 두 아이의 Progress platform 전체 및 기존 저장 progress KEY 완전 무변경을 확인했다. 기존 bridge 회귀 전체와 신규 1개는 PASS, 구문검사·scope diffcheck도 PASS다. job 764cb4d4-657a-4593-b498-748fbe5829f9의 succeeded/exitCode0/cursor3/잔여출력없음을 확인했다.

| 증거 | bridge SHA-256 |
|---|---|
| 앞선 실제 DOM·WebGL 브라우저 실행 당시 | f452c21b5b025bc088559b8414d0e0996a6eeeed591ff037e56eac6a37dec2da |
| START await 이후 아이 변경 방어 추가 후 Node 검증 | 5e3847e1e0ad5eaca547c28e9385d23092c8ef23bc37fff8542f4b55df61c77f |

최종 check-village-quality.mjs SHA-256: a212d2414942ad433ce6a2730dc383b1529d39041d3fc5430359358763c3649c.

기존 qa-dom.json·qa-webgl.json·qa-console.json의 실행 당시 소스/빌드 해시는 그대로 보존했다. 새 방어 구문의 현재 검증은 Node에서 수행했으며, 이 두 줄 추가 후 실제 브라우저나 Unity 빌드를 다시 실행했다고 주장하지 않는다.

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser/qa-start-race.json

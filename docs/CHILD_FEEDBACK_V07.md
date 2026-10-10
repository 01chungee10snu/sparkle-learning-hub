# 마법마을 어린이 피드백 패치 v0.7

추론: 탐험 선택권, 행동에 대한 반응, 지속되는 돌봄 경험을 강화하면 세 가지 피드백에 대응할 수 있다.

## 변경
- 이동 가능 면적 4배: 열매 숲·꽃 초원·별빛 언덕·소풍길·정원
- 달리기·살짝 날기·인사: 9개 캐릭터 동작 상태, NPC 산책·가까이 왔을 때 반응
- 8개 흙자리, 꽃 3종·나무 3종, 물·햇빛·노래로 성장
- 개인 정원 분리·가족 정원 공유·새로고침 후 유지·저장 실패 시 성공 표시 금지
- 학습 채점·IRT·별 보상과 돌봄 상태를 분리해 기존 기록 유지

## 검증
- Unity WebGL 0.7 빌드 성공
- 이동/정원 접근 경로 26개 통과
- 정원 상태 검사 21개 통과
- 실제 WebGL: 세로 390×844 원본 문항판 / 가로 844×390 공개 연습판 각각 11개 흐름 확인
- 기존 npm run check 통과
- 삼성 갤럭시 실제 기기에서의 발열·성능·터치는 미검증

## 원본과 현재본
원본 작업 디렉터리는 수정하지 않았다. 두 별도 Git worktree의 복사본을 제자리 수정했다. 이전 내용은 기준 Git 커밋에 보존되어 있다. 별도의 백업 파일은 생성하지 않았다.
- Unity 원본: `/Users/01chungee10/Github/sparkle-fairy-village` (기준 878558d)
- Unity 현재: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07`
- 웹 원본: `/Users/01chungee10/Github/sparkle-village-kma-public-pages` (기준 c5d50a4)
- 웹 현재: `/Users/01chungee10/Github/sparkle-learning-feedback-v07`

## 읽은 사용자 관련 소스 파일
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageWorld.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageRuntime.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageDirectionalHero.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageBillboard.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageBridge.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Scripts/VillageNpcSpeech.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageEditorBuild.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageMajorPatchAudit.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageArt.cs`
- 원본/소스: `/Users/01chungee10/Github/sparkle-village-kma-public-pages/package.json`
- 원본/소스: `/Users/01chungee10/Github/sparkle-village-kma-public-pages/magic-village-kma-v06/village/index.html`
- 원본/소스: `/Users/01chungee10/Github/sparkle-village-kma-public-pages/magic-village-kma-v06/village/village-bridge.js`
- 원본/소스: `/Users/01chungee10/Github/sparkle-village-kma-public-pages/magic-village-kma-v06/village/village-ui.js`

## 생성·수정한 파일 전체
- verification artifact: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageChildFeedbackAudit.cs`
- verification artifact: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageChildFeedbackAudit.cs.meta`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageCareGarden.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageCareGarden.cs.meta`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Art/Generated/runtime-prefab-verification.json`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageEditorBuild.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Editor/VillageMajorPatchAudit.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageBillboard.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageDirectionalHero.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageRuntime.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Assets/Scripts/VillageWorld.cs`
- output/current: `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/ProjectSettings/ProjectSettings.asset`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/CHILD_FEEDBACK_V07_FILE_MANIFEST.json`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-build-copy.json`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-platform-check.log`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-kma-v06-garden-world.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-kma-v06-grown-flower.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-kma-v06-world.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-v06-garden-world.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-v06-grown-flower.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/magic-village-v06-world.png`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa/results.json`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/garden-state.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/garden-state.js`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/scripts/check-care-garden.mjs`
- verification artifact: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/scripts/child-feedback-browser-qa.mjs`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/app.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/index.html`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/Build/WebGL.data.unityweb`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/Build/WebGL.loader.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/Build/WebGL.wasm.unityweb`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/index.html`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/major-patch.css`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/village-bridge.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-kma-v06/village/village-ui.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/Build/WebGL.data.unityweb`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/Build/WebGL.loader.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/Build/WebGL.wasm.unityweb`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/index.html`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/major-patch.css`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/village-bridge.js`
- output/current: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/magic-village-v06/village/village-ui.js`
- 검증 파일: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/CHILD_FEEDBACK_V07_FILE_MANIFEST.json`
- 설명/최신: `/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/CHILD_FEEDBACK_V07.md`

## 관련 디렉터리 구조
```
/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/
  Assets/Editor/VillageChildFeedbackAudit.cs
  Assets/Editor/VillageChildFeedbackAudit.cs.meta
  Assets/Scripts/VillageCareGarden.cs
  Assets/Scripts/VillageCareGarden.cs.meta
  Assets/Art/Generated/runtime-prefab-verification.json
  Assets/Editor/VillageEditorBuild.cs
  Assets/Editor/VillageMajorPatchAudit.cs
  Assets/Scripts/VillageBillboard.cs
  Assets/Scripts/VillageDirectionalHero.cs
  Assets/Scripts/VillageRuntime.cs
  Assets/Scripts/VillageWorld.cs
  ProjectSettings/ProjectSettings.asset
/Users/01chungee10/Github/sparkle-learning-feedback-v07/
  docs/CHILD_FEEDBACK_V07_FILE_MANIFEST.json
  docs/child-feedback-build-copy.json
  docs/child-feedback-platform-check.log
  docs/child-feedback-qa/magic-village-kma-v06-garden-world.png
  docs/child-feedback-qa/magic-village-kma-v06-grown-flower.png
  docs/child-feedback-qa/magic-village-kma-v06-world.png
  docs/child-feedback-qa/magic-village-v06-garden-world.png
  docs/child-feedback-qa/magic-village-v06-grown-flower.png
  docs/child-feedback-qa/magic-village-v06-world.png
  docs/child-feedback-qa/results.json
  magic-village-kma-v06/village/garden-state.js
  magic-village-v06/village/garden-state.js
  scripts/check-care-garden.mjs
  scripts/child-feedback-browser-qa.mjs
  app.js
  index.html
  magic-village-kma-v06/village/Build/WebGL.data.unityweb
  magic-village-kma-v06/village/Build/WebGL.loader.js
  magic-village-kma-v06/village/Build/WebGL.wasm.unityweb
  magic-village-kma-v06/village/index.html
  magic-village-kma-v06/village/major-patch.css
  magic-village-kma-v06/village/village-bridge.js
  magic-village-kma-v06/village/village-ui.js
  magic-village-v06/village/Build/WebGL.data.unityweb
  magic-village-v06/village/Build/WebGL.loader.js
  magic-village-v06/village/Build/WebGL.wasm.unityweb
  magic-village-v06/village/index.html
  magic-village-v06/village/major-patch.css
  magic-village-v06/village/village-bridge.js
  magic-village-v06/village/village-ui.js
```

## 추가 빌드 원본 및 읽은 소스
- `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Builds/WebGL/Build/WebGL.wasm.unityweb`
- `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Builds/WebGL/Build/WebGL.data.unityweb`
- `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Builds/WebGL/Build/WebGL.framework.js.unityweb`
- `/Users/01chungee10/Github/sparkle-fairy-village-feedback-v07/Builds/WebGL/Build/WebGL.loader.js`
- `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Editor/VillageEditorBuild.cs`
- `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Editor/VillageMajorPatchAudit.cs`

## v0.7.1 후속 개선

- 지도·정원·더 놀기만 한 줄로 표시하고 동작·상점 버튼은 펼쳐서 사용합니다.
- 정원 창에 씨앗→새싹→성장 모습을 표시하고 돌봄 직후 물·햇빛·음표 반응을 보여줍니다.
- 배움 꽃과 가꾸는 식물 수를 구분합니다.
- 세로 390×844, 가로 844×390 실제 WebGL 브라우저 검사 각각 16개 통과. 나무 6단계 성장·재접속 저장·가족 정원 분리·44px 터치 크기를 확인했습니다. 상태 검사 25개 통과. 삼성 실기기 검사는 미실시.
- Unity 월드의 기존 성장 반영은 유지하며, 이번 돌봄 애니메이션은 정원 창에 추가되었습니다.

작업 경로: `/Users/01chungee10/Github/sparkle-learning-feedback-v07`

```text
magic-village-{kma-v06,v06}/village/
  index.html
  village-ui.js
  major-patch.css
scripts/
  check-care-garden.mjs
  child-feedback-browser-qa.mjs
docs/child-feedback-qa/
  *-world.png
  *-grown-tree.png
  *-grown-flower.png
  *-garden-world.png
  results.json
```

변경된 전체 파일의 절대 경로와 해시는 `CHILD_FEEDBACK_V071_FILE_MANIFEST.json`에 기록했습니다.

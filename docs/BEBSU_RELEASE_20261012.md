# 뱁수(Bebsu) 공개 통합 업데이트 — 2026-10-12

## 기준 및 변경 범위
- 기존 공개 GitHub Pages `origin/main`의 v0.7 두 마법마을 `magic-village-v06`, `magic-village-kma-v06` 링크와 보상/기록 격리를 유지했다. 이 두 포털의 WebGL 빌드 파일은 교체하지 않았다.
- 수학 원본 명칭 `벡수`를 `뱁수`로 수정했다. 공개 포털의 KMA 원본 문제와 연습 문제는 계속 구분한다.
- `assets/bebsu/art/`에 Bebsu 원본 유래 최적화 이미지 15종(513,823바이트)을 원본 SHA-256과 일치하도록 저장했다. 원본 `/Users/01chungee10/Github/Bebsu` 내용은 변경하지 않았다.
- 학습허브의 수학 문제집 카드, 학습 도우미, 정답/재도전 반응, 잠금 해제된 배지에 이미지 원화를 연결했다. 잠금되지 않은 배지를 임의로 보여 주지 않는다.
- 기존 v0.7 포털 두 개와 별개인 `/village/`에 Unity v0.6.1 Bebsu 선생님 NPC와 성장형 화단·나무 스프라이트가 포함된 WebGL 미리보기를 새로 갱신했다. 빌드 원본: `/Users/01chungee10/Github/sparkle-fairy-village/Builds/WebGL`. Unity 소스 커밋: `35b4f85` (`feat/learning-boost-eight-view-web-v06`).
- 게임 데이터 `games/bebsu-challenges.json`과 브리지 연동으로 9개 학년, 학년별 3개 시험지, 각 25문항 경로를 구성했다. 배점/기록 경계와 태희·세희 분리는 회귀검증을 통과했다.
- 기존 사용자 로컬 저장기록 삭제, 데이터 마이그레이션 강제, 기존 v0.7 마법마을 루트 대체는 수행하지 않았다.

## 검증 수준 (정확한 범위)
- `npm run check`: PASS. 46개 게임, 문제은행, IRT, 별 보상, 3/5문항 및 25문항 연동, 성장 정원, 50개 native-art 체크 포함.
- `node scripts/check-bebsu-art.mjs`: PASS, 15개 에셋·SHA256·2개 Unity Sprite.
- `node scripts/check-bebsu-village.mjs`: PASS, 9학년×3시험지×25문항, 형제 별도 기록·증거·부정 지급 방지.
- `node scripts/bebsu-art-browser-qa.mjs`: PASS, 태희·세희 390px 및 1280px. 웹 브라우저 이미지 로딩·레이아웃·문제 피드백 확인.
- `node scripts/bebsu-unity-webgl-smoke.mjs`: PASS, 태희 1280×800·세희 390×844 헤드리스 Chromium 실제 Unity WebGL 부팅/INIT, 9학년/3시험지, 25문항 1번 시작, 원본 문제 이미지 디코드, 별 0·형제 기록 격리. 실제 휴대전화 터치/성능 검사가 아니다.
- 기존 `scripts/village-browser-qa.mjs --webgl`의 3/5문항 자동시나리오는 25문항 선택 방식과 충돌해 FAIL. 대신 새 25문항 시나리오로 보완했지만 Unity WebGL에서 25문항 전부 완주 및 보상까지 실기기 검증한 것은 아니다.
- Unity 6 WebGL build 이전 2026-10-11 PASS 증거: `/Users/01chungee10/AI-Interop/evidence/sparkle-garden-v3-20261011/unity-v061-webgl-build.log`. 이번 통합에서 해당 빌드를 복사해 실 브라우저에서 실행했고, 새 빌드를 다시 컴파일하지는 않았다.

## 작업 경로
- 공개 소스 worktree: `/Users/01chungee10/Github/sparkle-learning-bebsu-release-20261012/`
- 공개 파일: `app.js`, `experience.css`, `index.html`, `assets/bebsu/art/`, `games/bebsu-challenges.json`, `village/Build/`, `village/index.html`, `village/village-bridge.js`, `village/village-ui.js`.
- QA: `docs/qa-bebsu-art-20261011/`, `docs/qa-bebsu-art-20261012/webgl-smoke/`, 위 네 가지 `scripts/*` 자동검사.
- Unity 원본: `/Users/01chungee10/Github/sparkle-fairy-village/Assets/Editor/VillageBebsuImporter.cs`, `Assets/Scripts/VillageWorld.cs`, `Assets/Resources/Bebsu/`, `Assets/Resources/Sprites/Garden/`, `Builds/WebGL/Build/`.

## 남은 한계
- 실제 삼성 갤럭시·태블릿 기기에서 원화 크기, 화면 회전, 입력 키보드, FPS 및 NPC 터치 판정은 별도 확인이 필요하다.
- 8방향 독립 원화는 고해상도 원본 8장 확인 전까지 최종 자산으로 주장하지 않는다.

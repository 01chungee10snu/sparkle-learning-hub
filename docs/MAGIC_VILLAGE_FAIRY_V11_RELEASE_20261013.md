# 마법마을 Fairy v11 — 로컬 릴리스 후보 / 2026-10-13

## 1. 판정
- Unity WebGL 빌드 PASS: MAGIC_VILLAGE_WEB_BUILD_OK, 버전 0.9.1.
- 원본 검증 PASS: FAIRY_VARIANTS_AUDIT_PASS styles=5 art_assets=12 source_hashes=unchanged.
- JavaScript 전체 회귀 PASS: npm run check, 55 games / 4,828 items, 형제 데이터 분리 및 중복 별 지급 차단.
- 모바일 2D/3D 브라우저 QA PASS, 브라우저 WebGL 실제 로딩 및 4가지 신규 장식 전환 스크린샷 확보.
- 실제 모바일 기기 GPU 성능·장기 학습효과 검증은 아직 시행하지 않음.
- 공개 Pages 배포·원본 덮어쓰기·기존 학습기록 변경 없음.

## 2. 원화 품질 및 변경 범위
- 캐릭터 원본 태희: /Users/01chungee10/GitHub/sparkle-fairy-village-character-v11/Assets/Resources/Sprites/Characters/taehee_original.png
- SHA-256: 29a25499f32ac5f6f2ae83250b53239a55f963eaa3fb1d1b91b604fd4695b65c
- 캐릭터 원본 세희: /Users/01chungee10/GitHub/sparkle-fairy-village-character-v11/Assets/Resources/Sprites/Characters/sehee_original.png
- SHA-256: cc68444107297e904c292233e2b804dfbb3fb5395fc41b64b5e1ee850446cc6f
- 웹 원본 PNG 역시 위와 동일한 SHA-256; 원본 픽셀 바이트 불변.
- Unity 정면 캐릭터는 1,254px 원본을 직접 렌더링; 텍스처 임포트 최대 2,048px로 향상.
- 측면·후면은 기존 아틀라스 유지. 기존 8방향 저해상도 시안은 정식 완성작으로 선언하지 않음.
- v11 스타일은 새 의상 원화가 아니라 원본 요정 주위 독립 스프라이트 장식/움직임을 배치하는 비파괴 변주.

## 3. 스타일과 사용
| ID | 이름 | 표현 |
|---|---|---|
| classic | 기존 요정 | 원본 그대로 |
| garden | 꽃정원 수호자 | 꽃 · 새싹 · 잎사귀 배지 |
| starlight | 달빛 별지기 | 작은 별 · 마법 가루 |
| explorer | 호기심 탐험가 | 책 배지 · 별 · 꽃 |
| festival | 축제 요정 | 무지개 별 · 하트 |

- 입장 → 더 놀기 → 요정 스타일에서 변경. 모든 꾸미기는 무료.
- 선택은 learner별 localStorage 키로 분리되며 성적·IRT·별·학습 진행을 변경하지 않음.
- 움직임 줄이기 설정 시 장식 부유 모션을 비활성화.

## 4. 소스 및 빌드 위치
- Unity source: /Users/01chungee10/GitHub/sparkle-fairy-village-character-v11
- Unity branch: feat/character-variants-v11
- Unity commit: 3c57c254f8433bd543260df570fb2d8423939eab
- Unity core: Assets/Scripts/VillageCharacterVariation.cs, VillageDirectionalHero.cs, VillageWorld.cs, VillageRuntime.cs.
- Unity audit: Assets/Editor/VillageCharacterVariantAudit.cs, VillageSpriteImporter.cs, VillageEditorBuild.cs.
- Unity build: /Users/01chungee10/GitHub/sparkle-fairy-village-character-v11/Builds/WebGL/Build
- Web host: /Users/01chungee10/GitHub/sparkle-learning-gameplay-v10
- Web sources: village/fairy-styles-v11.js, village/fairy-variations-v11.css, village/village-ui.js, village/index.html.
- WebGL current: /Users/01chungee10/GitHub/sparkle-learning-gameplay-v10/village/Build
- WebGL previous backup: /Users/01chungee10/GitHub/sparkle-learning-gameplay-v10/docs/qa-fairy-v11/previous-v10-webgl-build

## 5. 검증과 재현
- Build log: /Users/01chungee10/GitHub/sparkle-fairy-village-character-v11/Builds/fairy-variants-v11-editor-final.log
- 2D QA: docs/qa-fairy-v11/FAIRY_STYLE_QA_RESULT.json — 360×740, 390×844, 768×1024 PASS.
- 3D QA: docs/qa-fairy-v11/FAIRY_STYLE_3D_QA_RESULT.json — SwiftShader WebGL, classic+4 styled, no JS/HTTP errors.
- 전체 검사: docs/qa-fairy-v11/npm-check-full-final.log — PASS.
- 기존 모험 3D 회귀: docs/qa-gameplay-v10/3D_QA_RESULT.json — PASS.
- QA 스크립트: scripts/fairy-styles-v11-browser-qa.mjs, scripts/fairy-styles-v11-3d-qa.mjs, scripts/gameplay-v10-3d-qa.mjs.
- Local test URL (server running when verified): http://127.0.0.1:4189/village/
- Command: npm run check; npm run qa:fairy; npm run qa:fairy:3d.

## 6. 한계 / 다음 단계
- 크롭된 HUD 카드와 인게임 장식은 완성했으나 캐릭터별 5가지 독립 전신 의상·실제 8방향 표정/동작 원화는 아직 없음.
- 스마트폰 실물 GPU·발열·프레임 타임, 원화 시각적 충실도 아동 평가, 카메라 프레이밍 및 NPC 말풍선 가림 확인이 필요.
- 현재 원화 스타일은 학습 심리와 동기부여 결과를 실증하지 않았으며, 추후 보호자/어린이 관찰 평가가 필요.
- 사용자 확인 전 공개 페이지 배포를 수행하지 않음.

## 7. QA 파일 보호
- WebGL 기존 4개 파일은 덮어쓰기에 앞서 위 previous-v10-webgl-build로 백업.
- 현행 4개 WebGL 파일을 Unity Build output과 바이트 일치 cmp/SHA-256 검증.
- 스크린샷과 원본 JSON 증거는 QA 폴더에 보존, 자동으로 외부로 업로드하지 않음.

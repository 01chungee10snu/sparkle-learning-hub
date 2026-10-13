# 통합 마법마을 v0.8 — 2026-10-13

## 제품의 정식 진입 동선

```text
공개 /  ──즉시 이동──▶ /village/ Unity 통합 마법마을
                           ├─ 🌸 태희 / 🌙 세희 프로필 선택
                           ├─ 🔢 수학 정원 · 수세기/도량형/원본 뱁수 문제집
                           ├─ 📖 이야기 도서관 · 국어 어휘/읽기/말하기
                           ├─ 🌍 영어 숲 · 영어 듣기/표현
                           ├─ 🪄 마법학교 · 수학/국어/영어 교차 학습
                           ├─ 🌟 성장의 탑 · 학습 단계/추천 근거
                           ├─ 🏆 경시대회 성 · KMA 공개 기출 (9학년×3시험지×25)
                           ├─ 🧩 마법 수학 훈련장 · 자체 제작 연습 (9학년×3수준×25)
                           ├─ 🌱 정원 · 물/햇빛/노래로 식물 성장
                           └─ 🎁 별 상점 · 하나의 앞으로의 보상 지갑
                        /learning.html ── 상세 문항·성장 지도·기록 백업 (보조 화면)
```

Unity의 건물·지역 핫스팟은 `AREA_OPEN` district ID를 호출하며, 모바일에서 3D 오브젝트 터치가 어려워도 월드 하단 '지역 선택'을 통해 동일한 미션으로 접근한다. 마을 개인공간과 가족 광장, 탐험·가꾸기, 요정 행동은 기존 v0.7을 계승했다. Unity/WebGL의 내부 C# 렌더링과 학습 채점·기록 로직은 분리되어 있다.

## 문항 및 추천

- 기존 배움터 4,153문항에는 KMA 원본 3,680문항, 유아·초등 기초 문제 등이 포함된다.
- `magic-village-v06`의 **앱 자체 제작 문제 675개**를 `games/magic-*-challenge/game.json`(9개)으로 비파괴 복사하여 하나의 `games/catalog.json`에 추가했다.
- 총 55개 공개 게임, 4,828문항 + 별도 레거시 단위 정원 48문항. 문항 출처 및 원본 해시 기록은 기존 Bebsu/KMA 자료에 계속 존재한다.
- 새로운 675문항도 `games/irt-bank.json` 색인에 편성되었지만 초기 모수는 **편집상 가정**이다. 실제 응답을 기반으로 문항 난이도·변별도 모수의 재추정이 완료된 것이 아니며 능력·IQ·발달 진단에 쓰지 않는다.
- 일반 학습은 학습자별 태희 5문항/세희 3문항, KMA 및 자체 제작 시험지는 1~25번 순서대로 진행한다. 문제집과 성장 학습을 자동 승급하지 않는다.
- 모든 학습 미션은 출처와 문항 ID를 유지한다. KMA 공개 접근성이 재배포에 대한 포괄적 이용허락을 의미하지 않으며 저작권/사용범위는 별도 확인이 필요하다.

## 보상 및 기록의 안전한 통합

- 현재 **반짝 배움터의 기존 저장소** `sparkle-learning-progress-v3`, `sparkle-rewards-v*` 등 canonical key를 변경하거나 초기화하지 않는다. 아이 프로필 키는 `sparkle-learner-v1`을 계속 사용한다.
- 새로운 통합 마을에서 앞으로 플레이한 25문항 자체 제작 연습은 같은 배움터 계정 안에서 별을 적립한다. **최초 시험지 완주 한정 보너스:** 태희 80, 세희 35. KMA는 태희 160, 세희 60. 이미 완료한 시험지에는 중복 보너스를 지급하지 않는다.
- 25문항 완주 기록은 시험지 ID와 25개 실제 문항의 정렬·중복 여부를 함께 검증하고, 응답·세션 ID에 따라 이중 지급을 차단한다. 게임별 기본 문제 별과 완주 별은 원래 규칙을 유지한다.
- 예전에 공개됐던 두 **별도 v0.7 마법마을**의 progress/wallet localStorage 데이터는 건드리지 않으며, 이전 장부의 지출·중복/ID 충돌 가능성이 확인되기 전에는 새 지갑에 자동 합산하지 않는다. 기존 두 배포 디렉터리는 소스·기록 접근을 위해 보존한다. 과거 지갑 전체 병합은 사용자 검수 및 데이터 백업 후 별도의 마이그레이션 작업으로 진행해야 한다.
- 배움터 기존 두 자녀의 기록, 완료 꽃, 가족 광장, 별 선물 및 IRT 증거는 코드 업데이트로 삭제되지 않는다. 매 브라우저·기기 기록의 클라우드 동기화는 지원하지 않으므로 기기 변경 시 보호자 기록 내보내기가 필요하다.

## 코드와 검증

| 부분 | 경로 |
|---|---|
| 정식 첫 화면 이동 | `index.html` |
| 상세 배움터 보조 페이지 | `learning.html` |
| 통합 3D 진입 HTML | `village/index.html` |
| Unity 자산 및 C# | `/Users/01chungee10/Github/sparkle-fairy-village-unified-20261013/` |
| 지역/학습/보상 브리지 | `village/village-bridge.js` |
| 모바일 지역 선택/학습 UI | `village/village-ui.js`, `village/unified-world.css` |
| 정원/상점/IRT | `village/garden-state.js`, `platform/village-adaptive.js` |
| 공동 문제은행 | `games/catalog.json`, `games/irt-bank.json` |
| 추가 연습문항 | `games/magic-*-challenge/game.json`, `games/magic-practice-challenges.json` |
| 은행 재생성/검증 | `scripts/import-magic-practice.mjs`, `scripts/build-irt-bank.mjs` |
| 공통 장부/25문항 검사 | `scripts/check-unified-world.mjs` |
| WebGL 브라우저 검사 | `scripts/unified-village-browser-qa.mjs` |

검증 관측은 '테스트 통과'와 '모바일 실기기 검증'을 구분한다. 브라우저 자동화에서는 태희/세희 프로필의 3D 실행, 지역별 모달, 국어/영어/수학 선택, KMA/연습 25문항 진입·이어풀기, 이미지·숫자패드·보상/기록 무결성을 확인한다. 실제 갤럭시 GPU·발열·장시간 이용에서 안정성은 별도로 검증해야 한다.

기존 공개 v0.7의 캐릭터 8방향 고화질 독립 원본은 이전 품질 이슈를 그대로 인지해야 하며, 손에 들고 선택할 수 있는 안내와 학습 도구가 최우선이다. 캐릭터 일러스트·놀이 행동 자체가 아동 학습성과를 증명하는 것은 아니다.

## 최종 통합 빌드 및 실제 사용성 증거

- Unity 6 WebGL: `/Users/01chungee10/Github/sparkle-fairy-village-unified-20261013/Builds/WebGL/Build/`, 소스 커밋 `c2f7896`, Unity Player 버전 `0.8.0`, 컴파일 및 BuildWeb 성공.
- 로컬 Chrome WebGL headless 화면 검사: 태희 390×844, 세희 1280×800의 학습 지역 7개(수학·국어·영어·경시·연습·학교·성장), 25문항 시험지, 정원, 선물 가게, UI 간 겹침 없음.
- 실제 Unity 물리 충돌체/레이캐스트 입력: 데스크톱 1280×800의 **건물 화면 좌표 (170,285)** 터치로 영어학교 건물 → `🌿 영어 숲` 학습 지역이 열리는 것을 확인. DOM 지역 버튼과 별개인 3D 콜라이더 입력 시험이다.
- 실제 태희·세희 English 학습 시작 및 자체 제작 연습장 25문항 1→2번 제출 후 중단·이어풀기 통과, 페이지 JavaScript 예외 0건.
- 통합 기록·지급 회귀: `node scripts/check-unified-world.mjs` 통과, KMA/연습 완주 별의 최초 지급·중복 방지 및 형제별 격리, 과거 공용 저장 키 무변경. 전체 `npm run check`의 IRT/보상/채점/카탈로그 검사도 통과.
- 테스트 스크립트: `scripts/unified-village-browser-qa.mjs`, `scripts/unified-village-hotspot-qa.mjs`, `scripts/check-unified-world.mjs`. 결과 파일은 `/Users/01chungee10/AI-Interop/evidence/unified-village-20261013/`에 보존한다.
- GitHub Pages의 배포 완료 여부 및 공개 브라우저 테스트는 **실제 remote main 배포를 확인한 뒤 따로 기록**한다. 이 보고서에 실기기 갤럭시 터치/발열 측정 완료라는 주장은 포함하지 않는다.

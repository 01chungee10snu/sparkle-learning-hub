# 마법 마을 v0.4.0 — 벡수 경시대회 25문항 도전

## 사용자 경험

1. 태희 또는 세희를 선택하고 **마법 마을**에 들어갑니다.
2. 하단 **🏆 벡수 25문제**를 누르거나, 개인 마을의 **수학 정원·부엉이**에게 다가갑니다.
3. **초1~초6 / 중1~중3**, **기본·도전·심화** 중 선택합니다.
4. 선택한 실제 경시대회 시험의 **1~25번**을 건너뛰지 않고 순서대로 풀게 됩니다. 문제·풀이 원본 이미지는 해당 정답 기록과 함께 표시됩니다.
5. 같은 학년·같은 시험지를 다시 선택하면 마지막으로 풀던 문제부터 이어집니다. 다른 시험지로 전환하면 해당 학년의 진행 중 시험지가 새 시험지로 교체됩니다.
6. 25번까지 마치면 정원에 꽃이 피고, **태희는 160별, 세희는 60별**의 경시대회 첫 완주 보너스를 받습니다. 모든 문항의 기본 별은 별도로 계산합니다. **동일 시험지 재완주 보너스는 0별**입니다.

## 데이터 구조

- `games/bebsu-challenges.json`: 학년 9 × 수준 3 × 경시 시험 25문항.
- `scripts/build-bebsu-challenges.mjs`: 원본 출처, 문항 순번 1~25, 기계검증 정답·이미지 존재 여부 확인 후 생성.
- `platform/progress.js`: 25문항 고정 순서·이어 풀기·완주 기록.
- `platform/rewards.js`: 최초 시험지 완주에만 보너스 추가·형제별 분리·기존 별 선물 구매 정합성.
- `village/village-bridge.js`, `village/village-ui.js`: 경시대회 선택·문제 그림·해설 그림·보상 표시.
- `../sparkle-fairy-village/Assets/Art/Generated/Directional/fairies_turnaround_source.png`: 투명 RGBA 8뷰 원화(태희/세희 × 전·후·좌·우). Unity Editor가 분할·직렬화하고 게임 중 이동 방향별 스프라이트를 전환.
- `../sparkle-fairy-village/Assets/Scripts/VillageNpcSpeech.cs`: 근접 말풍선.
- `../sparkle-fairy-village/Assets/Scripts/VillageWorld.cs`: 잔디·자갈길 질감과 수목·화단 추가.

## 검증

- `npm run check`: 기존 학습/성장/문항반응/보상/마을 회귀 검증과 본 기능 25문항 테스트.
- `node scripts/check-bebsu-village.mjs`: 실제 25문항 정답 처리·문제/풀이 원본·중단 후 이어 풀기·최초/반복 보상·태희/세희 프로필 분리·임의 위조 완주 거절.
- `SPARKLE_QA_ORIGIN=http://127.0.0.1:4181 node scripts/bebsu-browser-smoke.mjs`: 실제 Unity WebGL + Chrome 데스크톱 25문항/태희, iPhone 화면 세희 시험지 선택·1문항.
- Unity WebGL v0.4.0 `BuildWeb` 정상 종료, 에디터 프리팹 62개 및 아트 뷰 8개 검증.

## 운영상 주의

- **난이도**는 원본 시험지별 잠정 난이도 파라미터 평균에 따른 상대 추천입니다. 실제 수험자 정답률로 보정한 경시대회 난이도·신뢰도 점수가 아니므로 성취도 판정이나 자동 진급 근거로 사용할 수 없습니다.
- **경시대회 원본 저작권**: 소스 메타데이터에는 `originalLicenseStatus: private_reference_only`가 포함되어 있습니다. 공개 사이트에 원본 문제 그림/해설을 재배포하기 전 권리자 이용허락 범위 확인이 필요합니다. 기술적으로 정상이더라도 저작권 허락이 확인되지 않으면 내부 가족 학습용으로만 운영해야 합니다.
- **보상**은 신뢰된 클라이언트의 로컬 학습 기록으로 계산하므로 서버 방어형 부정행위 방지 시스템은 아닙니다.

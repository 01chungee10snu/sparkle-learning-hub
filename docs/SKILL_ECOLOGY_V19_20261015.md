# 마법마을 Skill Ecology v19 — 2026-10-15

## 목적

문제를 많이 푼 양이 아니라 **며칠 뒤에도 독립적으로 다시 기억한 skill**이 마을의 식물·숲·길로 남도록 한다.

핵심 루프:

`독립 학습 → 7/14/30일 지연회상 → raw skill 증거 → 생태계 군집 파생 → 월드 habitat 성장`

생태계는 학업능력·IQ·발달 단계가 아니다. 어떤 종류의 배움을 오래 기억했는지 보여주는 시각 기록이다.

## 30일 기억

`platform/learning-moments.js`에 `memory-30`을 추가했다.

조건:
- review 목적 회차
- 이전 독립 정답 존재
- 현재 독립 정답
- 같은 회차에서 힌트를 한 번도 사용하지 않음
- 이전 정답과 현재 정답 사이 30일 이상

시각 결과:
- 완료 UI: `기억 수호수가 자랐어요!`
- NPC 관계: owl 등 관련 NPC는 `기억을 지키는 친구` 단계
- 영구 월드: `기억 수호수` 생성
- 일시 연출: 더 큰 30일 기억축제

점수·별·IRT θ·학년 진급은 변경하지 않는다.

## Event sourcing

로컬 키: `sparkle-village-ecology-v1`

저장하는 원자료:
- learner
- subject
- memory tier
- round id
- event timestamp
- 해당 지연회상 문항의 raw IRT skill labels

저장하지 않는 파생값:
- habitat id
- habitat tier
- 수호수 unlock

따라서 skill→habitat 분류 규칙을 향후 수정해도 과거 raw skill 사건을 다시 해석할 수 있다.

## 12개 생태계

### 수학
- 🌻 수의 정원 (`number-garden`) — 수세기·덧셈·뺄셈·곱셈·나눗셈 등
- 💧 측정 물길 (`measure-river`) — 길이·단위·시간·시계·무게·들이
- 🌳 별무늬 숲 (`pattern-grove`) — 규칙·패턴·논리·분류·추론
- ⛰️ 도형 언덕 (`shape-hill`) — 도형·기하·둘레·넓이·각·좌표
- 🍎 비율 과수원 (`ratio-orchard`) — 분수·비율·백분율·소수

### 국어
- 🌸 말꽃 정원 (`word-flower`) — 낱말·음절·소리·글자
- 📚 이야기 숲 (`story-library`) — 문장·이야기·독해·추론
- 🪧 안내 길 (`guide-path`) — 안내·절차·순서·위치·조건

### 영어
- 🐦 소리새 숲 (`soundbird-forest`) — CVC·phonics·첫소리·단어 읽기
- 🎧 듣기 초원 (`listening-meadow`) — 듣기·행동 지시
- 🌙 문장 달빛숲 (`sentence-moon`) — 문장·표현·문맥·응답
- 🧭 순서 탐험길 (`sequence-trail`) — 순서·위치·준비물·조건 기억

모든 4,828 IRT item의 skill이 동일 과목의 12개 habitat 중 하나에 매핑되는지 자동 검증한다.

## 한 회차 집계 규칙

동일 review 회차에서 `덧셈`, `뺄셈`, `수의 합`처럼 여러 skill이 모두 `수의 정원`으로 매핑되더라도 생태계 성장 사건은 **한 회차당 한 번**만 증가한다.

원래 skill 목록은 모두 보존한다.

## 3D 월드

활성 habitat은 외곽의 고정 구역에 기존 프로젝트 원화로 나타난다.

7일 기억:
- 작은 대표 원화

14일 기억:
- 대표 원화 확대
- 나비 추가

30일 기억:
- 더 큰 대표 원화
- 나비 + 무지개별
- 별도 `기억 수호수` 영구 생성

사용 원화는 tree / flower / pond / stepping stones / picnic basket / house library / signpost / butterfly / moon house / bridge / rainbow star 등 기존 project asset뿐이다.

habitat은 시각 전용이며 충돌체나 학습 난이도를 바꾸지 않는다.

생태계 signature가 동일하면 Unity 원화를 다시 생성하지 않아 bridge 응답마다 발생할 수 있는 flicker/불필요한 재생성을 차단한다.

## 아이 UI

`더 놀기 → 🌿 배움 생태계`

각 habitat은 다음 네 상태만 정성적으로 보여준다.
- 아직 씨앗을 기다리는 중
- 7일 기억 · 새싹이 남음
- 14일 기억 · 환하게 자람
- 30일 기억 · 깊게 뿌리내림

활성 habitat에는 실제 raw skill 예시 1~2개를 함께 보여준다.

## 보호자 대시보드

보호자는 활성 habitat, 최고 지연회상 tier, 해당 raw skill 근거, 30일 기억 수호수 정착 여부를 확인한다.

형제 간 생태계 순위나 점수 비교는 제공하지 않는다.

## 가족 광장

개인 마을의 ecology event는 learner별로 분리한다.
가족 광장의 ecology world만 태희·세희의 검증된 ecology event를 union하여 파생한다.

## Cloud schema

migration:
`db/migrations/202610150004_skill_ecology_memory30.sql`

- 기존 relationship memory tier에 `memory-30` 추가
- `magic_ecology_events` 추가
- raw skills JSONB 저장
- habitat 분류·수호수 unlock은 서버에 고정 저장하지 않음

## 검증

- 30일 learning moment unit test PASS
- relationship memory-30 / guardian relationship PASS
- 4,828 IRT items ecology mapping PASS
- 동일 habitat의 복수 skill 한 회차 중복 집계 차단 PASS
- 35일 지연 독립회상 end-to-end PASS
  - `memory-30`
  - `number-garden`
  - `measure-river`
  - guardian relationship
  - 기억 수호수
- Unity audit: `skill_ecology=true memory30=true` PASS
- 3D persistent habitat/guardian render QA PASS
- 기존 55 games / 4,828 items 회귀 PASS

소프트웨어 WebGL의 pixel diff와 load time은 기능 검증값이며 실제 모바일 성능 지표로 사용하지 않는다.

## 최종 빌드·QA 결과

- WebGL product version: `0.15.0-ecology-v19`
- Unity build: PASS
- compressed data: 15,989,720 bytes
- compressed wasm: 6,012,368 bytes
- Unity audit: `skill_ecology=true memory30=true` PASS
- 35일 지연 독립회상 end-to-end: PASS
  - memory-30
  - number-garden
  - measure-river
  - guardian relationship
  - 기억 수호수
- 3D persistent habitat diff: 0.093
- 30일 celebration diff: 0.298
- 4,828 IRT items ecology mapping: PASS
- 전체 55 games / 4,828 items 회귀: PASS
- Unity viewport 390×844 / 320×568 / 768×1024 / 844×390: PASS
- software WebGL load-time QA: 약 10.5초

pixel diff와 load time은 소프트웨어 WebGL 검증값이며 실제 모바일 GPU 성능값으로 사용하지 않는다.

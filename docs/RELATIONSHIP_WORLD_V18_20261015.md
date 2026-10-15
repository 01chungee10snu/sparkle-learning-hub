# 마법마을 관계 기억 v18 — 2026-10-15

## 목적

NPC가 학습자를 '평가'하는 것이 아니라 이전 만남과 검증된 장기기억 사건을 기억하는 세계를 만든다.

핵심 루프:

`만남 → 학습 → 지연회상 → NPC가 기억함 → 관계 대사 변화 → 희귀 주민 정착`

## 데이터 분리

- IRT: 무엇을 얼마나 어렵게 출제할지
- Memory model: 언제 다시 꺼낼지
- Relationship events: 어떤 친구를 만났고 어떤 장기기억 사건을 함께 보았는지
- Village residents: 관계 사건에서 파생되는 시각적 세계 상태

관계 레벨은 IRT, 학업 능력, IQ, 발달 판정에 사용하지 않는다.

## 이벤트 소싱

로컬 키: `sparkle-village-relationships-v1`

저장하는 원사건:
- `visit`: NPC별 하루 1회만 저장
- `memory`: 검증된 `memory-7` / `memory-14` 회차만 저장

저장하지 않는 파생값:
- familiar/friend/special 등 관계 레벨
- 개인화 대사
- 희귀 주민 unlock boolean

이 값들은 이벤트로부터 매번 재계산한다.

## NPC 관계

현재 안정 ID:
- bunny
- cat
- squirrel
- owl
- tutor

관계 단계:
- new: 아직 검증된 만남 없음
- familiar: 1일 이상 만남
- friend: 4일 이상 만남 또는 7일 기억 사건
- special: 14일 기억 사건

과목별 장기기억을 대표적으로 기억하는 NPC:
- math → owl
- korean → bunny
- english → cat
- 기타 → squirrel

대사는 호스트 JS에서 결정하고 Unity는 표시만 한다.

## 실제 Unity 근접 방문

`VillageNpcSpeech`가 학습자가 가장 가까운 NPC 범위에 처음 진입할 때 비차단 `NPC_VISIT`을 전송한다.

- 학습 문제 요청 큐와 경쟁하지 않음
- 같은 NPC는 한 월드 인스턴스에서 1회만 전송
- 호스트 상태에서 다시 하루 1회로 idempotent 처리
- 답안/IRT/별/보상 원장을 수정하지 않음

## 희귀 주민

개인 마을:
- 7일+ 지연 독립회상 → `기억나비 주민` 영구 정착
- 14일+ 지연 독립회상 → `별빛 기억 부엉이 주민` 영구 정착

가족 광장:
- 태희·세희의 검증된 기억 사건을 합쳐 희귀 주민만 공동 표시
- NPC 친밀도와 개인 대사는 각 아이별로 계속 분리

희귀 주민은 기존 butterfly / npc_owl / star 원화를 재사용한다.

## 마을 친구들 UI

`더 놀기 → 💞 마을 친구들`

아이 화면에는 숫자 관계 점수를 표시하지 않는다.
다음만 표시한다:
- 처음 만나는 사이
- 익숙한 사이
- 친구
- 특별한 친구
- 현재 개인화 대사
- 기억나비/별빛 기억 부엉이 정착 여부

## 보호자 대시보드

보호자는 관계의 근거를 볼 수 있다.

- 만남 일수
- 7일 기억 사건 수
- 14일 기억 사건 수
- 정착 희귀 주민

형제 간 순위나 비교 점수는 제공하지 않는다.

## 복구

`INIT` 및 `RELATIONSHIP_OPEN` 시 완료된 review 회차를 다시 확인한다.
학습 기록에는 장기기억 근거가 있으나 관계 이벤트가 누락됐다면 자동으로 재구성한다.

## Cloud schema

migration:
`db/migrations/202610150003_relationship_events.sql`

테이블 `magic_relationship_events`에는 원사건만 저장한다.
파생 relationship level은 DB에 고정하지 않는다.

## QA

- relationship state unit test PASS
- 하루 중복 visit 차단 PASS
- 태희/세희 관계 분리 PASS
- 가족 광장 희귀 주민 union PASS
- browser friend UI PASS
- memory-14 → owl special + memoryButterfly + starlightOwl PASS
- 실제 Unity proximity → bunny visit 저장 PASS
- fresh 3D load → 희귀 주민 복원 pixel diff 3.429 PASS
- 보호자 대시보드 관계 섹션 mobile/desktop PASS
- 전체 55 games / 4,828 items 회귀 PASS
- Unity 390×844 / 320×568 / 768×1024 / 844×390 PASS

소프트웨어 WebGL QA는 기능 검증용이며 실제 기기 GPU 성능 수치로 해석하지 않는다.

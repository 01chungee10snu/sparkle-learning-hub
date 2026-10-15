# 마법마을 살아있는 월드 v17 — 2026-10-15

## 목적

v16의 캐릭터 반응 원화·모션을 마을 전체로 확장한다.

핵심 목표:
1. NPC마다 다른 행동 리듬을 부여한다.
2. 큰 나무·꽃·나비·분수·풍선에 환경 모션을 추가한다.
3. 장기 기억의 독립 회상 성공을 희귀 월드 이벤트로 축하한다.
4. reduced-motion 설정이 HTML뿐 아니라 실제 Unity 전체에 적용되도록 한다.

## NPC 행동

`VillageLivingFriend`는 이름/종류에 따라 deterministic profile을 사용한다.

- Bunny: 가까이 오면 통통 뛰며 살짝 접근
- Cat: 가까이 오면 일정 거리에서 잠깐 따라옴
- Squirrel: 짧고 빠른 이동
- Owl: 좁은 범위의 느린 순찰과 긴 정지
- Tutor/Bebsu: 제자리 중심의 작은 반응
- Generic: 완만한 산책

NPC는 학습·보상 상태를 쓰지 않는다. 이동은 기존 `IsWalkable()` 범위만 사용한다.

## 환경 모션

`VillageAmbientMotion`은 성능을 위해 큰 주요 장식에만 부착한다.

- Tree: 느린 sway
- Large flower bed: 작은 sway
- Butterfly: hover + 작은 궤도
- Fountain: 미세 pulse
- Balloon: vertical float

155개의 작은 filler 꽃·잔디에는 컴포넌트를 붙이지 않는다.

## 기억 희귀 이벤트

### 판정

`platform/learning-moments.js`

희귀 이벤트가 되려면:

1. 완료 회차의 `purpose === review`
2. 현재 정답이 독립 시도
3. 같은 회차에서 해당 문항에 힌트를 한 번도 사용하지 않음
4. 이전 독립 정답이 존재
5. 이전 정답과 현재 정답 사이 실제 지연이 7일 이상

이벤트:
- `memory-7`: 7일 이상 → 기억나비
- `memory-14`: 14일 이상 → 별빛 기억축제

여러 문항이 해당되면 가장 긴 지연을 기준으로 이벤트 등급을 선택하고, 해당 문항 수를 표시한다.

중복 `COMPLETE_WORLD`는 `gardenAdded=false`이므로 희귀 이벤트를 다시 재생하지 않는다.

### 월드 연출

`VillageMemoryMoment`

- 기존 butterfly / star / bloom / heart / magic_dust 원화 재사용
- 캐릭터 주변에 높은 sorting order로 표시
- 7일: 기억나비 중심
- 14일: 별·꽃·나비·하트가 더 큰 반경으로 나타나는 별빛 기억축제
- 수초 뒤 자동 제거
- 점수·별·진급을 변경하지 않음

### 완료 UI

완료 패널에도 동일한 evidence를 표시한다.

예:
`14일 이상 지난 내용을 힌트 없이 다시 기억했어요. 5개의 기억이 오래 남아 있어요.`

## reduced-motion

기존 HTML의 `MOTION_LOW / MOTION_FULL` 명령을 Unity가 실제 처리하도록 연결했다.

Reduced motion ON:
- 캐릭터 bob/afterimage/sparkle 정지
- NPC 순찰 최소화 및 home 복귀
- 환경 sway/hover 정지
- 기억 이벤트는 정적인 배치로만 표시
- 학습 기능·원화 교체·정보는 그대로 유지

## QA

- Unity Major Patch Audit: ambient_motion / reduced_motion / memory_moments PASS
- `check-learning-moments.mjs`: 7일/14일 판정, assisted disqualification PASS
- `memory-moment-browser-qa.mjs`: 16일 지연 독립회상 5문항 → 별빛 기억축제 UI PASS
- `world-v17-browser-qa.mjs`: 환경 모션 ON/OFF pixel-diff 및 기억 이벤트 렌더 QA
- 기존 전체 55 games / 4,828 items 회귀 유지

## 최종 검증 결과

- WebGL product version: `0.13.0-world-v17`
- Unity build: PASS
- compressed data: 15,992,899 bytes
- compressed wasm: 6,012,994 bytes
- 전체 회귀: 55 games / 4,828 items PASS
- 16일 전 독립 정답 5문항을 review로 재인출: `memory-14` PASS
- 완료 UI 별빛 기억축제: PASS
- 환경 모션 pixel diff: 3.588
- reduced-motion pixel diff: 0.887
  - 약 75% 감소
- memory-7 world render diff: 0.701
- memory-14 world render diff: 0.663
- 실제 Unity WebGL viewport:
  - 390×844 PASS
  - 320×568 PASS
  - 768×1024 PASS
  - 844×390 PASS

WebGL QA의 load time과 pixel diff는 소프트웨어 렌더링 환경 검증값이며 실제 모바일 GPU 성능지표로 사용하지 않는다.

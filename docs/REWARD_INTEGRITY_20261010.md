# 보상·마을 기록 품질 검증 — 2026-10-10

기존 학습점수·선물 가격·48종 선물·형제별 장부를 유지하면서, 저장 실패와 백업 복원·회차 식별의 오류 경로를 수정했다. 결과는 코드와 회귀검증 범위에 한정하며 실제 아동 학습 효과 향상을 실증한 것으로 해석하지 않는다.

## 현재 파일 — 원본을 제자리 수정

- /Users/01chungee10/Github/sparkle-learning-hub/platform/rewards.js — 수정/current
- /Users/01chungee10/Github/sparkle-learning-hub/village/village-state.js — 수정/current
- /Users/01chungee10/Github/sparkle-learning-hub/scripts/check-rewards.mjs — 수정/current
- /Users/01chungee10/Github/sparkle-learning-hub/scripts/check-reward-integrity.mjs — 신규/verification
- /Users/01chungee10/Github/sparkle-learning-hub/docs/REWARD_INTEGRITY_20261010.md — 신규/verification report

## 수정 내용

| 확인한 경로 | 현재 처리 |
|---|---|
| 구매 저장이 실패해도 화면상 구매 성공 | 최신 영속 장부와 합친 예산을 검증하고 저장 완료 후 소유권 확정. 실패 시 기존 지갑 유지 |
| 다른 탭에서 서로 다른 선물을 고른 뒤 합친 장부가 별 잔액을 초과 | 최종 병합 시 두 아이의 지출·누적별 확인, 예산 초과 거절 |
| 구매 실패 뒤 읽기만 성공해 저장 경고가 사라짐 | 읽기 성공과 쓰기 실패 상태를 구분. 쓰기 성공까지 실패 상태 유지 |
| 놀이 목록 미설정 상태의 백업 검사 생략 | 보상 백업 가져오기 전 놀이 목록 필수 |
| 실제 진행·답안이 없는 문항의 노력 이벤트 | 현재 진행 문항 또는 해당 아이의 실제 답안 필요. 다시 연습은 기존 답안 필수 |
| 백업의 가짜 완료 회차·시간 | 실제 보존 회차의 시간과 대조, 고유 보상 회차 수는 실제 완료 횟수 이내 |
| 다른 놀이의 동일 회차 ID | game+round 식별. 이전 session ID는 중복 지급 없이 유지 |
| 보상 key 삭제 뒤 이전 메모리 구매기록 부활 | 영속 key가 없어지면 최신 빈 장부 사용 |
| 완료 전 새 가족활동 신청 백업 | 연속 신청 순서와 이전 활동 완료 시각을 검사 |
| 마을 event ID의 underscore 연결 충돌·긴 ID가 정리 과정에서 사라짐 | 길이 접두어 tuple key와 긴 내부 event key 사용, 기존 실게임 회차 중복 방지 |
| 개인기록 없이 가족꽃만 생기는 백업 | 가족광장은 두 아이의 개인 완료 기록에서 산출 |
| 마을 저장 실패 후 오래된 기록 재로딩·다른 아이 기록 덮어쓰기 | 저장되지 않은 메모리 유지, 복구 저장 시 기존 영속 기록과 병합. 저장소가 없으면 실패 표시 |
| 회차마다 전체 노력 이벤트 재탐색 | session Set·retry Map으로 중첩 전체스캔 축소 |

## 기존 보상 정책

- 학습별은 문항별 최고 점수 증가량만 누적한다.
- 노력별은 문항당 평생 최대 2개, 완료 회차는 한국시간 하루 최대 3개다.
- 실제 다시 연습한 증거는 적립 상한 이후에도 배지 증거로 유지한다.
- 장식은 영구 소유·무료 재장착, 종류별 하나를 선택한다.
- 가족활동은 보호자와 의논하는 요청이며 실제 함께한 뒤 보호자가 완료한다.
- 별을 쓰거나 장식을 바꿔도 기존 학습점수와 단계 증거를 덮어쓰지 않는다.
- 연속출석 실패 벌점·순위 경쟁·무작위 확률 보상을 추가하지 않았다.

## 검증

모두 실제 progress 전환·영속 장부·실패주입을 사용하는 회귀검증이며 통과했다.

~~~bash
cd /Users/01chungee10/Github/sparkle-learning-hub
node scripts/check-rewards.mjs
node scripts/check-reward-integrity.mjs
node scripts/check-village.mjs
git diff --check -- platform/rewards.js village/village-state.js scripts/check-rewards.mjs
~~~

검증한 동작: 기존 단위정원 점수 보존, 아이별 격리, 실제 응답 증거, 노력 적립 상한, 중복 탭 제출, 잔액 부족, 구매 쓰기 실패 원자성·복구, 최신 장부 병합 예산, 오래된 백업 병합, 가족완료 순서, 48종·5슬롯 착용, 게임별 같은 회차 ID, 잘못된 백업의 무변경 거절, 긴·충돌 마을 key, 개인·가족꽃, 저장복구.

## 검증 한계·가정

- 저장 장부는 기기·브라우저 로컬이다. 사용자가 직접 개발자 도구로 임의 조작한 데이터를 서버에서 인증하는 모델은 아니다.
- localStorage 동기 API는 서로 다른 탭의 완전히 동시에 발생한 읽기·쓰기 전체를 ACID 트랜잭션으로 잠그지 못한다. 검증은 최종 저장 직전에 관측된 최신 장부의 병합·예산 거절과 순차 중복 방지다.
- progress가 놀이별 완료 영수증을 최근 100개까지만 보존하므로, 오래된 정상 보상 백업은 고유 회차 수≤완료 횟수 조건을 사용한다. 보존된 회차는 정확한 시각까지 대조한다.
- 힌트 UI 클릭과 gradeResponse 후 다시 연습 호출은 앱 계약을 전제로 한다. rewards는 실제 진행·답안 존재를 검사하지만 다시 연습 답안의 재채점 자체는 app/activities가 맡는다.
- 학습 효과는 아동의 실제 복습·전이 관찰로 확인해야 한다. 이 검증은 장부와 게임 흐름의 동작 검증이다.
- Unity 시각 렌더·WebGL 빌드·반응형 UI 검증은 별도 담당 범위다.

## 읽은 원본/현재 소스 — 수정하지 않은 파일

- /Users/01chungee10/Github/sparkle-learning-hub/platform/reward-catalog.js
- /Users/01chungee10/Github/sparkle-learning-hub/platform/progress.js — 기존 IRT 작업자의 변경 보존
- /Users/01chungee10/Github/sparkle-learning-hub/app.js — 실제 hint/retry/purchase 호출 검토
- /Users/01chungee10/Github/sparkle-learning-hub/platform/activity-ui.js — 관련 호출 검색
- /Users/01chungee10/Github/sparkle-learning-hub/village/village-bridge.js
- /Users/01chungee10/Github/sparkle-learning-hub/scripts/check-village.mjs
- /Users/01chungee10/Github/sparkle-learning-hub/package.json

## 변경 전 사본 — 소스와 1:1 대응

- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/rewards-backup/rewards.js
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/rewards-backup/village-state.js
- /Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/rewards-backup/check-rewards.mjs

## 관련 경로

~~~text
/Users/01chungee10/Github/sparkle-learning-hub/
  platform/rewards.js
  platform/reward-catalog.js
  village/village-state.js
  scripts/check-rewards.mjs
  scripts/check-reward-integrity.mjs
  docs/REWARD_INTEGRITY_20261010.md
/Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/
  rewards-backup/rewards.js
  rewards-backup/village-state.js
  rewards-backup/check-rewards.mjs
~~~

## 검증 시점 SHA-256

~~~text
fe49083c4212805fe95938ab6dbcb9b22a4f5c923978cd7dde638fdef50487b8  platform/rewards.js
f1b8684dbb2ddcbfd9c1b9949cbcdd5cd09ec5804478df53ceaa0d2045ca1b71  village/village-state.js
b35c30349f66d2c613498f947ba4c76e8736f12a74c0c9272f261e100f11d0f1  scripts/check-rewards.mjs
0524408281bd5f09cfac279dcbd5ee88de9a57bc3b8bcf99263c714fb6e2b5d0  scripts/check-reward-integrity.mjs
~~~

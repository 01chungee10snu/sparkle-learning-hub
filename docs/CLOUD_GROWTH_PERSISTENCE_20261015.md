# 마법 마을 클라우드 성장·육성 데이터 설계 — 2026-10-15

## 결론

기기 변경에도 학습·육성 기록을 이어가기 위해 **localStorage를 즉시 반응용 캐시로 유지하고, Supabase/PostgreSQL을 영구 기록의 기준 저장소로 추가**한다.

DBeaver는 이 PostgreSQL을 조회·관리·백업하는 운영 도구로 사용한다. DBeaver 자체가 온라인 데이터베이스를 제공하는 것은 아니다.

## 인증 역할 분리

- **DBeaver Academic**: 대학 이메일로 학생/교원 자격을 검증해 Enterprise Academic license를 받을 수 있다. 개인 학술·교육 용도에만 사용한다.
- **마법 마을 사용자 인증**: 아이에게 서울대 계정을 노출하지 않는다. 부모 계정이 family owner가 되고 태희/세희는 family 내부 learner profile로 둔다.
- **DB 관리자 접속**: DBeaver에서 Supabase의 PostgreSQL session pooler 또는 direct connection을 사용한다. DB password는 브라우저 코드나 GitHub 저장소에 절대 넣지 않는다.
- **앱 런타임 접속**: Supabase Auth + Data API/RLS 또는 Edge Function을 사용한다.

## offline-first 원칙

1. 답안 제출과 마을 이벤트는 먼저 기기 로컬에 성공적으로 기록한다.
2. 각 attempt/round/village/reward event는 안정적인 event_id를 사용해 재전송해도 중복되지 않게 한다.
3. 네트워크가 복구되면 outbox를 서버에 재전송한다.
4. 서버 데이터와 로컬 데이터를 합칠 때:
   - attempt/event: ID 기준 집합 합치기
   - stage/growth goal/equipment: updated_at이 최신인 값
   - completed round: (learner, game_id, round_id) 기준 유일
   - village completion: event_id 기준 단조 증가
   - 보상 구매: 서버 원장 검증 후 반영
5. 기기 변경 시 로그인 후 서버 상태를 먼저 받아 현재 localStorage merge API에 넣고 이후부터 양방향 동기화한다.

## 테이블

Migration: `db/migrations/202610150001_cloud_growth_core.sql`

핵심 테이블:
- `magic_families`, `magic_family_members`
- `magic_learners`
- `magic_devices`
- `magic_stage_state`
- `magic_learning_attempts`
- `magic_round_receipts`
- `magic_village_events`
- `magic_reward_events`
- `magic_growth_goals`
- `magic_device_snapshots`

`magic_device_snapshots`은 정상화 테이블과 별개로 복구용 전체 스냅샷을 보존한다. 운영 중 실수나 클라이언트 버그로 일부 상태가 손상되어도 이전 snapshot으로 검증할 수 있다.

## DBeaver 연결

Supabase 프로젝트 생성 후 Dashboard > Connect에서 실제 값을 복사한다.

- Driver: PostgreSQL
- 권장: Session pooler, port 5432
- SSL: Supabase가 제공하는 인증서 사용
- username/host/password를 Dashboard의 Connect 화면에서 그대로 사용

Direct connection 주소를 프로젝트 ref로 추정해서 만들지 않는다. 특히 pooler host는 Dashboard에서 복사해야 한다.

## 성장 UI 원칙

`platform/progression.js`의 “마을 성장 레벨”은 **게임 진행 지표**다. 학습 능력, IQ, 발달 단계 또는 학교 성취도의 판정값이 아니다.

점수에는 확인된 풀이·완료 회차·정원 성장·성취 배지가 반영되며, IRT 능력 추정과 분리한다. IRT는 문항 선택과 학습 추천에만 사용한다.

사용자가 고르는 육성 목표(균형/수학/국어/영어/정원)는 게임 경험의 강조점이며, 학습 추천을 임의로 왜곡하거나 자동 승급시키지 않는다.

## 다음 연결 게이트

1. Supabase 새 프로젝트 생성 또는 안정적으로 유지할 PostgreSQL 호스트 결정
2. migration 적용
3. 부모 인증 후 `bootstrap_magic_family()` RPC로 family + 태희/세희 learner를 원자 생성
4. local outbox + server ingest RPC/Edge Function
5. 현재 `Progress.importRecords`, `Rewards.importRewards`, `VillageState.mergeVillage`, `Progression.importGoals`를 이용한 최초 cloud merge
6. 멀티 디바이스 충돌·재시도·오프라인 복귀 QA

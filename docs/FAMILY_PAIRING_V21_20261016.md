# Magic Village Family Pairing v21 — 2026-10-16

## 목적

우리 가족만 사용하는 마법마을에서 부모 이메일 계정·비밀번호·확인메일을 제거하고, **가족 동기화 코드를 기기마다 최초 1회 입력**하는 방식으로 멀티디바이스 동기화를 단순화한다.

## 핵심 UX

기존:
- 부모 이메일 입력
- 비밀번호 입력
- 계정 생성
- 이메일 확인
- 로그인

v21:
- 가족 동기화 코드 1회 입력
- `이 기기 연결`
- 이후 자동 동기화

연결된 기기에서는:
- 마지막 동기화 시각
- `지금 동기화`
- `기기 연결 해제`

만 표시한다.

## 가족 동기화 코드

- 고엔트로피 random code
- 앱 소스/Git에 포함하지 않음
- 서버에는 SHA-256 hash만 저장
- 원문은 현재 Mac의 사용자 전용 파일에만 저장
- 파일 권한: 0600

로컬 위치:
`~/Library/Application Support/MagicVillage/family-sync-code.txt`

새 기기에서는 이 코드를 한 번 입력하면 된다.

## 실제 서버 상태

Supabase:
- project: `magic-village-family-v17`
- region: Seoul
- migration 001~006 실제 적용 완료
- family row: 1
- learner rows: 2
- pairing hash rows: 1

v21 migration:
`20261016000600_family_pairing_mode.sql`

## 서버 보안 구조

public API에는 SECURITY INVOKER wrapper만 둔다.

- `public.magic_family_pair()`
- `public.magic_family_pull()`
- `public.magic_family_push()`

실제 privileged 로직은 PostgREST exposed schema가 아닌 `magic_private`에 둔다.

- `magic_private.family_for_pairing_code()`
- `magic_private.magic_family_pair()`
- `magic_private.magic_family_pull()`
- `magic_private.magic_family_push()`

pairing code는 `extensions.digest(code,'sha256')`와 서버의 hash를 비교한다.
원문 code는 DB에 저장하지 않는다.

## 계정/Auth 제거

v21 클라이언트 동기화 코드에는 다음이 없다.

- signUp
- signIn
- signOut
- access token
- refresh token
- email/password storage

Supabase Auth는 기존 DB 인프라에 남아 있을 수 있지만 마법마을 가족 동기화 UX에서는 사용하지 않는다.

## 동기화

1. pairing code 검증
2. device key 등록/갱신
3. 가족의 각 기기 최신 snapshot pull
4. 기존 로컬 merge API로 모두 합침
5. snapshot SHA-256 계산
6. 새 내용일 때만 push
7. 4초 debounce auto-sync

학습 기록, 보상, 마을, 관계, Skill Ecology 모두 snapshot에 포함된다.
pairing code 자체는 snapshot에 포함하지 않는다.

## 기기 연결 해제

`기기 연결 해제`는 다음만 삭제한다.

- local pairing code
- cloud connection state

삭제하지 않는 것:
- 학습 attempt
- 복습 기록
- 보상
- 마을 성장
- NPC 관계
- Skill Ecology

따라서 연결 해제 후에도 현재 기기에서 학습은 그대로 계속된다.

## 실제 원격 검증

- migration 001~006 local/remote 일치
- public pair/pull/push = SECURITY INVOKER
- private pair/pull/push = SECURITY DEFINER
- 실제 family = 1
- learner = 2
- pairing hash = 1
- 잘못된 family code pair 요청 = HTTP 400
- Supabase Security Advisor = `No issues found`

실제 pairing code 원문을 자동화 도구로 다시 읽어 원격 호출하는 단계는 안전 검사에서 차단되어 우회하지 않았다. 대신 서버 migration/RPC/security와 클라이언트 pairing transport를 독립적으로 검증했다.

## 2-device QA

Supabase transport를 deterministic mock으로 대체하고 실제 앱 `cloud-sync.js`를 사용했다.

시나리오:
1. 잘못된 코드 → pairing 거부
2. Device A → family pair
3. A의 실제 학습 attempt + bunny 관계 + 30일 ecology upload
4. Device B → 동일 family code로 pair
5. B가 A의 학습/관계/ecology 다운로드
6. B → cat 관계 추가 후 upload
7. A → B branch merge
8. A → squirrel 관계 추가
9. QA에서 250ms debounce auto-sync 확인
10. village 직접 진입에서도 pairing 유지
11. unpair 후 local 학습/관계 데이터 보존

결과:
- learning attempt merged = PASS
- bunny/cat relationship merged = PASS
- guardian tree preserved = PASS
- debounced auto-sync = PASS
- pairing code in snapshot = false
- auth login required = false
- local data survives unpair = true

## 운영 원칙

가족용 앱이지만 인터넷에 배포되는 정적 웹이므로 publishable key만으로 DB를 열지 않는다.
로그인은 없애되 **고엔트로피 가족 pairing code**를 최소 보안 경계로 유지한다.

새 기기 연결은 매우 드문 작업이므로 매 접속 로그인보다 UX 비용이 훨씬 낮다.

## 최종 QA 결과

- Supabase migration 001~006 local/remote 일치
- 실제 family rows: 1
- learner rows: 2
- pairing hash rows: 1
- invalid family code 실제 원격 RPC: HTTP 400
- Supabase Security Advisor: No issues found
- 2-device family pairing QA: PASS
- 실제 learning attempt merge: PASS
- relationship/ecology merge: PASS
- debounced auto-sync: PASS
- pairing code snapshot 포함: false
- auth login required: false
- unpair 후 local data 보존: PASS
- Parent dashboard 390×844 / 1440×900: PASS
- 전체 55 games / 4,828 items 회귀: PASS
- Unity WebGL 390×844 / 320×568 / 768×1024 / 844×390: PASS
- software WebGL load-time QA: 약 7.7초

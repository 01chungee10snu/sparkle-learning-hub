# Magic Village V12 — 전 문항 IRT 출제 통합 검증

## 범위·출처

- 2026-10-14 기준 발행된 퀴즈 **55개 게임, 4,876문항 전체(100%)**: 수학 4,596, 국어 116, 영어 116.
- 출처 `games/catalog.json` SHA-256 `596b7b724d7e83e2e9a17a01b5dfab32242ce38c4fa5ad8202ff8997d6b3eecd`.
- 문항 색인 `games/irt-bank.json` SHA-256 `c88f8b60bd4e01815313772da6a8223e66b71070fa125ef9e5a95dc179bd6b58`. 원문 ID·정답·그림·풀이 수정 없음.
- 별도 외부 앱(unit garden) 48문항은 동일 원문 48개가 unit-garden 내부 퀴즈로 통합되어 IRT 색인에 포함된다. 기존 원장은 읽기 전용으로 유지한다.

## 출제 경로

| 경로 | 호출 | V12 새 회차 | 진행 중인 구 회차 |
|---|---|---|---|
| 일반 수학/국어/영어 및 direct 문제 페이지 | `app.js → Progress.beginRound` | 3/5개 IRT | 보존 |
| 성장/적응 모험 | `Progress.beginRound` + 단계별 pool | 단계 제한 내 IRT | 보존 |
| 마법마을 지역별 문제 | `village-bridge START` | 3/5개 IRT | 보존 |
| KMA 기출 | `village-bridge START({paperId})` | 원문 시험지의 정확한 25개 ID를 IRT 순서로 제시 | 원본 1~25 순서 보존 |
| 마법 연습장 25문항 | `village-bridge START({paperId})` | 시험지별 정확한 25개 ID를 IRT 순서로 제시 | 원본 1~25 순서 보존 |

새 회차 `irtVersion:2`; 과거 회차에는 이 마커가 없어 저장된 순서가 유지된다. 완료 회차도 해당 마커와 시험지 문항 ID의 집합을 보존한다. 원본 시험지 문항번호는 `provenance.examQuestionNo` 필드로 구분한다. 화면의 출제 순번은 회차 index+1이다.

각 정답 제출 시 최초 독립 답안만 기록하고, 힌트 받은 첫 답·재시도·시간·별 보상은 능력 추정에서 제외한다. `nextQuestion(id,game)`를 호출하면 다음 문항을 제시하기 직전에 아직 답하지 않은 문항의 순서를 최신 추정에 따라 재선택한다. `nextQuestion(id)`만 사용하는 과거 호출자는 회차 시작 시 이미 선정된 IRT 순서를 이어 간다. UI 호출자는 두 번째 인자로 실제 로드된 게임 객체를 전달해야 문항별 갱신이 활성화된다.

## 출제 정책

- 잠정 Bayesian 1PL 스타일, 정답 확률 `c+(1-c)×logistic(theta-b)`; `a=1` 고정, 선택형 `c=1/보기수`. 경험적으로 보정된 IRT/3PL이 아님.
- `b`는 학년·단계·원문 번호·저자 메타데이터에서 생성한 editorial anchor다. `a,b,c` 어떤 것도 실증 calibration으로 표시하지 않는다.
- 정답 가능성 목표 0.61~0.84를 순환 배치하고 동일 skill 과다출제를 벌점화한다. 최초 데이터가 없는 냉시작은 단계별 사전 평균을 사용하며, 사용하지 않은 문항을 먼저 선택한다. 진단정보·불확실성은 보호자 참고용이며 학년 자동변경에 사용하지 않는다.
- 누락된 IRT 색인에 대해 임의 셔플하는 우회 경로는 제거했다. 색인이 없으면 신규 회차는 명시적 오류로 막고 기존 진행 회차는 재개를 허용한다.
- 25문항 시험지의 보너스는 원본 문항 ID 집합·시험지 ID·25개 고유성·진짜 저장 완료 회차를 근거로 산정한다. 문항 제시 순서 자체는 보상 자격에 영향을 주지 않는다.

## 검사

```sh
node scripts/build-irt-bank.mjs --verify
node scripts/check-irt.mjs
node scripts/check-irt-v12.mjs
```

2026-10-14 직접 실행 PASS: 4,876/4,876 색인, 선택/능력 업데이트, KMA 25/25, 연습장 25/25, 응답 직후 남은 문항 재정렬, 힌트 제외, 형제별 분리, 구 회차 순서 보존, 중복/24문항/오류 시험지 보너스 거부. 최신 합성 low/high/cold posterior는 유한값 검사. 테스트 프로필은 합성이며 실제 아동 기록을 읽거나 변경하지 않았다.

**알려진 회귀 격차:** 과거 별도 보상 테스트 `scripts/check-rewards.mjs`는 IRT 색인이 없는 임의 synthetic catalog로 `beginRound`를 호출한다. 따라서 엄격한 전 문항 IRT 필수 조건에서 기존 fixtures가 실패한다. 해당 테스트를 새 인터페이스에 맞춰 synthetic bank를 구성해야 한다. 외부 앱 직결 48문항과 보상 KMA 원본의 동일 시험지 근거는 추가 검증이 필요하다. 인증/외부 공개/프로덕션 검증은 수행하지 않았다.

## V12 최종 회귀 갱신

- 실제 공개 퀴즈 55개, 문항 4,876개 전수 색인(100%).
- 신규 unit-garden 48문항의 기존 원장과 새 별 기록은 문항 ID별 최대치로 합산하며 추가 지급은 차액만 계산.
- KMA 보너스는 각 원본 게임의 provenance에서 추출한 동일 시험지 25문항의 정확한 집합으로 검증.
- `npm run check`, `node scripts/check-irt-v12.mjs`, `node scripts/check-unit-garden-migration-v12.mjs` PASS.
- 위 이전 회귀 격차 언급은 검증 완료 이전 시점의 기록이며 현재 최종 검사에서 해소되었다.

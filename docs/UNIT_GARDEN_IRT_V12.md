# 단위 정원 48문항의 내부 IRT 이관

## 원문과 출처

원본 프로젝트: `/Users/01chungee10/GitHub/fairy-math-garden/`.
원본 `questions.js`의 보고된 커밋은 `9774bd198648f10ac8d73b704288505ebb880d53`, SHA-256은 `4428fdba23ac18c6e4eecfb5c8a07b0012877d2d496e26b5700916d97dc7caf1`이다. 원본을 읽은 prime이 작업 루트 `rea/legacy-unit-garden/`에 보존 복사했고, 이관 스크립트는 복사본 해시를 독립 검증한다. 원본 파일이나 실제 사용자 기록은 이 스크립트가 읽거나 변경하지 않는다.

프로젝트에 LICENSE 파일이 없다는 prime의 확인에 따라 오픈소스 라이선스를 추정하지 않는다. 이번 산출물은 사용자가 승인한 소유 로컬 프로젝트의 작업 사본에 한정한다. README는 미커밋 변경이 포함된 스냅샷이므로 그 전체를 커밋과 동일하다고 표시하지 않는다. README SHA-256: `3e6e7129797ce83c7ec00abd028f3ee8b3cac2ef79c382279d374e7cd7169d7a`.

## 필드 변환 계약

| 원본 | 내부 표현 | 검증 |
|---|---|---|
| `id`, `course`, `level`, `emoji`, `title`, `story`, `prompt` | 모든 값과 순서를 그대로 유지 | 필드별 deep equality |
| `choices`, `answer` | 보기 순서와 정답 인덱스 그대로 | 3개 보기 각각 기존 채점 함수로 검증 |
| `explain` | 원문 필드 보존 + `explanation`에 동일 배열 복사 | 문장·순서 모두 일치 |
| `total`, `percent`, `baseUnit`, `result`, `convertValue`, `convertUnit`, `visualLabel` | 모든 원문 수량·단위·표시 메타데이터 보존 | 잔여 백분율 및 단위 변환의 독립 산술 확인 |
| 원문 파일 ID·SHA | `source`, `provenance` 추가 | 파일 해시 + 문항별 원문 투영 해시 |
| 원문 `course` | `skill` 및 `provenance.skillCode` | `length/weight/distance/mix` 각 12개 |

카탈로그의 `id: unit-garden`, `progressAdapter: unit-garden-v1`는 유지하고, `kind: quiz`, `source: ./games/unit-garden/game.json`으로 바꾼다. 기존 외부 URL 출제 경로는 이 카탈로그 항목에서 제거한다. 48개 원본 ID를 그대로 `questionIds`에 등록하여 과거 문항 기록의 매핑을 보존한다.

## IRT 초기 난이도에 둔 가정

원본 level 1은 전체·절반·0%, level 2는 여러 백분율을 다룬다. 이 수준값을 그대로 보존하고 기존 색인 생성기의 `STAGE_DIFFICULTY[1]=-2.2`, `[2]=-1.25`에 임시 연결한다. 최종 값은 `b = anchor + (원문 순서 / 47 - 0.5) × 0.24`, 3지선다 추측 하한 `c=0.333`이다. `difficultyB=0`은 추가 편집 오프셋이 없다는 뜻이며 경험적으로 보정된 난이도 0을 뜻하지 않는다.

**원본의 두 수준이 플랫폼 성장 단계·나이·능력과 같다는 실증 근거는 없다.** 이 연결은 초기 출제를 위한 편집상 가정이다. 독립 응답이 쌓인 뒤 적합도·과목 간 척도 연결과 추천 수준을 검토해야 한다. 산술 검증 통과는 아동의 이해도나 문항 IRT 모수의 검증을 의미하지 않는다.

## 구현 범위

48문항은 기존 quiz 흐름에서 출제·채점·IRT 처리한다. 원본 외부 앱의 비율 슬라이더와 별도 애니메이션은 이번 문항 이관에 포함하지 않았다. 이를 재구성할 수 있도록 원문 수량·단위·표시 필드를 모두 남겼다. 별 원장과 과거 `fairy-math-garden-v1` 저장소 병합·이중 보상 방지는 별도 담당 작업이며, 이관 스크립트가 과거 기록을 임의로 새 응답으로 만들지 않는다.

## 재현

웹 작업 폴더에서 `node scripts/import-unit-garden-v12.mjs`로 이관하고 `node scripts/build-irt-bank.mjs`로 전체 색인을 갱신한다. 이후 `node scripts/check-unit-garden-v12.mjs`, `node scripts/import-unit-garden-v12.mjs --verify`, `node scripts/build-irt-bank.mjs --verify`를 실행한다.

검증 증거는 작업 루트 `rea/legacy-unit-garden/MIGRATION_MANIFEST.json`, `rea/legacy-unit-garden/EQUIVALENCE_PROOF.json`에 기록한다. 카탈로그 이관 직전 사본은 `evidence/unit-garden-migration-v12/catalog-before.json`이다. 예상 통합 범위는 **4,876문항 / 55개 quiz**, 단위 정원 **48문항 / 4개 코스**다. 실제 검증 완료 여부는 증거 JSON의 상태를 기준으로 한다.

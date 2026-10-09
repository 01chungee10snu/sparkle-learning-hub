# 새 학습 게임 추가

## 1. 초안 만들기

저장소 루트에서 실행합니다.

```sh
npm run new:game -- clock-adventure math "시계 탐험"
```

`math`, `korean`, `english` 중 과목을 고릅니다. 스크립트가 `games/clock-adventure/game.json`과 `catalog.json`의 `draft` 항목을 만듭니다. 기존 파일/ID는 덮어쓰지 않습니다. 초안은 어린이에게 보이지 않습니다.

## 2. 문항 작성

게임별로 고유한 ID를 사용하고 기존 문항의 의미를 바꾸면 새로운 문항 ID를 부여합니다. 기록은 게임 ID와 문항 ID를 기준으로 연결됩니다.

필수 문항 필드:

| 필드 | 의미 |
|---|---|
| id | 게임 안에서 고유한 영문 소문자/숫자/하이픈 ID |
| title | 짧은 이야기 제목 |
| story | 친숙한 장면, 최대 두세 문장 |
| prompt | 무엇을 구하는지 명확한 한 질문 |
| choices | 서로 다른 보기 3개 |
| answer | 정답 인덱스 0/1/2 |
| explanation | 정답의 이유를 설명하는 짧은 문장 배열 |
| visual | emoji/word/counters 시각 자료(선택) |
| speak | 영어 정답 발음용 `{text, lang:"en-US"}`(선택) |

그림 형식:

```json
{"kind":"emoji","emoji":"🍎"}
{"kind":"word","text":"반짝반짝"}
{"kind":"counters","emoji":"🍎","left":8,"operator":"-","right":3}
```

`counters` 뺄셈은 처음 8개 중 3개를 흐리게 표시합니다. 덧셈은 두 무리를 각각 표시합니다. 현재 수학 검사는 20 이하 정수에 맞춰져 있으므로 다른 수 체계를 추가할 때 검사도 함께 조정합니다.

## 3. 검수·공개

최소 5문항을 작성하고 목록의 `questionCount`를 실제 문항 수와 맞추고 `questionIds` 배열을 문항의 ID 순서와 일치시킵니다. `status`를 `published`로 변경한 뒤 `npm run check`와 실제 모바일 화면을 확인합니다. 의미가 하나로 정해지는지, 해설이 정확한지, 오답이 아이를 혼란스럽게 하지 않는지 검수합니다. 커밋·푸시하면 런치패드에 자동 반영됩니다.

## 외부 게임

같은 GitHub Pages 계정의 별도 게임은 `kind:"external"`, `url:"../another-game/"`으로 연결합니다. 기존 단위 정원만 `progressAdapter:"unit-garden-v1"`을 사용합니다. 그 외 외부 게임은 자동 점수 읽기가 제공되지 않으므로 자체 게임에서 공통 기록 API를 쓰거나 별도 어댑터를 추가해야 합니다. 연결만으로 점수가 수집된다고 표시하지 않습니다.

## 공통 기록 API

`platform/progress.js`의 공개 함수는 `learner`, `selectLearner`, `gameProgress`, `beginRound`, `answerQuestion`, `nextQuestion`, `summary`, `exportRecords`, `importRecords`입니다. 학습 실행기는 이 API를 호출하고 저장 형식을 직접 수정하지 않습니다. 새 게임의 다른 실행 규칙을 지원할 때도 `summary`가 문항별 최고점과 진도를 일관되게 읽도록 유지합니다.

아이별 점수에는 경쟁 순위를 붙이지 않습니다. 실제 이해 여부는 아이가 풀이를 자기 말로 설명하는지, 다른 사례에도 적용하는지 보호자와 함께 관찰합니다.

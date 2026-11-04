# 마법마을 v42 — Blender 모델의 Unity 실제 플레이 공간 적용

작성·검증: 2026-11-04. **개발 브랜치에서 구현·빌드·검증 완료. 운영 main/GitHub Pages는 변경하지 않음.**

## 1. 적용 결과

v41의 웹용 3D 미리보기에서 한 단계 더 나아가, Blender로 제작·편집한 건물과 자연환경 소품을 **Unity의 실제 MeshRenderer와 Prefab으로 적용**했다. 새 Unity WebGL 실행 파일 4개를 컴파일하고 웹앱 개발본에 연결했다. 요정이 이동하는 실제 플레이 공간에서 새 3D 건물을 터치하면 기존 학습 화면이 열린다.

| 항목 | 구현·검증 결과 |
|---|---|
| Unity용 3D 자산 | Blender에서 제작·변환한 39종의 FBX와 Unity Prefab |
| 범위 | 성·도서관·학교·상점 등 건물, 나무·꽃·다리·분수·벤치·가로등·기타 소품 |
| 실제 게임 장면 | 테스트 초기 장면에서 256개 native 3D 인스턴스 확인 |
| 이동·학습 진입 | 11개 장소의 기존 접근 지점과 경로 검사 통과 |
| 직접 터치 | Unity canvas의 실제 영어학교 3D 건물을 터치하여 학습 목록 재진입 확인 |
| 기존 캐릭터 | 태희·세희 요정, 뱁수 및 NPC 원화 유지 |
| 기존 학습·놀이 | 문항·IRT·보상·연못·정원·기기 간 기록 병합 동작 회귀 검사 통과 |

**바뀌지 않은 범위:** 모든 NPC를 3D 캐릭터로 바꾸거나 세계 전체의 배치·게임 규칙을 다시 만든 것은 아니다. 기존 세계의 이동 경로·학습 연결·가족 기록을 보존하면서 환경 시각 자산을 교체했다. 기존 생물 수집·돌봄 기록은 새로운 장식 메시와 분리되어 있다.

## 2. 실제 게임 화면

아래 화면은 합성 학습기록을 사용하는 독립 Chromium 브라우저에서 **새 Unity WebGL 빌드를 실행하여 캡처**했다. 보기 쉬운 비교를 위해 기존 환경 미리보기 기능에서 봄·낮을 선택했다. 실제 자녀의 학습기록을 읽거나 노출하지 않았다.

- [태블릿 실제 플레이 공간](qa-unity-v42/tablet-native-world.png)
- [모바일 3D 학교와 간판](qa-unity-v42/galaxy-native-school.png)
- [태블릿 문제풀이](qa-unity-v42/tablet-native-learning.png)
- [모바일 연못](qa-unity-v42/galaxy-native-pond.png)

Unity Editor 렌더링은 별도로 [전체 장면](qa-unity-v42/unity-native-world.png)과 [학교 근접 장면](qa-unity-v42/unity-native-school.png)에 보존했다. 근접 장면은 자산 형태 확인용으로 간판을 숨겨 렌더링했으며, 실제 게임 캡처와 구분한다.

## 3. 구현 방식과 수정한 결함

- 검증된 기존 Kenney CC0 3D 자료를 재사용하고, 네 면이 닫힌 건물·지붕·창문·문·화분 등을 Blender에서 조립했다. 기존 예시 장면의 벽·지붕 조각을 그대로 건물로 오인하지 않도록 완성된 모델로 구성했다.
- 기존 건물 위치와 이동 접근 지점을 유지했다. 실제 메시 경계에 맞는 클릭용 BoxCollider를 추가하고, 장식 소품의 충돌은 꺼서 바닥 터치를 가로막지 않게 했다.
- 공통 재질과 정점 색상을 사용해 재질 수 증가를 억제했다. 색상 변환 오류로 과하게 밝아진 초기 결과를 수정했다.
- 건물 문이 접근 방향을 향하도록 회전했고, 입구를 가리는 나무는 크기를 조정했다.
- 기존 간판의 글자 크기가 판보다 커서 겹치는 문제를 수정하고, 새 건물 지붕 위로 간판 위치를 맞췄다. 실제 모바일 캡처에서 다시 확인했다.
- 새 실행 파일을 이전 파일과 혼용하지 않도록 WebGL 로딩 버전을 `blender-native-v42-20261104`로 변경했다.

## 4. 검증 결과

| 검사 | 결과와 한계 |
|---|---|
| Unity 빌드 | Succeeded, 빌드 보고서 오류 0·경고 0 |
| Unity 장면 검사 | 39개 Prefab, 11개 목적지 경로·접근점·클릭 영역 통과 |
| 태블릿 브라우저 | 1024×768, 태희: native 메시 확인 → 영어학교 이동 → 문제 응답 → 3D 건물 직접 터치 → 연못 → 정원 통과 |
| 모바일 브라우저 | 390×844, 세희: 같은 흐름 통과 |
| 실행 오류 | 위 두 브라우저에서 수집한 JS 예외 및 대상 엔진 오류 0 |
| 기존 2D 학습 | 태희 5문항·세희 3문항 회차 완료 및 다음 학습 동작 통과 |
| 클라우드 모의검사 | 독립 브라우저 2개, 합성 시도 5건, 동시 충돌 2건과 재시도, 학습자 분리·중복 방지 통과 |
| 전체 정적 회귀 | `npm run check` 통과; 8,462개 문항·정답·IRT 무결성 검사 포함 |

**성능을 과장하지 않기 위한 구분:** 이 검증은 Mac의 Chromium 터치 에뮬레이션과 소프트웨어 WebGL 환경이다. 물리적 갤럭시·iPad의 GPU 성능, Safari 호환성, 메모리, 발열, 실측 FPS는 아직 검증하지 않았다. 클라우드 검사는 모의 RPC이며 운영 서버와 실제 가족 기기 간 승계를 시험한 것은 아니다.

재현 명령:

```sh
npm run check
npm run check:native:v42
NATIVE_QA_ORIGIN=http://127.0.0.1:4622 npm run qa:native:v42
READABLE_QA_ORIGIN=http://127.0.0.1:4622 npm run qa:refactor
CLOUD_QA_ORIGIN=http://127.0.0.1:4622 npm run qa:cloud:canonical
```

근거 파일: [Unity 감사](qa-unity-v42/native-audit.json), [빌드 결과](qa-unity-v42/build-summary.json), [브라우저 통합시험](qa-unity-v42/browser-native-qa.json), [빌드별 SHA-256](qa-unity-v42/webgl-build-manifest.json), [문항 회차 검사](qa-unity-v42/quiz-completion.log), [클라우드 모의검사](qa-unity-v42/cloud-mock.log).

## 5. 용량과 기록 보존

배포에 사용하는 WebGL 실행 파일 4개의 합계는 이전 개발본 **22,243,264바이트 → 22,412,321바이트**, **169,057바이트(약 0.76%) 증가**했다. 이는 전송 파일 크기 비교이지 실행 중 메모리나 FPS 측정이 아니다. Unity 빌드 보고서 전체 출력 크기와는 포함 파일 범위가 다르다.

이번 변경에서 `games/`, `platform/progress.js`, `platform/irt.js`, `platform/rewards.js`, `platform/cloud-sync.js`, `supabase/`를 수정하지 않았다. 태희·세희의 기존 저장 키, 재화 및 이력 초기화를 수행하지 않았다. 모든 브라우저 시험은 격리된 합성 상태로 실행했고 운영 Supabase 통신을 차단했다.

## 6. 저장·배포 상태

- **비공개 Unity 소스:** `01chungee10snu/sparkle-fairy-village`, 브랜치 `feat/blender-runtime-v42-20261104`, 커밋 `c538d52`.
- **웹 실행본:** `01chungee10snu/sparkle-learning-hub`, 브랜치 `feat/unity-blender-v42-20261104`.
- Unity 원본에는 FBX, Prefab, Shader, C# 통합 코드, 편집 가능한 Blender 원본 및 검증 자료를 보존한다. 공개 웹 저장소에는 비공개 Unity 소스를 복사하지 않는다.
- 원본 라이선스는 기존 v41 자료의 Kenney CC0 출처를 따르며, 추가 제작한 모델과 대응 관계를 Unity 자산 목록에 기록했다.
- **운영 main 병합과 GitHub Pages 정식 배포는 수행하지 않았다.** 기존 운영 사이트가 자동으로 이 개발 버전으로 바뀌지는 않는다.
- 정식 전환 전 실제 갤럭시·iPad에서 가독성·터치·FPS·메모리와 기존 가족 기록 승계를 확인해야 한다. 회귀 시 웹 실행본을 이전 v41 커밋 `dcba5b5`로 되돌리고, 학습 데이터는 초기화하지 않는다.

# 마법마을 v41 — Blender 기반 3D 체험 및 Unity 연계

- 제작일: 2026-11-03
- 브랜치: `feat/magic-village-v41-blender-world-20261103`
- 베이스: v40 아트 개편 브랜치 `feat/magic-village-v40-open-art-20261102` (운영 main은 변경하지 않음)
- 구분: **개발·검증 브랜치. 운영 배포 전 실기기 검수 필요**

## 구현 결과

Blender 5.2.3 LTS에서 제작·렌더링한 새로운 입체 마법마을을 웹 진입 화면과 Unity 마을의 **선택형 모험 지도**에 적용했다. 사용자의 학습 활동은 기존 Unity WebGL과 학습 플랫폼이 계속 담당하고, 새로운 Blender 3D 영역은 실시간 회전·장소 선택·환경 표현을 담당한다.

| 구성요소 | 실제 구현 | 유지한 것 |
|---|---|---|
| 메인 랜딩 | Blender 제작 섬을 WebGL로 실시간 회전, 모바일 전용 큰 장소 버튼, 터치·키보드 접근 | 태희·세희 요정 원화, 사용자 선택 |
| 마을 내 지도 | 기존 2D 지도 위에 필요할 때 펼치는 **Blender 3D 지도** | Unity 도착·핫스팟·문항 풀이 로직 |
| 3D 세계 | 입체 건물·지형·꽃·나무·연못·산책로, 모험 지역 13개 | 기존 게임 과목·문항·재화 |
| 동적인 세계 | Blender 키프레임 애니메이션 6개(나비·연못 물고기 등), 한국 시간대 분위기 색상, 터치 카메라 회전 | 기존 생물 수집·보상 기록 |
| 성능·안전 | GLB 약 1.1MB, 휴대폰 30fps 상한·DPR 1.5 이하, reduce-motion, 로딩 실패 시 정적 포스터 | 기존 Unity WebGL 원본 파일 |
| 선택 깊이 | Blender 장소 선택 → 기존 Unity `GO_TO_DISTRICT` 명령 또는 학습 필터 이동 | IRT 난이도·정답 검증·진도 저장 |

**중요한 구현 경계:** 웹 페이지의 Blender/Three.js 실시간 장면을 만든 것이며, 기존 Unity 씬 전체를 Blender 모델로 **교체한 것은 아니다**. Unity 모델을 실제로 교체하려면 별도 Unity 원본 브랜치에서 Blender/FBX/GLB 임포트, 콜라이더·NPC·LOD·FPS 검증 후 새 Unity WebGL 바이너리를 빌드해야 한다.

## 게임 원화의 출처·권리

Kenney 제작 **CC0 1.0** 3D 모델만 사용했으며 각 팩의 `License.txt` 원본 내용을 로컬에 보존했다. 소스 GLB **51개**와 텍스처는 ZIP SHA-256 및 파일별 해시로 검증한다.

| CC0 팩 | 근거 | 원본 ZIP SHA-256 |
|---|---|---|
| Fantasy Town Kit 2.0 | https://opengameart.org/content/fantasy-town-kit | `1a7530c09f4d2fa2cdee259876f089334f8b1f27fa86a0c4f54ef86cdd8676ef` |
| Castle Kit 2.0 | https://opengameart.org/content/castle-kit | `921f3f73927bb23106cae34bc21d5ab4b033a9fc120475e96f714a406e3169df` |
| Nature Kit 2.1 | https://opengameart.org/content/nature-kit | `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d` |

- 원본 파일·라이선스·해시: `assets/blender-v41/source/manifest.json` 및 `LICENSE_*.txt`
- Blender 편집 가능한 원본: `assets/blender-v41/sparkle-magic-world-v41.blend` (Blender 5의 Zstandard 압축 지원)
- HTML/Three.js 실시간 3D: `assets/blender-v41/sparkle-magic-world-v41.glb` (1,096,852 bytes)
- Blender Cycles 렌더링 원본: `assets/blender-v41/blender-world-poster.png`
- 웹 경량 폴백: `assets/blender-v41/blender-world-poster.webp`
- 실행 시 추가 폰트·원화·외부 서버 요청 없음. Three.js/GLTFLoader의 원본 라이선스는 기존 MIT 텍스트 `vendor/THREE-LICENSE.txt`를 따른다.

## 재현 명령어

설치: `brew install --cask blender`, Unity는 웹 플레이 회귀를 위한 기존 설치 버전 유지. 아래 이미지/GLB는 이미 브랜치에 포함되며 배포에서 별도 3D 소프트웨어 설치를 요구하지 않는다.

```bash
# 원본 ZIP은 위 출처에서 승인된 라이선스 파일과 함께 다운로드
python3 scripts/blender-v41/prepare_sources.py /tmp/sparkle-blender-kenney
blender -b -noaudio --python scripts/blender-v41/build_world.py
npm run check:blender:v41
npm run qa:blender:v41
npm run check
```

`blender-v41-world.js`는 로컬 GLB를 기존 `three@0.180.0`과 호환되는 GLTFLoader로 로드한다. 학습·보상 진도나 다른 저장소에 직접 접근하지 않는 **읽기 전용 프레젠테이션 레이어**다.

## QA 결과

| 검증 | 결과 |
|---|---|
| 51개 소스 모델 및 텍스처 SHA, CC0 라이선스와 모델 구조 | PASS |
| GLB 11개 기본 POI·11개 PICK 영역·애니메이션 6개 | PASS |
| Galaxy 에뮬레이션 390×844 · 태희/세희 분리·WebGL·터치 위치·학습 링크 | PASS |
| 태블릿 에뮬레이션 1024×768 · WebGL·대형 버튼·Unity 마을 지도 | PASS |
| Blender 모델 다운로드 실패 시 원본 학습·마을 선택 유지 | PASS |
| 기존 v40 화면 3종 및 원화·학습 경로 회귀 | PASS |
| Unity 실제 WebGL: 영어학교 이동 → 문제 답변 → 연못 (태희/세희) | PASS |
| 태희 5문항, 세희 3문항 실제 2D 풀이/완료 | PASS |
| 가족 클라우드 **모의 RPC**: 2개 기기, 동시 충돌 2건, 재시도·진도 분리 | PASS |
| `npm run check` 전체 플랫폼 회귀 | PASS |

Chromium은 **실기기가 아닌 터치 에뮬레이션**이다. 테스트 동안 운영 Supabase와 실제 자녀 학습기록은 사용하지 않았다. 갤럭시 및 iPad 실기기의 GPU 프레임레이트, Safari 터치, 크래시·메모리, 동기화 실서버 연결은 정식 배포 전 별도 확인한다. 개발 시 태블릿 그림자 렌더링 결함이 발견되어 모바일·태블릿 실시간 그림자 맵을 비활성화했다.

## 검수한 실제 캡처 (합성 브라우저 상태)

- [갤럭시 시작 화면](previews/v41/galaxy-landing.png)
- [갤럭시 Unity 마을 내 Blender 3D 지도](previews/v41/galaxy-village-map.png)
- [태블릿 시작 화면](previews/v41/tablet-landing.png)
- [태블릿 실시간 3D 영역](previews/v41/tablet-3d-stage.png)

## 운영 데이터 보존 계약

이번 브랜치는 `games/`, `games/irt-bank.json`, `platform/progress.js`, `platform/cloud-sync.js`, `platform/irt.js`, `platform/rewards.js`, `supabase/`, `village/Build/` 바이너리를 수정하지 않는다. 기존 가족 연결과 `tae`·`se`의 저장 키 및 이력은 그대로 유지한다.

**사용자가 제공한 승인에 따라 이 기능은 개발 브랜치로 만들되, 운영 페이지 자동 배포나 학습기록 초기화는 하지 않는다.** 실기기 검사 후 개별 PR/검증을 거쳐 정식 공개한다.

## 다음 고품질 단계

- Blender 제작 건물의 Unity 현장 임포트 및 부드러운 공간 이동·실제 지형 충돌·NPC 애니메이션 정합화
- 하이브리드 씬보다 더 풍부한 조명·재질·LOD/메시 합치기 및 실기기 30/60fps 측정
- 원래 태희·세희 요정 캐릭터의 2D 원화 유지 또는 일관된 3D 캐릭터 리깅(사용자 검토 후)
- 학습과 놀이 보상 연결 고도화 시 정답률만으로 압박하지 않고, 노력·다양한 과제 경험 및 자율적 선택 존중

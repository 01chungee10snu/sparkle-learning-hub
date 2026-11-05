# v46 — 공개 요정 게임 에셋 교체와 모바일 중앙 카메라

작성: 2026-11-05. v45 운영본의 학습·경제·저장 권한은 그대로 둔다. 나머지 시각 요소를 통합한 v46에 이번 요청의 공개 캐릭터와 모바일 중앙 정렬을 추가했다.

## 선택 결과

**Frakassets / Pixor의 Fairy(CC0-1.0)**를 태희·세희 두 캐릭터의 공통 원본으로 선정했다. 서로 다른 원본 팩을 혼합하지 않고 같은 게임용 메시를 두 색상 변형으로 제작하여 세계관을 통일했다. 원본 파일을 직접 가져와 Blender에서 몸·머리·머리카락·팔다리·날개를 편집했다. 기존 자체 제작 모델을 외부 공개 모델이라고 부르는 것이 아니다.

- 원본 소개: https://pixor.art/library/crystals/fairy/
- 제작사 라이선스: https://pixor.art/library/license/
- 공식 GLB: https://pixor.art/library/files/fairy/pixor-library-fairy.glb
- 공식 Blender: https://pixor.art/library/files/fairy/pixor-library-fairy.blend
- Blender 원본 SHA-256: `b5b790eb6586217c6f84f5b2617ea0e814b1cdb494bc3d2acc1349c047c11468`
- GLB 원본 SHA-256: `d4cd0e331e607de9c0a08503e77adb76baf930108fcd966a13161fc150fca30a`

제작사의 CC0 안내는 게임 사용, 수정, 직접 렌더링, 에셋 재배포를 허용한다. 별도 구입·계정 생성·유료 플러그인 사용은 하지 않았다. 원본 설명에는 날개 피벗, 비행 애니메이션, 명명된 부품/재질, Blender 파일 제공이 명시되어 있다. 게임에서는 기존 이동/인사/생각하기/돌봄 명령에 맞춰 부품 피벗을 제어한다. 원본 비행 애니메이션을 그대로 사용하는 것은 아니다.

### 검토한 후보와 선택 범위

| 후보 | 확인한 특성 | 판단 |
|---|---|---|
| Pixor Fairy | CC0, 날개·드레스·큰 머리 비율, 편집 가능한 Blender/GLB | 즉시 합법적으로 사용할 수 있는 후보 중 기존 요정의 핵심 실루엣과 일치하여 채택 |
| Quaternius RPG Characters | CC0, 게임용 판타지 직업 캐릭터 | 인체 비율·복장·머리 표현이 기존 어린 요정과 달라 제외 |
| Quaternius Ultimate Modular Women | CC0, 모듈형 여성 캐릭터와 마녀 | 기존 큰 머리·작은 몸의 요정 비율과 차이 |
| KayKit Adventurers | CC0 무료 기본 팩, 게임용 애니메이션 | 일관된 게임 품질이나 기본 캐릭터의 판타지 직업 실루엣이 요정과 다름 |
| AliceCassie Chibi Witch / Poly Pizza | CC0, 작은 비율의 마녀 | 요정과 다른 복장, 이 환경에서 원본 다운로드 확인 미완료 |
| CraftPix Free 2D Fairy | 요정 외형과 애니메이션이 유사한 2D 스프라이트 | 현재 실제 3D 마을·회전 방향의 일관성을 위해 제외 |
| Meshtint Nymph Fairy | 유료 게임용 요정 팩, 외형상 적합한 후보 | 구매·라이선스 취득 없이 사용하지 않음 |

**선택 가정:** 추가 결제 없이 바로 사용·수정할 수 있는 권리, 기존 분홍/연보라 구분, 실제 3D 플레이와 모바일 배포를 우선했다. ‘가장 유사’는 위 검토 범위에서의 선택이며, 세상에 공개된 모든 유료·무료 모델을 전수 비교했다는 뜻이 아니다. 기존 원화의 동일 복제본도 아니다.

### 실제 수정

태희는 분홍 드레스·살구빛 머리·따뜻한 날개, 세희는 연보라 드레스·연보라 머리·옅은 청보라 날개다. 원본 메시의 표면을 부드럽게 다듬고 꽃 화관, 작은 곱슬 장식, 눈 반짝임, 볼, 드레스 테두리를 추가했다. Head/Body/ArmL/ArmR/LegL/LegR/WingL/WingR를 실제 Unity 부품으로 연결했다. 입장 선택, HUD, 학습 도우미, 스타일 선택은 같은 두 모델의 렌더 이미지를 사용한다.

## 모바일 중앙 정렬

기존 고정 카메라 오프셋은 캐릭터보다 성 쪽을 바라보게 했다. 세로 화면 또는 짧은 변 700px 미만/모바일 플랫폼에서는 캐릭터의 실제 렌더 경계 중심을 구하고, 그 점을 카메라 시선 축에 놓는다. 발 위치나 성을 중심으로 계산하지 않는다.

애니메이션을 반영한 뒤 LateUpdate에서 보정하므로 걷기·방향 전환 중에도 중심을 유지한다. 내부 공간이 열려 있을 때는 이 카메라 보정을 하지 않아 학습 화면을 침범하지 않는다. 마을 복귀 시 다시 적용한다. 큰 데스크톱 가로 화면은 기존 마을 구도를 유지한다.

`scripts/qa-mobile-heroes-v46.mjs`는 두 학습자 각각 390×844, 360×740, 844×390, 768×1024에서 실제 Unity 캐릭터의 투영 좌표를 측정한다. 자유 산책 중의 실제 위치 변화와 중앙 유지, 실내 복귀를 추가 검사한다. 기준은 가로·세로 중앙에서 각각 2% 이내이며 결과의 실제 오차는 `qa-cohesive-v46/mobile-hero-qa.json`에 기록한다. 2026-11-05 재검사에서 두 학습자 × 4개 화면 크기, 애니메이션을 켠 이동·실내 복귀를 통과했다. 화면 중앙이 HUD에 가려지지 않는지도 검사했고 최대 투영 오차는 약 0.11px였다. 이는 Chromium 소프트웨어 WebGL 측정이며 물리적 기기의 보장값은 아니다. 결과 파일은 현재 네 실행 파일의 SHA-256에 결합했다.

## 대부분의 남은 요소와 함께 반영

v46의 272개 모델 연동 그림에는 캐릭터/도우미 11, 수집 생물 64, 직업 100, 선물 48, 공통 UI/성장 아이콘 43, 꽃 장식 6이 포함된다. 이 중 두 요정을 위 공개 원본 기반으로 교체했다. 생물의 개별 소유·가격·직업 설명·문항 원문 등은 다시 쓰지 않았다. 실제 런타임에서 필요한 배우/생물만 3D로 생성하고, 직업·선물 등 목록은 동일 모델을 직접 렌더링한 그림을 사용한다.

기존 13개 내부 활동 공간은 보존한다. 문제 글자와 보기, 숫자 키패드, 설명은 읽기·음성·접근성을 위해 선명한 실시간 텍스트다. 모든 문자를 3D 메시로 바꾸거나 원본 문제 그림을 재해석하지 않았다.

## 재현과 검증

```sh
# 기존 전체 v46 모델을 다시 만드는 경우 이 순서를 따른다.
blender -b --factory-startup --python-exit-code 1 --python unity-v46/export_cohesive.py -- /path/to/unity-v46
blender -b --factory-startup --python-exit-code 1 --python unity-v46/export_gifts.py -- /path/to/unity-v46
# 공식 원본을 SourceArt/PublicFairiesV46에 보관한 뒤 두 주인공만 교체한다.
blender -b --factory-startup --python-exit-code 1 --python unity-v46/adapt_public_fairies.py -- /path/to/unity-v46
# Unity: VillageCohesiveBuild.PrepareAndBuild
python3 scripts/sync-cohesive-v46.py /path/to/unity-v46
npm run qa:mobile-heroes:v46
npm run qa:cohesive:v46
npm run check
```

개인 기록이 없는 합성 브라우저 상태에서만 검사하며 운영 Supabase 요청을 차단한다. 에뮬레이션 좌표 검사는 물리적 갤럭시·iPad의 발열·RAM·실측 FPS·Safari 검증을 대신하지 않는다. 배포 여부는 `qa-cohesive-v46/deployment.json`에 기록한 공개 응답과 브라우저 증거로 구분한다.

## 검증 자료

모바일 실제 실행 캡처: [태희 390×844](qa-cohesive-v46/mobile-tae-390x844.png) · [세희 390×844](qa-cohesive-v46/mobile-se-390x844.png). 새 독립 브라우저 상태로 촬영했으며 실제 가족 데이터를 사용하지 않았다.

현재 런타임 검증 연결: `qa-cohesive-v46/release-binding.json`. 공개 배포 상태는 `qa-cohesive-v46/deployment.json`에서 구분한다.


## 운영 배포 확인

2026-11-05 v46 공개 배포 및 실제 주소 검증 완료. 실행본 커밋 `e4d6a5950ed1e1754947bca975438b8c84b81c07`, Unity 소스 `5ad33e75bd4f1035baf54e41fa42f0b444f4c415`. 네 실행 파일·프런트 연결 모듈·두 요정 그림의 공개 응답 SHA가 검증본과 일치한다.

두 요정 각각 네 화면 크기, 애니메이션을 켠 걷기·중앙 유지·내부 활동 후 복귀를 공개 사이트에서 통과했다. 공개 도감/친구/꾸미기/직업 및 선물/보호자 화면도 검사했다. 내부 13개 공간 전체 검사는 같은 실행본의 로컬 서버 검사이며 실제 가족 데이터를 사용하지 않았다.

배포 기록: [deployment.json](qa-cohesive-v46/deployment.json). 실제 공개 게임 캡처: [태희](qa-cohesive-v46/live-tae-390x844.png) · [세희](qa-cohesive-v46/live-se-390x844.png).

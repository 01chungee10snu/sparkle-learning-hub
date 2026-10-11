# 뱁수(Bebsu) 원화 재사용 · 2026-10-11

## 기준 및 역할
- **정확한 명칭:** 뱁수(Bebsu). 잘못된 옛 표기 '벡수'를 학습 허브와 Unity 웹 UI에서 수정.
- **원본 저장소:** `/Users/01chungee10/Github/Bebsu` — 기존 에셋과 데이터는 **수정하지 않음**.
- **웹 학습 앱:** `/Users/01chungee10/Github/sparkle-learning-hub`.
- **Unity 소스:** `/Users/01chungee10/Github/sparkle-fairy-village`.
- 태희·세희의 기존 요정 캐릭터는 마을 주인공으로 유지. 뱁수는 **별도 수학 도우미 NPC**이며, 보상 원장이나 IRT 채점의 주체가 아님.
- 저작물 재사용은 프로젝트 사용자의 명시적 허용 범위에 따름. 공개 배포 시 외부 권리 제약이 있는지 최종 확인.

## 웹 에셋
`node scripts/import-bebsu-art.mjs`: 원본 15종(캐릭터 6, 학습 도구 5, 성취 배지 3, 배경 1)을 독립적으로 `assets/bebsu/art/`에 복사. 513,823 byte. `manifest.json`은 각 파일의 원본 상대 경로·SHA-256·크기를 기록.

`node scripts/import-bebsu-art.mjs --check`를 실행하면 원본·로컬 복사본의 무결성을 검증. 복제 이미지는 WebP·PNG이며, 원본 고해상도 RGB 이미지를 임의의 녹색/회색 배경과 함께 삽입하지 않음.

화면 연결:
1. 뱁수 문제집 목록: 학년별 학습 카드 및 수학 연구소 배너.
2. 원본 수학문항 진입·정답/오답 피드백: 태희는 갈색 뱁수, 세희는 분홍 뱁수; 두 사용자 모두 기존 요정 초상은 유지.
3. 문제 완료: 뱁수의 기뻐하는 모습. 보상 배지는 실제 해금 상태에 따라서만 노출.
4. `village/village-ui.js`, `village/index.html`: 뱁수 명칭 통일.

기존 `assets/bebsu/math/`의 문제 이미지와 IRT 상태, 문제 정답/풀이, 별 보상 수식 및 저장 키는 수정하지 않음.

## Unity NPC
`python3 Scripts/Art/import_bebsu_tutors.py`가 뱁수 PNG 스프라이트 2개를 `Assets/Resources/Bebsu/`에 준비하고 `Assets/Art/Generated/bebsu-tutor-manifest.json`에 원본·변환본 해시 기록.

`VillageBebsuImporter.Configure()`는 두 파일을 Sprite로 import. 이 폴더는 기존 `Assets/Resources/Sprites/` 외부여서 이전 62개 prefab의 목록/해시를 건드리지 않음.

`VillageWorld.BebsuTutor()`는 개인 마을 및 가족 광장에 수학 선생님 NPC를 배치. 터치 시 태희는 `bebsu-g1-original`, 세희는 `bebsu-foundation`의 기존 브리지로 연결. NPC는 UI·길 찾기를 위한 hotspot만 추가하며 정답 판정, IRT, 별 지급 기능은 생성하지 않음.

## 검증
- `node scripts/check-bebsu-art.mjs`: 이미지·원본 해시, 명칭, 게임 ID, UI 스코프, Unity 스프라이트 및 Unity 코드 연결.
- `npm run check`: 기존 게임·IRT·보상·브리지 테스트.
- Unity: `Sparkle Village → 5. Import Bebsu Math Tutors`; 이후 Scene Play 또는 WebGL build에서 실제 이미지·터치·이동 테스트 필요.
- 실제 아이들 모바일 터치 사용성·교육효과·Unity WebGL 최신 빌드 및 GitHub Pages 업로드는 검증·배포 시점을 별도 확인해야 함.

## 가정과 리스크
- Bebsu 기존 에셋은 같은 가족 학습 프로젝트 내에서 재사용 가능하다는 사용자의 허용을 근거로 함.
- 뱁수 PNG는 **2.5D 스프라이트**이며 뼈대 애니메이션이 있는 3D 모델이 아님.
- 휴대전화 소화면은 원본 수학 문제 이미지의 글씨 가독성에 영향을 받을 수 있어 실기기 확인 필요.
- 별 보상 및 오답 학습은 이미지 해금 연출만 바꾼 것이며, 아동 학습성과의 인과적 향상은 주장하지 않음.

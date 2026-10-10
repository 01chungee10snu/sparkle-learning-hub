# 태희·세희 Unity 마법마을 · 공개 체험판

- 공개 URL: https://01chungee10snu.github.io/sparkle-learning-hub/village/
- 기존 반짝 배움터에서 아이를 선택하고 마법마을 카드로 진입합니다.
- 개인 마을과 가족 공용 광장, 핑크/연보라 요정, 3D 터치 이동, NPC 미션을 제공합니다.
- 실제 수학·국어 문제와 채점·해설·별 지급은 기존 학습 플랫폼 모듈을 재사용합니다.
- Unity WebGL 소스는 별도 비공개 저장소 01chungee10snu/sparkle-fairy-village 에서 관리합니다.

## 빌드와 배포

Unity 6.3 LTS (6000.3.26f1, Input System 1.20.1).
Sparkle Village → 2. Build Web 메뉴를 사용합니다.

GitHub Pages는 커스텀 Content-Encoding 헤더를 지정할 수 없으므로 Brotli 압축 + JavaScript Decompression Fallback 빌드를 사용합니다.
공개 저장소의 village/Build/에는 .unityweb 3개와 .loader.js를 포함합니다.
기존 main 브랜치 루트를 게시하는 GitHub Pages 구성을 유지합니다.

빌드 결과를 재생성한 뒤 UnityProject/Builds/WebGL/Build 파일을 village/Build로 복사합니다.

## 무결성과 개인정보

- 개인/가족 꽃밭: sparkle-unity-village-v1 (기기 내 브라우저 저장)
- 학습 기록: 기존 sparkle-learning-progress-v3
- 보상 기록: 기존 sparkle-rewards-v1
- 단위 정원: 기존 fairy-math-garden-v1
- Unity는 별을 직접 지급하지 않습니다. 기존 학습 플랫폼의 검증된 원장이 관리합니다.
- 완료 회차의 고유 ID에 따라 꽃 한 송이만 추가됩니다.
- 클라우드 동기화, 계정 인증, 기기 간 실시간 멀티플레이는 포함하지 않습니다.
- 개인정보, 학교 실명, 연락처를 Unity 데이터 또는 공개 프로젝트에 추가하지 않습니다.
- 기록은 브라우저별로 저장됩니다. 중요한 학습 기록은 보호자 메뉴의 JSON 백업을 사용하세요.

## 검증 및 알려진 한계

npm run check 및 실제 Chrome 브라우저에서 진행한 두 아이의 5/3문항 회차, 보상/가족 광장, 재접속 검사가 통과했습니다.
390x844, 320x568, 1024x768 Chrome 모의 화면에서 레이아웃 검사를 통과했습니다.

현재 건물·3D 요정은 최초 출시용 Low-poly 모델입니다. 얼굴·원본 요정 초상과 HUD를 개선했으나 최종 아트 제작은 후속 과제입니다.
실제 iPhone/iPad/Android 장치에서의 WebGL 속도·발열·터치 안정성은 아직 별도로 확인해야 합니다.

## v0.5.0 개발 패치: 게임형 UX / 적응형 / 별 상점

- 상세 명세: `docs/MAGIC_VILLAGE_MAJOR_PATCH_V1_20261010.md` (저장소 루트 기준).
- 마법책(경시 25문항)·NPC 의뢰서·수정판 UI는 `major-patch.css`에서 변경합니다.
- `platform/village-adaptive.js`는 잠정 1PL IRT 추정/미확인 문항 기반으로 학습 게임을 추천하며 학년을 자동 변경하지 않습니다.
- `village-bridge.js`의 SHOP_* 요청은 기존 Rewards 원장만 수정합니다. Unity가 구매/별 지급을 직접 수행하지 않습니다.
- 캐릭터는 독립 4시점 원화+중간 4시점 알파 합성으로 8방향 이동을 제공합니다(실제 사선 독립 원화는 별도 제작 필요).
- 테스트: `npm run check`, `node scripts/major-patch-visual-qa.mjs`, `SPARKLE_QA_ORIGIN=http://127.0.0.1:4191 node scripts/bebsu-browser-smoke.mjs`.
- 새 벡수 원본 그림은 `private_reference_only` 표시를 존중하여 명시적 재배포 허락 전에는 공개 서비스로 출시하지 않습니다.

# 태희·세희 마법마을 — 2.5D 아트 개편 미리보기

- 상태: **기능 브랜치에서 검증한 프리뷰 빌드**. GitHub Pages 운영 main은 변경하지 않음.
- Unity 소스 브랜치: `01chungee10snu/sparkle-fairy-village:feat/magic-village-25d-art-kit`
- 웹 호스트 브랜치: `01chungee10snu/sparkle-learning-hub:feat/magic-village-25d-art-kit`
- Unity Editor: 6000.3.26f1
- 아트 구성: 62개 투명 스프라이트 + 62개 개별 프리팹
- 원본 캐릭터: 기존 분홍·연보라 요정 원본에서 각자 분리
- 기존 문제/별/꽃 기록: 점수 로직 변경 없음
- 학습 검증: Chrome 모의환경 태희 5문항 + 세희 3문항 + 가족 광장 + 재접속 PASS
- QA 미리보기: `village/preview/magic-25d-mobile.png`

## 주의

이 빌드의 신규 마을 소품은 원화 수준의 고화질 에셋이 아닌 **절차 제작 1차 자산**이며, 기존 블록형 오브젝트를 개별 2.5D 스프라이트로 전환하기 위한 작업입니다. 실제 iPhone/iPad/Android 실기기 QA 및 고급 원화 에셋 치환까지 마친 것은 아닙니다.

ChatGPT 측에서 생성된 콘셉트 원화 9장과 참조 크롭 26개는 별도 ZIP을 Mac으로 다운로드해야 Unity 원본 프로젝트에 통합됩니다. 다운로드 후 Unity 저장소의 `Scripts/Art/import_concept_bundle.py`로 무결성을 확인해 보관할 수 있습니다.

프로젝트 `AudioManager.asset`의 Unity 엔진 오디오는 Mac Editor CoreAudio hang을 방지하기 위해 현재 비활성화되어 있으며, 브라우저 JS 읽어주기는 별도로 유지됩니다. 장래 효과음·배경음을 제작할 때는 재활성화 및 검증이 필요합니다.

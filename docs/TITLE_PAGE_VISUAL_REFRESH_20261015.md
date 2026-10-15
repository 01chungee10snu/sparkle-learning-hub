# 마법마을 타이틀 페이지 v15 — 2026-10-15

## 목적

새 이미지를 생성하지 않고 기존 프로젝트 원화를 재조합해 첫 진입 경험을 게임 타이틀 수준으로 개선한다.

## 사용한 기존 자산

- `village/assets/illustrations/welcome.webp` — 메인 마법마을 히어로
- `village/assets/taehee_original.png` — 태희 학습자 선택 카드
- `village/assets/sehee_original.png` — 세희 학습자 선택 카드
- `village/assets/illustrations/math-icon.webp` — 수학 정원
- `village/assets/illustrations/korean-icon.webp` — 이야기 도서관
- `village/assets/illustrations/english-icon.webp` — 영어 숲

새 생성 이미지나 외부 이미지 의존성은 추가하지 않았다.

## 시각 구조

- 데스크톱: 좌측 세계관 히어로 / 우측 요정 선택·입장
- 모바일: 타이틀 → 마법마을 원화 → 학습 루프 → 요정 선택 → 입장
- 핵심 카피: `배우면, 우리 마을이 자라요.`
- 학습 루프: `다시 떠올리고 → 알맞게 도전하고 → 다른 곳에 써보기`
- 태희/세희 선택 버튼에 실제 캐릭터 원화 사용
- 학습기록·보호자 대시보드 바로가기 유지

## UX 원칙

- 3D 마법마을을 primary CTA로 유지
- 가벼운 2D 마을을 secondary CTA로 유지
- 320px 화면에서도 학습자 선택 및 두 입장 버튼 접근 가능
- 학습자 선택 시 상태 문구가 태희/세희에 맞게 즉시 변경
- reduced-motion 환경에서도 의미 손실 없음

## 검증

- title QA: 320×568 / 390×844 / 844×390 / 1440×900 PASS
- 모바일·태블릿 현재 동선 QA: 7 viewport PASS
- Unity WebGL 실제 진입 QA: 390×844 / 320×568 / 768×1024 / 844×390 PASS
- 전체 회귀: 55 games / 4,828 items PASS

# v32 캐릭터·직업·배경 일러스트 품질 감사

## 범위와 확인 결과

- 직업 라이브러리의 `village/assets/career-illustrations/*.svg` **100개**와 `manifest.json` 항목 **100개**를 대조하였다. 모두 XML로 파싱되며 파일 SHA-256이 매니페스트와 일치한다.
- 기존 SVG는 320×260 뷰박스, 그라디언트 배경, 인물 그림자, 단순한 명암, 둥근 표정, 한글 `<title>`을 갖춘 벡터 원화다. 일괄 재작성할 이유가 없다.
- **확인한 취약점:** 직업마다 차별화된 유일한 작은 소도구를 컬러 이모지 `<text>`로 구현하여, OS·웹뷰·폰트에 따라 문양이나 색이 달라지고 글꼴 부재 시 빈 글리프가 될 수 있었다. 얼굴·배경의 형태가 대체로 반복되므로 작은 소도구의 판독성이 특히 중요하다.
- 기존 `village/assets/illustrations/`의 학습 아이콘 및 배경은 20개 WebP이며 `assets/fairy-companions.webp`가 별도로 있다. 기존 완성된 요정/미션 아트는 재작성하지 않았다. `assets/bebsu/math/`에 다량의 원본 문제가 있으므로 교과 문제 이미지를 임의 변형하지 않았다.

## 정밀 수정: 직업 상징 소도구 12종

이모지 문자를 독립적인 SVG 도형으로 교체하고 기존 인물, 피부색, 눈, 배경, 그림자, 벡터 해상도는 유지했다. 소도구는 흰 원형 배지 안에 배치하며 인물의 얼굴 및 바깥 여백과 겹치지 않도록 226×43 위치 기준으로 그렸다.

| 직업 ID | 직접 그린 직업 소도구 |
|---|---|
| `doctor` | 청진기 |
| `dentist` | 치아 |
| `pilot` | 비행기 |
| `veterinarian` | 동물 발자국 |
| `robot-engineer` | 로봇 얼굴 |
| `ai-researcher` | 신경망·반도체 |
| `architect` | 건물 설계 형태 |
| `game-designer` | 게임 컨트롤러 |
| `cybersecurity` | 자물쇠 |
| `career-395` | 펼친 책과 별 |
| `career-182` | 새싹 |
| `career-104` | 실험 플라스크 |

해당 12개 파일의 SHA-256을 `village/assets/career-illustrations/manifest.json`에 갱신했다. 다른 88개 SVG와 직업 ID, 역할명, 경로, 데이터 필드는 보존했다. 매니페스트의 원저작권 표기 `Original generated vector portraits, project-owned, no third-party image dependencies`도 유지했다.

## 렌더·무결성 QA

- macOS Quick Look에서 수정 SVG **12개 모두 PNG 썸네일 렌더 성공**. 산출물: `docs/qa-visual-v32/*.svg.png` (각 360 또는 480px).
- SVG **100개 XML 파싱 성공**, `manifest.json` **100개 파일 경로/해시 일치**.
- 배포 HTML이나 JS 코드는 변경하지 않음. 런타임 브라우저 전 화면 검증은 상위 작업의 통합 QA에서 별도 수행할 필요가 있다.
- 잔여 과제: 이모지가 남은 88개 직업은 같은 유형의 플랫폼 의존성이 있으며, 별도의 시각 승인과 직업별 도구 실루엣 검수 후 단계적으로 벡터화할 수 있다. 전체 캐릭터 표정·몸체가 반복되는 문제는 원화 수준의 후속 아트 방향성 검토 대상이다.

## 관리 원칙

### 한자 수련관 아이콘 누락 보완

동적 지역 탐색 버튼이 참조하는 `./assets/illustrations/hanja-icon.webp` 파일이 존재하지 않아 이미지 404가 발생할 수 있음을 발견했다. 기존 수학·국어·영어 아이콘을 재사용하거나 이모지로 대체하지 않고, 붓·두루마리·한자 `山`을 독립 SVG 도형으로 그린 신규 256×256 투명 아이콘을 제작했다. 원본은 `village/assets/illustrations/hanja-icon.svg`, VectorCraft 렌더 결과는 `hanja-icon.webp` (43,026바이트)다. PNG/WebP 폴백을 유지하는 동일 `img` 경로에 연결되므로 JS 수정 없이 정상 표시된다. `node scripts/check-game-illustrations-v32.mjs`에서 모든 클릭 가능한 학습 지역 이미지의 실제 존재와 WebP 헤더를 검사한다.


직업 콘텐츠의 현실성은 보호자용 상세 자료와 분리해 보존하고, 4·7세 어린이 화면에서는 직업을 우열로 표현하거나 특정 성별·피부색에 고정하지 않는다. 직업 도구의 표현은 전문 활동을 이해하도록 돕는 장식이고 위험 행동의 조작법을 보여주지 않는다.

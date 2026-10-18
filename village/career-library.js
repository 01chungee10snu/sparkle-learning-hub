/**
 * Child-facing, independently written career explorer.
 * Occupational examples and preparation are educational descriptions, not
 * guaranteed salary, placement, admission, prestige rankings or predictions.
 * For audited/current classifications see Korea's CareerNet and Work24.
 */
export const CAREER_SOURCES=Object.freeze([
 {label:'커리어넷 직업백과',url:'https://www.career.go.kr/cloud/m/job/list'},
 {label:'고용24 직업·진로',url:'https://www.work24.go.kr/'}
]);
export const CAREER_GROUPS=Object.freeze([
 {id:'medical',name:'의료·생명',emoji:'🩺'},
 {id:'tech',name:'AI·공학·우주',emoji:'🚀'},
 {id:'justice',name:'법·국제사회',emoji:'⚖️'},
 {id:'leadership',name:'경제·경영',emoji:'🏛️'},
 {id:'creative',name:'교육·창작',emoji:'🎨'},
 {id:'planet',name:'환경·미래',emoji:'🌎'}
]);
const PROFILE_ROWS=[
 ['doctor','의사','🩺','medical','사람의 아픔을 살피고 건강을 회복하도록 돕는 전문가','생명을 지키는 일에는 깊은 공부와 큰 책임이 필요해요.','인체를 탐구하고, 과학·수학을 익힌 뒤 의학 교육과 면허를 거쳐요.','우리 가족 건강 지키는 방법 세 가지 알아보기','math,english,korean'],
 ['dentist','치과의사','🦷','medical','치아와 입의 건강을 살피고 치료하는 전문가','사람들이 편안하게 먹고 웃을 수 있도록 도와요.','과학과 손재능을 기르고 치의학 교육과 면허를 준비해요.','양치 방법을 그림으로 설명하기','math,korean'],
 ['veterinarian','수의사','🐾','medical','동물의 병을 치료하고 건강을 지키는 전문가','동물과 사람, 환경이 건강하게 연결되도록 지켜요.','생물·과학을 배우고 수의학 교육과 면허를 취득해요.','동물이 행복하게 지내려면 필요한 것 세 개 찾기','korean,english'],
 ['pharmacist','약사','💊','medical','약의 올바른 사용과 안전을 도와주는 전문가','약에 대한 정확한 지식으로 사람들의 건강을 지켜요.','화학·생명과학을 공부하고 약학 교육과 면허를 준비해요.','약은 어른과 상의해야 하는 이유 말하기','math,korean'],
 ['biomedical','의생명 연구원','🧬','medical','질병의 원인과 새로운 치료 기술을 연구하는 과학자','새로운 치료법을 발견하면 많은 사람에게 도움이 돼요.','과학 실험·통계·대학 연구를 꾸준히 경험해요.','물과 식물의 변화를 관찰하고 그림으로 기록하기','math,english'],
 ['surgeon','외과 전문의','🫀','medical','수술로 다친 부위와 질병을 치료하는 의사','정교한 기술과 팀 협력이 생명을 살릴 수 있어요.','의학 교육과 면허 이후 긴 전문 수련과 협업을 거쳐요.','친구를 돕는 팀의 역할 세 가지 나눠보기','math,korean'],
 ['ai-researcher','AI 연구원','🧠','tech','인공지능이 문제를 풀도록 알고리즘을 연구하는 과학자','사람에게 유용하면서도 안전한 기술을 개발해요.','수학·통계·코딩과 사회적 책임을 함께 배워요.','그림의 규칙을 찾아 다음 모양 맞히기','math,english'],
 ['robot-engineer','로봇공학자','🤖','tech','사람을 돕는 로봇의 구조와 움직임을 설계해요','의료·산업·생활 속 위험하거나 어려운 일을 도와요.','수학·물리·제어·프로그래밍을 차근차근 익혀요.','블록으로 움직이는 로봇 팔 모형 만들기','math,english'],
 ['semiconductor','반도체 설계 엔지니어','💻','tech','컴퓨터 속 작은 칩과 회로를 설계하는 전문가','미래 자동차·의료기기·AI의 핵심 기술을 만들어요.','수학·물리·전자공학과 꼼꼼함이 중요해요.','전기 회로 모양을 따라 그려 보기','math,english'],
 ['astronautical','우주공학자','🛸','tech','위성·우주선·로켓을 연구하고 설계해요','우주 관측과 통신, 지구를 위한 기술을 키워요.','수학·물리·항공우주공학·안전 실험을 배워요.','종이 비행기가 멀리 나는 모양 비교하기','math,english'],
 ['cybersecurity','정보보안 전문가','🔐','tech','컴퓨터와 사람의 개인정보를 지키는 전문가','중요한 정보를 안전하게 보호해요.','논리·수학·컴퓨터와 윤리를 함께 익혀요.','안전한 비밀번호의 특징 이야기하기','math,korean'],
 ['inventor','발명가·기술창업가','💡','tech','아직 없는 물건이나 기술로 불편함을 해결해요','좋은 발명은 많은 사람의 삶을 편하게 해요.','질문하는 습관·실험·실패를 고치는 힘을 길러요.','집에서 불편한 점 하나와 해결 아이디어 그리기','math,korean'],
 ['judge','판사','⚖️','justice','법에 따라 사건을 공정하게 판단하는 법률 전문가','사람들의 권리와 사회의 신뢰를 지키는 역할이에요.','읽기·글쓰기·사회 이해를 기르고 법학 및 선발 과정을 거쳐요.','같은 사건을 두 관점에서 공평하게 말하기','korean,hanja'],
 ['lawyer','변호사','📚','justice','법률을 이해하여 사람의 권리와 문제 해결을 돕는 전문가','어려운 문제에서 합리적 해결책을 찾도록 도와요.','언어·논리·법학 교육과 자격 취득을 준비해요.','친구와의 다툼을 공정하게 해결할 방법 적기','korean,hanja'],
 ['diplomat','외교관','🌐','justice','다른 나라와 대화하고 협력하는 나라의 대표자','나라 사이의 우정과 평화를 만드는 일을 해요.','한국어·영어·세계 역사·협상과 국가 선발 과정을 익혀요.','다른 나라 친구에게 자기소개를 영어로 해보기','english,korean'],
 ['international','국제기구 전문가','🕊️','justice','여러 나라가 환경·평화·건강 문제를 함께 풀게 돕는 전문가','세계의 여러 사람에게 도움이 될 수 있어요.','언어·국제 이해·전문 분야·협업 경험을 쌓아요.','세계 여러 나라의 인사말 세 개 찾기','english,korean'],
 ['patent','특허 전문가','📜','justice','발명과 새로운 기술의 권리를 살피는 전문가','좋은 아이디어가 공정하게 인정받도록 도와요.','과학·논리·글쓰기와 지식재산 제도를 배워요.','새 발명을 그림으로 설명하고 이름 붙이기','math,korean'],
 ['founder','기업가·창업가','🏙️','leadership','사람들에게 필요한 제품과 서비스를 만들고 회사를 세워요','좋은 사업은 일자리와 가치를 만들 수 있어요.','문제 관찰·계획·수학·소통·경제 감각을 키워요.','친구에게 도움이 되는 가게를 직접 상상하기','math,korean'],
 ['ceo','기업 경영자','👑','leadership','팀과 회사를 이끌어 중요한 결정을 하는 책임자','사람을 존중하며 조직의 미래를 설계해요.','여러 직무를 경험하고 숫자·윤리·소통을 배워요.','모둠장이라면 모두가 참여할 방법 정하기','math,english'],
 ['investment','금융투자 전문가','📈','leadership','기업과 경제를 살펴 자금을 책임 있게 운용하는 전문가','사람들의 미래 자금을 신중하게 다뤄요.','수학·통계·경제·윤리·위험관리 지식을 기르세요.','저축과 소비의 차이를 그림으로 설명하기','math,english'],
 ['accountant','공인회계사','🧮','leadership','조직의 돈과 기록을 정확하게 살피는 전문가','투명한 숫자는 사회의 신뢰를 높여요.','수학·회계·법규와 전문 자격을 준비해요.','장난감 가게의 수입과 지출표 만들어 보기','math,korean'],
 ['economist','경제학자','📊','leadership','일자리·가격·정책의 원인을 연구하는 학자','많은 사람의 삶에 영향을 주는 선택을 연구해요.','수학·통계·읽기·사회과학 연구를 익혀요.','왜 물건 가격이 달라질지 이야기하기','math,korean'],
 ['professor','대학교수·연구자','🎓','creative','새로운 지식을 연구하고 학생을 가르치는 전문가','새로운 발견을 다음 세대와 나누어요.','궁금증을 깊게 공부하고 연구·설명하는 힘을 키워요.','친구에게 오늘 배운 내용을 가르쳐 보기','korean,math'],
 ['architect','건축가','🏛️','creative','사람에게 안전하고 아름다운 공간을 설계해요','집·학교·도시를 더 편리하고 멋지게 만들어요.','그림·공간·수학·과학과 관련 전문 교육을 배워요.','블록으로 모두에게 편리한 학교 만들기','math,korean'],
 ['film-director','영화감독·콘텐츠 제작자','🎬','creative','이야기를 영상·음악·그림으로 표현해요','좋은 작품은 생각과 마음을 움직일 수 있어요.','읽기·예술·기술·팀 협력을 연습해요.','세 장의 그림으로 짧은 이야기 만들기','korean,english'],
 ['game-designer','게임 개발자','🎮','creative','사람들이 배우고 즐기는 게임을 기획하고 개발해요','재미와 학습, 접근성을 함께 생각해요.','수학·코딩·디자인·사용자 관찰을 익혀요.','마법마을 새 게임의 규칙 세 가지 생각하기','math,english'],
 ['pilot','항공기 조종사','✈️','planet','비행기를 안전하게 운항하며 사람을 이동시켜요','많은 사람의 안전을 책임지는 일을 해요.','수학·영어·기상·안전 훈련과 비행 자격을 익혀요.','구름과 날씨 변화 일기 쓰기','math,english'],
 ['climate','기후과학자','🌦️','planet','지구의 날씨와 기후 변화를 연구해요','미래 세대의 환경을 지키는 데 도움이 돼요.','과학·수학·통계와 관찰·연구를 연습해요.','일주일간 하늘과 기온을 표에 정리하기','math,korean'],
 ['energy','미래 에너지 연구원','🔋','planet','햇빛·바람과 새 에너지 기술을 연구해요','사람과 지구가 지속가능하게 살 수 있게 도와요.','물리·화학·수학과 안전한 실험을 익혀요.','집에서 에너지를 아낄 수 있는 방법 찾기','math,korean'],
 ['urban','도시설계 전문가','🏙️','planet','공원·길·집을 연결해 편리하고 안전한 도시를 설계해요','모두가 이동하고 쉬기 좋은 동네를 만들어요.','지리·수학·그림·사회 문제 해결을 배워요.','우리 동네에 필요한 공원 하나를 그려 보기','math,korean']
];
const GROUP_IDS=new Set(CAREER_GROUPS.map(g=>g.id));
const SUBJECT_IDS=new Set(['math','korean','english','hanja']);
export const CAREERS=Object.freeze(PROFILE_ROWS.map(row=>{
 const [id,name,emoji,group,mission,impact,journey,tryIt,subjects]=row;
 if(!/^[a-z][a-z-]+$/.test(id)||!GROUP_IDS.has(group))throw new Error('Invalid career');
 const links=subjects.split(',').filter(s=>SUBJECT_IDS.has(s));
 if(!links.length)throw new Error('Missing career subjects');
 return Object.freeze({id,name,emoji,group,mission,impact,journey,tryIt,subjects:Object.freeze(links)});
}));
export function findCareer(id){return CAREERS.find(c=>c.id===id)||null;}
export const CAREER_BY_ID=new Map(CAREERS.map(c=>[c.id,c]));

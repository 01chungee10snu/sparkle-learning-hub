/**
 * Standalone child-safe story prompts inspired by the authored Unity 0.9 blueprint.
 * These are narrative wrappers, never a second answer engine or wallet.
 * The host remains the ONLY authority for questions, completion, stars, and IRT.
 */
export const STORY_QUESTS = Object.freeze([
  {
    id:'first-magic-seed', district:'garden', emoji:'🌱', title:'첫 마법 씨앗',
    guide:'정원 요정', intro:'작은 씨앗이 도착했어! 네가 마음에 드는 꽃밭을 골라 줄래?',
    choices:['분홍 꽃밭','별빛 꽃밭','달빛 꽃밭'],
    learning:'수를 세며 꽃이 자라도록 도와요', after:'우리가 돌본 정원에 새싹이 올라왔어요.',
    subject:'math', effect:'garden.seed-grow-stage'
  },
  {
    id:'lantern-road', district:'math', emoji:'🌟', title:'별빛 길 밝히기',
    guide:'뱁수 수학 도우미', intro:'숲속 오솔길의 랜턴이 꺼졌어. 어떤 길부터 환하게 밝힐까?',
    choices:['숲길부터','호숫길부터'],
    learning:'규칙과 숫자를 발견해요', after:'별빛이 마을 길을 환하게 비춰요.',
    subject:'math', effect:'path.lantern-on'
  },
  {
    id:'lost-letter', district:'korean', emoji:'✉️', title:'길 잃은 편지',
    guide:'우체부 토끼', intro:'친구에게 보내는 편지가 섞였어. 어떤 편지를 찾아볼까?',
    choices:['꽃 편지','별 편지'],
    learning:'글자를 읽고 이야기를 이해해요', after:'우리의 편지가 친구에게 무사히 도착했어요.',
    subject:'korean', effect:'plaza.postbox-flag'
  },
  {
    id:'butterfly-hello', district:'english', emoji:'🦋', title:'나비의 인사',
    guide:'영어 요정', intro:'멀리서 온 나비가 너를 기다려. 어떤 인사를 해 줄래?',
    choices:['색깔로 인사하기','이름을 말하기'],
    learning:'인사와 영어 표현을 익혀요', after:'기뻐하는 나비가 마법 정원에서 춤춰요.',
    subject:'english', effect:'garden.butterfly-visit'
  },
  {
    id:'whisper-book', district:'academy', emoji:'📚', title:'속삭이는 그림책',
    guide:'도서관 친구', intro:'이야기책 속에서 작은 빛이 새어 나와! 어떤 이야기를 찾아볼까?',
    choices:['숲 속 이야기','바다 이야기'],
    learning:'그림과 문장을 읽고 생각해요', after:'도서관에 새로운 이야기가 반짝여요.',
    subject:'korean', effect:'library.storybook-sparkle'
  },
  {
    id:'bridge-of-help', district:'practice', emoji:'🌉', title:'친구의 작은 다리',
    guide:'너구리 건축가', intro:'토끼가 시냇물을 건너기 어려워해. 어떤 다리를 만들까?',
    choices:['꽃 장식 다리','나무 다리'],
    learning:'도형과 크기를 비교해요', after:'친구가 우리 덕분에 길을 건넜어요.',
    subject:'math', effect:'village.small-bridge'
  },
  {
    id:'stargazer-challenge', district:'kma', emoji:'🔭', title:'별자리 관측소',
    guide:'별지기', intro:'별자리에 숨겨진 규칙을 찾는 특별한 모험이야. 천천히 풀어도 좋아.',
    choices:['혼자 도전하기','힌트와 함께 보기','나중에 해 보기'],
    learning:'어려운 문제도 다른 방법으로 생각해요', after:'새로운 별자리 하나를 발견했어요.',
    subject:'math', effect:'sky.constellation-sparkle'
  },
  {
    id:'gift-with-care', district:'shop', emoji:'🎁', title:'마법 선물 가게',
    guide:'선물 가게 친구', intro:'반짝이는 모자가 기다려! 구경만 해도 정말 좋아.',
    choices:['요정 꾸미기','가게 구경하기'],
    learning:'별 없이도 언제든 구경할 수 있어요', after:'나에게 어울리는 모습을 발견했어요.',
    subject:null, effect:null
  }
]);

export const STORY_DISTRICTS = Object.freeze({
  math:'수학 마법학교',korean:'한글 이야기관',english:'영어 요정학교',
  kma:'경시대회 성',practice:'연습 모험관',academy:'마법 도서관',
  garden:'정원 가꾸기',shop:'별 선물 가게'
});

export function findStory(district) {
  return STORY_QUESTS.find(item => item.district === district) ?? null;
}
export function recommendedStories(who='tae') {
  const primary = who === 'se' ? ['garden','english','korean'] : ['math','academy','garden'];
  return primary.map(district => findStory(district)).filter(Boolean);
}
export function describeStoryForSpeech(story, choice) {
  if (!story) return '';
  return [story.guide + '의 부탁.',story.intro,choice ? choice + '를 골랐어요.' : '',
    story.learning].filter(Boolean).join(' ');
}
export function storyCompletionText(story, gardenAdded) {
  if (!story || gardenAdded === false) return '';
  return story.after;
}

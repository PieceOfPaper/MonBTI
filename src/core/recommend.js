// 임시 무기 추천. 추천 계산이 기획에서 정해지지 않아 무기를 무작위로 고른다(docs/test-design.md).
// 같은 답변에서는 같은 결과가 나오도록 답변으로 만든 시드를 사용한다.
// 새로고침해도 결과가 바뀌지 않고, 답변을 수정하면 새로 뽑는다. 순위에는 의미가 없다.

export const RECOMMENDATION_COUNT = 3;

// FNV-1a 32비트 해시
function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32 의사 난수 생성기
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function answerSeed(questions, answers) {
  return hashString(questions.map(({ question_id }) => `${question_id}=${answers[question_id] ?? ''}`).join('&'));
}

export function pickTemporaryRecommendations(weapons, seed, count = RECOMMENDATION_COUNT) {
  const random = createRandom(seed);
  const pool = [...weapons];
  // Fisher–Yates 셔플 후 앞에서부터 고른다.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

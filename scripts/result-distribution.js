// 현재 질문·무기 데이터로 어떤 무기가 몇 % 비율로 추천되는지 모의 응답으로 추정한다. 밸런싱 전용이며 사이트에서 쓰지 않는다.
// 점수 계산은 사이트와 같은 src/core 함수를 그대로 사용한다.
import { AXIS_IDS } from '../src/core/axes.js';
import { RESPONSES, responseCoefficient } from '../src/core/responses.js';
import { computeAxisProfile, computeAxisTotals } from '../src/core/scoring.js';
import { RECOMMENDATION_COUNT, rankWeapons } from '../src/core/recommend.js';

const RESPONSE_VALUES = RESPONSES.map(({ value }) => value);
const COEFFICIENTS = RESPONSE_VALUES.map(responseCoefficient);

// 재현 가능한 난수(mulberry32). 같은 seed면 같은 결과를 낸다.
export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  const u = 1 - random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

// 연속 동의 정도 x(-1~1)를 계수가 가장 가까운 응답으로 바꾼다.
export function nearestResponse(x) {
  let best = 0;
  for (let i = 1; i < COEFFICIENTS.length; i += 1) {
    if (Math.abs(COEFFICIENTS[i] - x) < Math.abs(COEFFICIENTS[best] - x)) best = i;
  }
  return RESPONSE_VALUES[best];
}

// 응답 모형.
// - uniform: 모든 질문에 여섯 응답 중 하나를 무작위로 고른다. 아무렇게나 누르는 사용자에 가깝고 축 점수가 50 근처에 몰린다.
// - persona: 축마다 실제 취향(0~100)을 고르게 뽑고, 그 취향이 질문 가중치 방향으로 기대하는 동의 정도에
//   표준편차 noise의 흔들림을 더해 가장 가까운 응답을 고른다. 취향이 고르게 퍼진 사용자 집단을 가정한다.
export const ANSWER_MODELS = {
  uniform: (questions, random) => Object.fromEntries(questions.map(({ question_id }) => (
    [question_id, RESPONSE_VALUES[Math.floor(random() * RESPONSE_VALUES.length)]]
  ))),
  persona: (questions, random, { noise }) => {
    const trait = Object.fromEntries(AXIS_IDS.map((axis) => [axis, random() * 100]));
    return Object.fromEntries(questions.map((question) => {
      let signed = 0;
      let maxAbs = 0;
      for (const axis of AXIS_IDS) {
        const weight = question[axis] ?? 0;
        signed += weight * ((trait[axis] - 50) / 50);
        maxAbs += Math.abs(weight);
      }
      const expected = maxAbs ? signed / maxAbs : 0;
      return [question.question_id, nearestResponse(expected + noise * gaussian(random))];
    }));
  },
};

// samples번 모의 응답을 만들어 무기별 1순위·3순위 이내 횟수, 순위 합, 1순위가 된 사용자의 축 점수 합을 센다.
export function simulateDistribution({ questions, weapons, model, samples, seed = 1, noise = 0.3 }) {
  const answer = ANSWER_MODELS[model];
  if (!answer) throw new Error(`알 수 없는 응답 모형입니다: ${model}`);
  const random = createRandom(seed);
  const stats = weapons.map((weapon) => ({
    weapon,
    first: 0,
    top: 0,
    rankSum: 0,
    profileSum: Object.fromEntries(AXIS_IDS.map((axis) => [axis, 0])),
  }));
  const byId = new Map(stats.map((entry) => [entry.weapon.weapon_id, entry]));
  let ties = 0;

  for (let i = 0; i < samples; i += 1) {
    const profile = computeAxisProfile(computeAxisTotals(questions, answer(questions, random, { noise })));
    const ranked = rankWeapons(weapons, profile);
    ranked.forEach(({ weapon }, rank) => {
      const entry = byId.get(weapon.weapon_id);
      entry.rankSum += rank + 1;
      if (rank < RECOMMENDATION_COUNT) entry.top += 1;
    });
    const winner = byId.get(ranked[0].weapon.weapon_id);
    winner.first += 1;
    for (const axis of AXIS_IDS) winner.profileSum[axis] += profile[axis] ?? 0;
    if (ranked.length > 1 && ranked[0].score === ranked[1].score) ties += 1;
  }

  return {
    model,
    samples,
    seed,
    noise: model === 'persona' ? noise : null,
    ties,
    weapons: stats.map(({ weapon, first, top, rankSum, profileSum }) => ({
      weapon_id: weapon.weapon_id,
      weapon_name: weapon.weapon_name,
      firstRate: first / samples,
      topRate: top / samples,
      averageRank: rankSum / samples,
      firstProfile: first
        ? Object.fromEntries(AXIS_IDS.map((axis) => [axis, profileSum[axis] / first]))
        : null,
    })),
  };
}

// 무기 추천 계산. 공식은 docs/test-design.md의 '무기 적합도와 추천 순위'를 따른다.
// 사용자 점수(0~100)와 무기 기준값(0~100)의 축별 불일치를 구하고,
// 측정된 축의 적합도(100 - 불일치)를 축별 최종 가중치로 가중 평균해 무기 점수로 쓴다.
import { AXIS_IDS } from './axes.js';

export const RECOMMENDATION_COUNT = 3;

// 축별 불일치. attack·counter는 대칭 취향 거리다. freedom은 무기가 사용자보다 낮은 차이는 전부,
// 높은 차이는 절반만 본다. complexity·management는 반대로 높은 차이는 전부, 낮은 차이는 절반만 본다.
const LOWER_DEMAND_RATE = 0.5;
const demandMismatch = (user, weapon) => Math.max(0, weapon - user) + LOWER_DEMAND_RATE * Math.max(0, user - weapon);
const freedomMismatch = (user, weapon) => Math.max(0, user - weapon) + LOWER_DEMAND_RATE * Math.max(0, weapon - user);

export const AXIS_MISMATCH = {
  attack: (user, weapon) => Math.abs(user - weapon),
  freedom: freedomMismatch,
  complexity: demandMismatch,
  management: demandMismatch,
  counter: (user, weapon) => Math.abs(user - weapon),
};

// 최종 합산 가중치(DEC-044). 양방향 차이를 모두 반영하는 attack·counter의 실질 비중을 낮춘다.
export const AXIS_WEIGHTS = {
  attack: 0.75,
  freedom: 1,
  complexity: 1,
  management: 1,
  counter: 0.75,
};

const isMeasured = (value) => value !== null && value !== undefined;

function axisDirection(user, weapon) {
  if (weapon < user) return 'lower';
  if (weapon > user) return 'higher';
  return 'equal';
}

// 무기 하나의 점수와 축별 상세값. 추천 순위와 추천 이유(core/reason.js)가 같은 계산을 쓴다.
// mismatch·fit은 성향 거리, weight·weightedMismatch·weightedFit은 최종 점수와 순위 기여도에 쓴다.
// 미측정(null) 축은 axes와 가중치 합에서 뺀다. 측정된 축이 없으면 score는 null이다.
export function scoreWeapon(profile, weapon) {
  const axes = {};
  let weightSum = 0;
  let weightedFitSum = 0;
  let maxMismatch = null;
  for (const axis of AXIS_IDS) {
    const user = profile[axis];
    if (!isMeasured(user)) continue;
    const mismatch = AXIS_MISMATCH[axis](user, weapon[axis]);
    const fit = 100 - mismatch;
    const weight = AXIS_WEIGHTS[axis];
    axes[axis] = {
      user,
      weapon: weapon[axis],
      direction: axisDirection(user, weapon[axis]),
      mismatch,
      fit,
      weight,
      weightedMismatch: weight * mismatch,
      weightedFit: weight * fit,
    };
    weightSum += weight;
    weightedFitSum += weight * fit;
    maxMismatch = maxMismatch === null ? mismatch : Math.max(maxMismatch, mismatch);
  }
  if (weightSum === 0) return { score: null, maxMismatch: null, weightSum: 0, axes };
  return { score: weightedFitSum / weightSum, maxMismatch, weightSum, axes };
}

// 반올림하지 않은 점수 내림차순. 동점이면 가중치를 적용하지 않은 최대 단일 축 불일치가 작은 무기,
// 다시 같으면 시트 행 순서.
export function rankWeapons(weapons, profile) {
  return weapons
    .map((weapon, order) => ({ weapon, order, ...scoreWeapon(profile, weapon) }))
    .sort((a, b) => (b.score - a.score) || (a.maxMismatch - b.maxMismatch) || (a.order - b.order));
}

export function recommendWeapons(weapons, profile, count = RECOMMENDATION_COUNT) {
  return rankWeapons(weapons, profile).slice(0, count).map(({ weapon }) => weapon);
}

// 1~3순위(top) 이후의 무기를 순위대로 돌려준다. 공유 링크처럼 top이 따로 정해진 경우에도
// top에 없는 무기만 같은 순위 규칙으로 이어 붙인다.
export function remainingWeapons(weapons, profile, top) {
  const topIds = new Set(top.map(({ weapon_id }) => weapon_id));
  return rankWeapons(weapons, profile)
    .map(({ weapon }) => weapon)
    .filter(({ weapon_id }) => !topIds.has(weapon_id));
}

// 무기 추천 계산. 공식은 docs/test-design.md의 '무기 적합도와 추천 순위'를 따른다.
// 사용자 점수(0~100)와 무기 기준값(0~100)의 축별 불일치를 구하고,
// 측정된 축의 적합도(100 - 불일치)를 축별 최종 가중치로 가중 평균해 무기 점수로 쓴다.
// 축 목록·불일치 공식·가중치는 작품의 축 모델(core/axis-models.js)에서 받는다. 모델을 주지 않으면 기존 와일즈 모델이다.
import { DEFAULT_AXIS_MODEL, FREEDOM_MODEL, excessDemandMismatch } from './axis-models.js';

export { excessDemandMismatch };

export const RECOMMENDATION_COUNT = 3;

// 기존 와일즈의 축별 불일치와 최종 합산 가중치. 작품별 값은 축 모델의 mismatch·weights를 쓴다.
export const AXIS_MISMATCH = FREEDOM_MODEL.mismatch;
export const AXIS_WEIGHTS = FREEDOM_MODEL.weights;

const isMeasured = (value) => value !== null && value !== undefined;

function axisDirection(user, weapon) {
  if (weapon < user) return 'lower';
  if (weapon > user) return 'higher';
  return 'equal';
}

// 무기 하나의 점수와 축별 상세값. 추천 순위와 추천 이유(core/reason.js)가 같은 계산을 쓴다.
// mismatch·fit은 성향 거리, weight·weightedMismatch·weightedFit은 최종 점수와 순위 기여도에 쓴다.
// 미측정(null) 축은 axes와 가중치 합에서 뺀다. 측정된 축이 없으면 score는 null이다.
export function scoreWeapon(profile, weapon, model = DEFAULT_AXIS_MODEL) {
  const axes = {};
  let weightSum = 0;
  let weightedFitSum = 0;
  let maxMismatch = null;
  for (const axis of model.axisIds) {
    const user = profile[axis];
    if (!isMeasured(user)) continue;
    const mismatch = model.mismatch[axis](user, weapon[axis]);
    const fit = 100 - mismatch;
    const weight = model.weights[axis];
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
export function rankWeapons(weapons, profile, model = DEFAULT_AXIS_MODEL) {
  return weapons
    .map((weapon, order) => ({ weapon, order, ...scoreWeapon(profile, weapon, model) }))
    .sort((a, b) => (b.score - a.score) || (a.maxMismatch - b.maxMismatch) || (a.order - b.order));
}

export function recommendWeapons(weapons, profile, { count = RECOMMENDATION_COUNT, axisModel = DEFAULT_AXIS_MODEL } = {}) {
  return rankWeapons(weapons, profile, axisModel).slice(0, count).map(({ weapon }) => weapon);
}

// 1~3순위(top) 이후의 무기를 순위대로 돌려준다. 공유 링크처럼 top이 따로 정해진 경우에도
// top에 없는 무기만 같은 순위 규칙으로 이어 붙인다.
export function remainingWeapons(weapons, profile, top, model = DEFAULT_AXIS_MODEL) {
  const topIds = new Set(top.map(({ weapon_id }) => weapon_id));
  return rankWeapons(weapons, profile, model)
    .map(({ weapon }) => weapon)
    .filter(({ weapon_id }) => !topIds.has(weapon_id));
}

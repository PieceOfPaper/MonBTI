// 무기 추천 계산. 공식은 docs/test-design.md의 '무기 적합도와 추천 순위'를 따른다.
// 사용자 점수(0~100)와 무기 기준값(0~100)의 축별 불일치를 구하고,
// 측정된 축의 적합도(100 - 불일치)를 같은 비중으로 평균해 무기 점수로 쓴다.

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

// 무기 하나의 점수. 미측정(null) 축은 평균에서 뺀다. 측정된 축이 없으면 score는 null이다.
export function scoreWeapon(profile, weapon) {
  const mismatches = Object.entries(AXIS_MISMATCH)
    .filter(([axis]) => profile[axis] !== null && profile[axis] !== undefined)
    .map(([axis, mismatch]) => mismatch(profile[axis], weapon[axis]));
  if (mismatches.length === 0) return { score: null, maxMismatch: null };
  const fits = mismatches.map((mismatch) => 100 - mismatch);
  return {
    score: fits.reduce((sum, fit) => sum + fit, 0) / fits.length,
    maxMismatch: Math.max(...mismatches),
  };
}

// 반올림하지 않은 점수 내림차순. 동점이면 최대 단일 축 불일치가 작은 무기, 다시 같으면 시트 행 순서.
export function rankWeapons(weapons, profile) {
  return weapons
    .map((weapon, order) => ({ weapon, order, ...scoreWeapon(profile, weapon) }))
    .sort((a, b) => (b.score - a.score) || (a.maxMismatch - b.maxMismatch) || (a.order - b.order));
}

export function recommendWeapons(weapons, profile, count = RECOMMENDATION_COUNT) {
  return rankWeapons(weapons, profile).slice(0, count).map(({ weapon }) => weapon);
}

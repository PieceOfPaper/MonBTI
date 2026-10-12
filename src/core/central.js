// 중앙형 응답 특별 결과(GitHub 이슈 #1, DEC-058). 작품 설정 centralResult가 켜진 검사에만 쓴다.
// 다섯 축이 모두 50 근처라 뚜렷한 성향이 없는 응답은 일반 적합도 1위 대신, 작은 차이를 4배로 키운 점수의
// 1위를 재미 결과로 보여 주고 2·3순위는 원래 점수 순위로 채운다. 공식은 docs/test-design.md '중앙형 응답 특별 결과'를 따른다.
import { AXIS_IDS } from './axes.js';
import { RECOMMENDATION_COUNT, rankWeapons } from './recommend.js';

export const CENTRAL_DEVIATION_LIMIT = 10;
export const AMPLIFY_FACTOR = 4;
// 원래 점수가 정확히 50인 축을 옮기는 값. 50 ± 1을 4배 확대하면 54·46이 된다.
const TIE_OFFSET = 1;

const isMeasured = (value) => value !== null && value !== undefined;

// 중앙 이탈도: 측정된 축의 |축 - 50| 평균. 다섯 축이 모두 측정되면 Σ|축 - 50| / 5다.
// 화면 표시용으로 반올림하기 전 점수로 계산한다. 측정된 축이 없으면 null이다.
export function centralDeviation(profile) {
  const values = AXIS_IDS.map((axis) => profile[axis]).filter(isMeasured);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + Math.abs(value - 50), 0) / values.length;
}

export function isCentralProfile(profile) {
  const deviation = centralDeviation(profile);
  return deviation !== null && deviation <= CENTRAL_DEVIATION_LIMIT;
}

// 정확히 50인 축을 축 순서대로 51 또는 49로 옮긴다. 50보다 큰 축이 많으면 49, 작은 축이 많으면 51,
// 같으면 51이며, 옮긴 축도 다음 축의 개수에 넣는다. 모두 50이면 51·49·51·49·51이 된다.
export function breakCenterTies(profile) {
  let above = AXIS_IDS.filter((axis) => isMeasured(profile[axis]) && profile[axis] > 50).length;
  let below = AXIS_IDS.filter((axis) => isMeasured(profile[axis]) && profile[axis] < 50).length;
  const result = { ...profile };
  for (const axis of AXIS_IDS) {
    if (profile[axis] !== 50) continue;
    if (above > below) {
      result[axis] = 50 - TIE_OFFSET;
      below += 1;
    } else {
      result[axis] = 50 + TIE_OFFSET;
      above += 1;
    }
  }
  return result;
}

// 4배 확대 점수: clamp(50 + 4 × (축 - 50), 0, 100). 정확히 50인 축은 먼저 51·49로 옮긴다. 미측정 축은 null로 둔다.
export function amplifyProfile(profile) {
  const moved = breakCenterTies(profile);
  return Object.fromEntries(AXIS_IDS.map((axis) => {
    const value = moved[axis];
    if (!isMeasured(value)) return [axis, null];
    return [axis, Math.min(100, Math.max(0, 50 + AMPLIFY_FACTOR * (value - 50)))];
  }));
}

// 특별 결과의 1~3순위. 1순위는 확대 점수 순위 1위, 2·3순위는 원래 점수 순위에서 1순위를 뺀 앞의 두 무기다.
export function centralRecommendation(weapons, profile, count = RECOMMENDATION_COUNT) {
  const winner = rankWeapons(weapons, amplifyProfile(profile))[0].weapon;
  const rest = rankWeapons(weapons, profile)
    .map(({ weapon }) => weapon)
    .filter(({ weapon_id }) => weapon_id !== winner.weapon_id);
  return [winner, ...rest.slice(0, count - 1)];
}

// 설명 모델. 1순위가 확대 점수에서 다른 무기를 앞선 축과 원래 점수 순위를 계산해 둔다.
// 비교 대상은 확대 점수 순위에서 1순위를 뺀 첫 무기다. 축별 우위는 축 가중치가 반영된 불일치 차이
// w_a × (D_비교,a - D_1순위,a)이며, 0보다 큰 축을 큰 순서로 최대 maxAxes개 고른다.
// 우위 축이 없으면 확대 점수가 50에서 가장 멀리 간 축 하나를 쓴다.
// 원래 점수가 정확히 50이라 규칙으로 방향을 정한 축(forcedAxes)은 실제로 기운 성향이 아니므로 axes 후보에서 뺀다.
// 공유 결과는 반올림한 점수로 다시 계산하므로 경계 근처에서는 직접 본 결과와 축 설명이 조금 다를 수 있다.
export function buildCentralModel(weapons, profile, winner, { maxAxes = 2 } = {}) {
  const amplified = amplifyProfile(profile);
  const ranked = rankWeapons(weapons, amplified);
  const winnerScore = ranked.find(({ weapon }) => weapon.weapon_id === winner.weapon_id);
  const rival = ranked.find(({ weapon }) => weapon.weapon_id !== winner.weapon_id);
  const side = (axis) => (amplified[axis] >= 50 ? 'higher' : 'lower');
  const forcedAxes = AXIS_IDS.filter((axis) => profile[axis] === 50);
  const leaning = (axis) => isMeasured(profile[axis]) && profile[axis] !== 50;

  let axes = AXIS_IDS
    .filter((axis) => leaning(axis) && winnerScore.axes[axis] && rival.axes[axis])
    .map((axis) => ({ axis, gain: rival.axes[axis].weightedMismatch - winnerScore.axes[axis].weightedMismatch }))
    .filter(({ gain }) => gain > 0)
    .sort((a, b) => (b.gain - a.gain) || (AXIS_IDS.indexOf(a.axis) - AXIS_IDS.indexOf(b.axis)))
    .slice(0, maxAxes)
    .map(({ axis }) => ({ axis, side: side(axis) }));
  if (!axes.length) {
    const far = AXIS_IDS
      .filter(leaning)
      .sort((a, b) => Math.abs(amplified[b] - 50) - Math.abs(amplified[a] - 50))[0];
    axes = far ? [{ axis: far, side: side(far) }] : [];
  }

  const originalRank = rankWeapons(weapons, profile).findIndex(({ weapon }) => weapon.weapon_id === winner.weapon_id) + 1;
  return {
    deviation: centralDeviation(profile),
    amplified,
    winnerId: winner.weapon_id,
    rivalId: rival.weapon.weapon_id,
    axes,
    forcedAxes,
    originalRank,
  };
}

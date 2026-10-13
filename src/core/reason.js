// 1순위 추천 이유 모델. 규칙은 docs/result-reason.md를 따른다.
// 추천 순위와 같은 축별 계산(scoreWeapon)을 쓰고, 문장 대신 축 ID와 수치만 돌려준다.
// 잘 맞는 점·낯설 수 있는 점·2순위가 더 가까운 점은 원래 불일치(mismatch)로,
// 1순위가 된 이유(화면 소제목 ‘결정적인 차이’)는 축 가중치를 곱한 상대 우위(weightedAmount)로 고른다.
import { DEFAULT_AXIS_MODEL } from './axis-models.js';
import { scoreWeapon } from './recommend.js';

// 문구 임계값. 계산 중에는 반올림하지 않고 원본 실수 값으로 비교한다.
export const VERY_CLOSE_MAX = 10;
export const CLOSE_MAX = 20;
export const SOME_DIFFERENCE_MAX = 30;
export const CAUTION_MIN = 20;
export const COMPARISON_MIN = 5;
export const CLOSE_SCORE_GAP = 2;
export const MODERATE_SCORE_GAP = 5;
export const STRONG_ADVANTAGE_MIN = 10;
export const MODERATE_ADVANTAGE_MIN = 5;

const CLOSEST_COUNT = 2;
const ADVANTAGE_COUNT = 2;

export function mismatchBand(mismatch) {
  if (mismatch <= VERY_CLOSE_MAX) return 'very-close';
  if (mismatch <= CLOSE_MAX) return 'close';
  if (mismatch <= SOME_DIFFERENCE_MAX) return 'some-difference';
  return 'far';
}

export function gapLevel(scoreGap) {
  if (scoreGap < CLOSE_SCORE_GAP) return 'close';
  if (scoreGap < MODERATE_SCORE_GAP) return 'moderate';
  return 'clear';
}

export function advantageStrength(weightedAmount) {
  if (weightedAmount >= STRONG_ADVANTAGE_MIN) return 'strong';
  if (weightedAmount >= MODERATE_ADVANTAGE_MIN) return 'moderate';
  return 'slight';
}

// 값 내림차순(또는 오름차순), 같으면 축 모델의 축 순서.
const byValue = (axisIds, key, descending) => (a, b) =>
  (descending ? b[key] - a[key] : a[key] - b[key]) || (axisIds.indexOf(a.axis) - axisIds.indexOf(b.axis));

function comparisonStatus(winner, runner) {
  if (!runner) return 'missing-runner-up';
  const gap = winner.score - runner.score;
  if (gap > 0) return 'normal';
  if (gap < 0) return 'stale';
  // 최종 점수가 같으면 순위 규칙처럼 최대 단일 축 불일치로 가린다. 저장된 순서와 반대면 stale이다.
  return winner.maxMismatch > runner.maxMismatch ? 'stale' : 'tie';
}

// profile: 사용자 축 점수, winner·runnerUp: 결과의 1·2순위 무기(runnerUp은 없을 수 있음).
// model은 작품의 축 모델(core/axis-models.js)이며 추천 순위와 같은 모델을 넘긴다. 측정된 축이 없으면 null을 돌려준다.
export function buildRecommendationReason(profile, winner, runnerUp, model = DEFAULT_AXIS_MODEL) {
  const winnerScore = scoreWeapon(profile, winner, model);
  if (winnerScore.score === null) return null;
  const runnerScore = runnerUp ? scoreWeapon(profile, runnerUp, model) : null;
  const status = comparisonStatus(winnerScore, runnerScore);
  const measured = model.axisIds.filter((axis) => winnerScore.axes[axis]);
  const winnerAxes = measured.map((axis) => ({ axis, ...winnerScore.axes[axis] }));

  const closest = [...winnerAxes].sort(byValue(model.axisIds, 'mismatch', false)).slice(0, CLOSEST_COUNT)
    .map(({ axis, mismatch, direction }) => ({ axis, mismatch, band: mismatchBand(mismatch), direction }));

  const top = [...winnerAxes].sort(byValue(model.axisIds, 'mismatch', true))[0];
  const caution = top.mismatch > CAUTION_MIN
    ? { axis: top.axis, mismatch: top.mismatch, band: mismatchBand(top.mismatch), direction: top.direction }
    : null;

  const base = {
    winnerId: winner.weapon_id,
    runnerUpId: runnerUp?.weapon_id ?? null,
    scoreGap: null,
    weightSum: winnerScore.weightSum,
    comparisonStatus: status,
    gapLevel: null,
    tieReason: null,
    closest,
    advantages: [],
    tradeoff: null,
    caution,
  };
  // 2순위가 없거나 공유 뒤 기준값이 바뀌어 순서가 뒤집혔으면 1순위 자체의 설명만 남긴다.
  if (status === 'missing-runner-up' || status === 'stale') {
    return { ...base, scoreGap: runnerScore ? winnerScore.score - runnerScore.score : null };
  }

  const pairs = measured.map((axis) => {
    const winnerMismatch = winnerScore.axes[axis].mismatch;
    const runnerMismatch = runnerScore.axes[axis].mismatch;
    const rawAmount = runnerMismatch - winnerMismatch;
    const weightedAmount = winnerScore.axes[axis].weight * rawAmount;
    return {
      axis,
      rawAmount,
      weightedAmount,
      scoreContribution: weightedAmount / winnerScore.weightSum,
      strength: advantageStrength(weightedAmount),
      winnerMismatch,
      runnerMismatch,
    };
  });

  const advantages = status === 'normal'
    ? pairs.filter(({ weightedAmount }) => weightedAmount > 0).sort(byValue(model.axisIds, 'weightedAmount', true)).slice(0, ADVANTAGE_COUNT)
    : [];

  const tradeoffs = pairs.map(({ axis, winnerMismatch, runnerMismatch }) => ({
    axis, amount: winnerMismatch - runnerMismatch, winnerMismatch, runnerMismatch,
  })).filter(({ amount }) => amount >= COMPARISON_MIN).sort(byValue(model.axisIds, 'amount', true));

  const scoreGap = winnerScore.score - runnerScore.score;
  return {
    ...base,
    scoreGap,
    gapLevel: status === 'normal' ? gapLevel(scoreGap) : null,
    tieReason: status === 'tie'
      ? (winnerScore.maxMismatch < runnerScore.maxMismatch ? 'max-mismatch' : 'row-order')
      : null,
    advantages,
    tradeoff: tradeoffs[0] ?? null,
  };
}

// 페르소나 목표 축 점수에 가장 가까운 1~6 응답을 찾는다. 규칙은 docs/persona-test-plan.md의 '응답 자동 탐색'을 따른다.
// 축 점수는 사이트와 같은 computeAxisTotals·computeAxisProfile로 계산하며, 응답 계수와 정규화식을 다시 구현하지 않는다.
import { DEFAULT_AXIS_MODEL } from '../../src/core/axis-models.js';
import { RESPONSES } from '../../src/core/responses.js';
import { computeAxisProfile, computeAxisTotals } from '../../src/core/scoring.js';

const RESPONSE_VALUES = RESPONSES.map(({ value }) => value);
// 부동소수 합산 순서 차이로 생기는 미세한 오차는 같은 값으로 보고 사전순 규칙으로 고른다.
const EPSILON = 1e-9;

const measuredAxes = (question, axisIds) => axisIds.filter((axis) => (question[axis] ?? 0) !== 0);

export class MultiAxisQuestionError extends Error {
  constructor(questions) {
    const detail = questions.map(({ question, axes }) => `${question.question_id}(${axes.join('·')})`).join(', ');
    super(`여러 축을 측정하는 질문이 있어 축별 독립 탐색을 사용할 수 없습니다: ${detail}. `
      + '전체 문항 빔 탐색 또는 명시적인 답변 fixture 방식으로 전환해야 합니다(docs/persona-test-plan.md).');
    this.name = 'MultiAxisQuestionError';
  }
}

// 축 → 그 축만 측정하는 질문 목록(질문 배열 순서 유지). 다축 질문이 있으면 오류를 낸다.
// axisModel은 작품의 축 모델(core/axis-models.js)이다.
export function groupQuestionsByAxis(questions, axisModel = DEFAULT_AXIS_MODEL) {
  const { axisIds } = axisModel;
  const multi = questions
    .map((question) => ({ question, axes: measuredAxes(question, axisIds) }))
    .filter(({ axes }) => axes.length > 1);
  if (multi.length) throw new MultiAxisQuestionError(multi);
  const groups = Object.fromEntries(axisIds.map((axis) => [axis, []]));
  for (const question of questions) {
    const [axis] = measuredAxes(question, axisIds);
    if (axis) groups[axis].push(question);
  }
  return groups;
}

// 길이 n의 1~6 응답 배열을 사전순으로 생성한다.
function* responseCombinations(n) {
  const combo = Array(n).fill(RESPONSE_VALUES[0]);
  while (true) {
    yield combo;
    let i = n - 1;
    while (i >= 0 && combo[i] === RESPONSE_VALUES.at(-1)) {
      combo[i] = RESPONSE_VALUES[0];
      i -= 1;
    }
    if (i < 0) return;
    combo[i] += 1;
  }
}

// 한 축의 질문들로 목표값에 가장 가까운 응답 조합을 찾는다. 같은 오차면 먼저 생성된(사전순으로 앞선) 조합을 유지한다.
function searchAxis(axis, axisQuestions, target, axisModel) {
  if (!axisQuestions.length) {
    throw new Error(`'${axis}' 축을 측정하는 질문이 없어 목표 ${target}을 재현할 수 없습니다.`);
  }
  let best = null;
  for (const combo of responseCombinations(axisQuestions.length)) {
    const answers = Object.fromEntries(axisQuestions.map(({ question_id }, i) => [question_id, combo[i]]));
    const value = computeAxisProfile(computeAxisTotals(axisQuestions, answers, axisModel))[axis];
    const error = Math.abs(value - target);
    if (!best || error < best.error - EPSILON) best = { answers, value, error };
  }
  return best;
}

// 축이 서로 독립이므로 축별 최소 오차 조합이 최대 축 오차와 평균 절대 오차를 함께 최소화한다.
// 축별 사전순 최소 조합을 합치면 전체 질문 순서 기준으로도 사전순 최소가 된다.
// 어느 축에도 영향이 없는 질문은 결과와 무관하므로 가장 앞선 응답(1)으로 채운다.
export function searchAnswers(questions, targetProfile, axisModel = DEFAULT_AXIS_MODEL) {
  const { axisIds } = axisModel;
  const groups = groupQuestionsByAxis(questions, axisModel);
  const answers = Object.fromEntries(questions.map(({ question_id }) => [question_id, RESPONSE_VALUES[0]]));
  for (const axis of axisIds) Object.assign(answers, searchAxis(axis, groups[axis], targetProfile[axis], axisModel).answers);

  // 최종 프로필은 합친 전체 답변으로 다시 계산해 실제 검사 흐름과 같게 만든다.
  const profile = computeAxisProfile(computeAxisTotals(questions, answers, axisModel));
  const axisErrors = Object.fromEntries(axisIds.map((axis) => [axis, Math.abs(profile[axis] - targetProfile[axis])]));
  const errors = Object.values(axisErrors);
  return {
    answers,
    profile,
    axisErrors,
    maxAxisError: Math.max(...errors),
    meanAbsoluteError: errors.reduce((sum, e) => sum + e, 0) / errors.length,
  };
}

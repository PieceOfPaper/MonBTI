// 사용자 축별 합산값 계산. 규칙은 docs/test-design.md의 '환산과 집계'를 따른다.
import { AXIS_IDS } from './axes.js';
import { contribution, isValidResponse } from './responses.js';

// 답변은 { [question_id]: 1~6 }으로 관리한다. 답변 수정은 같은 키의 값을 교체한다.
export function setAnswer(answers, questions, questionId, response) {
  if (!questions.some(({ question_id }) => question_id === questionId)) {
    throw new Error(`존재하지 않는 질문입니다: ${questionId}`);
  }
  if (!isValidResponse(response)) throw new RangeError(`응답은 1~6의 정수여야 합니다: ${response}`);
  return { ...answers, [questionId]: response };
}

// 저장소 등 외부에서 읽은 답변에서 유효한 항목만 남긴다.
export function sanitizeAnswers(raw, questions) {
  if (!raw || typeof raw !== 'object') return {};
  const ids = new Set(questions.map(({ question_id }) => question_id));
  return Object.fromEntries(Object.entries(raw).filter(([id, response]) => ids.has(id) && isValidResponse(response)));
}

export function isComplete(answers, questions) {
  return questions.length > 0 && questions.every(({ question_id }) => isValidResponse(answers[question_id]));
}

export function firstUnansweredIndex(answers, questions) {
  const index = questions.findIndex(({ question_id }) => !isValidResponse(answers[question_id]));
  return index === -1 ? questions.length : index;
}

// 축별 { total, count }. 0이 아닌 가중치가 있는 답변 문항이 없으면 total은 null이다.
// 계산은 매번 현재 답변 전체에서 다시 하므로 답변 수정이 중복 누적되지 않는다.
export function computeAxisTotals(questions, answers) {
  const result = Object.fromEntries(AXIS_IDS.map((axis) => [axis, { total: null, count: 0 }]));
  for (const question of questions) {
    const response = answers[question.question_id];
    if (!isValidResponse(response)) continue;
    for (const axis of AXIS_IDS) {
      const weight = question[axis] ?? 0;
      if (weight === 0) continue;
      const entry = result[axis];
      entry.total = (entry.total ?? 0) + contribution(weight, response);
      entry.count += 1;
    }
  }
  return result;
}

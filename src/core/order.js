// 질문 표시 순서. 검사를 시작할 때 한 번 무작위로 섞고, 저장한 순서로 새로고침·답변 수정 중에도 유지한다.
// 원본의 question_order는 편집용 기준 순서이며 표시 순서를 정하지 않는다.

// Fisher–Yates. random은 [0, 1) 값을 돌려주는 함수다.
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 저장한 question_id 순서가 현재 질문 집합과 정확히 같으면 그 순서를, 아니면 새로 섞은 순서를 돌려준다.
export function resolveQuestionOrder(savedIds, questions, random = Math.random) {
  const ids = questions.map(({ question_id }) => question_id);
  const valid = Array.isArray(savedIds)
    && savedIds.length === ids.length
    && new Set(savedIds).size === ids.length
    && savedIds.every((id) => ids.includes(id));
  return valid ? savedIds : shuffle(ids, random);
}

export function orderQuestions(questions, orderIds) {
  const byId = new Map(questions.map((question) => [question.question_id, question]));
  return orderIds.map((id) => byId.get(id));
}

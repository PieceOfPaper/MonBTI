// 모든 질문이 공유하는 1~6단계 동의 응답. 질문 데이터에 반복 저장하지 않는다.
export const RESPONSES = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '조금 그렇지 않다' },
  { value: 4, label: '조금 그렇다' },
  { value: 5, label: '그렇다' },
  { value: 6, label: '매우 그렇다' },
];

export function isValidResponse(response) {
  return Number.isInteger(response) && response >= 1 && response <= 6;
}

// 응답 1~6의 동의 강도: -100%, -70%, -30%, +30%, +70%, +100%.
// 극단 응답을 피하고 '그렇다'를 주로 고르는 경향을 반영하되 양쪽을 대칭으로 둔다.
const RESPONSE_COEFFICIENTS = [-1, -0.7, -0.3, 0.3, 0.7, 1];

export function responseCoefficient(response) {
  if (!isValidResponse(response)) throw new RangeError(`응답은 1~6의 정수여야 합니다: ${response}`);
  return RESPONSE_COEFFICIENTS[response - 1];
}

// 질문 가중치 × 응답 계수.
export function contribution(weight, response) {
  return weight * responseCoefficient(response);
}

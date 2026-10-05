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

// c(r) = (2r - 7) / 5 → -1, -0.6, -0.2, 0.2, 0.6, 1
export function responseCoefficient(response) {
  if (!isValidResponse(response)) throw new RangeError(`응답은 1~6의 정수여야 합니다: ${response}`);
  return (2 * response - 7) / 5;
}

// 가중치 × c(r). 부동소수 오차를 줄이려고 나눗셈을 마지막에 한다.
export function contribution(weight, response) {
  responseCoefficient(response);
  return (weight * (2 * response - 7)) / 5;
}

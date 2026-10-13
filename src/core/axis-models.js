// 작품별 축 모델: 사용하는 축 목록, 축별 불일치 공식, 최종 합산 가중치, 입문 난이도 원점수.
// 기존 와일즈는 FREEDOM_MODEL(docs/test-design.md), 와일즈 V2는 CONSTRAINT_MODEL(docs/wilds-v2-plan.md)을 쓴다.
// 작품 설정(src/games/index.js)의 axisModel로 지정하며, 계산 함수는 모델을 받지 않으면 FREEDOM_MODEL을 쓴다.
import { AXES, V2_AXES } from './axes.js';

const LOWER_DEMAND_RATE = 0.5;

// 무기가 사용자보다 더 많이 요구하는 초과 부담: 처음 10점 50%·다음 10점 75%·20점 초과분 100%를 앞 구간부터 누적한다(DEC-054).
export function excessDemandMismatch(excess) {
  const d = Math.max(0, excess);
  return 0.5 * Math.min(d, 10) + 0.75 * Math.min(Math.max(d - 10, 0), 10) + Math.max(d - 20, 0);
}

// 취향 일치형(attack·counter): 대칭 거리.
export const preferenceMismatch = (user, weapon) => Math.abs(user - weapon);

// 부담형: 초과 부담은 3구간 완충, 무기가 덜 요구하는 차이는 절반만 본다.
export const demandMismatch = (user, weapon) =>
  excessDemandMismatch(weapon - user) + LOWER_DEMAND_RATE * Math.max(0, user - weapon);

// 기존 와일즈의 자유도: 무기가 덜 자유로운 차이는 전부, 더 자유로운 차이는 절반만 본다.
const freedomMismatch = (user, weapon) => Math.max(0, user - weapon) + LOWER_DEMAND_RATE * Math.max(0, weapon - user);

// 최종 합산 가중치(DEC-044). 양방향 차이를 모두 반영하는 attack·counter의 실질 비중을 낮춘다.
const PREFERENCE_WEIGHT = 0.75;

const createModel = ({ id, axes, mismatch, weights, difficultyScore }) => ({
  id, axes, axisIds: axes.map((axis) => axis.id), mismatch, weights, difficultyScore,
});

export const FREEDOM_MODEL = createModel({
  id: 'freedom',
  axes: AXES,
  mismatch: {
    attack: preferenceMismatch,
    freedom: freedomMismatch,
    complexity: demandMismatch,
    management: demandMismatch,
    counter: preferenceMismatch,
  },
  weights: { attack: PREFERENCE_WEIGHT, freedom: 1, complexity: 1, management: 1, counter: PREFERENCE_WEIGHT },
  // 행동 제약(100 - freedom)·운용 복잡도·관리 부담의 합.
  difficultyScore: (weapon) => (100 - weapon.freedom) + weapon.complexity + weapon.management,
});

// 와일즈 V2. 제약·복잡·관리 세 부담 허용형 축이 같은 demandMismatch를 쓴다.
export const CONSTRAINT_MODEL = createModel({
  id: 'constraint',
  axes: V2_AXES,
  mismatch: {
    attack: preferenceMismatch,
    constraint: demandMismatch,
    complexity: demandMismatch,
    management: demandMismatch,
    counter: preferenceMismatch,
  },
  weights: { attack: PREFERENCE_WEIGHT, constraint: 1, complexity: 1, management: 1, counter: PREFERENCE_WEIGHT },
  difficultyScore: (weapon) => weapon.constraint + weapon.complexity + weapon.management,
});

export const DEFAULT_AXIS_MODEL = FREEDOM_MODEL;

// 작품 ID별 축 모델. 사이트 작품 설정(src/games/index.js)과, 이미지 자산 없이 Node로 실행하는
// 시뮬레이터·페르소나 테스트가 같은 값을 쓰도록 여기서 한 번만 정한다.
export const GAME_AXIS_MODELS = {
  wilds: FREEDOM_MODEL,
  wilds_v2: CONSTRAINT_MODEL,
};

// 작품 설정의 축 모델. 지정하지 않은 작품은 기존 와일즈 모델을 쓴다.
export const axisModelOf = (game) => game?.axisModel ?? DEFAULT_AXIS_MODEL;

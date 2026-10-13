// 무기 선택 기준 다섯 축. 정의는 docs/test-design.md를 따르며, 와일즈 V2의 행동 제약은 docs/wilds-v2-plan.md를 따른다.
// short는 결과 화면·차트에 쓰는 짧은 표기다. attack은 값이 높을수록 한방형이다.
// guide는 검사 설명 화면에 쓰는 쉬운 설명, fit은 무기와 비교하는 방식을 풀어 쓴 문구다.
// 작품마다 쓰는 축 목록이 다르므로 계산·화면은 작품의 축 모델(core/axis-models.js)에서 축 목록을 받는다.
const ATTACK = {
  id: 'attack', name: '대미지 집중도', short: '한방',
  guide: '짧은 기회마다 조금씩 꾸준히 대미지를 쌓는 쪽과, 준비해 둔 큰 한 방을 기회에 몰아넣는 쪽 중 어느 쪽이 좋은지 봅니다. 공격이 빠르거나 느린 것과는 다른 이야기예요.',
  fit: '내 취향과 무기의 성향이 가까울수록 잘 맞아요.',
};

const COUNTER = {
  id: 'counter', name: '카운터 취향', short: '반격',
  guide: '몬스터의 공격을 기다렸다가 딱 맞는 순간에 받아치는 플레이를 얼마나 좋아하는지 봅니다. 낮게 나와도 받아치기를 싫어한다는 뜻이 아니라, 먼저 흐름을 만들어 가는 쪽을 더 좋아한다는 뜻이에요.',
  fit: '내 취향과 무기의 성향이 가까울수록 잘 맞아요.',
};

const COMPLEXITY_GUIDE = '무기가 제 역할을 하려면 상황에 맞는 동작을 골라 써야 하는 정도입니다. 기술이 많다고 복잡한 것은 아니고, 무엇을 써도 대체로 괜찮다면 낮아요.';
const MANAGEMENT_GUIDE = '싸우는 동안 무기만의 게이지나 강화 상태를 계속 확인하고 채우거나 써야 하는 정도입니다. 체력처럼 모든 무기가 똑같이 신경 쓰는 것은 빼고 봐요.';
const DEMAND_FIT = '내 취향과 가까울수록 잘 맞아요. 무기가 내 취향보다 더 많이 요구하는 차이는 조금 넘칠 때는 너그럽게 보고 차이가 커질수록 더 크게 반영해요. 덜 요구하는 차이는 절반만 반영해요.';

// 기존 와일즈: 두 번째 축은 자유도(freedom)다.
export const AXES = [
  ATTACK,
  {
    id: 'freedom', name: '자유도', short: '자유',
    guide: '행동을 시작한 뒤 마음이 바뀌었을 때 피하기·막기·방향 바꾸기·다시 공격하기로 얼마나 빨리 넘어갈 수 있는지 봅니다. 단순히 이동이 빠른 것과는 달라요.',
    fit: '무기가 내가 원하는 것보다 덜 자유로운 차이는 그대로, 더 자유로운 차이는 절반만 반영해요.',
  },
  { id: 'complexity', name: '운용 복잡도', short: '복잡', guide: COMPLEXITY_GUIDE, fit: DEMAND_FIT },
  { id: 'management', name: '관리 부담', short: '관리', guide: MANAGEMENT_GUIDE, fit: DEMAND_FIT },
  COUNTER,
];

export const AXIS_IDS = AXES.map(({ id }) => id);

// 와일즈 V2: 자유도를 뒤집은 행동 제약(constraint)을 쓰고, 제약·복잡·관리는 ‘어디까지 할 만한가’를 보는 부담 허용형이다.
const BURDEN_FIT = '내가 할 만한 수준과 가까울수록 잘 맞아요. 무기가 그보다 더 많이 요구하는 차이는 조금 넘칠 때는 너그럽게 보고 차이가 커질수록 더 크게 반영해요. 덜 요구하는 차이는 절반만 반영해요.';

export const V2_AXES = [
  ATTACK,
  {
    id: 'constraint', name: '행동 제약', short: '제약',
    guide: '공격이나 이동을 시작한 뒤 마음이 바뀌어도, 하던 동작 때문에 피하기·막기·방향 바꾸기·다른 공격으로 바로 넘어가지 못하는 정도입니다. 단순히 이동이 느린 것과는 다르고, 신경 쓸 것이 많다는 뜻도 아니에요. 내 점수는 이런 행동 제약을 어디까지 할 만한지(행동 제약 허용도)를 뜻해요.',
    fit: BURDEN_FIT,
  },
  {
    id: 'complexity', name: '운용 복잡도', short: '복잡',
    guide: `${COMPLEXITY_GUIDE} 내 점수는 이런 선택을 어디까지 할 만한지를 뜻해요.`,
    fit: BURDEN_FIT,
  },
  {
    id: 'management', name: '관리 부담', short: '관리',
    guide: `${MANAGEMENT_GUIDE} 내 점수는 이런 관리를 어디까지 할 만한지를 뜻해요.`,
    fit: BURDEN_FIT,
  },
  COUNTER,
];

// 모든 작품의 축 표시 정보. 같은 ID는 같은 짧은 표기를 쓴다.
export const AXIS_BY_ID = Object.fromEntries([...AXES, ...V2_AXES].map((axis) => [axis.id, axis]));

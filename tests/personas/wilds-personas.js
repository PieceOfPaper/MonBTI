// 몬스터헌터 와일즈 대표 페르소나. 형식과 판정 규칙은 docs/persona-test-plan.md를 따른다.
// 다섯 축을 모두 지정하고, 관심이 없는 축은 중간값 50을 쓴다.
// expected의 무기는 현재 데이터로 순위를 계산하고 검토한 뒤 확정한 값이다. 의도한 데이터 보정으로 결과가 바뀌면
// 변경 이유를 확인한 뒤 갱신하고, 비워 둔 페르소나는 관찰용으로 결과만 보고한다.
export const wildsPersonas = [
  {
    id: 'simple_reactive',
    name: '단순·즉응형',
    description: '짧은 행동을 자주 바꾸며 별도 관리가 적은 방식을 선호한다.',
    targetProfile: { attack: 15, freedom: 90, complexity: 25, management: 25, counter: 15 },
    expected: {
      directTop1: ['light_bowgun', 'sword_and_shield'],
      directTop3Includes: ['light_bowgun', 'sword_and_shield'],
      answerTop1: ['light_bowgun', 'sword_and_shield'],
      answerTop3Includes: ['light_bowgun', 'sword_and_shield'],
    },
  },
  {
    id: 'heavy_simple',
    name: '묵직한 단순형',
    description: '기회에 큰 한 방을 넣고, 판단과 관리는 단순한 쪽을 선호한다.',
    targetProfile: { attack: 90, freedom: 30, complexity: 25, management: 10, counter: 25 },
    expected: {
      directTop1: ['great_sword', 'hammer'],
      directTop3Includes: ['great_sword', 'hammer'],
      answerTop1: ['great_sword', 'hammer'],
      answerTop3Includes: ['great_sword', 'hammer'],
    },
  },
  {
    id: 'counter_guard',
    name: '반격 수비형',
    description: '공격을 기다렸다가 받아치는 플레이를 즐기고 관리는 적은 쪽을 선호한다.',
    targetProfile: { attack: 25, freedom: 60, complexity: 35, management: 15, counter: 95 },
    expected: {
      directTop1: ['lance'],
      directTop3Includes: ['lance'],
      answerTop1: ['lance'],
      answerTop3Includes: ['lance'],
    },
  },
  {
    id: 'complex_manager',
    name: '고난도 관리형',
    description: '상황 판단과 자원 관리가 많은 무기를 깊게 다루고 받아치기도 즐긴다.',
    targetProfile: { attack: 70, freedom: 40, complexity: 90, management: 90, counter: 75 },
    expected: {
      directTop1: ['charge_blade', 'switch_axe'],
      directTop3Includes: ['charge_blade'],
      answerTop1: ['charge_blade', 'switch_axe'],
      answerTop3Includes: ['charge_blade'],
    },
  },
  {
    id: 'mobile_manager',
    name: '기동 관리형',
    description: '자유롭게 움직이면서 강화 상태를 꾸준히 유지하고 먼저 흐름을 만든다.',
    targetProfile: { attack: 60, freedom: 80, complexity: 65, management: 85, counter: 10 },
    expected: {
      directTop1: ['insect_glaive'],
      directTop3Includes: ['insect_glaive'],
      answerTop1: ['insect_glaive'],
      answerTop3Includes: ['insect_glaive'],
    },
  },
  {
    id: 'balanced',
    name: '균형형',
    description: '모든 기준에서 중간 정도를 선호한다. 중간값에 가까운 무기를 관찰하는 기준점이다.',
    targetProfile: { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 },
    // 관찰용: 특정 무기를 정답으로 만들기 위해 무기 값을 조정하지 않는다.
    expected: {},
  },
  {
    id: 'morph_pressure',
    name: '변형 압박형',
    description: '큰 한 방과 상태 전환, 자원 관리를 함께 다루며 받아치기도 섞는다.',
    targetProfile: { attack: 85, freedom: 40, complexity: 70, management: 80, counter: 70 },
    expected: {
      directTop1: ['switch_axe'],
      directTop3Includes: ['switch_axe'],
      answerTop1: ['switch_axe'],
      answerTop3Includes: ['switch_axe'],
    },
  },
  {
    id: 'mobile_counter',
    name: '자유 반격형',
    description: '자유롭게 움직이며 받아치는 순간을 노리고 어느 정도 관리도 감수한다.',
    targetProfile: { attack: 35, freedom: 85, complexity: 45, management: 65, counter: 75 },
    expected: {
      directTop1: ['bow'],
      directTop3Includes: ['bow'],
      answerTop1: ['bow'],
      answerTop3Includes: ['bow'],
    },
  },
];

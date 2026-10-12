// 몬스터헌터 와일즈 V2 대표 페르소나. 형식과 판정 규칙은 docs/persona-test-plan.md를 따른다.
// V2는 기존 와일즈와 따로 보정하므로 기존 와일즈 페르소나(wilds-personas.js)를 복사해 시작한 독립 fixture다.
// V2 데이터·규칙을 바꿔 결과가 달라지면 이 파일만 갱신하고 기존 와일즈 fixture는 그대로 둔다.
// V2는 중앙형 응답 특별 결과(작품 설정 centralResult)를 쓰므로 기대값은 결과 화면과 같은 최종 순위로 판정하고,
// directCentral·answerCentral로 특별 결과 적용 여부를 확인한다. 다섯 축을 모두 지정하고, 관심이 없는 축은 50을 쓴다.
// 순위 기대값은 2026-10-12 V2 데이터(분리 시점의 와일즈와 같은 값)로 계산하고 검토한 값이다.
export const wildsV2Personas = [
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
    // 다섯 축이 모두 50이라 중앙형 특별 결과가 적용된다. 1순위 무기는 관찰용으로 두고 특별 결과 적용 여부만 확정한다.
    expected: { directCentral: true, answerCentral: true },
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
  {
    id: 'mild_leaning',
    name: '약한 성향형',
    description: '한 방과 받아치기 쪽으로 조금 기울지만 뚜렷한 취향은 없다. 중앙형 특별 결과 경계 안쪽을 확인하는 기준점이다.',
    // 중앙 이탈도 (10 + 5 + 5 + 10 + 5) / 5 = 7
    targetProfile: { attack: 60, freedom: 55, complexity: 45, management: 40, counter: 55 },
    expected: { directCentral: true, answerCentral: true },
  },
  {
    id: 'mild_outside',
    name: '경계 밖 약한 성향형',
    description: '약한 성향형보다 조금 더 기울어 일반 결과를 받는다. 중앙형 특별 결과 경계 바깥을 확인하는 기준점이다.',
    // 중앙 이탈도 (15 + 10 + 10 + 10 + 10) / 5 = 11
    targetProfile: { attack: 65, freedom: 60, complexity: 40, management: 40, counter: 60 },
    // 일반 결과지만 1·2순위 차이가 작아(1.11) 1순위는 고정하지 않고 건랜스·해머의 상위 3위만 확정한다(2026-10-13 사용자 확인).
    expected: {
      directCentral: false,
      answerCentral: false,
      directTop3Includes: ['gunlance', 'hammer'],
      answerTop3Includes: ['gunlance', 'hammer'],
    },
  },
];

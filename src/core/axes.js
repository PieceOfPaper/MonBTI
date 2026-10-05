// 무기 선택 기준 다섯 축. 정의는 docs/test-design.md를 따른다.
export const AXES = [
  { id: 'attack', name: '공격 성향', low: '지속형', high: '한방형' },
  { id: 'freedom', name: '자유도', low: '행동 자유도가 낮음', high: '행동 자유도가 높음' },
  { id: 'combo', name: '콤보 의존', low: '공격 연계 의존이 낮음', high: '공격 연계 의존이 높음' },
  { id: 'resource', name: '자원 부담', low: '관리 부담이 낮음', high: '관리 부담이 높음' },
  { id: 'counter', name: '카운터 의존', low: '카운터 중심 플레이 필요가 낮음', high: '카운터 중심 플레이 필요가 높음' },
];

export const AXIS_IDS = AXES.map(({ id }) => id);

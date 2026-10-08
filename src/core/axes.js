// 무기 선택 기준 다섯 축. 정의는 docs/test-design.md를 따른다.
// short는 결과 화면·차트에 쓰는 짧은 표기다. attack은 값이 높을수록 한방형이다.
export const AXES = [
  { id: 'attack', name: '대미지 집중도', short: '한방' },
  { id: 'freedom', name: '자유도', short: '자유' },
  { id: 'complexity', name: '운용 복잡도', short: '복잡' },
  { id: 'management', name: '관리 부담', short: '관리' },
  { id: 'counter', name: '카운터 취향', short: '반격' },
];

export const AXIS_IDS = AXES.map(({ id }) => id);

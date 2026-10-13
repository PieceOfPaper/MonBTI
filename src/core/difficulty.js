// 결과 화면의 입문 난이도 별표. 규칙은 docs/test-design.md의 '입문 난이도 별표'를 따른다.
// 행동 제약·운용 복잡도·관리 부담을 합친 같은 작품 무기 사이의 상대평가이며,
// 추천 점수·순위·동점 처리와 공유 코드에는 쓰지 않는다. 원점수 공식은 작품의 축 모델(core/axis-models.js)을 따른다.
// 기존 와일즈는 (100 - freedom) + complexity + management, 와일즈 V2는 constraint + complexity + management다.
import { DEFAULT_AXIS_MODEL } from './axis-models.js';

export const DIFFICULTY_LEVELS = 5;
const SAME_RANGE_LEVEL = 3;

export function difficultyScore(weapon, model = DEFAULT_AXIS_MODEL) {
  return model.difficultyScore(weapon);
}

// weapons는 같은 작품의 전체 무기다. 최솟값·최댓값이 같으면 모두 3단계로 둔다.
export function difficultyStars(weapon, weapons, model = DEFAULT_AXIS_MODEL) {
  const scores = weapons.map((w) => difficultyScore(w, model));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return SAME_RANGE_LEVEL;
  const normalized = (difficultyScore(weapon, model) - min) / (max - min);
  return Math.min(DIFFICULTY_LEVELS, Math.max(1, Math.ceil(normalized * DIFFICULTY_LEVELS)));
}

export function difficultyLabel(stars) {
  return '★'.repeat(stars) + '☆'.repeat(DIFFICULTY_LEVELS - stars);
}

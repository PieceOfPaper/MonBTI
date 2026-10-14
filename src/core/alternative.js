// 부담이 적은 대안(DEC-075). 작품 설정 lighterAlternative가 켜진 검사에만 쓴다(현재 와일즈 V2).
// 기존 1~3순위와 추천 점수는 그대로 두고, 취향 축(한방·반격)은 사용자와 각각 25 이내로 비슷하면서
// 부담형 축(제약·복잡·관리)은 모두 사용자 이하이고 그중 하나 이상이 10 이상 낮은 무기 하나를 보조로 보여 준다.
// 후보 중에서는 원래 사용자 점수의 일반 추천 순위(rankWeapons)가 가장 높은 무기를 고르며 별도 점수는 만들지 않는다.
// 그 무기가 이미 화면의 1~3순위에 있으면 대안은 없으며, 결과 화면은 기준 비교의 네 번째 버튼에 4순위 무기를 둔다(DEC-076).
// 규칙은 docs/wilds-v2-plan.md '부담이 적은 대안'을 따른다.
import { DEFAULT_AXIS_MODEL } from './axis-models.js';
import { rankWeapons } from './recommend.js';

export const SIMILAR_LIMIT = 25;
export const MIN_REDUCTION = 10;

const isMeasured = (value) => value !== null && value !== undefined;

// 무기가 후보 조건을 모두 만족하는지. 조건에 쓰는 축이 하나라도 측정되지 않았으면 판단할 수 없으므로 후보가 아니다.
export function isLighterAlternative(profile, weapon, model = DEFAULT_AXIS_MODEL) {
  const config = model.lighterAlternative;
  if (!config) return false;
  const { similarAxes, burdenAxes } = config;
  if (![...similarAxes, ...burdenAxes].every((axis) => isMeasured(profile[axis]))) return false;
  if (!similarAxes.every((axis) => Math.abs(weapon[axis] - profile[axis]) <= SIMILAR_LIMIT)) return false;
  if (!burdenAxes.every((axis) => weapon[axis] <= profile[axis])) return false;
  return burdenAxes.some((axis) => profile[axis] - weapon[axis] >= MIN_REDUCTION);
}

// 보조 추천 모델. top은 화면에 표시한 1~3순위(중앙형 특별 결과면 그 순서)다.
// profile은 확대하지 않은 원래 사용자 점수다. 가장 앞선 후보가 top에 있거나, 후보가 없거나, 모델이 이 규칙을 쓰지 않으면 null이다.
export function findLighterAlternative(weapons, profile, top, model = DEFAULT_AXIS_MODEL) {
  if (!model.lighterAlternative) return null;
  const topIds = new Set(top.map(({ weapon_id }) => weapon_id));
  const entry = rankWeapons(weapons, profile, model).find(({ weapon }) => isLighterAlternative(profile, weapon, model));
  if (!entry || topIds.has(entry.weapon.weapon_id)) return null;
  return { weapon: entry.weapon };
}

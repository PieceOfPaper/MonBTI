// 페르소나 실행기: 직접 입력 프로필과 실제 응답 프로필의 추천, 무기 기준점, 인접값, 추천 영역을 계산한다.
// 사양은 docs/persona-test-plan.md를 따른다. 추천 점수는 src/core/recommend.js를 그대로 사용한다.
// rules.centralResult는 사이트의 작품 설정 centralResult와 같다. 켜져 있으면 결과 화면과 같은 최종 순위
// (중앙형 응답 특별 결과, src/core/central.js)로 기대값·인접값·기준점·추천 영역을 판정한다.
// rules.axisModel은 사이트의 작품 설정 axisModel(core/axis-models.js)이며 축 목록과 추천 공식을 정한다.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_AXIS_MODEL } from '../../src/core/axis-models.js';
import { centralDeviation, finalRanking } from '../../src/core/central.js';
import { RECOMMENDATION_COUNT } from '../../src/core/recommend.js';
import { searchAnswers } from './answer-search.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_TOLERANCE = { maxAxisError: 5, meanAbsoluteError: 3 };
export const NEIGHBOR_DELTAS = [-10, -5, 5, 10];
// 경고 기준(초기값). 실패가 아니라 보고서에만 표시한다.
export const WARNING_LIMITS = {
  minFirstRate: 0.01,
  minTopRate: 0.05,
  maxFirstRate: 0.2,
  maxTopRate: 0.45,
  // 1·2순위 점수 차이가 이 값 미만이면 경계에 가깝다고 본다.
  closeGap: 1,
};

// 배포에 포함되는 src/data/<작품>/*.json을 읽는다. 시트 수정 뒤에는 npm run data:convert를 먼저 실행해야 한다.
export async function loadGameData(game = 'wilds') {
  const read = async (name) => JSON.parse(await readFile(resolve(ROOT, 'src/data', game, `${name}.json`), 'utf8'));
  const [questionData, weaponData] = await Promise.all([read('questions'), read('weapons')]);
  return {
    questions: questionData.questions,
    weapons: weaponData.weapons,
    meta: { questions: questionData.meta, weapons: weaponData.meta },
  };
}

const RANK_EXPECTATION_KEYS = ['directTop1', 'directTop3Includes', 'answerTop1', 'answerTop3Includes'];
// 중앙형 응답 특별 결과 적용 여부의 기대값(true·false). centralResult가 켜진 작품에서만 쓴다.
const CENTRAL_EXPECTATION_KEYS = ['directCentral', 'answerCentral'];
const EXPECTATION_KEYS = [...RANK_EXPECTATION_KEYS, ...CENTRAL_EXPECTATION_KEYS];

export const axisModelOfRules = (rules = {}) => rules.axisModel ?? DEFAULT_AXIS_MODEL;

// fixture 형식 오류 목록. 비어 있으면 통과다.
export function validatePersonas(personas, weapons, rules = {}) {
  const errors = [];
  const { axisIds } = axisModelOfRules(rules);
  const weaponIds = new Set(weapons.map(({ weapon_id }) => weapon_id));
  const seen = new Set();
  for (const [index, persona] of personas.entries()) {
    const label = persona?.id ?? `#${index}`;
    if (typeof persona?.id !== 'string' || !/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(persona.id)) {
      errors.push(`${label}: id는 영문 snake_case여야 합니다.`);
    } else if (seen.has(persona.id)) {
      errors.push(`${label}: id가 중복됩니다.`);
    }
    seen.add(persona?.id);
    if (typeof persona?.name !== 'string' || !persona.name) errors.push(`${label}: name이 필요합니다.`);
    const target = persona?.targetProfile ?? {};
    for (const axis of axisIds) {
      const value = target[axis];
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        errors.push(`${label}: targetProfile.${axis}는 0~100의 숫자여야 합니다(현재 ${value}).`);
      }
    }
    for (const key of Object.keys(target)) {
      if (!axisIds.includes(key)) errors.push(`${label}: targetProfile에 알 수 없는 축 '${key}'가 있습니다.`);
    }
    for (const key of ['maxAxisError', 'meanAbsoluteError']) {
      const value = persona?.tolerance?.[key];
      if (value !== undefined && !(Number.isFinite(value) && value >= 0)) {
        errors.push(`${label}: tolerance.${key}는 0 이상의 숫자여야 합니다.`);
      }
    }
    for (const key of Object.keys(persona?.expected ?? {})) {
      if (!EXPECTATION_KEYS.includes(key)) errors.push(`${label}: expected에 알 수 없는 항목 '${key}'가 있습니다.`);
    }
    for (const key of CENTRAL_EXPECTATION_KEYS) {
      const value = persona?.expected?.[key];
      if (value === undefined) continue;
      if (typeof value !== 'boolean') errors.push(`${label}: expected.${key}는 true 또는 false여야 합니다.`);
      else if (!rules.centralResult) errors.push(`${label}: expected.${key}는 중앙형 특별 결과를 쓰는 작품에서만 쓸 수 있습니다.`);
    }
    for (const key of RANK_EXPECTATION_KEYS) {
      const list = persona?.expected?.[key];
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        errors.push(`${label}: expected.${key}는 배열이어야 합니다.`);
        continue;
      }
      for (const id of list) {
        if (!weaponIds.has(id)) errors.push(`${label}: expected.${key}의 무기 '${id}'가 무기 데이터에 없습니다.`);
      }
    }
  }
  return errors;
}

// 결과 화면 순서의 보고·비교용 순위 항목. 점수는 원래 점수이며 반올림하지 않는다.
// 중앙형 특별 결과가 적용되면 central이 true이고 1순위가 점수 1위가 아닐 수 있다.
export function ranking(weapons, profile, rules = {}) {
  const { ranked, central } = finalRanking(weapons, profile, rules);
  return Object.assign(ranked.map(({ weapon, score, maxMismatch }) => ({
    weapon_id: weapon.weapon_id,
    weapon_name: weapon.weapon_name,
    score,
    maxMismatch,
  })), { central });
}

const topIds = (ranked, count = RECOMMENDATION_COUNT) => ranked.slice(0, count).map(({ weapon_id }) => weapon_id);
// 1·2순위 점수 차이. 특별 결과는 점수 순서가 아니므로 차이를 매기지 않는다.
const gapOf = (ranked) => (!ranked.central && ranked.length > 1 ? ranked[0].score - ranked[1].score : null);

const summarize = (ranked, profile, axisModel) => ({
  ranking: ranked,
  gap: gapOf(ranked),
  central: ranked.central,
  deviation: centralDeviation(profile, axisModel),
});

export function runPersona(persona, { questions, weapons, rules = {} }) {
  const axisModel = axisModelOfRules(rules);
  const search = searchAnswers(questions, persona.targetProfile, axisModel);
  return {
    persona,
    axes: axisModel.axes,
    tolerance: { ...DEFAULT_TOLERANCE, ...persona.tolerance },
    direct: {
      profile: persona.targetProfile,
      ...summarize(ranking(weapons, persona.targetProfile, rules), persona.targetProfile, axisModel),
    },
    answer: { ...search, ...summarize(ranking(weapons, search.profile, rules), search.profile, axisModel) },
  };
}

// 확정 기대값과 재현 오차 검사. 실패 메시지 목록을 돌려준다(비어 있으면 통과).
export function checkPersona(result) {
  const failures = [];
  const { expected = {} } = result.persona;
  const { tolerance, answer } = result;
  if (answer.maxAxisError > tolerance.maxAxisError) {
    failures.push(`최대 축 오차 ${fmt(answer.maxAxisError)} > 허용 ${tolerance.maxAxisError}`);
  }
  if (answer.meanAbsoluteError > tolerance.meanAbsoluteError) {
    failures.push(`평균 절대 오차 ${fmt(answer.meanAbsoluteError)} > 허용 ${tolerance.meanAbsoluteError}`);
  }
  for (const [kind, part] of [['direct', result.direct], ['answer', answer]]) {
    const central = expected[`${kind}Central`];
    if (central !== undefined && central !== part.central) {
      failures.push(`${kind}Central: 중앙형 특별 결과 ${part.central ? '적용' : '미적용'}(중앙 이탈도 ${fmt(part.deviation)}), 기대 ${central ? '적용' : '미적용'}`);
    }
  }
  for (const [kind, ranked] of [['direct', result.direct.ranking], ['answer', answer.ranking]]) {
    const top1 = expected[`${kind}Top1`];
    if (top1?.length && !top1.includes(ranked[0].weapon_id)) {
      failures.push(`${kind}Top1: 1순위 ${ranked[0].weapon_id}가 허용 후보 [${top1.join(', ')}]에 없음`);
    }
    const top3 = topIds(ranked);
    const missing = (expected[`${kind}Top3Includes`] ?? []).filter((id) => !top3.includes(id));
    if (missing.length) failures.push(`${kind}Top3Includes: [${missing.join(', ')}]가 상위 3개 [${top3.join(', ')}]에 없음`);
  }
  return failures;
}

export const hasExpectations = (persona) => RANK_EXPECTATION_KEYS.some((key) => persona.expected?.[key]?.length)
  || CENTRAL_EXPECTATION_KEYS.some((key) => typeof persona.expected?.[key] === 'boolean');

const centralNote = (part) => (part.central ? ` [중앙형 특별 결과, 이탈도 ${fmt(part.deviation)}]` : '');

// 실패를 고칠 때 바로 판단할 수 있도록 목표·실제 프로필, 축별 오차, 순위를 함께 보여 준다.
export function describePersonaResult(result, count = 5) {
  const { persona, answer, direct } = result;
  const axes = (profile) => result.axes.map(({ id, short }) => `${short} ${fmt(profile[id])}`).join(' · ');
  const ranks = (ranked) => ranked.slice(0, count).map((r, i) => `${i + 1}.${r.weapon_id}(${fmt(r.score)})`).join(' ');
  return [
    `[${persona.id}] ${persona.name}`,
    `  목표 프로필: ${axes(direct.profile)}`,
    `  응답 프로필: ${axes(answer.profile)}`,
    `  축별 오차:   ${axes(answer.axisErrors)} (최대 ${fmt(answer.maxAxisError)}, 평균 ${fmt(answer.meanAbsoluteError)})`,
    `  직접 순위:   ${ranks(direct.ranking)}${centralNote(direct)}`,
    `  응답 순위:   ${ranks(answer.ranking)}${centralNote(answer)}`,
  ].join('\n');
}

export function personaWarnings(result) {
  const warnings = [];
  const { expected = {} } = result.persona;
  for (const [label, part] of [['직접', result.direct], ['응답', result.answer]]) {
    if (part.gap !== null && part.gap < WARNING_LIMITS.closeGap) {
      warnings.push(`${label} 프로필 1·2순위 점수 차이 ${fmt(part.gap)}로 경계에 가까움`);
    }
  }
  const directTop = result.direct.ranking[0].weapon_id;
  const answerTop = result.answer.ranking[0].weapon_id;
  const allowed = new Set([...(expected.directTop1 ?? []), ...(expected.answerTop1 ?? [])]);
  if (directTop !== answerTop && allowed.has(directTop) && allowed.has(answerTop)) {
    warnings.push(`직접 1순위 ${directTop}와 응답 1순위 ${answerTop}가 다르지만 허용 후보 안에 있음`);
  }
  return warnings;
}

// 각 무기의 기준값을 그대로 프로필로 쓸 때의 1순위. 다섯 값이 같은 무기는 중복으로 따로 보고한다.
// 특별 결과가 적용되는 기준점은 결과 화면과 같은 최종 1순위로 판정한다.
export function checkWeaponAnchors(weapons, rules = {}) {
  const { axisIds } = axisModelOfRules(rules);
  const key = (w) => axisIds.map((axis) => w[axis]).join(',');
  return weapons.map((weapon) => {
    const ranked = ranking(weapons, weapon, rules);
    const duplicates = weapons
      .filter((other) => other !== weapon && key(other) === key(weapon))
      .map(({ weapon_id }) => weapon_id);
    return {
      weapon_id: weapon.weapon_id,
      weapon_name: weapon.weapon_name,
      top1: ranked[0].weapon_id,
      score: ranked.find(({ weapon_id }) => weapon_id === weapon.weapon_id).score,
      gap: gapOf(ranked),
      runnerUp: ranked[1]?.weapon_id ?? null,
      duplicates,
      central: ranked.central,
      ok: ranked[0].weapon_id === weapon.weapon_id,
    };
  });
}

const clamp = (value) => Math.min(100, Math.max(0, value));

// 한 번에 한 축만 바꿔 1순위·상위 3개 변화를 본다.
export function analyzeNeighborhood(weapons, profile, { rules = {}, deltas = NEIGHBOR_DELTAS } = {}) {
  const { axisIds } = axisModelOfRules(rules);
  const base = ranking(weapons, profile, rules);
  const baseTop = topIds(base);
  const variations = [];
  for (const axis of axisIds) {
    for (const delta of deltas) {
      const value = clamp(profile[axis] + delta);
      const ranked = ranking(weapons, { ...profile, [axis]: value }, rules);
      const top = topIds(ranked);
      variations.push({
        axis,
        delta,
        value,
        top1: ranked[0].weapon_id,
        top1Changed: ranked[0].weapon_id !== base[0].weapon_id,
        central: ranked.central,
        centralChanged: ranked.central !== base.central,
        top3: top,
        overlap: top.filter((id) => baseTop.includes(id)).length,
        entered: top.filter((id) => !baseTop.includes(id)),
        left: baseTop.filter((id) => !top.includes(id)),
        gap: gapOf(ranked),
      });
    }
  }
  // 1순위가 처음 바뀌는 변화: 변화 크기가 작은 순, 같은 크기면 축 표시 순서와 감소 방향 우선.
  const changed = variations.filter(({ top1Changed }) => top1Changed);
  const firstChange = changed.sort((a, b) => (Math.abs(a.delta) - Math.abs(b.delta))
    || (axisIds.indexOf(a.axis) - axisIds.indexOf(b.axis)) || (a.delta - b.delta))[0] ?? null;
  // 축·방향별로 1순위가 유지되는 가장 큰 변화량.
  const stableRange = Object.fromEntries(axisIds.map((axis) => {
    const along = (sign) => {
      let kept = 0;
      for (const v of variations.filter((x) => x.axis === axis && Math.sign(x.delta) === sign)
        .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))) {
        if (v.top1Changed) break;
        kept = v.delta;
      }
      return kept;
    };
    return [axis, { minus: along(-1), plus: along(1) }];
  }));
  return {
    base: { top1: base[0].weapon_id, top3: baseTop, gap: gapOf(base), central: base.central },
    variations,
    firstChange,
    stableRange,
  };
}

// ±5에서 상위 3개가 하나도 겹치지 않는 변화(실패 조건).
export const disjointSmallChanges = (neighborhood) => neighborhood.variations
  .filter(({ delta, overlap }) => Math.abs(delta) === 5 && overlap === 0);

// 다섯 축의 0~100을 step 간격으로 순회한 기하학적 추천 영역. 실제 사용자 분포가 아니다.
// 중앙형 특별 결과를 쓰는 작품은 결과 화면과 같은 최종 순위로 세고, 특별 결과가 적용된 프로필 수를 함께 센다.
export function analyzeDistribution(weapons, step = 10, rules = {}) {
  if (!Number.isInteger(step) || step <= 0 || 100 % step !== 0) throw new Error('간격은 100의 약수인 양의 정수여야 합니다.');
  const { axisIds } = axisModelOfRules(rules);
  const values = Array.from({ length: 100 / step + 1 }, (_, i) => i * step);
  const counts = Object.fromEntries(weapons.map(({ weapon_id }) => [weapon_id, { first: 0, top: 0 }]));
  const profile = {};
  let total = 0;
  let centrals = 0;
  const visit = (depth) => {
    if (depth === axisIds.length) {
      const { ranked, central } = finalRanking(weapons, profile, rules);
      if (central) centrals += 1;
      counts[ranked[0].weapon.weapon_id].first += 1;
      for (const { weapon } of ranked.slice(0, RECOMMENDATION_COUNT)) counts[weapon.weapon_id].top += 1;
      total += 1;
      return;
    }
    for (const value of values) {
      profile[axisIds[depth]] = value;
      visit(depth + 1);
    }
  };
  visit(0);
  return {
    step,
    total,
    centralResult: Boolean(rules.centralResult),
    centrals,
    weapons: weapons.map(({ weapon_id, weapon_name }) => {
      const { first, top } = counts[weapon_id];
      return { weapon_id, weapon_name, first, top, firstRate: first / total, topRate: top / total };
    }),
  };
}

export function distributionFindings(distribution) {
  const failures = [];
  const warnings = [];
  const L = WARNING_LIMITS;
  for (const w of distribution.weapons) {
    const name = `${w.weapon_name}(${w.weapon_id})`;
    if (w.first === 0) failures.push(`${name}: 1순위가 한 번도 되지 않음`);
    else if (w.firstRate < L.minFirstRate) warnings.push(`${name}: 1순위 비율 ${pct(w.firstRate)} < ${pct(L.minFirstRate)}`);
    if (w.top === 0) failures.push(`${name}: 상위 3위에 한 번도 들지 않음`);
    else if (w.topRate < L.minTopRate) warnings.push(`${name}: 상위 3위 비율 ${pct(w.topRate)} < ${pct(L.minTopRate)}`);
    if (w.firstRate > L.maxFirstRate) warnings.push(`${name}: 1순위 비율 ${pct(w.firstRate)} > ${pct(L.maxFirstRate)}`);
    if (w.topRate > L.maxTopRate) warnings.push(`${name}: 상위 3위 비율 ${pct(w.topRate)} > ${pct(L.maxTopRate)}`);
  }
  return { failures, warnings };
}

// 보고서 표시에서만 소수 둘째 자리로 반올림한다.
export const fmt = (value) => (value === null || value === undefined ? '-' : Number(value.toFixed(2)).toString());
export const pct = (rate) => `${(rate * 100).toFixed(2)}%`;

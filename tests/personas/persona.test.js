// 페르소나 회귀 테스트. 사양은 docs/persona-test-plan.md를 따른다.
// 추천 영역 전체 순회와 상세 보고서는 npm run analyze:personas에서 실행한다.
// 작품별 페르소나 묶음(suites.js)을 모두 검사한다. 와일즈 V2는 중앙형 응답 특별 결과를 적용한 최종 순위로 판정한다.
import { describe, expect, it } from 'vitest';
import { supportedGames } from '../../src/games/index.js';
import { AXIS_IDS } from '../../src/core/axes.js';
import { MultiAxisQuestionError, groupQuestionsByAxis, searchAnswers } from './answer-search.js';
import {
  analyzeNeighborhood, checkPersona, checkWeaponAnchors, describePersonaResult, disjointSmallChanges,
  runPersona, validatePersonas,
} from './persona-runner.js';
import { PERSONA_GAME_IDS, loadPersonaSuite } from './suites.js';

const suites = await Promise.all(PERSONA_GAME_IDS.map(loadPersonaSuite));
const data = suites.find(({ game }) => game === 'wilds');
const question = (question_id, values) => ({
  question_id, attack: 0, freedom: 0, complexity: 0, management: 0, counter: 0, ...values,
});
const target = (values) => ({ attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values });

describe('페르소나 묶음', () => {
  it('페르소나가 있는 작품은 사이트에 등록된 작품이고 판정 규칙이 작품 설정과 같다', () => {
    for (const { game, rules } of suites) {
      const site = supportedGames.find(({ id }) => id === game);
      expect(site, `${game}이 사이트 작품 설정에 없음`).toBeTruthy();
      expect(rules.centralResult, `${game}의 centralResult`).toBe(Boolean(site.centralResult));
      expect(rules.axisModel, `${game}의 axisModel`).toBe(site.axisModel);
    }
  });

  it('사이트에 등록된 모든 작품에 페르소나 묶음이 있다', () => {
    expect(supportedGames.map(({ id }) => id).filter((id) => !PERSONA_GAME_IDS.includes(id))).toEqual([]);
  });
});

describe('페르소나 fixture', () => {
  it.each(suites.map((suite) => [suite.game, suite]))('%s: 형식이 올바르고 기대 무기가 현재 데이터에 있다', (_, suite) => {
    expect(validatePersonas(suite.personas, suite.weapons, suite.rules)).toEqual([]);
  });

  it('중앙형 특별 결과 기대값은 true·false이며 그 규칙을 쓰는 작품에서만 쓸 수 있다', () => {
    const base = { name: '이름', targetProfile: target({}) };
    const personas = [
      { ...base, id: 'flag', expected: { directCentral: 'yes' } },
      { ...base, id: 'ok', expected: { directCentral: true, answerCentral: false } },
    ];
    const withRule = validatePersonas(personas, data.weapons, { centralResult: true });
    expect(withRule).toEqual(['flag: expected.directCentral는 true 또는 false여야 합니다.']);
    const withoutRule = validatePersonas(personas, data.weapons);
    expect(withoutRule.filter((e) => e.startsWith('ok:'))).toHaveLength(2);
  });

  it('id 중복, 빠진 축, 범위 밖 값, 없는 무기를 오류로 보고한다', () => {
    const base = { id: 'a_b', name: '이름', targetProfile: target({}) };
    const errors = validatePersonas([
      base,
      { ...base },
      { ...base, id: 'missing', targetProfile: { attack: 50 } },
      { ...base, id: 'range', targetProfile: target({ counter: 101 }) },
      { ...base, id: 'NotSnake' },
      { ...base, id: 'unknown', expected: { directTop1: ['no_such_weapon'] } },
    ], data.weapons);
    expect(errors.some((e) => e.startsWith('a_b: id가 중복'))).toBe(true);
    expect(errors.filter((e) => e.startsWith('missing: targetProfile'))).toHaveLength(4);
    expect(errors.some((e) => e.startsWith('range: targetProfile.counter'))).toBe(true);
    expect(errors.some((e) => e.startsWith('NotSnake:'))).toBe(true);
    expect(errors.some((e) => e.includes("'no_such_weapon'"))).toBe(true);
  });
});

describe('응답 자동 탐색', () => {
  it('여러 축을 측정하는 질문이 있으면 조용히 계산하지 않고 오류를 낸다', () => {
    const questions = [question('q1', { attack: 100, counter: 50 }), question('q2', { freedom: 100 })];
    expect(() => groupQuestionsByAxis(questions)).toThrow(MultiAxisQuestionError);
    expect(() => searchAnswers(questions, target({}))).toThrow(/q1\(attack·counter\)/);
  });

  it('측정 질문이 없는 축은 재현할 수 없다고 알린다', () => {
    expect(() => searchAnswers([question('q1', { attack: 100 })], target({}))).toThrow(/'freedom' 축/);
  });

  it('같은 오차의 후보가 여럿이면 질문 순서 기준 사전순으로 앞선 응답을 고른다', () => {
    // 상쇄되는 두 문항에서 50은 (1,1)·(2,2)·…·(6,6)이 모두 정확하므로 (1,1)을 고른다.
    const questions = AXIS_IDS.flatMap((axis) => [question(`${axis}+`, { [axis]: 100 }), question(`${axis}-`, { [axis]: -100 })]);
    const { answers, maxAxisError } = searchAnswers(questions, target({}));
    expect(maxAxisError).toBe(0);
    expect(Object.values(answers).every((r) => r === 1)).toBe(true);
  });

  it('현재 질문으로 같은 목표에서 항상 같은 응답을 찾는다', () => {
    for (const { personas, questions, rules } of suites) {
      for (const persona of personas) {
        const search = () => searchAnswers(questions, persona.targetProfile, rules.axisModel);
        expect(search()).toEqual(search());
      }
    }
  });
});

const personaCases = suites.flatMap((suite) => suite.personas.map((persona) => [suite.game, persona.id, persona, suite]));

describe.each(personaCases)('%s 페르소나 %s', (_, __, persona, suite) => {
  const result = runPersona(persona, suite);

  it('실제 응답으로 목표 프로필을 허용 오차 안에서 재현하고 확정 기대 추천을 만족한다', () => {
    const failures = checkPersona(result);
    expect(failures, `${failures.join('\n')}\n${describePersonaResult(result)}`).toEqual([]);
  });

  it('같은 입력에서 결과가 달라지지 않는다', () => {
    expect(runPersona(persona, suite)).toEqual(result);
  });

  it('±5 인접값에서 기존 상위 3개와 공통 무기가 남는다', () => {
    const disjoint = disjointSmallChanges(analyzeNeighborhood(suite.weapons, persona.targetProfile, { rules: suite.rules }));
    const detail = disjoint.map(({ axis, delta, top3 }) => `${axis} ${delta > 0 ? '+' : ''}${delta}: [${top3.join(', ')}]`);
    expect(detail, describePersonaResult(result)).toEqual([]);
  });
});

describe('무기 기준점', () => {
  it.each(suites.flatMap(({ game, weapons, rules }) => checkWeaponAnchors(weapons, rules).map((anchor) => [game, anchor.weapon_id, anchor])))(
    '%s %s는 자신의 기준값에서 100점으로 1순위가 된다',
    (_, __, anchor) => {
      expect(anchor.duplicates, `다섯 값이 같은 무기: ${anchor.duplicates.join(', ')}`).toEqual([]);
      expect(anchor.score).toBe(100);
      expect(anchor.top1, `${anchor.weapon_id} 기준점의 1순위가 ${anchor.top1}`).toBe(anchor.weapon_id);
    },
  );
});

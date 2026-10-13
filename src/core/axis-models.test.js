import { describe, expect, it } from 'vitest';
import v2Questions from '../data/wilds_v2/questions.json';
import v2Weapons from '../data/wilds_v2/weapons.json';
import { CONSTRAINT_MODEL, FREEDOM_MODEL, GAME_AXIS_MODELS, axisModelOf } from './axis-models.js';
import { centralDeviation } from './central.js';
import { difficultyScore, difficultyStars } from './difficulty.js';
import { buildRecommendationReason } from './reason.js';
import { cautionCopy } from './reason-copy.js';
import { rankWeapons, scoreWeapon } from './recommend.js';
import { computeAxisProfile, computeAxisTotals } from './scoring.js';
import { decodeShareCode, encodeShareCode } from './share.js';

const BURDEN_AXES = ['constraint', 'complexity', 'management'];
const v2Weapon = (weapon_id, values) => ({
  weapon_id, weapon_name: weapon_id, attack: 50, constraint: 50, complexity: 50, management: 50, counter: 50, ...values,
});
const v2Profile = (values) => ({ attack: 50, constraint: 50, complexity: 50, management: 50, counter: 50, ...values });
const mismatchOf = (axis, user, weapon) => scoreWeapon(
  v2Profile({ [axis]: user }), v2Weapon('w', { [axis]: weapon }), CONSTRAINT_MODEL,
).axes[axis].mismatch;

// V2 데이터를 기존 자유도 형식으로 되돌린 같은 질문·무기. 초기 마이그레이션의 기준이다.
const toFreedom = ({ constraint, ...rest }, flip) => ({ ...rest, freedom: flip(constraint) });
const freedomQuestions = v2Questions.questions.map((q) => toFreedom(q, (w) => (w === 0 ? 0 : -w)));
const freedomWeapons = v2Weapons.weapons.map((w) => toFreedom(w, (v) => 100 - v));

describe('작품별 축 모델', () => {
  it('기존 와일즈는 자유도, 와일즈 V2는 행동 제약을 두 번째 축으로 쓴다', () => {
    expect(GAME_AXIS_MODELS.wilds).toBe(FREEDOM_MODEL);
    expect(GAME_AXIS_MODELS.wilds_v2).toBe(CONSTRAINT_MODEL);
    expect(CONSTRAINT_MODEL.axisIds).toEqual(['attack', 'constraint', 'complexity', 'management', 'counter']);
    expect(CONSTRAINT_MODEL.axes.find(({ id }) => id === 'constraint')).toMatchObject({ name: '행동 제약', short: '제약' });
    expect(axisModelOf({})).toBe(FREEDOM_MODEL);
  });

  it('V2 최종 합산 가중치는 한방·반격 0.75, 제약·복잡·관리 1.0이다', () => {
    expect(CONSTRAINT_MODEL.weights).toEqual({ attack: 0.75, constraint: 1, complexity: 1, management: 1, counter: 0.75 });
  });
});

describe('V2 부담 허용형 불일치', () => {
  it('제약·복잡·관리 세 축은 하나의 공용 함수를 쓴다', () => {
    const [first, ...rest] = BURDEN_AXES.map((axis) => CONSTRAINT_MODEL.mismatch[axis]);
    for (const fn of rest) expect(fn).toBe(first);
  });

  it.each(BURDEN_AXES)('%s: 무기가 더 요구하면 10점 50%·다음 10점 75%·20점 초과 100%를 누적한다', (axis) => {
    expect(mismatchOf(axis, 50, 50)).toBe(0);
    expect(mismatchOf(axis, 50, 60)).toBe(5);
    expect(mismatchOf(axis, 50, 61)).toBeCloseTo(5.75);
    expect(mismatchOf(axis, 50, 70)).toBe(12.5);
    expect(mismatchOf(axis, 50, 71)).toBe(13.5);
    expect(mismatchOf(axis, 20, 100)).toBe(72.5);
  });

  it.each(BURDEN_AXES)('%s: 무기가 덜 요구하면 차이의 절반만 반영하고 구간 완충은 쓰지 않는다', (axis) => {
    expect(mismatchOf(axis, 60, 50)).toBe(5);
    expect(mismatchOf(axis, 70, 50)).toBe(10);
    expect(mismatchOf(axis, 100, 20)).toBe(40);
  });

  it('한방·반격은 V2에서도 대칭 거리다', () => {
    for (const axis of ['attack', 'counter']) {
      expect(mismatchOf(axis, 50, 80)).toBe(30);
      expect(mismatchOf(axis, 80, 50)).toBe(30);
    }
  });
});

describe('V2 값 변환', () => {
  it('같은 응답이면 사용자 constraint는 기존 방식의 100 - freedom이다', () => {
    const answerSets = [1, 2, 3, 4, 5, 6].map((r) => (q, i) => (i % 2 ? r : 7 - r));
    for (const pick of answerSets) {
      const answers = Object.fromEntries(v2Questions.questions.map((q, i) => [q.question_id, pick(q, i)]));
      const v2 = computeAxisProfile(computeAxisTotals(v2Questions.questions, answers, CONSTRAINT_MODEL));
      const old = computeAxisProfile(computeAxisTotals(freedomQuestions, answers, FREEDOM_MODEL));
      expect(v2.constraint).toBeCloseTo(100 - old.freedom, 10);
      for (const axis of ['attack', 'complexity', 'management', 'counter']) expect(v2[axis]).toBe(old[axis]);
      expect(centralDeviation(v2, CONSTRAINT_MODEL)).toBeCloseTo(centralDeviation(old, FREEDOM_MODEL), 10);
    }
  });

  it('무기 constraint는 기존 freedom을 뒤집은 값이며 질문 데이터에 freedom이 남지 않는다', () => {
    for (const w of v2Weapons.weapons) expect(w.constraint).toBe(100 - freedomWeapons.find(({ weapon_id }) => weapon_id === w.weapon_id).freedom);
    for (const item of [...v2Weapons.weapons, ...v2Questions.questions]) expect(item).not.toHaveProperty('freedom');
  });

  it('입문 난이도 원점수는 constraint + complexity + management이며 기존 식과 같은 값이다', () => {
    expect(difficultyScore(v2Weapon('w', { constraint: 70, complexity: 30, management: 5 }), CONSTRAINT_MODEL)).toBe(105);
    const stars = v2Weapons.weapons.map((w) => difficultyStars(w, v2Weapons.weapons, CONSTRAINT_MODEL));
    const before = freedomWeapons.map((w) => difficultyStars(w, freedomWeapons, FREEDOM_MODEL));
    expect(stars).toEqual(before);
  });
});

describe('V2 추천 순위와 이유', () => {
  it('행동 제약이 무기보다 낮은 사용자에게 제약이 더 큰 무기는 3구간 완충으로 감점한다', () => {
    const user = v2Profile({ constraint: 30 });
    const ranked = rankWeapons([v2Weapon('heavy', { constraint: 70 }), v2Weapon('light', { constraint: 10 })], user, CONSTRAINT_MODEL);
    expect(ranked.map(({ weapon }) => weapon.weapon_id)).toEqual(['light', 'heavy']);
    expect(ranked[1].axes.constraint.mismatch).toBe(32.5);
  });

  it('낯설 수 있는 점은 제약 방향을 자유도처럼 거꾸로 말하지 않는다', () => {
    const user = v2Profile({ constraint: 20 });
    const heavy = v2Weapon('heavy', { constraint: 90 });
    const reason = buildRecommendationReason(user, heavy, null, CONSTRAINT_MODEL);
    expect(reason.caution).toMatchObject({ axis: 'constraint', direction: 'higher' });
    expect(cautionCopy(reason, '')).toContain('한 번 시작한 동작에 오래 묶이는');
  });
});

describe('V2 공유 코드', () => {
  it('두 번째 축 값은 constraint로 담고 읽는다', () => {
    const profile = v2Profile({ attack: 79, constraint: 70, complexity: 64, management: 59, counter: 69 });
    const code = encodeShareCode({ weaponIds: ['gunlance', 'switch_axe', 'lance'], profile, nickname: '헌터' }, CONSTRAINT_MODEL);
    expect(code.split('.').slice(3, 8)).toEqual(['79', '70', '64', '59', '69']);
    const decoded = decodeShareCode(code, v2Weapons.weapons, CONSTRAINT_MODEL);
    expect(decoded.profile).toEqual(profile);
    expect(decoded.profile).not.toHaveProperty('freedom');
  });
});

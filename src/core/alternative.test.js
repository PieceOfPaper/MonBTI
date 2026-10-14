import { describe, expect, it } from 'vitest';
import { CONSTRAINT_MODEL, FREEDOM_MODEL } from './axis-models.js';
import { findLighterAlternative, isLighterAlternative } from './alternative.js';
import { amplifyProfile, finalRanking } from './central.js';
import { rankWeapons } from './recommend.js';

const model = CONSTRAINT_MODEL;
const profile = { attack: 50, constraint: 50, complexity: 50, management: 50, counter: 50 };
const weapon = (weapon_id, values) => ({ weapon_id, weapon_name: weapon_id, ...profile, ...values });

describe('부담이 적은 대안 후보 조건', () => {
  it('한방·반격은 각각 25 이하 차이까지 허용하고 26부터는 후보가 아니다', () => {
    const base = { constraint: 40 };
    expect(isLighterAlternative(profile, weapon('a', { ...base, attack: 75, counter: 25 }), model)).toBe(true);
    expect(isLighterAlternative(profile, weapon('a', { ...base, attack: 76 }), model)).toBe(false);
    expect(isLighterAlternative(profile, weapon('a', { ...base, counter: 24 }), model)).toBe(false);
  });

  it('평균이 아니라 축별로 확인한다', () => {
    // 한방 차이 0, 반격 차이 30이면 평균 15지만 반격이 25를 넘는다.
    expect(isLighterAlternative(profile, weapon('a', { constraint: 40, counter: 80 }), model)).toBe(false);
  });

  it('제약·복잡·관리는 모두 사용자 이하여야 한다', () => {
    expect(isLighterAlternative(profile, weapon('a', { constraint: 30, complexity: 51 }), model)).toBe(false);
    expect(isLighterAlternative(profile, weapon('a', { constraint: 30, management: 51 }), model)).toBe(false);
    expect(isLighterAlternative(profile, weapon('a', { complexity: 30, constraint: 51 }), model)).toBe(false);
  });

  it('부담형 기준 하나 이상이 10점 이상 낮아야 한다', () => {
    expect(isLighterAlternative(profile, weapon('a', { management: 40 }), model)).toBe(true);
    expect(isLighterAlternative(profile, weapon('a', { constraint: 41, complexity: 41, management: 41 }), model)).toBe(false);
    expect(isLighterAlternative(profile, weapon('a', {}), model)).toBe(false);
  });

  it('조건에 쓰는 축이 측정되지 않았거나 모델이 규칙을 쓰지 않으면 후보가 아니다', () => {
    expect(isLighterAlternative({ ...profile, counter: null }, weapon('a', { constraint: 30 }), model)).toBe(false);
    expect(isLighterAlternative(profile, weapon('a', { constraint: 30 }), FREEDOM_MODEL)).toBe(false);
  });
});

describe('부담이 적은 대안 선택', () => {
  const weapons = [
    weapon('top1', {}),
    weapon('top2', { attack: 55 }),
    weapon('top3', { attack: 45 }),
    weapon('far', { constraint: 20, attack: 80 }),
    weapon('light_low', { constraint: 10, complexity: 10, management: 10 }),
    weapon('light_high', { constraint: 38 }),
  ];
  const top = weapons.slice(0, 3);

  it('1~3순위를 빼고 후보 중 일반 추천 순위가 가장 높은 무기를 고른다', () => {
    const ranked = rankWeapons(weapons, profile, model).map(({ weapon: { weapon_id } }) => weapon_id);
    expect(ranked.indexOf('light_high')).toBeLessThan(ranked.indexOf('light_low'));
    const alternative = findLighterAlternative(weapons, profile, top, model);
    expect(alternative.weapon.weapon_id).toBe('light_high');
  });

  it('가장 앞선 후보가 이미 화면의 1~3순위에 있으면 다음 후보로 넘어가지 않고 null이다', () => {
    const lightTop = weapon('top_light', { constraint: 38 });
    expect(findLighterAlternative([lightTop, ...weapons.slice(1)], profile, [lightTop, ...top.slice(1)], model)).toBeNull();
    // 2·3순위에 있어도 마찬가지다.
    expect(findLighterAlternative([...top.slice(0, 2), lightTop, ...weapons.slice(3)], profile, [...top.slice(0, 2), lightTop], model)).toBeNull();
  });

  it('후보가 없으면 조건을 완화하지 않고 null이다', () => {
    expect(findLighterAlternative(weapons.slice(0, 4), profile, top, model)).toBeNull();
    expect(findLighterAlternative(weapons, profile, top, FREEDOM_MODEL)).toBeNull();
  });

  it('점수가 같으면 기존 추천처럼 시트 행 순서를 따른다', () => {
    const twins = [weapon('first', { constraint: 30 }), weapon('second', { constraint: 30 })];
    expect(findLighterAlternative([...top, ...twins], profile, top, model).weapon.weapon_id).toBe('first');
    expect(findLighterAlternative([...top, ...twins.reverse()], profile, top, model).weapon.weapon_id).toBe('second');
  });

  it('추천 점수와 1~3순위 계산은 바뀌지 않는다', () => {
    const before = rankWeapons(weapons, profile, model);
    findLighterAlternative(weapons, profile, top, model);
    expect(rankWeapons(weapons, profile, model)).toEqual(before);
  });

  it('중앙형 특별 결과에서도 확대 점수가 아닌 원래 점수로 후보를 고른다', () => {
    const central = { attack: 52, constraint: 58, complexity: 50, management: 50, counter: 48 };
    const amplified = amplifyProfile(central, model);
    // only_amplified: 확대한 제약(82)보다는 12 낮지만 원래 제약(58)보다는 높다.
    // only_original: 원래 점수 기준으로는 제약이 12 낮은 후보지만, 확대 점수 기준으로는 후보가 아니다.
    const onlyAmplified = weapon('only_amplified', { attack: amplified.attack, constraint: 70, counter: amplified.counter, complexity: 0, management: 0 });
    const onlyOriginal = weapon('only_original', { attack: 52, constraint: 46, counter: 48, complexity: 50, management: 40 });
    // 원래 점수와 똑같아 1~3순위를 채우지만 부담이 낮지 않아 후보는 아닌 무기들.
    const same = ['x', 'y', 'z'].map((id) => weapon(id, central));
    const candidates = [...same, onlyAmplified, onlyOriginal];
    expect(isLighterAlternative(amplified, onlyAmplified, model)).toBe(true);
    expect(isLighterAlternative(central, onlyAmplified, model)).toBe(false);
    expect(isLighterAlternative(amplified, onlyOriginal, model)).toBe(false);

    const { ranked, central: isCentral } = finalRanking(candidates, central, { centralResult: true, axisModel: model });
    expect(isCentral).toBe(true);
    const shown = ranked.slice(0, 3).map(({ weapon: w }) => w);
    expect(shown).not.toContain(onlyOriginal);
    expect(findLighterAlternative(candidates, central, shown, model).weapon).toBe(onlyOriginal);
  });
});

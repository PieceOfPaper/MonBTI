import { describe, expect, it } from 'vitest';
import { rankWeapons, recommendWeapons, scoreWeapon } from './recommend.js';

const weapon = (weapon_id, values) => ({
  weapon_id, weapon_name: weapon_id, attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values,
});
const profile = (values) => ({ attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values });
const ids = (weapons) => weapons.map(({ weapon_id }) => weapon_id);

describe('축별 불일치', () => {
  it('attack·counter는 어느 방향이든 차이만큼 벌점을 준다', () => {
    for (const axis of ['attack', 'counter']) {
      expect(scoreWeapon(profile({ [axis]: 50 }), weapon('w', { [axis]: 75 })).maxMismatch).toBe(25);
      expect(scoreWeapon(profile({ [axis]: 50 }), weapon('w', { [axis]: 25 })).maxMismatch).toBe(25);
    }
  });

  it('freedom은 무기가 낮으면 차이 전부, 높으면 차이의 절반을 벌점으로 준다', () => {
    expect(scoreWeapon(profile({ freedom: 75 }), weapon('w', { freedom: 25 })).maxMismatch).toBe(50);
    expect(scoreWeapon(profile({ freedom: 25 }), weapon('w', { freedom: 100 })).maxMismatch).toBe(37.5);
    expect(scoreWeapon(profile({ freedom: 60 }), weapon('w', { freedom: 60 })).score).toBe(100);
  });

  it('complexity·management는 무기가 높으면 차이 전부, 낮으면 차이의 절반을 벌점으로 준다', () => {
    for (const axis of ['complexity', 'management']) {
      expect(scoreWeapon(profile({ [axis]: 25 }), weapon('w', { [axis]: 100 })).maxMismatch).toBe(75);
      expect(scoreWeapon(profile({ [axis]: 100 }), weapon('w', { [axis]: 0 })).maxMismatch).toBe(50);
      expect(scoreWeapon(profile({ [axis]: 60 }), weapon('w', { [axis]: 60 })).score).toBe(100);
    }
  });

  it('측정된 축의 적합도를 같은 비중으로 평균하고 미측정 축은 뺀다', () => {
    const user = { attack: 0, freedom: null, complexity: null, management: null, counter: 100 };
    // attack 적합도 0(불일치 100), counter 적합도 50(불일치 50) → 평균 25
    expect(scoreWeapon(user, weapon('w', { attack: 100, counter: 50, freedom: 0, complexity: 100 }))).toEqual({
      score: 25, maxMismatch: 100,
    });
    expect(scoreWeapon({ attack: null, freedom: null, complexity: null, management: null, counter: null }, weapon('w')).score)
      .toBeNull();
  });
});

describe('추천 순위', () => {
  it('점수가 높은 순으로 세 무기를 고른다', () => {
    const weapons = [weapon('far', { attack: 0 }), weapon('near', { attack: 75 }), weapon('exact', { attack: 100 }),
      weapon('mid', { attack: 50 })];
    expect(ids(recommendWeapons(weapons, profile({ attack: 100 })))).toEqual(['exact', 'near', 'mid']);
  });

  it('동점이면 최대 단일 축 불일치가 작은 무기, 그다음 시트 행 순서를 따른다', () => {
    const user = profile({});
    const weapons = [
      weapon('row_first', { attack: 0 }), // 불일치 50 하나 → 점수 90, 최대 50
      weapon('spread', { attack: 25, counter: 25 }), // 불일치 25 두 개 → 점수 90, 최대 25
      weapon('row_second', { counter: 100 }), // 불일치 50 하나 → 점수 90, 최대 50
    ];
    const ranked = rankWeapons(weapons, user);
    expect(ranked.map(({ score }) => score)).toEqual([90, 90, 90]);
    expect(ids(ranked.map(({ weapon: w }) => w))).toEqual(['spread', 'row_first', 'row_second']);
  });

});

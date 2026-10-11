import { describe, expect, it } from 'vitest';
import {
  AXIS_MISMATCH, AXIS_WEIGHTS, excessDemandMismatch, rankWeapons, recommendWeapons, remainingWeapons, scoreWeapon,
} from './recommend.js';

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

  it('complexity·management는 무기가 낮으면 차이의 절반, 높으면 3구간 누적으로 벌점을 준다', () => {
    for (const axis of ['complexity', 'management']) {
      // 초과 부담 75: 10 × 0.5 + 10 × 0.75 + 55 = 67.5
      expect(scoreWeapon(profile({ [axis]: 25 }), weapon('w', { [axis]: 100 })).maxMismatch).toBe(67.5);
      expect(scoreWeapon(profile({ [axis]: 100 }), weapon('w', { [axis]: 0 })).maxMismatch).toBe(50);
      expect(scoreWeapon(profile({ [axis]: 60 }), weapon('w', { [axis]: 60 })).score).toBe(100);
    }
  });

  it('초과 부담 3구간은 경계에서 이어지고 앞 구간부터 누적한다', () => {
    expect([0, 5, 10, 15, 20, 30].map(excessDemandMismatch)).toEqual([0, 2.5, 5, 8.75, 12.5, 22.5]);
    expect(excessDemandMismatch(-10)).toBe(0);
    for (const edge of [10, 20]) {
      expect(excessDemandMismatch(edge - 1e-9)).toBeCloseTo(excessDemandMismatch(edge), 8);
      expect(excessDemandMismatch(edge + 1e-9)).toBeCloseTo(excessDemandMismatch(edge), 8);
    }
    for (const axis of ['complexity', 'management']) {
      expect([0, 5, 10, 15, 20, 30].map((d) => AXIS_MISMATCH[axis](50, 50 + d))).toEqual([0, 2.5, 5, 8.75, 12.5, 22.5]);
    }
  });

  it('3구간은 복잡·관리의 무기 > 사용자에만 적용한다', () => {
    for (const axis of ['complexity', 'management']) {
      expect(AXIS_MISMATCH[axis](80, 50)).toBe(15);
      expect(AXIS_MISMATCH[axis](50, 15)).toBe(17.5);
    }
    expect(AXIS_MISMATCH.freedom(80, 50)).toBe(30);
    expect(AXIS_MISMATCH.freedom(50, 80)).toBe(15);
    for (const axis of ['attack', 'counter']) {
      expect(AXIS_MISMATCH[axis](50, 65)).toBe(15);
      expect(AXIS_MISMATCH[axis](65, 50)).toBe(15);
    }
  });

  it('측정된 축의 적합도를 축 가중치로 평균하고 미측정 축은 분자와 분모에서 뺀다', () => {
    const user = { attack: 0, freedom: null, complexity: null, management: null, counter: 100 };
    // attack 적합도 0(불일치 100), counter 적합도 50(불일치 50), 두 축 모두 0.75 → (0 + 37.5) / 1.5 = 25
    expect(scoreWeapon(user, weapon('w', { attack: 100, counter: 50, freedom: 0, complexity: 100 }))).toMatchObject({
      score: 25, maxMismatch: 100, weightSum: 1.5,
    });
    expect(scoreWeapon({ attack: null, freedom: null, complexity: null, management: null, counter: null }, weapon('w')).score)
      .toBeNull();
  });

  it('한방·반격은 0.75, 자유·복잡·관리는 1.0으로 합산한다', () => {
    expect(AXIS_WEIGHTS).toEqual({ attack: 0.75, freedom: 1, complexity: 1, management: 1, counter: 0.75 });
    // 한방 불일치 40(적합도 60×0.75) + 자유 불일치 0(적합도 100×1) → 145 / 1.75
    const user = { attack: 40, freedom: 50, complexity: null, management: null, counter: null };
    expect(scoreWeapon(user, weapon('w', { attack: 0 })).score).toBeCloseTo(145 / 1.75, 10);
    // 같은 원래 불일치 20이라도 관리 축(낮은 요구, 50%)과 한방 축의 가중 감점이 다르다.
    const all = profile({});
    const byAttack = scoreWeapon(all, weapon('a', { attack: 70 })).score;
    const byManagement = scoreWeapon(all, weapon('m', { management: 10 })).score;
    expect(byAttack).toBeCloseTo(100 - 15 / 4.5, 10);
    expect(byManagement).toBeCloseTo(100 - 20 / 4.5, 10);
  });

  it('축별 상세값에 원래 불일치·적합도와 가중 값을 함께 담는다', () => {
    const detail = scoreWeapon(profile({ attack: 73, freedom: 21 }), weapon('w', { attack: 80, freedom: 35 }));
    expect(detail.weightSum).toBe(4.5);
    expect(detail.axes.attack).toEqual({
      user: 73, weapon: 80, direction: 'higher', mismatch: 7, fit: 93, weight: 0.75, weightedMismatch: 5.25, weightedFit: 69.75,
    });
    expect(detail.axes.freedom).toMatchObject({ direction: 'higher', mismatch: 7, weight: 1, weightedFit: 93 });
    expect(detail.axes.counter.direction).toBe('equal');
    const partial = scoreWeapon({ ...profile({}), counter: null }, weapon('w'));
    expect(Object.keys(partial.axes)).toEqual(['attack', 'freedom', 'complexity', 'management']);
    expect(partial.weightSum).toBe(3.75);
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
      weapon('row_first', { attack: 0 }), // 불일치 50 하나(가중 37.5), 최대 50
      weapon('spread', { attack: 25, counter: 25 }), // 불일치 25 두 개(가중 18.75 × 2), 최대 25
      weapon('row_second', { counter: 100 }), // 불일치 50 하나(가중 37.5), 최대 50
    ];
    const ranked = rankWeapons(weapons, user);
    expect(new Set(ranked.map(({ score }) => score)).size).toBe(1);
    expect(ids(ranked.map(({ weapon: w }) => w))).toEqual(['spread', 'row_first', 'row_second']);
  });

  it('나머지 무기는 지정한 상위 무기를 빼고 같은 순위 규칙으로 이어진다', () => {
    const user = profile({ attack: 100 });
    const weapons = [weapon('far', { attack: 0 }), weapon('exact', { attack: 100 }), weapon('near', { attack: 80 })];
    const ranked = rankWeapons(weapons, user).map(({ weapon: w }) => w);
    expect(ids(remainingWeapons(weapons, user, ranked.slice(0, 1)))).toEqual(ids(ranked.slice(1)));
    expect(ids(remainingWeapons(weapons, user, [ranked[2]]))).toEqual(ids(ranked.slice(0, 2)));
  });
});

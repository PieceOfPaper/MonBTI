import { describe, expect, it } from 'vitest';
import { nearestResponse, simulateDistribution } from './result-distribution.js';

const questions = [
  { question_id: 'q1', attack: 100, freedom: 0, complexity: 0, management: 0, counter: 0 },
  { question_id: 'q2', attack: -100, freedom: 0, complexity: 0, management: 0, counter: 0 },
];
const weapons = [
  { weapon_id: 'heavy', weapon_name: '한방', attack: 90, freedom: 50, complexity: 50, management: 50, counter: 50 },
  { weapon_id: 'light', weapon_name: '지속', attack: 10, freedom: 50, complexity: 50, management: 50, counter: 50 },
];

describe('추천 비율 시뮬레이션', () => {
  it('연속 동의 정도를 가장 가까운 응답으로 바꾼다', () => {
    expect(nearestResponse(-2)).toBe(1);
    expect(nearestResponse(0.1)).toBe(4);
    expect(nearestResponse(0.65)).toBe(5);
    expect(nearestResponse(3)).toBe(6);
  });

  it.each(['uniform', 'persona'])('%s: 1순위 비율 합은 1, 3순위 이내 비율은 무기 수 이하', (model) => {
    const result = simulateDistribution({ questions, weapons, model, samples: 500 });
    const sum = (key) => result.weapons.reduce((total, weapon) => total + weapon[key], 0);
    expect(sum('firstRate')).toBeCloseTo(1);
    expect(sum('topRate')).toBeCloseTo(2);
  });

  it('central을 켜면 중앙형 응답 수를 세고, 비율 합은 그대로 유지한다', () => {
    const off = simulateDistribution({ questions, weapons, model: 'uniform', samples: 500, seed: 3 });
    const on = simulateDistribution({ questions, weapons, model: 'uniform', samples: 500, seed: 3, central: true });
    expect(off.specials).toBe(0);
    expect(on.specials).toBeGreaterThan(0);
    expect(on.weapons.reduce((total, weapon) => total + weapon.firstRate, 0)).toBeCloseTo(1);
    expect(on.weapons.reduce((total, weapon) => total + weapon.topRate, 0)).toBeCloseTo(2);
  });

  it('같은 seed는 같은 결과를 낸다', () => {
    const run = () => simulateDistribution({ questions, weapons, model: 'persona', samples: 300, seed: 9 });
    expect(run()).toEqual(run());
  });

  it('흔들림이 없는 취향 응답은 취향 쪽 무기를 고른다', () => {
    const result = simulateDistribution({ questions, weapons, model: 'persona', samples: 2000, noise: 0 });
    const heavy = result.weapons.find(({ weapon_id }) => weapon_id === 'heavy');
    expect(heavy.firstProfile.attack).toBeGreaterThan(50);
    expect(heavy.firstRate).toBeGreaterThan(0.4);
    expect(heavy.firstRate).toBeLessThan(0.6);
  });

  it('알 수 없는 응답 모형은 거부한다', () => {
    expect(() => simulateDistribution({ questions, weapons, model: 'x', samples: 1 })).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { DIFFICULTY_LEVELS, difficultyLabel, difficultyScore, difficultyStars } from './difficulty.js';
import { rankWeapons } from './recommend.js';

const weapon = (weapon_id, values) => ({
  weapon_id, attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values,
});

describe('입문 난이도', () => {
  it('원점수는 (100 - 자유도) + 복잡도 + 관리 부담이며 한방·반격은 쓰지 않는다', () => {
    expect(difficultyScore(weapon('w', { freedom: 80, complexity: 30, management: 10 }))).toBe(60);
    expect(difficultyScore(weapon('w', { attack: 0, counter: 100 })))
      .toBe(difficultyScore(weapon('w', { attack: 100, counter: 0 })));
  });

  it('작품 내 최솟값·최댓값으로 정규화해 올림하고 최저 무기는 1단계로 보정한다', () => {
    // 원점수 0, 60, 61, 240, 300 → 정규화 0, 0.2, 0.2033, 0.8, 1
    const weapons = [
      weapon('min', { freedom: 100, complexity: 0, management: 0 }),
      weapon('edge', { freedom: 100, complexity: 60, management: 0 }),
      weapon('over', { freedom: 100, complexity: 61, management: 0 }),
      weapon('high', { freedom: 0, complexity: 100, management: 40 }),
      weapon('max', { freedom: 0, complexity: 100, management: 100 }),
    ];
    expect(weapons.map((w) => difficultyStars(w, weapons))).toEqual([1, 1, 2, 4, 5]);
  });

  it('모든 무기의 원점수가 같으면 3단계로 표시한다', () => {
    const weapons = [weapon('a'), weapon('b', { attack: 0 })];
    expect(weapons.map((w) => difficultyStars(w, weapons))).toEqual([3, 3]);
  });

  it('채운 별 뒤에 빈 별을 붙여 항상 다섯 칸을 유지한다', () => {
    expect(DIFFICULTY_LEVELS).toBe(5);
    expect(difficultyLabel(1)).toBe('★☆☆☆☆');
    expect(difficultyLabel(3)).toBe('★★★☆☆');
    expect(difficultyLabel(5)).toBe('★★★★★');
  });

  it('추천 점수와 순위에는 영향을 주지 않는다', () => {
    const weapons = [weapon('a', { freedom: 90 }), weapon('b', { complexity: 90 })];
    const profile = { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 };
    const before = rankWeapons(weapons, profile);
    weapons.forEach((w) => difficultyStars(w, weapons));
    expect(rankWeapons(weapons, profile)).toEqual(before);
    expect(before[0]).not.toHaveProperty('difficulty');
  });
});

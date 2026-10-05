import { describe, expect, it } from 'vitest';
import { createGameSelection, supportedGames } from './main.js';

describe('작품 선택 화면', () => {
  it('현재 지원하는 와일즈만 표시한다', () => {
    expect(supportedGames).toHaveLength(1);
    expect(supportedGames[0].id).toBe('wilds');
    expect(createGameSelection()).toContain('몬스터헌터 와일즈');
  });

  it('검사 작품을 버튼으로 제공한다', () => {
    expect(createGameSelection()).toContain('data-game-id="wilds"');
  });
});

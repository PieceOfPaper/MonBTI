import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { supportedGames } from '../src/games/index.js';
import { GAMES, selectGames } from './convert-sheet.js';

describe('검사별 데이터 변환 대상', () => {
  it('내부 이름은 원본 탭 접두사이고 사이트에 등록된 작품과 하나씩 대응한다', () => {
    expect(GAMES.map(({ sheet, weaponSheet, questionSheet }) => [sheet, weaponSheet, questionSheet])).toEqual([
      ['Wilds', 'Wilds_Weapon', 'Wilds_Question'],
      ['Wilds_V2', 'Wilds_V2_Weapon', 'Wilds_V2_Question'],
    ]);
    expect(GAMES.map(({ id }) => id).sort()).toEqual(supportedGames.map(({ id }) => id).sort());
  });

  it('검사별 축 열은 사이트 작품 설정의 축 모델과 같다', () => {
    for (const game of GAMES) {
      expect(game.axisFields).toEqual(supportedGames.find(({ id }) => id === game.id).axisModel.axisIds);
    }
  });

  it('--sheet가 없으면 모든 검사, 있으면 그 검사만 고르고 모르는 이름은 거부한다', () => {
    expect(selectGames(undefined)).toEqual(GAMES);
    expect(selectGames('Wilds_V2').map(({ id }) => id)).toEqual(['wilds_v2']);
    expect(selectGames('Wilds').map(({ id }) => id)).toEqual(['wilds']);
    expect(() => selectGames('wilds_v2')).toThrow(/가능: Wilds, Wilds_V2/);
  });

  it.each(GAMES.map((game) => [game.sheet, game]))('%s 검사에 데이터 갱신 워크플로가 있다', async (_, game) => {
    const file = `refresh-data-${game.id.replaceAll('_', '-')}.yml`;
    const text = await readFile(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8');
    expect(text).toContain('uses: ./.github/workflows/refresh-data.yml');
    expect(text).toMatch(new RegExp(`sheet: ${game.sheet}\\s`));
    expect(text).toMatch(new RegExp(`game_id: ${game.id}\\s`));
  });
});

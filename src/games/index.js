// 작품별 데이터 등록. 각 작품의 데이터는 src/data/<작품 ID>/에서만 읽어 섞이지 않게 한다.
import wildsQuestions from '../data/wilds/questions.json';
import wildsWeapons from '../data/wilds/weapons.json';

export const supportedGames = [
  {
    id: 'wilds',
    name: '몬스터헌터 와일즈',
    description: '나의 플레이 취향에 어울리는 무기를 찾아보세요.',
    questions: wildsQuestions.questions,
    weapons: wildsWeapons.weapons,
  },
];

export function findGame(id, games = supportedGames) {
  return games.find((game) => game.id === id) ?? null;
}

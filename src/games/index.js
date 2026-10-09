// 작품별 데이터 등록. 각 작품의 데이터는 src/data/<작품 ID>/에서만 읽어 섞이지 않게 한다.
import wildsQuestions from '../data/wilds/questions.json';
import wildsWeapons from '../data/wilds/weapons.json';
import { wildsLogo, wildsMedia } from './wilds/media.js';

// 시트에서 온 무기 데이터에 사이트 표시 자료(아이콘·영상·소개 문구)를 붙인다. 작품 로고는 작품 선택 화면에서 이름 대신 보여 준다.
const withMedia = (weapons, media) => weapons.map((weapon) => ({ ...weapon, ...media(weapon.weapon_id) }));

export const supportedGames = [
  {
    id: 'wilds',
    name: '몬스터헌터 와일즈',
    logo: wildsLogo,
    description: '나의 플레이 취향에 어울리는 무기를 찾아보세요.',
    questions: wildsQuestions.questions,
    weapons: withMedia(wildsWeapons.weapons, wildsMedia),
  },
];

export function findGame(id, games = supportedGames) {
  return games.find((game) => game.id === id) ?? null;
}

// 작품별 데이터 등록. 각 작품의 데이터는 src/data/<작품 ID>/에서만 읽어 섞이지 않게 한다.
import wildsQuestions from '../data/wilds/questions.json';
import wildsWeapons from '../data/wilds/weapons.json';
import wildsV2Questions from '../data/wilds_v2/questions.json';
import wildsV2Weapons from '../data/wilds_v2/weapons.json';
import { GAME_AXIS_MODELS } from '../core/axis-models.js';
import { wildsLogo, wildsMedia } from './wilds/media.js';

// 시트에서 온 무기 데이터에 사이트 표시 자료(아이콘·영상·소개 문구)를 붙인다. 작품 로고는 작품 선택 화면에서 이름 대신 보여 준다.
const withMedia = (weapons, media) => weapons.map((weapon) => ({ ...weapon, ...media(weapon.weapon_id) }));

// 등록 순서가 작품 선택 화면의 표시 순서다. development가 true인 검사는 ‘개발 중인 검사’ 접이식 목록에 따로 보여 준다.
// tag는 같은 로고를 쓰는 검사를 구분하는 짧은 표시다.
// 와일즈 V2는 개발 중인 다음 버전 검사로, 무기·질문 원본을 Wilds_V2_* 탭으로 분리하고 표시 자료는 와일즈 것을 함께 쓴다.
// 개발이 끝나면 development를 지우고 기존 와일즈보다 위에 등록한다.
// axisModel은 축 목록·불일치 공식·입문 난이도 원점수를 정하는 축 모델(core/axis-models.js)이다.
// 기존 와일즈는 자유도(freedom), 와일즈 V2는 행동 제약(constraint)과 부담 허용형 공식을 쓴다(docs/wilds-v2-plan.md).
// centralResult가 true인 검사는 중앙형 응답에 특별 결과를 보여 준다(core/central.js, GitHub 이슈 #1). 현재 와일즈 V2에만 적용한다.
export const supportedGames = [
  {
    id: 'wilds',
    name: '몬스터헌터 와일즈',
    logo: wildsLogo,
    description: '나의 플레이 취향에 어울리는 무기를 찾아보세요.',
    axisModel: GAME_AXIS_MODELS.wilds,
    questions: wildsQuestions.questions,
    weapons: withMedia(wildsWeapons.weapons, wildsMedia),
  },
  {
    id: 'wilds_v2',
    name: '몬스터헌터 와일즈 V2',
    tag: 'V2',
    development: true,
    centralResult: true,
    axisModel: GAME_AXIS_MODELS.wilds_v2,
    logo: wildsLogo,
    description: '다음 버전으로 준비 중인 와일즈 검사예요.',
    questions: wildsV2Questions.questions,
    weapons: withMedia(wildsV2Weapons.weapons, wildsMedia),
  },
];

export function findGame(id, games = supportedGames) {
  return games.find((game) => game.id === id) ?? null;
}

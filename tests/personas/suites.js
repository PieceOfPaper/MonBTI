// 작품별 페르소나 묶음. 작품 ID는 src/data/<작품 ID>/와 사이트 작품 설정(src/games/index.js)의 ID와 같다.
// rules.centralResult는 사이트의 작품 설정 centralResult와 같아야 하며 persona.test.js에서 일치를 확인한다.
// (사이트 작품 설정은 이미지 자산을 불러오므로 Node로 실행하는 보고서 스크립트에서 직접 읽지 않는다.)
import { loadGameData } from './persona-runner.js';
import { wildsPersonas } from './wilds-personas.js';
import { wildsV2Personas } from './wilds-v2-personas.js';

export const personaSuites = {
  wilds: { personas: wildsPersonas, rules: { centralResult: false } },
  wilds_v2: { personas: wildsV2Personas, rules: { centralResult: true } },
};

export const PERSONA_GAME_IDS = Object.keys(personaSuites);

// 작품의 배포 데이터와 페르소나·판정 규칙을 함께 읽는다.
export async function loadPersonaSuite(game) {
  const suite = personaSuites[game];
  if (!suite) throw new Error(`페르소나가 없는 작품입니다: ${game} (가능: ${PERSONA_GAME_IDS.join(', ')})`);
  return { game, ...suite, ...(await loadGameData(game)) };
}

// 결과 공유 링크. 답변 대신 결과 자체(추천 무기 ID와 축별 0~100 값)를 담아
// 질문 데이터가 바뀌어도 공유받은 사람이 같은 결과를 볼 수 있게 한다.
// 공유 창·메신저·복사 과정에서 인코딩되지 않도록 영문·숫자·'.'·'_'·'-'만 사용한다.
// 코드: <1순위>.<2순위>.<3순위 weapon_id>.<attack>.<freedom>.<complexity>.<management>.<counter>
// 축 값은 0~100 정수이며 미측정 축은 '-'로 적는다.
// 외부 링크: <사이트 주소>?r=<작품 ID>.<코드>, 앱 내부 주소: #/<작품 ID>/share/<코드>
import { AXIS_IDS } from './axes.js';
import { RECOMMENDATION_COUNT } from './recommend.js';

export const SHARE_PARAM = 'r';

export function encodeShareCode({ weaponIds, profile }) {
  const values = AXIS_IDS.map((axis) => (profile[axis] === null ? '-' : String(Math.round(profile[axis]))));
  return [...weaponIds, ...values].join('.');
}

export function shareHash(gameId, code) {
  return `#/${gameId}/share/${code}`;
}

// ?r=<작품 ID>.<코드>에서 작품 ID와 코드를 나눈다.
export function parseShareParam(value) {
  const match = /^([a-z0-9_-]+)\.(.+)$/i.exec(value ?? '');
  return match ? { gameId: match[1], code: match[2] } : null;
}

// 알 수 없는 무기, 중복, 범위 밖 값이 있으면 null을 돌려준다.
export function decodeShareCode(code, weapons) {
  const parts = (code ?? '').split('.');
  if (parts.length !== RECOMMENDATION_COUNT + AXIS_IDS.length) return null;
  const ids = parts.slice(0, RECOMMENDATION_COUNT);
  const values = parts.slice(RECOMMENDATION_COUNT);
  if (new Set(ids).size !== ids.length) return null;

  const byId = new Map(weapons.map((weapon) => [weapon.weapon_id, weapon]));
  if (!ids.every((id) => byId.has(id))) return null;

  const profile = {};
  for (const [i, axis] of AXIS_IDS.entries()) {
    if (values[i] === '-') {
      profile[axis] = null;
      continue;
    }
    if (!/^\d{1,3}$/.test(values[i])) return null;
    const value = Number(values[i]);
    if (value > 100) return null;
    profile[axis] = value;
  }
  return { weapons: ids.map((id) => byId.get(id)), profile };
}

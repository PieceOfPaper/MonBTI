// 결과 화면(views.js)과 공유 이미지(share-image.js)가 함께 쓰는 결과 표시 내용.
// 두 출력이 같은 항목·문구·값을 보여 주도록 표시 내용은 여기서만 만든다(docs/test-design.md '결과 화면과 공유 이미지').
// 문자열은 이스케이프하지 않은 원문이다. HTML로 낼 때는 views.js가 이스케이프한다.
import { AXES } from '../core/axes.js';
import { DIFFICULTY_LEVELS, difficultyLabel, difficultyStars } from '../core/difficulty.js';
import { FALLBACK_NICKNAME } from '../core/nickname.js';
import {
  REASON_TITLE, SECTION_TITLES, advantagesCopy, cautionCopy, closestCopy, leadText, tradeoffCopy,
} from '../core/reason-copy.js';

export const RANK_LABELS = ['1순위', '2순위', '3순위'];
export const COMPARE_SECTION_TITLE = '무기별 기준 비교';
export const DIFFICULTY_TITLE = '입문 난이도';

export const displayName = (nickname) => nickname || FALLBACK_NICKNAME;
export const resultTitle = (who) => `${who}에게 어울리는 무기`;
export const compareTitle = (who, weapon) => `${who} vs ${weapon.weapon_name}`;

// 입문 난이도: 같은 작품 무기 사이의 상대평가 별표.
export function difficultyContent(weapon, weapons) {
  const stars = difficultyStars(weapon, weapons);
  return {
    title: DIFFICULTY_TITLE,
    stars,
    label: difficultyLabel(stars),
    spoken: `${DIFFICULTY_LEVELS}단계 중 ${stars}단계`,
  };
}

// 1순위 무기의 공식 소개 문구. 없으면 null이다.
export function quoteContent(weapon) {
  if (!weapon.description?.length) return null;
  return {
    lines: weapon.description,
    credit: weapon.descriptionSource ? `출처: ${weapon.descriptionSource}` : null,
  };
}

// 1순위 추천 이유(core/reason.js 모델). weapons는 결과의 1~3순위이며 이름을 찾는 데만 쓴다. 없는 항목은 parts에서 뺀다.
export function reasonContent(reason, weapons) {
  if (!reason) return null;
  const nameOf = (id) => weapons.find(({ weapon_id }) => weapon_id === id)?.weapon_name ?? '';
  const winnerName = nameOf(reason.winnerId);
  const runnerName = nameOf(reason.runnerUpId);
  const closest = closestCopy(reason, winnerName);
  const advantages = [advantagesCopy(reason, runnerName)].filter(Boolean);
  const cautions = [cautionCopy(reason, runnerName)].filter(Boolean);
  // 낯선 점과 다른 축에서 2순위가 더 가까우면 1순위 비교 옆에, 비교가 없으면 낯선 점 옆에 붙인다.
  const tradeoff = tradeoffCopy(reason, runnerName);
  const tradeoffs = [];
  if (tradeoff) (advantages.length ? advantages : cautions.length ? cautions : tradeoffs).push(tradeoff);
  return {
    title: REASON_TITLE,
    lead: leadText(reason, winnerName, runnerName),
    parts: [
      { title: closest.title, lines: [closest.text] },
      { title: SECTION_TITLES.advantages, lines: advantages },
      { title: SECTION_TITLES.caution, lines: cautions },
      { title: SECTION_TITLES.tradeoff, lines: tradeoffs },
    ].filter(({ lines }) => lines.length > 0),
  };
}

const formatValue = (value) => (value === null || value === undefined ? '측정 안 됨' : String(Math.round(value)));

// 기준 비교 표의 행. 차트도 같은 profile·weapon 값을 그린다.
export function comparisonRows(profile, weapon) {
  return AXES.map(({ id, short }) => ({ id, short, me: formatValue(profile[id]), weapon: formatValue(weapon[id]) }));
}

// 공유 이미지에 담는 결과 전체. 결과 화면의 첫 상태(1순위와 비교)와 같다.
// 영상·버튼·나머지 무기 목록처럼 눌러서 쓰는 요소는 이미지에서 쓸 수 없으므로 담지 않는다.
export function shareContent({ gameName, result, reason, weapons }) {
  const who = displayName(result.nickname);
  const winner = result.weapons[0];
  return {
    gameName,
    who,
    title: resultTitle(who),
    winner: {
      weapon: winner,
      difficulty: difficultyContent(winner, weapons),
      quote: quoteContent(winner),
    },
    reason: reasonContent(reason, result.weapons),
    comparison: {
      title: COMPARE_SECTION_TITLE,
      ranking: result.weapons.map((weapon, index) => ({ weapon, label: RANK_LABELS[index], selected: index === 0 })),
      subtitle: compareTitle(who, winner),
      legend: [who, winner.weapon_name],
      profile: result.profile,
      weapon: winner,
      rows: comparisonRows(result.profile, winner),
    },
  };
}

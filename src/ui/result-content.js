// 결과 화면(views.js)과 공유 이미지(share-image.js)가 함께 쓰는 결과 표시 내용.
// 두 출력이 같은 항목·문구·값을 보여 주도록 표시 내용은 여기서만 만든다(docs/test-design.md '결과 화면과 공유 이미지').
// 문자열은 이스케이프하지 않은 원문이다. HTML로 낼 때는 views.js가 이스케이프한다.
import { DEFAULT_AXIS_MODEL } from '../core/axis-models.js';
import { DIFFICULTY_LEVELS, difficultyLabel, difficultyStars } from '../core/difficulty.js';
import { FALLBACK_NICKNAME } from '../core/nickname.js';
import {
  CENTRAL_CHART_LINE, CENTRAL_LEAD, CENTRAL_SECTION_TITLES, CENTRAL_TITLE, centralOthersLine, centralWinnerLines,
} from '../core/central-copy.js';
import {
  REASON_TITLE, SECTION_TITLES, advantagesCopy, cautionCopy, closestCopy, leadText, tradeoffCopy,
} from '../core/reason-copy.js';

export const RANK_LABELS = ['1순위', '2순위', '3순위'];
export const COMPARE_SECTION_TITLE = '무기별 기준 비교';
export const DIFFICULTY_TITLE = '입문 난이도';

export const displayName = (nickname) => nickname || FALLBACK_NICKNAME;
export const resultTitle = (who) => `${who}에게 어울리는 무기`;
export const compareTitle = (who, weapon) => `${who} vs ${weapon.weapon_name}`;

// 입문 난이도: 같은 작품 무기 사이의 상대평가 별표. axisModel은 작품의 축 모델이다.
export function difficultyContent(weapon, weapons, axisModel = DEFAULT_AXIS_MODEL) {
  const stars = difficultyStars(weapon, weapons, axisModel);
  return {
    title: DIFFICULTY_TITLE,
    stars,
    label: difficultyLabel(stars),
    spoken: `${DIFFICULTY_LEVELS}단계 중 ${stars}단계`,
  };
}

// 중앙형 특별 결과의 1순위 아이콘 오른쪽 아래에 붙이는 물음표 표시. 확신하기 어려운 재미 결과라는 느낌을 준다.
// 일반 결과에는 null이다. label은 화면 낭독기용 이름이다.
export const UNSURE_BADGE = { mark: '?', label: '확신하기 어려운 추천' };
export const winnerBadge = (result) => (result.central ? UNSURE_BADGE : null);
// 결과 상단에 크게 보여 주는 1순위 무기 이름. 중앙형 특별 결과면 끝에 물음표를 붙인다(예: 건랜스?).
export const winnerName = (result) => `${result.weapons[0].weapon_name}${result.central ? UNSURE_BADGE.mark : ''}`;

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

// 중앙형 응답 특별 결과의 안내(core/central.js 모델). ‘왜 이 무기인가요?’ 자리에 같은 모양으로 보여 준다.
export function centralContent(central, weapons) {
  if (!central) return null;
  const nameOf = (id) => weapons.find(({ weapon_id }) => weapon_id === id)?.weapon_name ?? '';
  const others = centralOthersLine(weapons.slice(1).map(({ weapon_name }) => weapon_name));
  return {
    title: CENTRAL_TITLE,
    lead: CENTRAL_LEAD,
    parts: [
      { title: CENTRAL_SECTION_TITLES.winner, lines: centralWinnerLines(central, nameOf(central.winnerId)) },
      { title: CENTRAL_SECTION_TITLES.others, lines: others ? [others] : [] },
      { title: CENTRAL_SECTION_TITLES.chart, lines: [CENTRAL_CHART_LINE] },
    ].filter(({ lines }) => lines.length > 0),
  };
}

// 결과 상단의 설명 영역. 중앙형 특별 결과면 특별 안내, 아니면 1순위 추천 이유다.
export function resultReasonContent(result, reason) {
  return result.central ? centralContent(result.central, result.weapons) : reasonContent(reason, result.weapons);
}

const formatValue = (value) => (value === null || value === undefined ? '측정 안 됨' : String(Math.round(value)));

// 기준 비교 표의 행. 차트도 같은 profile·weapon 값과 축 순서를 그린다.
export function comparisonRows(profile, weapon, axisModel = DEFAULT_AXIS_MODEL) {
  return axisModel.axes.map(({ id, short }) => ({ id, short, me: formatValue(profile[id]), weapon: formatValue(weapon[id]) }));
}

// 공유 이미지에 담는 결과 전체. 결과 화면의 첫 상태(1순위와 비교)와 같다.
// 영상·버튼·나머지 무기 목록처럼 눌러서 쓰는 요소는 이미지에서 쓸 수 없으므로 담지 않는다.
// axisModel은 작품의 축 모델이며 입문 난이도와 기준 비교의 축을 정한다.
export function shareContent({ gameName, result, reason, weapons, axisModel = DEFAULT_AXIS_MODEL }) {
  const who = displayName(result.nickname);
  const winner = result.weapons[0];
  return {
    gameName,
    who,
    title: resultTitle(who),
    winner: {
      weapon: winner,
      name: winnerName(result),
      badge: winnerBadge(result),
      difficulty: difficultyContent(winner, weapons, axisModel),
      quote: quoteContent(winner),
    },
    reason: resultReasonContent(result, reason),
    comparison: {
      title: COMPARE_SECTION_TITLE,
      ranking: result.weapons.map((weapon, index) => ({ weapon, label: RANK_LABELS[index], selected: index === 0 })),
      subtitle: compareTitle(who, winner),
      legend: [who, winner.weapon_name],
      profile: result.profile,
      weapon: winner,
      axes: axisModel.axes,
      rows: comparisonRows(result.profile, winner, axisModel),
    },
  };
}

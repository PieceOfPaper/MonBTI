// 추천 이유 문장 틀. 기준은 docs/result-reason.md의 '축별 문장 기준'을 따른다.
// 게임 용어와 내부 변수명 없이 쓰고, 이름은 escape 전 원문을 받아 조사만 붙인다(HTML 이스케이프는 views.js가 맡는다).
import { AXES } from './axes.js';

const SHORT = Object.fromEntries(AXES.map(({ id, short }) => [id, short]));

// 축별 문구. noun은 잘 맞는 점에서 두 기준을 이어 말할 때 쓰는 짧은 명사구이고,
// higher·lower는 무기 값이 사용자보다 높거나 낮아 멀 때 '처음에는 낯설 수 있어요' 앞에 붙는 연결형 구절이다.
export const AXIS_COPY = {
  attack: {
    noun: '한방 성향',
    higher: '원하는 것보다 한 번의 기회에 대미지를 더 집중하는 편이라',
    lower: '원하는 것보다 대미지를 여러 번 나누어 쌓는 편이라',
  },
  freedom: {
    noun: '행동을 바꾸는 속도',
    higher: '원하는 것보다 행동을 더 빠르고 자유롭게 바꿀 수 있어',
    lower: '공격 중 다음 행동으로 넘어가는 속도가 원하는 것보다 느려',
  },
  complexity: {
    noun: '상황에 맞는 행동을 고르는 정도',
    higher: '원하는 것보다 상황에 맞춰 골라야 할 행동이 많아',
    lower: '원하는 것보다 단순한 편이라',
  },
  management: {
    noun: '전투 중 관리해야 하는 정도',
    higher: '원하는 것보다 확인하고 관리해야 할 상태가 많아',
    lower: '원하는 것보다 관리할 요소가 적은 편이라',
  },
  counter: {
    noun: '받아치는 플레이의 비중',
    higher: '원하는 것보다 받아치는 플레이의 비중이 높아',
    lower: '원하는 것보다 받아치는 플레이의 비중이 낮아',
  },
};

// 마지막 글자의 받침 여부로 조사를 고른다. 한글이 아니면 '은(는)'처럼 함께 적는다.
function hasFinalConsonant(word) {
  const code = String(word).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return code % 28 !== 0;
}

export function josa(word, withFinal, withoutFinal) {
  const final = hasFinalConsonant(word);
  if (final === null) return `${word}${withFinal}(${withoutFinal})`;
  return `${word}${final ? withFinal : withoutFinal}`;
}

const joinPair = (words) => (words.length === 2 ? `${josa(words[0], '과', '와')} ${words[1]}` : words[0]);

export const REASON_TITLE = '왜 이 무기인가요?';

export const SECTION_TITLES = {
  closest: '잘 맞는 점',
  relativelyClosest: '상대적으로 가까운 기준',
  advantages: '결정적인 차이',
  caution: '낯설 수 있는 점',
  tradeoff: '2순위가 더 가까운 기준',
};

// 제목 아래 첫 문장. 1순위와 2순위 이름을 밝힌다.
export function leadText(reason, winnerName, runnerName) {
  switch (reason.comparisonStatus) {
    case 'missing-runner-up':
      return `${josa(winnerName, '이', '가')} 가장 잘 맞는 무기로 나왔어요.`;
    case 'stale':
      return `${josa(winnerName, '과', '와')} ${runnerName} 사이의 순위는 공유된 뒤 기준값이 조정되어 당시의 순위 차이는 다시 설명하기 어려워요.`;
    case 'tie':
      return reason.tieReason === 'max-mismatch'
        ? `${josa(winnerName, '과', '와')} ${runnerName}의 전체 평균은 같지만, 가장 크게 어긋난 한 기준의 차이가 더 작아 ${josa(winnerName, '이', '가')} 앞섰어요.`
        : `${josa(winnerName, '과', '와')} ${josa(runnerName, '은', '는')} 계산상 같은 후보예요.`;
    default:
      if (reason.gapLevel === 'close') return `${josa(winnerName, '과', '와')} ${josa(runnerName, '은', '는')} 거의 비슷한 후보예요.`;
      if (reason.gapLevel === 'moderate') return `${runnerName}도 가까운 후보지만 ${josa(winnerName, '이', '가')} 조금 더 잘 맞아요.`;
      return `${josa(winnerName, '이', '가')} 비교적 뚜렷한 1순위예요.`;
  }
}

// 잘 맞는 점. 두 기준이 모두 차이가 큰 구간이면 소제목과 문장을 '상대적으로 가까운' 표현으로 바꾼다.
export function closestCopy(reason, winnerName) {
  const { closest } = reason;
  const isFar = ({ band }) => band === 'some-difference' || band === 'far';
  const relative = closest.every(isFar);
  const anyFar = closest.some(isFar);
  const subject = josa(joinPair(closest.map(({ axis }) => AXIS_COPY[axis].noun)), '이', '가');
  return {
    title: relative ? SECTION_TITLES.relativelyClosest : SECTION_TITLES.closest,
    text: anyFar
      ? `${josa(winnerName, '은', '는')} 다른 기준보다 ${subject} 취향에 가까운 편이에요.`
      : `${josa(winnerName, '은', '는')} ${subject} 취향과 가깝습니다.`,
  };
}

const STRENGTH = { strong: '특히', moderate: '조금', slight: '근소하게' };

// 1순위가 된 이유. 가장 크게 기여한 축의 강도를 쓰고, 점수 차가 작으면 근소한 1순위임을 덧붙인다.
export function advantagesCopy(reason, runnerName) {
  if (reason.advantages.length === 0) return null;
  const { strength } = reason.advantages[0];
  const axes = joinPair(reason.advantages.map(({ axis }) => SHORT[axis]));
  const how = STRENGTH[strength];
  const head = `${runnerName}보다 ${axes} 기준에서 ${how} 더 가까`;
  return reason.gapLevel === 'close' && strength !== 'slight'
    ? `${head}웠지만, 전체 점수 차이는 작아 근소하게 1순위가 됐어요.`
    : `${head}워 1순위가 됐어요.`;
}

// 낯설 수 있는 점. 2순위가 더 가까운 축과 같으면 한 문단에 붙여 반복하지 않는다.
export function cautionCopy(reason, runnerName) {
  const { caution, tradeoff } = reason;
  if (!caution) return null;
  const text = `다만 ${AXIS_COPY[caution.axis][caution.direction]} 처음에는 낯설 수 있어요.`;
  return tradeoff?.axis === caution.axis ? `${text} 이 기준은 2순위인 ${josa(runnerName, '이', '가')} 더 가깝습니다.` : text;
}

// 낯설 수 있는 점과 다른 축에서 2순위가 더 가까운 점. 같은 축이면 cautionCopy에 이미 포함되므로 null이다.
export function tradeoffCopy(reason, runnerName) {
  const { caution, tradeoff } = reason;
  if (!tradeoff || tradeoff.axis === caution?.axis) return null;
  return `반대로 ${SHORT[tradeoff.axis]} 기준은 2순위인 ${josa(runnerName, '이', '가')} 더 가깝습니다.`;
}

// 중앙형 응답 특별 결과의 안내 문구(core/central.js의 설명 모델을 문장으로 바꾼다).
// 게임 용어 없이 쓰고, 이름은 escape 전 원문을 받아 조사만 붙인다(HTML 이스케이프는 views.js가 맡는다).
import { AMPLIFY_FACTOR } from './central.js';
import { josa } from './reason-copy.js';

export const CENTRAL_TITLE = '혹시 이미 몬스터헌터 숙련자이거나 취향을 잘 안 타는 사람인가요?';

export const CENTRAL_LEAD = '다섯 기준이 모두 가운데에 가까워요. 여러 무기를 두루 써 봐서 어느 한쪽으로 치우치지 않았거나, 아직 취향을 찾는 중일 수 있어요. 뚜렷한 성향이 보이지 않아 이번 결과는 평소보다 잘 맞지 않을 수 있어요.';

export const CENTRAL_SECTION_TITLES = {
  winner: `1순위: 작은 차이를 ${AMPLIFY_FACTOR}배로 키워 고른 무기`,
  others: '2·3순위: 원래 응답과 가까운 후보',
  chart: '그래프: 실제 응답 결과',
};

// 확대한 축이 50보다 높거나 낮을 때의 성향. 모두 '쪽'으로 끝나 뒤에 붙는 조사가 같다.
export const CENTRAL_AXIS_COPY = {
  attack: { higher: '큰 한 방을 모아 넣는 쪽', lower: '대미지를 꾸준히 쌓는 쪽' },
  freedom: { higher: '행동을 빨리 바꾸는 쪽', lower: '한 행동을 끝까지 이어 가는 쪽' },
  constraint: { higher: '한 행동을 끝까지 이어 가는 쪽', lower: '행동을 빨리 바꾸는 쪽' },
  complexity: { higher: '상황에 맞게 골라 쓰는 쪽', lower: '단순하게 밀고 가는 쪽' },
  management: { higher: '상태를 챙기며 싸우는 쪽', lower: '신경 쓸 것이 적은 쪽' },
  counter: { higher: '받아치는 플레이 쪽', lower: '먼저 흐름을 만드는 쪽' },
};

export function centralWinnerLines(model, winnerName) {
  const lines = [`응답에서 살짝 기운 쪽을 ${AMPLIFY_FACTOR}배로 키웠더니 ${josa(winnerName, '이', '가')} 가장 가까워졌어요.`];
  if (model.axes.length) {
    const leanings = model.axes.map(({ axis, side }) => CENTRAL_AXIS_COPY[axis][side]).join(', ');
    lines.push(`크게 작용한 성향은 ${leanings}이에요.`);
  }
  if (model.forcedAxes.length) lines.push('정확히 가운데였던 기준은 정해 둔 규칙으로 방향을 골라 함께 키웠어요.');
  lines.push(model.originalRank === 1
    ? '키우기 전 원래 응답으로도 1순위인 무기예요.'
    : `키우기 전 원래 응답으로는 ${model.originalRank}순위였던 무기예요.`);
  return lines;
}

export function centralOthersLine(names) {
  if (!names.length) return null;
  const subject = names.length === 2 ? `${josa(names[0], '과', '와')} ${josa(names[1], '은', '는')}` : josa(names[0], '은', '는');
  return `${subject} 키우기 전 원래 응답으로 계산한 가장 가까운 후보예요.`;
}

export const CENTRAL_CHART_LINE = '아래 그래프와 표는 키우기 전 실제 응답 점수를 보여 줘요.';

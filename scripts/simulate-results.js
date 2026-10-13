// 현재 질문 구성에서 무기별 추천 비율을 추정해 출력한다. 밸런싱용 도구이며 사이트에는 포함하지 않는다.
//   npm run sim:results                                  두 응답 모형을 모두 계산
//   npm run sim:results -- --model persona --noise 0.5   한 모형만, 흔들림 지정
//   npm run sim:results -- --samples 50000 --seed 7 --json
//   npm run sim:results -- --game wilds_v2 --central       중앙형 응답 특별 결과를 적용(와일즈 V2)
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { GAME_AXIS_MODELS } from '../src/core/axis-models.js';
import { RECOMMENDATION_COUNT } from '../src/core/recommend.js';
import { ANSWER_MODELS, simulateDistribution } from './result-distribution.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MODEL_LABELS = {
  uniform: '무작위 응답(모든 질문에 여섯 응답을 고르게 선택)',
  persona: '취향 분포 응답(축별 취향을 0~100에서 고르게 뽑고 그에 맞게 응답)',
};

async function loadData(game) {
  const read = async (name) => JSON.parse(await readFile(resolve(ROOT, 'src/data', game, `${name}.json`), 'utf8'));
  return { questions: (await read('questions')).questions, weapons: (await read('weapons')).weapons };
}

// 한글은 터미널에서 두 칸을 차지하므로 표 정렬에 표시 폭을 쓴다.
const displayWidth = (text) => [...text].reduce((sum, ch) => sum + (/[ᄀ-ᇿ㄰-㆏가-힯]/.test(ch) ? 2 : 1), 0);
const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - displayWidth(text)));
const padStart = (text, width) => ' '.repeat(Math.max(0, width - displayWidth(text))) + text;
const percent = (rate) => `${(rate * 100).toFixed(1)}%`;
const bar = (rate, scale) => '█'.repeat(Math.round(rate * scale));

function formatResult(result, axes) {
  const count = result.weapons.length;
  const fair = 1 / count;
  const nameWidth = Math.max(...result.weapons.map(({ weapon_name }) => displayWidth(weapon_name)));
  const profileHeader = axes.map(({ short }) => padStart(short, 5)).join('');
  const lines = [
    `■ ${MODEL_LABELS[result.model]}`,
    `  표본 ${result.samples.toLocaleString()}회 · seed ${result.seed}${result.noise === null ? '' : ` · 흔들림 ${result.noise}`}`
      + ` · 균등 기준 1순위 ${percent(fair)}, ${RECOMMENDATION_COUNT}순위 이내 ${percent(RECOMMENDATION_COUNT / count)}`,
    `  1·2순위 점수 동점(행 순서 등으로 결정) ${percent(result.ties / result.samples)}`
      + (result.central ? ` · 중앙형 특별 결과 ${percent(result.specials / result.samples)}` : ''),
    '',
    `  ${padEnd('무기', nameWidth)}    1순위  ${RECOMMENDATION_COUNT}위내  평균순위 │ ${padEnd('1순위 비율', 22)}${profileHeader}  ← 1순위가 된 사용자의 평균 축 점수`,
  ];
  const sorted = [...result.weapons].sort((a, b) => b.firstRate - a.firstRate);
  for (const weapon of sorted) {
    const profile = weapon.firstProfile
      ? axes.map(({ id }) => padStart(weapon.firstProfile[id].toFixed(0), 5)).join('')
      : '   (1순위 없음)';
    const flag = weapon.firstRate < fair / 2 ? ' ▼' : weapon.firstRate > fair * 2 ? ' ▲' : '  ';
    lines.push(
      `  ${padEnd(weapon.weapon_name, nameWidth)} ${padStart(percent(weapon.firstRate), 7)}${flag}${padStart(percent(weapon.topRate), 6)}`
        + `${padStart(weapon.averageRank.toFixed(1), 9)} │ ${padEnd(bar(weapon.firstRate, 100), 22)}${profile}`,
    );
  }
  lines.push('', `  ▲ 균등 기준의 2배 초과, ▼ 절반 미만`);
  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      game: { type: 'string', default: 'wilds' },
      model: { type: 'string', default: 'all' },
      samples: { type: 'string', default: '20000' },
      seed: { type: 'string', default: '1' },
      noise: { type: 'string', default: '0.3' },
      json: { type: 'boolean', default: false },
      central: { type: 'boolean', default: false },
    },
  });
  const models = values.model === 'all' ? Object.keys(ANSWER_MODELS) : [values.model];
  const samples = Number(values.samples);
  const seed = Number(values.seed);
  const noise = Number(values.noise);
  if (!Number.isInteger(samples) || samples <= 0) throw new Error('--samples는 양의 정수여야 합니다.');
  if (!Number.isFinite(noise) || noise < 0) throw new Error('--noise는 0 이상이어야 합니다.');

  const axisModel = GAME_AXIS_MODELS[values.game];
  if (!axisModel) throw new Error(`알 수 없는 작품입니다: ${values.game} (가능: ${Object.keys(GAME_AXIS_MODELS).join(', ')})`);
  const data = await loadData(values.game);
  const results = models.map((model) => simulateDistribution({
    ...data, model, samples, seed, noise, central: values.central, axisModel,
  }));
  if (values.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  console.log(`${values.game}: 질문 ${data.questions.length}개 · 무기 ${data.weapons.length}개\n`);
  console.log(results.map((result) => formatResult(result, axisModel.axes)).join('\n\n'));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

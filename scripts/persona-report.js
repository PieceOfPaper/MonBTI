// 페르소나별 직접·응답 프로필과 순위, 인접값 변화, 무기 기준점, 추천 영역 분포를 출력한다.
// 사양은 docs/persona-test-plan.md를 따른다. 사이트에는 포함하지 않는다.
//   npm run analyze:personas                          기본 간격 10(11⁵ 프로필)
//   npm run analyze:personas -- --game wilds_v2       와일즈 V2(중앙형 응답 특별 결과를 적용한 최종 순위로 판정)
//   npm run analyze:personas -- --step 5              상세 간격 5(21⁵ 프로필, 오래 걸림)
//   npm run analyze:personas -- --save base.json      분포를 기준 결과로 저장
//   npm run analyze:personas -- --baseline base.json  저장한 기준 결과와 비율 증감 비교
// 실패 조건(형식·재현 오차·확정 기대·기준점·±5 상위 3개 단절·한 번도 추천되지 않는 무기)이 있으면 종료 코드 1로 끝난다.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { AXIS_BY_ID } from '../src/core/axes.js';
import {
  analyzeDistribution, analyzeNeighborhood, checkPersona, checkWeaponAnchors, disjointSmallChanges,
  distributionFindings, fmt, hasExpectations, pct, personaWarnings, runPersona, validatePersonas,
} from '../tests/personas/persona-runner.js';
import { loadPersonaSuite } from '../tests/personas/suites.js';

const RANK_COUNT = 5;

// 한글은 터미널에서 두 칸을 차지하므로 표 정렬에 표시 폭을 쓴다.
const displayWidth = (text) => [...text].reduce((sum, ch) => sum + (/[ᄀ-ᇿ㄰-㆏가-힯]/.test(ch) ? 2 : 1), 0);
const padEnd = (text, width) => text + ' '.repeat(Math.max(0, width - displayWidth(text)));
const padStart = (text, width) => ' '.repeat(Math.max(0, width - displayWidth(text))) + text;
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const shortName = Object.fromEntries(Object.values(AXIS_BY_ID).map(({ id, short }) => [id, short]));

function axisRow(axes, label, profile) {
  return `  ${padEnd(label, 12)}${axes.map(({ id }) => padStart(fmt(profile[id]), 8)).join('')}`;
}

function rankLines(ranked) {
  return ranked.slice(0, RANK_COUNT)
    .map((r, i) => `${i + 1}. ${r.weapon_name}(${r.weapon_id}) ${fmt(r.score)}`)
    .join('  ');
}

const centralTag = (part) => (part.central ? ` — 중앙형 특별 결과(이탈도 ${fmt(part.deviation)})` : '');

function formatPersona(result, neighborhood, questions) {
  const { persona, direct, answer, axes } = result;
  const answerText = questions.map(({ question_id }) => `${question_id.replace(/^.*_q/, 'q')}=${answer.answers[question_id]}`);
  const lines = [
    `■ ${persona.name} (${persona.id})${hasExpectations(persona) ? '' : ' — 관찰용'}`,
    `  ${persona.description}`,
    `  ${padEnd('', 12)}${axes.map(({ short }) => padStart(short, 8)).join('')}`,
    axisRow(axes, '목표', direct.profile),
    axisRow(axes, '응답 결과', answer.profile),
    axisRow(axes, '오차', answer.axisErrors),
    `  최대 축 오차 ${fmt(answer.maxAxisError)} / 허용 ${result.tolerance.maxAxisError}`
      + ` · 평균 절대 오차 ${fmt(answer.meanAbsoluteError)} / 허용 ${result.tolerance.meanAbsoluteError}`,
    `  응답: ${answerText.join(' ')}`,
    `  직접 순위: ${rankLines(direct.ranking)}${centralTag(direct)}`,
    `  응답 순위: ${rankLines(answer.ranking)}${centralTag(answer)}`,
    `  1·2순위 차이: 직접 ${fmt(direct.gap)} · 응답 ${fmt(answer.gap)}`
      + `${direct.central || answer.central ? ' (특별 결과는 점수 순서가 아니므로 표시하지 않음)' : ''}`,
  ];
  const { firstChange, stableRange } = neighborhood;
  lines.push(firstChange
    ? `  인접값: ${shortName[firstChange.axis]} ${signed(firstChange.delta)}에서 1순위가 ${firstChange.top1}(으)로 처음 바뀜`
    : `  인접값: ±${Math.max(...neighborhood.variations.map(({ delta }) => Math.abs(delta)))} 안에서 1순위 유지`);
  lines.push(`  1순위 유지 범위: ${axes.map(({ id, short }) => `${short} ${stableRange[id].minus}~${signed(stableRange[id].plus)}`).join(' · ')}`);
  for (const v of neighborhood.variations.filter(({ entered, top1Changed, centralChanged }) => entered.length || top1Changed || centralChanged)) {
    const centralChange = v.centralChanged ? ` · 특별 결과 ${v.central ? '적용' : '해제'}` : '';
    lines.push(`    ${shortName[v.axis]} ${padStart(signed(v.delta), 3)} → 1순위 ${v.top1}${v.top1Changed ? '*' : ''}${centralChange}`
      + ` · 상위 3 공통 ${v.overlap}개 · 들어옴 [${v.entered.join(', ')}] · 빠짐 [${v.left.join(', ')}] · 1·2순위 차이 ${fmt(v.gap)}`);
  }
  return lines.join('\n');
}

function formatDistribution(distribution, baseline) {
  const prev = baseline && Object.fromEntries(baseline.weapons.map((w) => [w.weapon_id, w]));
  const nameWidth = Math.max(...distribution.weapons.map(({ weapon_name }) => displayWidth(weapon_name)), 4);
  const delta = (now, before) => (before === undefined ? '' : ` (${now >= before ? '+' : ''}${((now - before) * 100).toFixed(2)}p)`);
  const lines = [
    `■ 추천 영역 분포 — 간격 ${distribution.step}, 프로필 ${distribution.total.toLocaleString()}개`,
    '  다섯 축을 독립적이고 균등하게 순회한 기하학적 추천 영역이며 실제 사용자 분포가 아닙니다.',
    distribution.centralResult
      ? `  중앙형 특별 결과를 적용한 최종 순위입니다. 특별 결과 프로필 ${distribution.centrals.toLocaleString()}개(${pct(distribution.centrals / distribution.total)})`
      : null,
    baseline ? `  비교 기준: 간격 ${baseline.step}, 프로필 ${baseline.total.toLocaleString()}개` : null,
    `  ${padEnd('무기', nameWidth)}  ${padStart('1순위', 18)}  ${padStart('상위 3위', 20)}`,
  ].filter((line) => line !== null);
  for (const w of [...distribution.weapons].sort((a, b) => b.firstRate - a.firstRate)) {
    const before = prev?.[w.weapon_id];
    lines.push(`  ${padEnd(w.weapon_name, nameWidth)}  ${padStart(`${w.first.toLocaleString()} ${pct(w.firstRate)}`, 18)}`
      + `${delta(w.firstRate, before?.firstRate)}  ${padStart(`${w.top.toLocaleString()} ${pct(w.topRate)}`, 20)}${delta(w.topRate, before?.topRate)}`);
  }
  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      game: { type: 'string', default: 'wilds' },
      step: { type: 'string', default: '10' },
      save: { type: 'string' },
      baseline: { type: 'string' },
    },
  });
  const data = await loadPersonaSuite(values.game);
  const { personas, rules } = data;
  const step = Number(values.step);
  const failures = [];
  const warnings = [];
  const out = [];

  out.push(`■ 데이터 — ${values.game}${rules.centralResult ? ' · 중앙형 응답 특별 결과 적용' : ''}`);
  for (const [label, meta] of [['무기', data.meta.weapons], ['질문', data.meta.questions]]) {
    out.push(`  ${label}: format_version ${meta.format_version} · exported_at ${meta.exported_at} · converted_at ${meta.converted_at}`);
  }
  out.push(`  무기 ${data.weapons.length}개 · 질문 ${data.questions.length}개 · 페르소나 ${personas.length}개`, '');

  const formatErrors = validatePersonas(personas, data.weapons, rules);
  failures.push(...formatErrors.map((e) => `형식: ${e}`));
  if (!formatErrors.length) {
    for (const persona of personas) {
      const result = runPersona(persona, data);
      const neighborhood = analyzeNeighborhood(data.weapons, persona.targetProfile, { rules });
      out.push(formatPersona(result, neighborhood, data.questions), '');
      failures.push(...checkPersona(result).map((f) => `${persona.id}: ${f}`));
      failures.push(...disjointSmallChanges(neighborhood)
        .map(({ axis, delta }) => `${persona.id}: ${shortName[axis]} ${signed(delta)}에서 상위 3개가 하나도 겹치지 않음`));
      warnings.push(...personaWarnings(result).map((w) => `${persona.id}: ${w}`));
      warnings.push(...neighborhood.variations.filter(({ delta, top1Changed }) => Math.abs(delta) === 5 && top1Changed)
        .map(({ axis, delta, top1 }) => `${persona.id}: ${shortName[axis]} ${signed(delta)}만으로 1순위가 ${top1}(으)로 바뀜`));
      warnings.push(...neighborhood.variations.filter(({ delta, centralChanged }) => Math.abs(delta) === 5 && centralChanged)
        .map(({ axis, delta, central }) => `${persona.id}: ${shortName[axis]} ${signed(delta)}만으로 중앙형 특별 결과가 ${central ? '적용됨' : '해제됨'}`));
    }
  }

  out.push('■ 무기 기준점 — 각 무기의 기준값을 그대로 사용자 프로필로 쓸 때');
  for (const anchor of checkWeaponAnchors(data.weapons, rules)) {
    out.push(`  ${anchor.ok ? '✓' : '✗'} ${anchor.weapon_name}(${anchor.weapon_id}) → 1순위 ${anchor.top1}${anchor.central ? '(중앙형 특별 결과)' : ''}`
      + ` · 2순위 ${anchor.runnerUp} · 차이 ${fmt(anchor.gap)}${anchor.duplicates.length ? ` · 값이 같은 무기 [${anchor.duplicates.join(', ')}]` : ''}`);
    if (anchor.duplicates.length) failures.push(`기준점: ${anchor.weapon_id}와 다섯 값이 같은 무기 [${anchor.duplicates.join(', ')}]`);
    if (!anchor.ok) failures.push(`기준점: ${anchor.weapon_id}가 자신의 기준값에서 1순위가 아님(${anchor.top1})`);
  }
  out.push('');

  const started = Date.now();
  const distribution = analyzeDistribution(data.weapons, step, rules);
  const baseline = values.baseline ? JSON.parse(await readFile(resolve(values.baseline), 'utf8')) : null;
  out.push(formatDistribution(distribution, baseline), `  계산 시간 ${((Date.now() - started) / 1000).toFixed(1)}초`, '');
  const findings = distributionFindings(distribution);
  failures.push(...findings.failures.map((f) => `추천 영역: ${f}`));
  warnings.push(...findings.warnings.map((w) => `추천 영역: ${w}`));

  out.push(`■ 경고 ${warnings.length}건 — 테스트와 데이터 갱신을 막지 않습니다`, ...warnings.map((w) => `  ! ${w}`), '');
  out.push(`■ 실패 ${failures.length}건`, ...failures.map((f) => `  ✗ ${f}`));
  console.log(out.join('\n'));

  if (values.save) {
    const saved = { meta: data.meta, ...distribution };
    await writeFile(resolve(values.save), `${JSON.stringify(saved, null, 2)}\n`);
    console.log(`\n분포를 저장했습니다: ${values.save}`);
  }
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

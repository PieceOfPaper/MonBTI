import { describe, expect, it } from 'vitest';
import { buildResult } from '../app.js';
import { buildRecommendationReason } from '../core/reason.js';
import { supportedGames } from '../games/index.js';
import { shareContent } from './result-content.js';
import { renderResult } from './views.js';

const wilds = supportedGames[0];
// 결과 화면 HTML을 글자만 남긴 문장으로 바꾼다. 공유 이미지 원문과 비교하기 위해 엔티티를 되돌린다.
const plain = (html) => html.replace(/<br \/>/g, '\n').replace(/<[^>]+>/g, ' ')
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
  .replace(/[ \t]+/g, ' ');

// 공유 이미지가 그리는 모든 글자·값. 하나라도 결과 화면에 없으면 두 출력이 어긋난 것이다.
function shareTexts(content) {
  const { winner, reason, comparison } = content;
  return [
    content.gameName, content.title,
    winner.weapon.weapon_name, winner.name, winner.difficulty.title, winner.difficulty.label,
    ...(winner.quote?.lines ?? []), winner.quote?.credit,
    reason?.title, reason?.lead, ...(reason?.parts ?? []).flatMap(({ title, lines }) => [title, ...lines]),
    comparison.title, comparison.subtitle, ...comparison.legend,
    ...comparison.ranking.flatMap(({ label, weapon }) => [label, weapon.weapon_name]),
    ...comparison.rows.flatMap(({ short, me, weapon }) => [short, me, weapon]),
  ].filter(Boolean);
}

describe('결과 화면과 공유 이미지', () => {
  const cases = [
    ['정상 결과', buildResult(wilds, Object.fromEntries(wilds.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1])), '종잇장')],
    ['특수 문자 이름', { ...buildResult(wilds, {}, '<b>&"'), nickname: '<b>&"' }],
  ];

  it.each(cases)('%s: 공유 이미지에 담는 모든 글자와 값이 결과 화면 첫 상태에 있다', (_, result) => {
    const reason = buildRecommendationReason(result.profile, result.weapons[0], result.weapons[1]);
    const html = plain(renderResult(wilds, result, { reason }));
    const content = shareContent({ gameName: wilds.name, result, reason, weapons: wilds.weapons });
    const missing = shareTexts(content).filter((value) => !html.includes(value));
    expect(missing).toEqual([]);
  });

  it('중앙형 특별 결과: 공유 이미지의 특별 안내와 모든 값이 결과 화면 첫 상태에 있다', () => {
    const v2 = supportedGames.find(({ id }) => id === 'wilds_v2');
    const result = buildResult(v2, Object.fromEntries(v2.questions.map(({ question_id }) => [question_id, 4])), '종잇장');
    expect(result.central).toBeTruthy();
    const html = plain(renderResult(v2, result));
    const content = shareContent({ gameName: v2.name, result, reason: null, weapons: v2.weapons, axisModel: v2.axisModel });
    expect(content.comparison.rows.map(({ short }) => short)).toEqual(['한방', '제약', '복잡', '관리', '반격']);
    expect(content.reason.title).toBe('혹시 이미 몬스터헌터 숙련자이거나 취향을 잘 안 타는 사람인가요?');
    // 1순위 아이콘의 물음표 표시도 두 출력에 같이 있다.
    expect(content.winner.badge).toEqual({ mark: '?', label: '확신하기 어려운 추천' });
    expect(content.winner.name).toBe(`${result.weapons[0].weapon_name}?`);
    expect(renderResult(v2, result)).toContain(`<strong class="winner__name">${result.weapons[0].weapon_name}?</strong>`);
    expect(renderResult(v2, result)).toContain('<span class="winner__badge" role="img" aria-label="확신하기 어려운 추천"');
    expect(shareTexts(content).filter((value) => !html.includes(value))).toEqual([]);
  });

  it('결과 화면과 같은 순서(1순위 → 추천 이유 → 1~3순위 기준 비교)와 1순위 비교 대상으로 구성한다', () => {
    const [, result] = cases[0];
    const reason = buildRecommendationReason(result.profile, result.weapons[0], result.weapons[1]);
    const content = shareContent({ gameName: wilds.name, result, reason, weapons: wilds.weapons });
    expect(Object.keys(content)).toEqual(['gameName', 'who', 'title', 'winner', 'reason', 'comparison']);
    expect(content.winner.badge).toBeNull();
    expect(content.winner.name).toBe(result.weapons[0].weapon_name);
    expect(renderResult(wilds, result, { reason })).not.toContain('winner__badge');
    expect(content.comparison.weapon).toBe(result.weapons[0]);
    expect(content.comparison.ranking.map(({ selected }) => selected)).toEqual([true, false, false]);
    expect(content.winner.weapon.characters?.length).toBeGreaterThan(0);
  });
});

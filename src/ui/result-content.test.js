import { describe, expect, it } from 'vitest';
import { buildResult, sharedResult } from '../app.js';
import { findLighterAlternative } from '../core/alternative.js';
import { remainingWeapons } from '../core/recommend.js';
import { buildRecommendationReason } from '../core/reason.js';
import { gameLabel, supportedGames } from '../games/index.js';
import {
  alternativeTip, comparisonSlots, reasonContent, segmentsText, shareContent,
} from './result-content.js';
import { renderResult } from './views.js';

const wilds = supportedGames.find(({ id }) => id === 'wilds');
// 결과 화면 HTML을 글자만 남긴 문장으로 바꾼다. 공유 이미지 원문과 비교하기 위해 엔티티를 되돌린다.
// 문장 속 무기 아이콘(와일즈 V2)은 이름과 붙어 있으므로 공백 없이 지운다.
const plain = (html) => html.replace(/<span class="inline-weapon">|<img class="inline-weapon__icon"[^>]*>|<\/span>/g, '')
  .replace(/<br \/>/g, '\n').replace(/<[^>]+>/g, ' ')
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
  .replace(/[ \t]+/g, ' ');

// 공유 이미지가 그리는 모든 글자·값. 하나라도 결과 화면에 없으면 두 출력이 어긋난 것이다.
function shareTexts(content) {
  const { winner, reason, comparison } = content;
  return [
    content.gameName, content.title,
    winner.weapon.weapon_name, winner.name, winner.difficulty.title, winner.difficulty.label,
    ...(winner.quote?.lines ?? []), winner.quote?.credit,
    reason?.title, reason && segmentsText(reason.lead), ...(reason?.parts ?? []).flatMap(({ title, lines }) => [title, ...lines.map(segmentsText)]),
    comparison.title, comparison.subtitle, ...comparison.legend,
    ...comparison.ranking.flatMap(({ label, weapon, badge }) => [label, weapon.weapon_name, badge?.text]),
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
    const content = shareContent({ gameName: gameLabel(wilds), result, reason, weapons: wilds.weapons });
    const missing = shareTexts(content).filter((value) => !html.includes(value));
    expect(missing).toEqual([]);
  });

  it('중앙형 특별 결과: 공유 이미지의 특별 안내와 모든 값이 결과 화면 첫 상태에 있다', () => {
    const v2 = supportedGames.find(({ id }) => id === 'wilds_v2');
    const result = buildResult(v2, Object.fromEntries(v2.questions.map(({ question_id }) => [question_id, 4])), '종잇장');
    expect(result.central).toBeTruthy();
    const html = plain(renderResult(v2, result));
    const content = shareContent({ gameName: gameLabel(v2), result, reason: null, weapons: v2.weapons, axisModel: v2.axisModel });
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
    const content = shareContent({ gameName: gameLabel(wilds), result, reason, weapons: wilds.weapons });
    expect(Object.keys(content)).toEqual(['gameName', 'who', 'title', 'winner', 'reason', 'comparison']);
    // 기존 와일즈에는 부담이 적은 대안을 쓰지 않으므로 버튼은 1~3순위 세 개다.
    expect(result.alternative).toBeUndefined();
    expect(content.comparison.ranking.map(({ label }) => label)).toEqual(['1순위', '2순위', '3순위']);
    expect(renderResult(wilds, result, { reason })).not.toContain('ranking--four');
    expect(content.winner.badge).toBeNull();
    expect(content.winner.name).toBe(result.weapons[0].weapon_name);
    expect(renderResult(wilds, result, { reason })).not.toContain('winner__badge');
    expect(content.comparison.weapon).toBe(result.weapons[0]);
    expect(content.comparison.ranking.map(({ selected }) => selected)).toEqual([true, false, false]);
    expect(content.winner.weapon.characters?.length).toBeGreaterThan(0);
  });

  describe('와일즈 V2 부담이 적은 대안', () => {
    const v2 = supportedGames.find(({ id }) => id === 'wilds_v2');
    const answers = Object.fromEntries(v2.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1]));
    const base = buildResult(v2, answers, '종잇장');
    const { profile } = base;
    const others = remainingWeapons(v2.weapons, profile, base.weapons, v2.axisModel);
    // 실제 데이터 수치와 무관하게 확인하도록, 대안은 결과 모델에 직접 넣는다(후보 계산은 core/alternative.test.js에서 고정 예시로 검사).
    const alternativeWeapon = others[3];
    const withAlternative = { ...base, alternative: { weapon: alternativeWeapon } };
    const reason = buildRecommendationReason(profile, base.weapons[0], base.weapons[1], v2.axisModel);
    const content = (result) => shareContent({ gameName: gameLabel(v2), result, reason, weapons: v2.weapons, others, axisModel: v2.axisModel });

    it('대안이 있으면 네 번째 버튼에 실제 순위와 추천 표시를 붙이고 나머지 무기 목록에서는 뺀다', () => {
      const slots = comparisonSlots(withAlternative, others);
      expect(slots.buttons.map(({ weapon }) => weapon)).toEqual([...base.weapons, alternativeWeapon]);
      expect(slots.buttons[3]).toEqual({ weapon: alternativeWeapon, label: '7순위', badge: { text: '🪶 가벼운 추천', label: '순위 밖이지만 취향이 비슷하고 부담이 적어 추천하는 무기' } });
      expect(slots.others.map(({ label }) => label)).not.toContain('7순위');
      expect(slots.others[0]).toEqual({ weapon: others[0], label: '4순위', badge: null });
      expect(slots.order).toHaveLength(v2.weapons.length);
      const html = renderResult(v2, withAlternative, { reason, others });
      expect(html).toContain('ranking--four');
      expect(html).toContain('<button class="rank__badge" type="button" data-action="toggle-tip" aria-expanded="false" aria-controls="alternative-tip">🪶 가벼운 추천</button>');
      expect(html).toContain(`aria-label="7순위 ${alternativeWeapon.weapon_name}, 순위 밖이지만 취향이 비슷하고 부담이 적어 추천하는 무기"`);
      // 말풍선은 처음에 닫혀 있고 축 모델의 이름으로 뜻을 풀어 쓴다.
      expect(html).toContain('<div class="rank__tip" id="alternative-tip" role="tooltip" hidden>');
      expect(alternativeTip(v2.axisModel)).toBe('1~3순위에는 들지 않았지만 한방·반격 성향은 나와 비슷하고 제약·복잡·관리 부담은 더 적어서 함께 추천하는 무기예요. 무기 자체가 쉽다는 뜻은 아니에요.');
      expect(html).toContain(alternativeTip(v2.axisModel));
      expect(alternativeTip(wilds.axisModel)).toBeNull();
      // 나머지 무기 목록의 버튼 번호는 네 번째 버튼 다음부터 이어지고 비교 대상 순서와 맞는다.
      expect(html).toContain(`data-select="4" aria-pressed="false">
          <span class="others__rank">4순위</span>`);
    });

    it('대안이 없으면(가장 앞선 후보가 1~3순위인 경우 포함) 네 번째 버튼은 추천 표시 없는 4순위다', () => {
      const slots = comparisonSlots({ ...base, alternative: null }, others);
      expect(slots.buttons.map(({ label, badge }) => [label, badge])).toEqual([['1순위', null], ['2순위', null], ['3순위', null], ['4순위', null]]);
      expect(slots.others[0].label).toBe('5순위');
      expect(renderResult(v2, { ...base, alternative: null }, { reason, others })).not.toContain('rank__badge');
    });

    it.each([['대안 있음', withAlternative], ['대안 없음', { ...base, alternative: null }]])('%s: 공유 이미지의 버튼과 모든 글자가 결과 화면 첫 상태와 같다', (_, result) => {
      const share = content(result);
      expect(share.comparison.ranking.map(({ weapon, label, badge }) => [weapon, label, badge]))
        .toEqual(comparisonSlots(result, others).buttons.map(({ weapon, label, badge }) => [weapon, label, badge]));
      expect(share.comparison.ranking.map(({ selected }) => selected)).toEqual([true, false, false, false]);
      const html = plain(renderResult(v2, result, { reason, others }));
      expect(shareTexts(share).filter((value) => !html.includes(value))).toEqual([]);
    });

    it('대안을 켜도 사용자 점수와 1~3순위는 그대로다', () => {
      const { alternative, ...rest } = buildResult(v2, answers, '종잇장');
      expect(alternative === null || typeof alternative === 'object').toBe(true);
      expect(buildResult({ ...v2, lighterAlternative: false }, answers, '종잇장')).toEqual(rest);
    });

    it('공유 결과도 링크의 점수와 1~3순위로 대안을 다시 고른다', () => {
      const rounded = Object.fromEntries(Object.entries(profile).map(([axis, value]) => [axis, Math.round(value)]));
      const shared = sharedResult(v2, { weapons: base.weapons, profile: rounded, nickname: '종잇장', central: false });
      expect(shared.weapons).toBe(base.weapons);
      expect(shared.alternative).toEqual(findLighterAlternative(v2.weapons, rounded, base.weapons, v2.axisModel));
    });
  });

  describe('설명 문장 속 무기 아이콘', () => {
    const v2 = supportedGames.find(({ id }) => id === 'wilds_v2');
    const byId = (id) => v2.weapons.find(({ weapon_id }) => weapon_id === id);
    // ‘랜스’와 ‘건랜스’처럼 한 이름이 다른 이름에 들어 있어도 정확히 나눈다.
    const lance = byId('lance');
    const gunlance = byId('gunlance');
    const reason = buildRecommendationReason({ attack: 50, constraint: 50, complexity: 50, management: 50, counter: 90 }, gunlance, lance, v2.axisModel);

    it('켜면 무기 이름을 아이콘 조각으로 나누고, 끄면 같은 문장을 글자 조각 하나로 둔다', () => {
      const on = reasonContent(reason, [gunlance, lance], { weaponIcons: true });
      const off = reasonContent(reason, [gunlance, lance]);
      expect(segmentsText(on.lead)).toBe(segmentsText(off.lead));
      expect(on.parts.map(({ lines }) => lines.map(segmentsText))).toEqual(off.parts.map(({ lines }) => lines.map(segmentsText)));
      expect(off.lead).toEqual([{ text: segmentsText(off.lead) }]);
      const weapons = [on.lead, ...on.parts.flatMap(({ lines }) => lines)].flat().filter(({ weapon }) => weapon).map(({ weapon }) => weapon.weapon_id);
      expect(weapons).toContain('gunlance');
      expect(weapons.every((id) => id === 'gunlance' || id === 'lance')).toBe(true);
      // 아이콘 뒤의 조사는 이름과 따로 글자 조각으로 남는다(예: 건랜스 + ‘는’).
      expect(on.parts[0].lines[0][0]).toEqual({ weapon: gunlance });
      expect(on.parts[0].lines[0][1].text.startsWith('는 ')).toBe(true);
    });

    it('와일즈 V2 결과 화면과 공유 이미지에만 아이콘을 넣고 글자는 그대로 같다', () => {
      const answers = Object.fromEntries(v2.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1]));
      const result = buildResult(v2, answers, '종잇장');
      const v2Reason = buildRecommendationReason(result.profile, result.weapons[0], result.weapons[1], v2.axisModel);
      const html = renderResult(v2, result, { reason: v2Reason });
      expect(html).toContain(`<span class="inline-weapon"><img class="inline-weapon__icon" src="${result.weapons[0].icon}" alt="" width="100" height="100" />${result.weapons[0].weapon_name}</span>`);
      const content = shareContent({ gameName: gameLabel(v2), result, reason: v2Reason, weapons: v2.weapons, axisModel: v2.axisModel, weaponIcons: true });
      expect(content.reason.lead.some(({ weapon }) => weapon)).toBe(true);
      expect(shareTexts(content).filter((value) => !plain(html).includes(value))).toEqual([]);

      const wildsAnswers = Object.fromEntries(wilds.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1]));
      const wildsResult = buildResult(wilds, wildsAnswers, '종잇장');
      const wildsReason = buildRecommendationReason(wildsResult.profile, wildsResult.weapons[0], wildsResult.weapons[1]);
      const wildsHtml = renderResult(wilds, wildsResult, { reason: wildsReason });
      expect(wildsHtml).toContain('reason-title');
      expect(wildsHtml).not.toContain('inline-weapon');
    });

    it('중앙형 특별 결과 안내에도 무기 아이콘을 넣는다', () => {
      const result = buildResult(v2, Object.fromEntries(v2.questions.map(({ question_id }) => [question_id, 4])), '종잇장');
      const html = renderResult(v2, result);
      for (const weapon of result.weapons) expect(html).toContain(`${weapon.icon}" alt="" width="100" height="100" />${weapon.weapon_name}</span>`);
    });
  });
});

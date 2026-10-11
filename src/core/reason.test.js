import { describe, expect, it } from 'vitest';
import { supportedGames } from '../games/index.js';
import { renderRecommendationReason, renderResult } from '../ui/views.js';
import {
  advantagesCopy, cautionCopy, closestCopy, josa, leadText, tradeoffCopy,
} from './reason-copy.js';
import {
  advantageStrength, buildRecommendationReason, gapLevel, mismatchBand,
} from './reason.js';
import { AXIS_MISMATCH, AXIS_WEIGHTS, rankWeapons, scoreWeapon } from './recommend.js';
import { decodeShareCode, encodeShareCode } from './share.js';

const wilds = supportedGames[0];
const weapon = (weapon_id, values) => ({
  weapon_id, weapon_name: weapon_id, attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values,
});
const profile = (values) => ({ attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50, ...values });
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('추천 이유 — 기획 예시 검산(사용자 73·21·57·56·23)', () => {
  const user = { attack: 73, freedom: 21, complexity: 57, management: 56, counter: 23 };
  const ranked = rankWeapons(wilds.weapons, user);
  const [winner, runner] = ranked.map(({ weapon: w }) => w);
  const reason = buildRecommendationReason(user, winner, runner);

  it('건랜스가 1순위, 대검이 2순위이며 점수는 기획 검산과 같다', () => {
    expect([winner.weapon_id, runner.weapon_id]).toEqual(['gunlance', 'great_sword']);
    expect(ranked[0].score).toBeCloseTo(85.9444444444, 8);
    expect(ranked[1].score).toBeCloseTo(84.6666666667, 8);
  });

  it('잘 맞는 점·1순위가 된 이유·낯설 수 있는 점·2순위가 더 가까운 점을 고른다', () => {
    expect(reason).toMatchObject({
      winnerId: 'gunlance', runnerUpId: 'great_sword', comparisonStatus: 'normal', gapLevel: 'close', weightSum: 4.5,
      closest: [
        { axis: 'attack', mismatch: 7, band: 'very-close', direction: 'higher' },
        { axis: 'freedom', mismatch: 7, band: 'very-close', direction: 'higher' },
      ],
      advantages: [
        { axis: 'attack', rawAmount: 20, weightedAmount: 15, winnerMismatch: 7, runnerMismatch: 27, strength: 'strong' },
        { axis: 'management', rawAmount: 11.5, weightedAmount: 11.5, winnerMismatch: 14, runnerMismatch: 25.5 },
      ],
      tradeoff: { axis: 'counter', amount: 25, winnerMismatch: 32, runnerMismatch: 7 },
      caution: { axis: 'counter', mismatch: 32, band: 'far', direction: 'higher' },
    });
    expect(reason.scoreGap).toBeCloseTo(1.2777777778, 8);
  });

  it('축별 순위 기여도의 합은 최종 점수 차이와 같다', () => {
    const all = Object.keys(AXIS_WEIGHTS).map((axis) => {
      const w = scoreWeapon(user, winner).axes[axis];
      const r = scoreWeapon(user, runner).axes[axis];
      return (w.weight * (r.mismatch - w.mismatch)) / 4.5;
    });
    expect(all.reduce((sum, value) => sum + value, 0)).toBeCloseTo(reason.scoreGap, 10);
  });

  it('예상 문구를 만든다', () => {
    const html = renderRecommendationReason(reason, [winner, runner]);
    const body = text(html);
    expect(body).toContain('왜 이 무기인가요?');
    expect(body).toContain('건랜스와 대검은 거의 비슷한 후보예요.');
    expect(body).toContain('건랜스는 한방 성향과 행동을 바꾸는 속도가 취향과 가깝습니다.');
    expect(body).toContain('대검보다 한방과 관리 기준에서 특히 더 가까웠지만, 전체 점수 차이는 작아 근소하게 1순위가 됐어요.');
    expect(body).toContain('다만 원하는 것보다 받아치는 플레이의 비중이 높아 처음에는 낯설 수 있어요. 이 기준은 2순위인 대검이 더 가깝습니다.');
    // 같은 축(반격)의 2순위 우위 문장을 따로 반복하지 않는다.
    expect(body).not.toContain('반격 기준은 2순위인');
    // 원시 점수와 불일치 숫자, 확률 표현을 노출하지 않는다.
    expect(body.replace(/[12]순위/g, '')).not.toMatch(/\d/);
    expect(body).not.toContain('%');
  });

  it('같은 입력은 같은 모델을 만들고 순위 계산을 바꾸지 않는다', () => {
    expect(buildRecommendationReason(user, winner, runner)).toEqual(reason);
    expect(rankWeapons(wilds.weapons, user)).toEqual(ranked);
  });

  it('같은 프로필과 1·2순위를 가진 공유 결과는 같은 이유를 만든다', () => {
    const code = encodeShareCode({ weaponIds: ranked.slice(0, 3).map(({ weapon: w }) => w.weapon_id), profile: user, nickname: '헌터' });
    const shared = decodeShareCode(code, wilds.weapons);
    expect(buildRecommendationReason(shared.profile, shared.weapons[0], shared.weapons[1])).toEqual(reason);
  });
});

describe('추천 이유 — 계산 규칙', () => {
  it('원래 불일치는 추천 계산과 같은 함수를 쓰고, 상대 우위에만 축 가중치를 곱한다', () => {
    const user = profile({});
    const winner = weapon('w', {});
    const runner = weapon('r', { attack: 70, management: 70 });
    const reason = buildRecommendationReason(user, winner, runner);
    const byAxis = Object.fromEntries(reason.advantages.map((item) => [item.axis, item]));
    expect(byAxis.attack).toMatchObject({ rawAmount: 20, weightedAmount: 15 });
    expect(byAxis.management).toMatchObject({ rawAmount: 20, weightedAmount: 20 });
    // 가중치가 큰 관리가 먼저 온다.
    expect(reason.advantages.map(({ axis }) => axis)).toEqual(['management', 'attack']);
    expect(byAxis.attack.runnerMismatch).toBe(AXIS_MISMATCH.attack(50, 70));
  });

  it('잘 맞는 점과 낯설 수 있는 점은 가중치를 곱하지 않은 불일치로 고른다', () => {
    // 한방 불일치 30(가중 22.5)이 관리 불일치 25(가중 25)보다 크므로 낯선 점은 한방이다.
    const reason = buildRecommendationReason(profile({}), weapon('w', { attack: 80, management: 75 }), null);
    expect(reason.caution).toMatchObject({ axis: 'attack', mismatch: 30 });
    expect(reason.closest.map(({ axis }) => axis)).toEqual(['freedom', 'complexity']);
  });

  it('불일치 구간 경계 10·20·30', () => {
    expect([0, 10, 10.01, 20, 20.01, 30, 30.01].map(mismatchBand))
      .toEqual(['very-close', 'very-close', 'close', 'close', 'some-difference', 'some-difference', 'far']);
  });

  it('점수 차이 경계 2·5', () => {
    expect([0.01, 1.99, 2, 4.99, 5].map(gapLevel)).toEqual(['close', 'close', 'moderate', 'moderate', 'clear']);
  });

  it('가중 상대 우위 경계 5·10', () => {
    expect([0.1, 4.99, 5, 9.99, 10].map(advantageStrength))
      .toEqual(['slight', 'slight', 'moderate', 'moderate', 'strong']);
  });

  it('낯설 수 있는 점은 불일치 20을 넘을 때만 만든다', () => {
    expect(buildRecommendationReason(profile({}), weapon('w', { counter: 70 }), null).caution).toBeNull();
    expect(buildRecommendationReason(profile({}), weapon('w', { counter: 70.5 }), null).caution)
      .toMatchObject({ axis: 'counter', direction: 'higher' });
  });

  it('2순위가 더 가까운 점은 원래 차이 5 이상에서만 만든다', () => {
    const user = profile({});
    const winner = weapon('w', { counter: 55 });
    expect(buildRecommendationReason(user, winner, weapon('r', { attack: 0, counter: 50.01 })).tradeoff).toBeNull();
    expect(buildRecommendationReason(user, winner, weapon('r', { attack: 0, counter: 50 })).tradeoff)
      .toMatchObject({ axis: 'counter', amount: 5 });
  });

  it('잘 맞는 점·상대 우위는 최대 2개, 낯설 수 있는 점은 최대 1개다', () => {
    const reason = buildRecommendationReason(
      profile({}), weapon('w', { attack: 80, counter: 90 }), weapon('r', { freedom: 0, complexity: 100, management: 100 }),
    );
    expect(reason.closest).toHaveLength(2);
    expect(reason.advantages).toHaveLength(2);
    expect(reason.caution).toMatchObject({ axis: 'counter' });
  });

  it('두 기준 모두 차이가 20을 넘으면 상대적으로 가까운 기준으로 부른다', () => {
    const far = { attack: 90, freedom: 0, complexity: 100, management: 100, counter: 0 };
    const reason = buildRecommendationReason(profile({}), weapon('w', far), null);
    expect(reason.closest.every(({ mismatch }) => mismatch > 20)).toBe(true);
    expect(closestCopy(reason, '대검').title).toBe('상대적으로 가까운 기준');
    expect(closestCopy(reason, '대검').text).toContain('다른 기준보다');
  });
});

describe('추천 이유 — 동점과 예외', () => {
  it('최종 점수가 같고 최대 불일치로 정해지면 그 이유만 설명한다', () => {
    const user = profile({});
    const winner = weapon('spread', { attack: 25, counter: 25 });
    const runner = weapon('row_first', { attack: 0 });
    expect(scoreWeapon(user, winner).score).toBe(scoreWeapon(user, runner).score);
    const reason = buildRecommendationReason(user, winner, runner);
    expect(reason).toMatchObject({ comparisonStatus: 'tie', tieReason: 'max-mismatch', gapLevel: null, advantages: [] });
    expect(leadText(reason, '해머', '대검')).toBe('해머와 대검의 전체 평균은 같지만, 가장 크게 어긋난 한 기준의 차이가 더 작아 해머가 앞섰어요.');
    expect(advantagesCopy(reason, '대검')).toBeNull();
  });

  it('최대 불일치까지 같으면 계산상 같은 후보라고만 말한다', () => {
    const user = profile({});
    const reason = buildRecommendationReason(user, weapon('a', { attack: 0 }), weapon('b', { counter: 100 }));
    expect(reason).toMatchObject({ comparisonStatus: 'tie', tieReason: 'row-order', advantages: [] });
    expect(leadText(reason, '해머', '대검')).toBe('해머와 대검은 계산상 같은 후보예요.');
  });

  it('공유 뒤 순서가 뒤집히면 stale로 두고 1순위 자체의 설명만 남긴다', () => {
    const user = profile({});
    const reason = buildRecommendationReason(user, weapon('worse', { attack: 0 }), weapon('better', { attack: 40 }));
    expect(reason).toMatchObject({ comparisonStatus: 'stale', gapLevel: null, advantages: [], tradeoff: null });
    expect(reason.scoreGap).toBeLessThan(0);
    expect(reason.closest).toHaveLength(2);
    expect(reason.caution).toMatchObject({ axis: 'attack' });
    expect(leadText(reason, '해머', '대검')).toContain('당시의 순위 차이는 다시 설명하기 어려워요.');
    // 점수가 같아도 최대 불일치가 저장된 순서와 반대면 stale이다.
    expect(buildRecommendationReason(user, weapon('a', { attack: 0 }), weapon('b', { attack: 25, counter: 25 })).comparisonStatus)
      .toBe('stale');
  });

  it('2순위가 없으면 잘 맞는 점과 낯설 수 있는 점만 만든다', () => {
    const reason = buildRecommendationReason(profile({}), weapon('w', { counter: 90 }), undefined);
    expect(reason).toMatchObject({ comparisonStatus: 'missing-runner-up', runnerUpId: null, advantages: [], tradeoff: null });
    expect(reason.caution).toMatchObject({ axis: 'counter' });
    expect(leadText(reason, '랜스', '')).toBe('랜스가 가장 잘 맞는 무기로 나왔어요.');
  });

  it('미측정 축은 모든 항목에서 빠지고, 측정 축이 없으면 null이다', () => {
    const user = { attack: null, freedom: 50, complexity: null, management: null, counter: null };
    const reason = buildRecommendationReason(user, weapon('w', { attack: 0 }), weapon('r', { attack: 100, freedom: 0 }));
    expect(reason.closest.map(({ axis }) => axis)).toEqual(['freedom']);
    expect(reason.advantages.map(({ axis }) => axis)).toEqual(['freedom']);
    expect(reason.caution).toBeNull();
    expect(reason.weightSum).toBe(1);
    const empty = { attack: null, freedom: null, complexity: null, management: null, counter: null };
    expect(buildRecommendationReason(empty, weapon('w'), weapon('r'))).toBeNull();
    expect(renderRecommendationReason(null, [])).toBe('');
  });

  it('2순위가 더 가까운 축이 낯선 점과 다르면 따로 한 번만 말한다', () => {
    const reason = buildRecommendationReason(
      profile({}), weapon('w', { attack: 80, counter: 60 }), weapon('r', { freedom: 0 }),
    );
    expect(reason.caution.axis).toBe('attack');
    expect(reason.tradeoff.axis).toBe('attack');
    expect(tradeoffCopy(reason, '대검')).toBeNull();
    const other = { ...reason, tradeoff: { axis: 'counter', amount: 10 } };
    expect(cautionCopy(other, '대검')).toBe('다만 원하는 것보다 한 번의 기회에 대미지를 더 집중하는 편이라 처음에는 낯설 수 있어요.');
    expect(tradeoffCopy(other, '대검')).toBe('반대로 반격 기준은 2순위인 대검이 더 가깝습니다.');
    // 1순위 비교가 있으면 그 옆에 붙인다.
    const html = renderRecommendationReason(other, [weapon('w', { weapon_name: '해머' }), weapon('r', { weapon_name: '대검' })]);
    const body = text(html);
    expect(body.match(/반격 기준은 2순위인/g)).toHaveLength(1);
    expect(body.indexOf('반대로 반격')).toBeLessThan(body.indexOf('낯설 수 있는 점'));
  });

  it('낯선 점과 1순위 비교가 모두 없으면 2순위가 더 가까운 기준만 따로 보여 준다', () => {
    const reason = {
      winnerId: 'w', runnerUpId: 'r', comparisonStatus: 'tie', tieReason: 'row-order', gapLevel: null,
      closest: [{ axis: 'attack', mismatch: 0, band: 'very-close' }], advantages: [], caution: null,
      tradeoff: { axis: 'counter', amount: 10 },
    };
    const body = text(renderRecommendationReason(reason, [weapon('w'), weapon('r', { weapon_name: '대검' })]));
    expect(body).toContain('2순위가 더 가까운 기준 반대로 반격 기준은 2순위인 대검이 더 가깝습니다.');
    expect(body).not.toContain('결정적인 차이');
    expect(body).not.toContain('낯설 수 있는 점');
  });
});

describe('추천 이유 — 문구와 화면', () => {
  it('받침에 따라 조사를 고르고 한글이 아니면 함께 적는다', () => {
    expect(josa('대검', '은', '는')).toBe('대검은');
    expect(josa('건랜스', '은', '는')).toBe('건랜스는');
    expect(josa('Bow', '이', '가')).toBe('Bow이(가)');
  });

  it('무기 이름의 HTML을 이스케이프한다', () => {
    const user = profile({});
    const winner = weapon('w', { weapon_name: '<img src=x>' });
    const runner = weapon('r', { weapon_name: '"대검"', attack: 0 });
    const html = renderRecommendationReason(buildRecommendationReason(user, winner, runner), [winner, runner]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('&quot;대검&quot;');
  });

  it('결과 화면에서 1순위 표시 아래·비교 버튼 위에 두고, 비교 대상과 관계없이 1순위 설명을 유지한다', () => {
    const user = { attack: 73, freedom: 21, complexity: 57, management: 56, counter: 23 };
    const weapons = rankWeapons(wilds.weapons, user).slice(0, 3).map(({ weapon: w }) => w);
    const result = { weapons, profile: user, nickname: '헌터' };
    const reason = buildRecommendationReason(user, weapons[0], weapons[1]);
    const first = renderResult(wilds, result, { reason });
    const order = ['class="winner"', 'id="reason-title"', 'class="ranking"', 'id="compare-title"'].map((mark) => first.indexOf(mark));
    expect(order[0]).toBeGreaterThan(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(text(first)).toContain('결정적인 차이');
    expect(text(first)).not.toContain('1순위가 된 이유');
    const section = (html) => html.slice(html.indexOf('class="result__section reason"'), html.indexOf('class="ranking"'));
    expect(section(renderResult(wilds, result, { reason, selectedIndex: 2 }))).toBe(section(first));
    expect(renderResult(wilds, result)).not.toContain('reason-title');
  });

  it('1순위 무기 뒤에 장식용 캐릭터 이미지를 뒤(b)·앞(a) 순서로 깔고, 다른 무기를 골라도 바꾸지 않는다', () => {
    const [winner, runner, third] = wilds.weapons;
    expect(winner.characters.map(({ src }) => src.includes('great_sword_b'))).toEqual([true, false]);
    // 공식 페이지 폭 709px 기준 left 83.2px·width 657.27px, 기준 틀 top -560px·높이 1000px
    expect(winner.characters[1]).toMatchObject({ left: 11.73, width: 92.7, top: 33.54 });
    const result = { weapons: [winner, runner, third], profile: { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 }, nickname: '헌터' };
    const html = renderResult(wilds, result, { selectedIndex: 2 });
    const art = html.slice(html.indexOf('class="winner__art"'), html.indexOf('class="winner__main"'));
    expect(art).toContain('aria-hidden="true"');
    expect(art.match(/<img /g)).toHaveLength(2);
    expect(art).toContain('great_sword_a');
    expect(art).not.toContain(third.weapon_id);
    expect(renderResult(wilds, { ...result, weapons: [{ ...winner, characters: [] }, runner, third] })).not.toContain('winner__art');
  });
});

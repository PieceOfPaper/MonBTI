import { describe, expect, it } from 'vitest';
import { buildResult, sharedResult, shareUrl } from '../app.js';
import { supportedGames } from '../games/index.js';
import { renderGuide, renderResult } from '../ui/views.js';
import {
  amplifyProfile, breakCenterTies, buildCentralModel, centralDeviation, centralRecommendation, isCentralProfile,
} from './central.js';
import { rankWeapons, recommendWeapons } from './recommend.js';
import { decodeShareCode, encodeShareCode } from './share.js';

const wilds = supportedGames.find(({ id }) => id === 'wilds');
const v2 = supportedGames.find(({ id }) => id === 'wilds_v2');
const profileOf = (attack, freedom, complexity, management, counter) => ({ attack, freedom, complexity, management, counter });
const weapon = (weapon_id, values) => ({ weapon_id, weapon_name: weapon_id, ...values });

describe('중앙 이탈도', () => {
  it('Σ|축 - 50| / 5이며 10 이하만 중앙형이다', () => {
    expect(centralDeviation(profileOf(60, 40, 50, 50, 50))).toBe(4);
    expect(isCentralProfile(profileOf(60, 40, 60, 40, 60))).toBe(true);
    expect(isCentralProfile(profileOf(60, 40, 60, 40, 60.001))).toBe(false);
    expect(isCentralProfile(profileOf(100, 50, 50, 50, 50))).toBe(true);
  });

  it('미측정 축은 빼고 평균하며 측정된 축이 없으면 중앙형이 아니다', () => {
    expect(centralDeviation(profileOf(70, null, null, null, null))).toBe(20);
    expect(centralDeviation(profileOf(null, null, null, null, null))).toBeNull();
    expect(isCentralProfile(profileOf(null, null, null, null, null))).toBe(false);
  });
});

describe('정확히 50인 축의 방향', () => {
  const signs = (profile) => Object.values(breakCenterTies(profile)).map((value) => (value > 50 ? '+' : value < 50 ? '-' : '0')).join('');

  it('모두 50이면 축 순서대로 +, -, +, -, +이다', () => {
    expect(breakCenterTies(profileOf(50, 50, 50, 50, 50))).toEqual(profileOf(51, 49, 51, 49, 51));
  });

  it('50보다 큰 축이 많으면 49, 작은 축이 많으면 51, 같으면 51부터 옮긴다', () => {
    expect(signs(profileOf(60, 50, 60, 40, 60))).toBe('+-+-+');
    expect(signs(profileOf(40, 40, 50, 60, 30))).toBe('--++-');
    expect(signs(profileOf(50, 60, 40, 60, 40))).toBe('++-+-');
  });

  it('50인 축이 1~5개일 때 양쪽 개수를 맞추며 번갈아 옮긴다', () => {
    expect(signs(profileOf(60, 60, 60, 60, 50))).toBe('++++-');
    expect(signs(profileOf(60, 60, 60, 50, 50))).toBe('+++--');
    expect(signs(profileOf(60, 60, 50, 50, 50))).toBe('++--+');
    expect(signs(profileOf(60, 50, 50, 50, 50))).toBe('+-+-+');
    expect(signs(profileOf(40, 50, 50, 50, 50))).toBe('-++-+');
  });
});

describe('4배 확대 점수', () => {
  it('50에서 떨어진 거리를 4배로 늘리고 0~100으로 제한한다', () => {
    expect(amplifyProfile(profileOf(55, 45, 70, 30, 50))).toEqual(profileOf(70, 30, 100, 0, 54));
    expect(amplifyProfile(profileOf(51.5, null, 50, 50, 50)).freedom).toBeNull();
  });
});

describe('특별 결과 순위', () => {
  // 원래 점수(모두 50 근처)에서는 a가 1위, 확대하면 b가 1위가 되도록 만든 무기.
  const weapons = [
    weapon('a', { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 }),
    weapon('c', { attack: 45, freedom: 50, complexity: 50, management: 50, counter: 50 }),
    weapon('b', { attack: 90, freedom: 50, complexity: 50, management: 50, counter: 50 }),
    weapon('d', { attack: 20, freedom: 50, complexity: 50, management: 50, counter: 50 }),
  ];
  const lean = profileOf(58, 50, 50, 50, 50);

  it('확대 1위가 원래 3위면 1순위로 올리고 원래 1·2위를 2·3순위로 쓴다', () => {
    expect(rankWeapons(weapons, lean).map(({ weapon: { weapon_id } }) => weapon_id)).toEqual(['a', 'c', 'b', 'd']);
    expect(rankWeapons(weapons, amplifyProfile(lean))[0].weapon.weapon_id).toBe('b');
    expect(centralRecommendation(weapons, lean).map(({ weapon_id }) => weapon_id)).toEqual(['b', 'a', 'c']);
  });

  it('확대 1위가 원래 1위와 같으면 중복 없이 원래 2·3위가 이어진다', () => {
    const same = profileOf(50, 50, 50, 50, 50);
    const original = recommendWeapons(weapons, same).map(({ weapon_id }) => weapon_id);
    const central = centralRecommendation(weapons, same).map(({ weapon_id }) => weapon_id);
    expect(central[0]).toBe(original[0]);
    expect(central).toEqual(original);
    expect(new Set(central).size).toBe(3);
  });

  it('확대 1위가 원래 2위면 원래 1·3위가 2·3순위가 된다', () => {
    const list = [
      weapon('a', { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 }),
      weapon('b', { attack: 70, freedom: 50, complexity: 50, management: 50, counter: 50 }),
      weapon('c', { attack: 30, freedom: 50, complexity: 50, management: 50, counter: 50 }),
    ];
    expect(rankWeapons(list, lean).map(({ weapon: { weapon_id } }) => weapon_id)).toEqual(['a', 'b', 'c']);
    expect(centralRecommendation(list, lean).map(({ weapon_id }) => weapon_id)).toEqual(['b', 'a', 'c']);
  });

  it('설명 모델은 1순위가 앞선 축과 원래 순위를 계산한다', () => {
    const [winner] = centralRecommendation(weapons, lean);
    const model = buildCentralModel(weapons, lean, winner);
    expect(model.winnerId).toBe('b');
    expect(model.rivalId).toBe('a');
    expect(model.originalRank).toBe(3);
    expect(model.axes).toEqual([{ axis: 'attack', side: 'higher' }]);
    expect(model.forcedAxes).toEqual(['freedom', 'complexity', 'management', 'counter']);
    expect(model.deviation).toBeCloseTo(1.6);
  });
});

describe('설명 모델의 축 선택', () => {
  // 정확히 50이라 규칙으로 옮긴 축이 비교 무기와의 차이를 만들어도 실제로 기운 성향으로 소개하지 않는다.
  const weapons = [
    weapon('a', { attack: 50, freedom: 50, complexity: 50, management: 50, counter: 50 }),
    weapon('b', { attack: 70, freedom: 50, complexity: 50, management: 50, counter: 55 }),
  ];

  it('원래 50인 축은 크게 작용한 성향에서 빼고 따로 알린다', () => {
    const profile = profileOf(55, 50, 50, 50, 50);
    const [winner] = centralRecommendation(weapons, profile);
    expect(winner.weapon_id).toBe('b');
    const model = buildCentralModel(weapons, profile, winner);
    expect(model.axes.map(({ axis }) => axis)).toEqual(['attack']);
    expect(model.forcedAxes).toContain('counter');
  });

  it('모든 축이 50이면 작용한 성향 없이 규칙 안내만 남긴다', () => {
    const profile = profileOf(50, 50, 50, 50, 50);
    const model = buildCentralModel(weapons, profile, centralRecommendation(weapons, profile)[0]);
    expect(model.axes).toEqual([]);
    expect(model.forcedAxes).toHaveLength(5);
  });
});

describe('작품별 적용', () => {
  // 모든 질문에 같은 답을 하면 모든 축이 정확히 50이 된다.
  const flat = (game) => Object.fromEntries(game.questions.map(({ question_id }) => [question_id, 4]));

  it('와일즈 V2에만 적용하고 기존 와일즈는 그대로 둔다', () => {
    expect(v2.centralResult).toBe(true);
    expect(wilds.centralResult).toBeFalsy();
    const before = buildResult(wilds, flat(wilds));
    expect(before.central).toBeUndefined();
    expect(before.weapons).toEqual(recommendWeapons(wilds.weapons, before.profile));
    const after = buildResult(v2, flat(v2));
    expect(after.central).toBeTruthy();
    expect(after.weapons).toEqual(centralRecommendation(v2.weapons, after.profile));
  });

  it('특별 결과의 profile과 그래프는 원래 점수를 쓴다', () => {
    const result = buildResult(v2, flat(v2), '종잇장');
    expect(Object.values(result.profile).every((value) => value === 50)).toBe(true);
    const html = renderResult(v2, result);
    expect(html).toContain('혹시 이미 몬스터헌터 숙련자이거나 취향을 잘 안 타는 사람인가요?');
    expect(html).not.toContain('왜 이 무기인가요?');
    // 표의 내 점수 칸은 확대 점수(51·49→54·46)가 아니라 원래 점수 50이다.
    expect(html.match(/<tr><th scope="row">[^<]+<\/th><td>(\d+)<\/td>/g).map((row) => row.match(/<td>(\d+)/)[1])).toEqual(['50', '50', '50', '50', '50']);
  });

  it('중앙 이탈도 10 초과인 건랜스·슬래시액스 회귀 사례는 V2에서도 일반 결과다', () => {
    const profile = profileOf(79, 30, 64, 59, 69);
    expect(centralDeviation(profile)).toBeCloseTo(18.2);
    expect(isCentralProfile(profile)).toBe(false);
    expect(recommendWeapons(v2.weapons, profile).slice(0, 2).map(({ weapon_id }) => weapon_id)).toEqual(['gunlance', 'switch_axe']);
  });

  it('특별 결과가 아닌 V2 결과는 일반 추천과 같다', () => {
    const answers = Object.fromEntries(v2.questions.map(({ question_id }, i) => [question_id, i % 2 ? 1 : 6]));
    const result = buildResult(v2, answers);
    expect(isCentralProfile(result.profile)).toBe(false);
    expect(result.central).toBeUndefined();
    expect(result.weapons).toEqual(recommendWeapons(v2.weapons, result.profile));
  });

  it('검사 설명은 특별 결과를 쓰는 검사에만 안내한다', () => {
    expect(renderGuide(v2)).toContain('다섯 기준이 모두 가운데에 가까우면');
    expect(renderGuide(wilds)).not.toContain('다섯 기준이 모두 가운데에 가까우면');
  });
});

describe('공유 링크', () => {
  const flat = Object.fromEntries(v2.questions.map(({ question_id }) => [question_id, 4]));

  it('특별 결과는 표시를 담아 같은 순위와 안내로 다시 연다', () => {
    const own = buildResult(v2, flat, '종잇장');
    const url = shareUrl(v2, own, 'https://example.com/MonBTI/');
    const code = new URL(url).searchParams.get('r').replace(/^wilds_v2\./, '');
    expect(code.endsWith('.c')).toBe(true);
    const shared = sharedResult(v2, decodeShareCode(code, v2.weapons));
    expect(shared.weapons).toEqual(own.weapons);
    expect(shared.central).toEqual(own.central);
    expect(renderResult(v2, shared, { shared: true })).toContain('혹시 이미 몬스터헌터 숙련자이거나 취향을 잘 안 타는 사람인가요?');
  });

  it('일반 결과는 표시 없이 예전 형식 그대로다', () => {
    const answers = Object.fromEntries(v2.questions.map(({ question_id }, i) => [question_id, i % 2 ? 1 : 6]));
    const own = buildResult(v2, answers, '종잇장');
    const code = new URL(shareUrl(v2, own, 'https://example.com/')).searchParams.get('r');
    expect(code.endsWith('.c')).toBe(false);
    const shared = sharedResult(v2, decodeShareCode(code.replace(/^wilds_v2\./, ''), v2.weapons));
    expect(shared.central).toBeUndefined();
    expect(shared.weapons).toEqual(own.weapons);
  });

  it('특별 결과 규칙이 없는 작품은 표시가 있어도 일반 결과로 연다', () => {
    const code = encodeShareCode({ weaponIds: ['bow', 'lance', 'hammer'], profile: profileOf(50, 50, 50, 50, 50), nickname: '헌터', central: true });
    const decoded = decodeShareCode(code, wilds.weapons);
    expect(decoded.central).toBe(true);
    expect(sharedResult(wilds, decoded).central).toBeUndefined();
  });

  it('알 수 없는 끝 표시는 거부한다', () => {
    const code = encodeShareCode({ weaponIds: ['bow', 'lance', 'hammer'], profile: profileOf(50, 50, 50, 50, 50), nickname: '헌터' });
    expect(decodeShareCode(`${code}.x`, v2.weapons)).toBeNull();
    expect(decodeShareCode(`${code}.c.c`, v2.weapons)).toBeNull();
  });
});

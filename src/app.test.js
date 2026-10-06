import { describe, expect, it } from 'vitest';
import {
  buildResult, createAnswerStore, parseRoute, shareParamToHash, shareUrl,
} from './app.js';
import { supportedGames } from './games/index.js';
import { renderGameSelection, renderQuestion, renderResult } from './ui/views.js';
import { decodeShareCode } from './core/share.js';

const wilds = supportedGames[0];
// 화면·저장 테스트는 편집 가능한 원본 시트의 문항 ID·가중치와 분리한다.
const testGame = {
  ...wilds,
  questions: [{
    question_id: 'wilds_q001', question_order: 1, question_text: '테스트 질문',
    attack: 100, freedom: 0, combo: 0, resource: 0, counter: 0,
  }],
};

describe('작품 데이터', () => {
  it('현재 지원하는 작품은 와일즈뿐이다', () => {
    expect(supportedGames.map(({ id }) => id)).toEqual(['wilds']);
  });

  it('와일즈 질문은 표시 순서대로 정렬되어 있고 무기 기준값은 0~100이다', () => {
    const orders = wilds.questions.map(({ question_order }) => question_order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    for (const weapon of wilds.weapons) {
      for (const axis of ['attack', 'freedom', 'combo', 'resource', 'counter']) {
        expect(weapon[axis]).toBeGreaterThanOrEqual(0);
        expect(weapon[axis]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('라우팅', () => {
  it('해시를 화면으로 해석한다', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/wilds')).toEqual({ name: 'quiz', gameId: 'wilds' });
    expect(parseRoute('#/wilds/result')).toEqual({ name: 'result', gameId: 'wilds' });
    expect(parseRoute('#/wilds/share/a.b.c.1.2.3.4.5')).toEqual({ name: 'share', gameId: 'wilds', code: 'a.b.c.1.2.3.4.5' });
    expect(parseRoute('#/wilds/share')).toEqual({ name: 'unknown' });
    expect(parseRoute('#/wilds/zzz')).toEqual({ name: 'unknown' });
    expect(parseRoute('#/wilds/result/x')).toEqual({ name: 'unknown' });
  });
});

describe('답변 저장', () => {
  const memory = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  };

  it('저장한 답변을 다시 읽고 초기화할 수 있다', () => {
    const store = createAnswerStore(memory());
    store.save(testGame, { wilds_q001: 5 });
    expect(store.load(testGame)).toEqual({ wilds_q001: 5 });
    store.clear(testGame);
    expect(store.load(testGame)).toEqual({});
  });

  it('저장소가 없거나 오류가 나도 빈 답변으로 진행한다', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(createAnswerStore(null).load(testGame)).toEqual({});
    expect(createAnswerStore(broken).load(testGame)).toEqual({});
    expect(() => createAnswerStore(broken).save(testGame, {})).not.toThrow();
  });
});

describe('화면', () => {
  it('작품 선택 화면은 와일즈 검사 링크를 제공한다', () => {
    expect(renderGameSelection(supportedGames)).toContain('href="#/wilds"');
  });

  it('질문 화면은 공통 여섯 응답을 라디오 버튼으로 보여 준다', () => {
    const html = renderQuestion(testGame, 0, {});
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html).toContain('전혀 그렇지 않다');
    expect(html).toContain('scale__end--low');
    expect(html).toContain('scale__end--high');
    expect(html).toContain('매우 그렇다');
    expect(html).toContain('disabled');
    expect(renderQuestion(testGame, 0, { wilds_q001: 4 })).toContain('value="4" checked');
  });

  const result = buildResult(testGame, { wilds_q001: 5 });

  it('결과 화면은 1~3순위 무기와 1순위 강조, 짧은 기준 이름을 보여 준다', () => {
    const html = renderResult(testGame, result);
    expect(html.match(/class="rank rank--/g)).toHaveLength(3);
    expect(html).toContain('rank--1');
    expect(html).toContain('aria-pressed="true"');
    for (const short of ['한방', '자유', '연계', '자원', '반격']) expect(html).toContain(short);
    expect(html).not.toContain('axis__description');
  });

  it('결과 화면은 방사형 차트에 나와 무기를 함께 그리고 미측정 기준은 측정 안 됨으로 표시한다', () => {
    const html = renderResult(testGame, result);
    expect(html).toContain('radar__series--me');
    expect(html).toContain('radar__series--weapon');
    expect(html).toContain('측정 안 됨');
    // 응답 5 → attack 50 + 50 × 60/100 = 80
    expect(html).toContain('<td>80</td>');
  });

  it('결과 화면은 선택한 무기의 소개 영상과 두 가지 공유 버튼을 제공한다', () => {
    const html = renderResult(testGame, result, { selectedIndex: 1 });
    expect(html).toContain(`data-video-id="${result.weapons[1].videoId}"`);
    expect(html).toContain('data-action="share-image"');
    expect(html).toContain('data-action="share-link"');
    expect(html).toContain('data-action="restart"');
  });

  it('공유 결과 화면은 답변 수정 대신 검사 시작을 안내한다', () => {
    const html = renderResult(testGame, result, { shared: true });
    expect(html).toContain('나도 검사하기');
    expect(html).toContain('친구 vs');
    expect(html).not.toContain('data-action="restart"');
  });

  it('질문 문구의 HTML을 이스케이프한다', () => {
    const game = { ...testGame, questions: [{ ...testGame.questions[0], question_text: '<b>x</b>' }] };
    expect(renderQuestion(game, 0, {})).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('임시 추천과 공유 링크', () => {
  it('와일즈 무기는 모두 아이콘과 소개 영상을 가진다', () => {
    for (const weapon of wilds.weapons) {
      expect(weapon.icon, weapon.weapon_id).toBeTruthy();
      expect(weapon.videoId, weapon.weapon_id).toMatch(/^[\w-]{11}$/);
    }
  });

  it('같은 답변은 같은 서로 다른 무기 세 개를 고르고, 답변을 바꾸면 다시 고른다', () => {
    const answers = Object.fromEntries(wilds.questions.map(({ question_id }) => [question_id, 4]));
    const first = buildResult(wilds, answers);
    expect(buildResult(wilds, { ...answers }).weapons).toEqual(first.weapons);
    expect(new Set(first.weapons.map(({ weapon_id }) => weapon_id)).size).toBe(3);
    const picks = new Set();
    for (let r = 1; r <= 6; r += 1) {
      const changed = Object.fromEntries(wilds.questions.map(({ question_id }) => [question_id, r]));
      picks.add(buildResult(wilds, changed).weapons.map(({ weapon_id }) => weapon_id).join());
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  const answers = Object.fromEntries(wilds.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1]));
  const own = buildResult(wilds, answers);
  const url = shareUrl(wilds, own, 'https://example.com/MonBTI/');

  it('공유 링크는 # 없이 인코딩되지 않는 문자만 사용한다', () => {
    expect(url.startsWith('https://example.com/MonBTI/?r=wilds.')).toBe(true);
    expect(url).not.toContain('#');
    expect(url.slice(url.indexOf('?r=') + 3)).toMatch(/^[a-z0-9_.-]+$/);
    expect(encodeURIComponent(url.slice(url.indexOf('?r=') + 3))).toBe(url.slice(url.indexOf('?r=') + 3));
  });

  it('공유 링크로 같은 무기와 반올림한 기준값을 복원한다', () => {
    const hash = shareParamToHash(new URL(url).search);
    const route = parseRoute(hash);
    expect(route).toMatchObject({ name: 'share', gameId: 'wilds' });
    const decoded = decodeShareCode(route.code, wilds.weapons);
    expect(decoded.weapons).toEqual(own.weapons);
    for (const axis of ['attack', 'freedom', 'combo', 'resource', 'counter']) {
      expect(decoded.profile[axis]).toBe(own.profile[axis] === null ? null : Math.round(own.profile[axis]));
    }
  });

  it('공유 과정에서 인코딩된 주소도 같은 결과로 해석한다', () => {
    const hash = shareParamToHash(new URL(url).search);
    const encoded = hash.replaceAll('/', '%2F');
    expect(parseRoute(encoded)).toEqual(parseRoute(hash));
    expect(shareParamToHash(`?r=${encodeURIComponent(new URL(url).searchParams.get('r'))}`)).toBe(hash);
    expect(shareParamToHash('')).toBeNull();
    expect(shareParamToHash('?r=wilds')).toBeNull();
  });

  it('잘못된 공유 코드는 거부한다', () => {
    expect(decodeShareCode('bow.lance.hammer.10.20.-.40.100', wilds.weapons).profile.combo).toBeNull();
    for (const bad of [
      'bow.lance.1.2.3.4.5',
      'bow.bow.lance.1.2.3.4.5',
      'bow.lance.nope.1.2.3.4.5',
      'bow.lance.hammer.1.2.3.4',
      'bow.lance.hammer.1.2.3.4.101',
      'bow.lance.hammer.1.2.3.4.x',
      '',
      undefined,
    ]) expect(decodeShareCode(bad, wilds.weapons), bad).toBeNull();
  });
});

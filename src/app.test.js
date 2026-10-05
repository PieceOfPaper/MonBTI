import { describe, expect, it } from 'vitest';
import { createAnswerStore, parseRoute } from './app.js';
import { supportedGames } from './games/index.js';
import { renderGameSelection, renderQuestion, renderResult } from './ui/views.js';
import { computeAxisTotals } from './core/scoring.js';

const wilds = supportedGames[0];

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
    expect(parseRoute('#/wilds/zzz')).toEqual({ name: 'unknown' });
  });
});

describe('답변 저장', () => {
  const memory = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  };

  it('저장한 답변을 다시 읽고 초기화할 수 있다', () => {
    const store = createAnswerStore(memory());
    store.save(wilds, { wilds_q001: 5 });
    expect(store.load(wilds)).toEqual({ wilds_q001: 5 });
    store.clear(wilds);
    expect(store.load(wilds)).toEqual({});
  });

  it('저장소가 없거나 오류가 나도 빈 답변으로 진행한다', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(createAnswerStore(null).load(wilds)).toEqual({});
    expect(createAnswerStore(broken).load(wilds)).toEqual({});
    expect(() => createAnswerStore(broken).save(wilds, {})).not.toThrow();
  });
});

describe('화면', () => {
  it('작품 선택 화면은 와일즈 검사 링크를 제공한다', () => {
    expect(renderGameSelection(supportedGames)).toContain('href="#/wilds"');
  });

  it('질문 화면은 공통 여섯 응답을 라디오 버튼으로 보여 준다', () => {
    const html = renderQuestion(wilds, 0, {});
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html).toContain('전혀 그렇지 않다');
    expect(html).toContain('scale__end--low');
    expect(html).toContain('scale__end--high');
    expect(html).toContain('매우 그렇다');
    expect(html).toContain('disabled');
    expect(renderQuestion(wilds, 0, { wilds_q001: 4 })).toContain('value="4" checked');
  });

  it('결과 화면은 측정하지 않은 기준을 0으로 표시하지 않는다', () => {
    const html = renderResult(wilds, computeAxisTotals(wilds.questions, { wilds_q001: 5 }));
    expect(html).toContain('+60');
    expect(html).toContain('한방형 쪽');
    expect(html).toContain('측정하지 않았어요');
  });

  it('질문 문구의 HTML을 이스케이프한다', () => {
    const game = { ...wilds, questions: [{ ...wilds.questions[0], question_text: '<b>x</b>' }] };
    expect(renderQuestion(game, 0, {})).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

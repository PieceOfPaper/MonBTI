import { describe, expect, it } from 'vitest';
import { contribution, responseCoefficient } from './responses.js';
import { computeAxisProfile, computeAxisTotals, firstUnansweredIndex, isComplete, sanitizeAnswers, setAnswer } from './scoring.js';

const q = (id, order, weights) => ({
  question_id: id, question_order: order, question_text: id,
  attack: 0, freedom: 0, combo: 0, resource: 0, counter: 0, ...weights,
});

describe('응답 계수', () => {
  it('응답 1~6을 -1·-0.6·-0.2·0.2·0.6·1로 바꾼다', () => {
    expect([1, 2, 3, 4, 5, 6].map(responseCoefficient)).toEqual([-1, -0.6, -0.2, 0.2, 0.6, 1]);
  });

  it('1~6 정수가 아닌 응답을 거부한다', () => {
    for (const bad of [0, 7, 3.5, '4', null, undefined, true]) {
      expect(() => responseCoefficient(bad)).toThrow(RangeError);
    }
  });

  it('양수·음수 가중치의 부호와 크기를 반영한다', () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => contribution(100, r))).toEqual([-100, -60, -20, 20, 60, 100]);
    expect([1, 2, 3, 4, 5, 6].map((r) => contribution(50, r))).toEqual([-50, -30, -10, 10, 30, 50]);
    expect([1, 6].map((r) => contribution(-100, r))).toEqual([100, -100]);
  });
});

describe('축별 합산', () => {
  const sample = q('wilds_q001', 1, { attack: 100, freedom: 50 });

  it('예시 질문은 attack·freedom만 측정하고 나머지는 null이다', () => {
    const totals = computeAxisTotals([sample], { wilds_q001: 6 });
    expect(totals.attack).toEqual({ total: 100, count: 1, maxAbs: 100 });
    expect(totals.freedom).toEqual({ total: 50, count: 1, maxAbs: 50 });
    expect(totals.combo.total).toBeNull();
    expect(totals.resource.total).toBeNull();
    expect(totals.counter.total).toBeNull();
  });

  it('응답 1은 부호가 반대로 반영된다', () => {
    const totals = computeAxisTotals([sample], { wilds_q001: 1 });
    expect(totals.attack.total).toBe(-100);
    expect(totals.freedom.total).toBe(-50);
  });

  it('상쇄된 합계 0은 null이 아닌 유효한 값이다', () => {
    const questions = [q('a', 1, { combo: 60 }), q('b', 2, { combo: -60 })];
    const totals = computeAxisTotals(questions, { a: 6, b: 6 });
    expect(totals.combo).toEqual({ total: 0, count: 2, maxAbs: 120 });
  });

  it('무응답 문항은 합산에서 제외하며 응답 1과 다르다', () => {
    const questions = [q('a', 1, { counter: 80 }), q('b', 2, { counter: 40 })];
    expect(computeAxisTotals(questions, { a: 5 }).counter).toEqual({ total: 48, count: 1, maxAbs: 80 });
    expect(computeAxisTotals(questions, {}).counter.total).toBeNull();
  });

  it('여러 문항의 소수 가중치를 반올림 없이 더한다', () => {
    const questions = [q('a', 1, { resource: 33.3 }), q('b', 2, { resource: -12.5 })];
    const totals = computeAxisTotals(questions, { a: 5, b: 2 });
    expect(totals.resource.total).toBeCloseTo(33.3 * 0.6 + 12.5 * 0.6, 10);
  });
});

describe('답변 관리', () => {
  const questions = [q('a', 1, { attack: 100 }), q('b', 2, { freedom: 100 })];

  it('답변 수정은 기존 응답을 교체해 중복 누적되지 않는다', () => {
    let answers = setAnswer({}, questions, 'a', 6);
    answers = setAnswer(answers, questions, 'a', 2);
    expect(answers).toEqual({ a: 2 });
    expect(computeAxisTotals(questions, answers).attack.total).toBe(-60);
  });

  it('존재하지 않는 질문과 잘못된 응답을 거부한다', () => {
    expect(() => setAnswer({}, questions, 'zzz', 3)).toThrow();
    expect(() => setAnswer({}, questions, 'a', 7)).toThrow(RangeError);
  });

  it('미완료 상태와 첫 미응답 위치를 구한다', () => {
    expect(isComplete({ a: 3 }, questions)).toBe(false);
    expect(firstUnansweredIndex({ a: 3 }, questions)).toBe(1);
    expect(isComplete({ a: 3, b: 4 }, questions)).toBe(true);
    expect(firstUnansweredIndex({ a: 3, b: 4 }, questions)).toBe(2);
    expect(isComplete({}, [])).toBe(false);
  });

  it('저장된 답변에서 알 수 없는 질문과 잘못된 응답을 버린다', () => {
    expect(sanitizeAnswers({ a: 4, b: '5', c: 2, d: 9 }, questions)).toEqual({ a: 4 });
    expect(sanitizeAnswers(null, questions)).toEqual({});
  });
});

describe('사용자 점수 정규화', () => {
  it('합산값을 가능한 최대 크기 기준으로 0~100에 놓고 미측정 축은 null로 둔다', () => {
    const questions = [q('a', 1, { attack: 100, freedom: -50 }), q('b', 2, { attack: 50 })];
    const profile = computeAxisProfile(computeAxisTotals(questions, { a: 6, b: 1 }));
    // attack: (100 - 50) / 150 → 50 + 50 × 1/3
    expect(profile.attack).toBeCloseTo(50 + 50 / 3);
    expect(profile.freedom).toBe(0);
    expect(profile.combo).toBeNull();
  });

  it('모두 매우 그렇다면 100, 상쇄되면 50이다', () => {
    const questions = [q('a', 1, { counter: 60 }), q('b', 2, { counter: -60 })];
    expect(computeAxisProfile(computeAxisTotals(questions, { a: 6, b: 1 })).counter).toBe(100);
    expect(computeAxisProfile(computeAxisTotals(questions, { a: 6, b: 6 })).counter).toBe(50);
  });
});

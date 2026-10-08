import { describe, expect, it } from 'vitest';
import { orderQuestions, resolveQuestionOrder, shuffle } from './order.js';

const q = (id) => ({ question_id: id });
const questions = ['a', 'b', 'c', 'd'].map(q);
// 정해진 값을 차례로 돌려주는 난수 함수
const sequence = (...values) => () => values.shift() ?? 0;

describe('질문 순서', () => {
  it('원본을 바꾸지 않고 같은 항목을 섞는다', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const shuffled = shuffle(ids, sequence(0, 0, 0));
    expect(shuffled).toEqual(['b', 'c', 'd', 'a']);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect([...shuffle(ids)].sort()).toEqual(ids);
  });

  it('저장한 순서가 현재 질문 집합과 같으면 그대로 사용한다', () => {
    const saved = ['d', 'b', 'a', 'c'];
    expect(resolveQuestionOrder(saved, questions, () => { throw new Error('섞지 않아야 함'); })).toBe(saved);
  });

  it('저장한 순서가 없거나 질문 집합과 다르면 새로 섞는다', () => {
    for (const saved of [null, 'abc', ['a', 'b', 'c'], ['a', 'b', 'c', 'x'], ['a', 'a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e']]) {
      expect([...resolveQuestionOrder(saved, questions, sequence(0.5, 0.5, 0.5))].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });

  it('ID 순서대로 질문 객체를 정렬한다', () => {
    expect(orderQuestions(questions, ['c', 'a', 'd', 'b']).map(({ question_id }) => question_id)).toEqual(['c', 'a', 'd', 'b']);
  });
});

import { describe, expect, it } from 'vitest';
import { SheetConversionError, convertQuestions, convertWeapons } from './sheet-converter.js';

const WEAPON_HEADER = ['weapon_id', 'weapon_name', 'attack', 'freedom', 'combo', 'management', 'counter'];
const QUESTION_HEADER = ['question_id', 'question_order', 'question_text', 'attack', 'freedom', 'combo', 'management', 'counter'];

const errorsOf = (fn) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(SheetConversionError);
    return error.errors.join('\n');
  }
  throw new Error('변환 오류가 발생하지 않았습니다.');
};

describe('무기 탭 변환', () => {
  it('열 이름으로 읽어 다섯 기준값을 숫자로 보존한다', () => {
    const header = ['weapon_name', 'counter', 'weapon_id', 'attack', 'freedom', 'combo', 'management'];
    const rows = [header, ['대검', 10, 'great_sword', 90.5, 20, 30, 40], [null, null, null], []];
    expect(convertWeapons(rows)).toEqual([
      { weapon_id: 'great_sword', weapon_name: '대검', attack: 90.5, freedom: 20, combo: 30, management: 40, counter: 10 },
    ]);
  });

  it('reason 메모 열은 JSON에 포함하지 않는다', () => {
    const rows = [[...WEAPON_HEADER, 'reason'], ['lance', '랜스', 30, 20, 40, 10, 60, '가드 중심']];
    expect(convertWeapons(rows)).toEqual([
      { weapon_id: 'lance', weapon_name: '랜스', attack: 30, freedom: 20, combo: 40, management: 10, counter: 60 },
    ]);
  });

  it('누락·범위 밖·불리언 값과 ID 중복을 오류로 처리한다', () => {
    const rows = [
      WEAPON_HEADER,
      ['a', '가', 50, 50, 50, 50, null],
      ['a', '나', 101, true, '50', 50, 50],
    ];
    const message = errorsOf(() => convertWeapons(rows));
    expect(message).toContain('counter 값이 비어');
    expect(message).toContain("'a'가 중복");
    expect(message).toContain('attack 값');
    expect(message).toContain('freedom 값');
    expect(message).toContain('combo 값');
  });

  it('필수 열 누락과 열 이름 중복을 오류로 처리한다', () => {
    expect(errorsOf(() => convertWeapons([WEAPON_HEADER.slice(0, 6)]))).toContain("'counter'");
    expect(errorsOf(() => convertWeapons([[...WEAPON_HEADER, 'attack']]))).toContain('중복');
  });
});

describe('질문 탭 변환', () => {
  it('빈칸 가중치를 0으로 통일하고 표시 순서로 정렬한다', () => {
    const rows = [
      QUESTION_HEADER,
      ['q2', 2, ' 두 번째 ', null, -40, 0, '', 0],
      ['q1', 1, '첫 번째', 100, 50, 0, 0, 0],
      [null, null, null, 0, null, 0, null, null],
    ];
    expect(convertQuestions(rows)).toEqual([
      { question_id: 'q1', question_order: 1, question_text: '첫 번째', attack: 100, freedom: 50, combo: 0, management: 0, counter: 0 },
      { question_id: 'q2', question_order: 2, question_text: '두 번째', attack: 0, freedom: -40, combo: 0, management: 0, counter: 0 },
    ]);
  });

  it('분류1·분류2 메모 열은 JSON에 포함하지 않는다', () => {
    const rows = [
      [...QUESTION_HEADER, '분류1', '분류2'],
      ['q1', 1, '가', 0, 0, 75, 0, 0, '숙련', null],
      ['q2', 2, '나', 0, 0, 0, -100, 0, '상태 확인', '피로'],
    ];
    expect(convertQuestions(rows)).toEqual([
      { question_id: 'q1', question_order: 1, question_text: '가', attack: 0, freedom: 0, combo: 75, management: 0, counter: 0 },
      { question_id: 'q2', question_order: 2, question_text: '나', attack: 0, freedom: 0, combo: 0, management: -100, counter: 0 },
    ]);
  });

  it('ID·순서 중복, 잘못된 순서, 범위 밖 가중치, 모든 가중치 0을 오류로 처리한다', () => {
    const rows = [
      QUESTION_HEADER,
      ['q1', 1, '가', 10, 0, 0, 0, 0],
      ['q1', 1, '나', 10, 0, 0, 0, 0],
      ['q3', 1.5, '다', -101, 0, 0, 0, 0],
      ['q4', 4, '라', 0, 0, 0, 0, 0],
      ['q5', true, '마', false, 0, 0, 0, 10],
    ];
    const message = errorsOf(() => convertQuestions(rows));
    expect(message).toContain("'q1'가 중복");
    expect(message).toContain('question_order 1가 중복');
    expect(message).toContain("question_order '1.5'");
    expect(message).toContain("attack 가중치 '-101'");
    expect(message).toContain('0이 아닌 가중치');
    expect(message).toContain("question_order 'true'");
    expect(message).toContain("attack 가중치 'false'");
  });

  it('기본 필드가 일부만 있거나 가중치만 있는 행을 오류로 처리한다', () => {
    expect(errorsOf(() => convertQuestions([QUESTION_HEADER, ['q1', null, null, 10]]))).toContain('question_order');
    expect(errorsOf(() => convertQuestions([QUESTION_HEADER, [null, null, null, 10]]))).toContain('가중치만');
  });

  it('이전 axis·reverse 구조를 새 구조로 읽지 않는다', () => {
    const legacy = ['question_id', 'question_order', 'question_text', 'axis', 'reverse'];
    const message = errorsOf(() => convertQuestions([legacy, ['q1', 1, '가', 'attack', false]]));
    expect(message).toContain("'axis'");
    expect(message).toContain("'reverse'");
    expect(message).toContain("'attack'");
  });
});

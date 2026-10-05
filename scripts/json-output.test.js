import { describe, expect, it } from 'vitest';
import { sameSheetData } from './json-output.js';

const original = {
  meta: {
    format_version: 3,
    source: { spreadsheet_id: 'sheet', sheet: 'Wilds_Question' },
    exported_at: '2026-10-05T00:00:00Z',
    converted_at: '2026-10-05T00:01:00Z',
  },
  questions: [{ question_id: 'q1', question_order: 1, question_text: '질문', attack: 80 }],
};

describe('시트 데이터 변경 판단', () => {
  it('시각과 객체 필드 순서만 바뀌면 같은 데이터로 판단한다', () => {
    const next = structuredClone(original);
    next.meta.exported_at = '2026-10-06T00:00:00Z';
    next.meta.converted_at = '2026-10-06T00:01:00Z';
    next.questions[0] = { attack: 80, question_text: '질문', question_order: 1, question_id: 'q1' };
    expect(sameSheetData(original, next)).toBe(true);
  });

  it.each(['question_text', 'attack', 'question_order'])('%s 변경을 반영한다', (field) => {
    const next = structuredClone(original);
    next.questions[0][field] = field === 'question_text' ? '다른 질문' : 2;
    expect(sameSheetData(original, next)).toBe(false);
  });

  it('문항 삭제와 형식 버전·원본 변경을 반영한다', () => {
    expect(sameSheetData(original, { ...original, questions: [] })).toBe(false);
    expect(sameSheetData(original, { ...original, meta: { ...original.meta, format_version: 4 } })).toBe(false);
    expect(sameSheetData(original, { ...original, meta: { ...original.meta, source: { sheet: '다른 탭' } } })).toBe(false);
  });

  it('무기 기준값 변경을 반영한다', () => {
    const weapon = { meta: original.meta, weapons: [{ weapon_id: 'lance', counter: 50 }] };
    expect(sameSheetData(weapon, { ...weapon, weapons: [{ weapon_id: 'lance', counter: 60 }] })).toBe(false);
  });
});

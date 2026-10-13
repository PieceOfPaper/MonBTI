// 원본 시트의 행 배열을 사이트용 JSON 구조로 검증·변환한다.
// 규칙은 docs/data-schema.md의 '변환 규칙'을 따른다.

// 검사마다 축 열이 다르다. 기존 와일즈는 freedom, 와일즈 V2는 constraint를 쓴다(작품 축 모델, src/core/axis-models.js).
// axisFields를 주지 않으면 기존 와일즈의 축 열이다.
export const AXIS_FIELDS = ['attack', 'freedom', 'complexity', 'management', 'counter'];
export const V2_AXIS_FIELDS = ['attack', 'constraint', 'complexity', 'management', 'counter'];
// 어느 검사에서든 축으로 쓰는 열. 그 검사가 쓰지 않는 축 열이 남아 있으면 옮기다 만 데이터로 보고 오류를 낸다.
const KNOWN_AXIS_FIELDS = [...new Set([...AXIS_FIELDS, ...V2_AXIS_FIELDS])];
const weaponColumns = (axisFields) => ['weapon_id', 'weapon_name', ...axisFields];
const questionColumns = (axisFields) => ['question_id', 'question_order', 'question_text', ...axisFields];
export const LEGACY_columns = ['axis', 'reverse'];

// 다축 가중치 구조(complexity 필드). 선택지 행(1)·단일 축(2)·resource(3)·combo(4) 구조와 구분한다.
export const DATA_FORMAT_VERSION = 5;

export class SheetConversionError extends Error {
  constructor(sheet, errors) {
    super(`${sheet}: ${errors.length}개의 변환 오류\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    this.name = 'SheetConversionError';
    this.sheet = sheet;
    this.errors = errors;
  }
}

const isBlank = (value) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

function readHeader(sheet, rows, expected, errors, axisFields) {
  const header = (rows[0] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : cell));
  const index = {};
  header.forEach((name, column) => {
    if (isBlank(name)) return;
    if (name in index) errors.push(`열 이름 '${name}'이 중복되었습니다.`);
    index[name] = column;
  });
  for (const name of expected) {
    if (!(name in index)) errors.push(`필수 열 '${name}'이 없습니다.`);
  }
  for (const name of KNOWN_AXIS_FIELDS) {
    if (name in index && !axisFields.includes(name)) errors.push(`이 검사에서 쓰지 않는 축 열 '${name}'이 있습니다. 제거해야 합니다.`);
  }
  if (errors.length) throw new SheetConversionError(sheet, errors);
  return index;
}

function cellsOf(row, index, names) {
  return Object.fromEntries(names.map((name) => [name, row[index[name]] ?? null]));
}

function readText(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function readNumber(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function convertWeapons(rows, sheet = 'Wilds_Weapon', axisFields = AXIS_FIELDS) {
  const errors = [];
  const columns = weaponColumns(axisFields);
  const index = readHeader(sheet, rows, columns, errors, axisFields);
  const weapons = [];
  const seen = new Set();

  rows.slice(1).forEach((row, offset) => {
    const line = `${offset + 2}행`;
    const cells = cellsOf(row ?? [], index, columns);
    if (Object.values(cells).every(isBlank)) return;

    const weapon_id = readText(cells.weapon_id);
    const weapon_name = readText(cells.weapon_name);
    if (!weapon_id) errors.push(`${line}: weapon_id가 비어 있습니다.`);
    else if (seen.has(weapon_id)) errors.push(`${line}: weapon_id '${weapon_id}'가 중복되었습니다.`);
    else seen.add(weapon_id);
    if (!weapon_name) errors.push(`${line}: weapon_name이 비어 있습니다.`);

    const weapon = { weapon_id, weapon_name };
    for (const axis of axisFields) {
      if (isBlank(cells[axis])) {
        errors.push(`${line}: ${axis} 값이 비어 있습니다.`);
        continue;
      }
      const value = readNumber(cells[axis], 0, 100);
      if (value === null) errors.push(`${line}: ${axis} 값 '${cells[axis]}'은 0~100의 숫자가 아닙니다.`);
      weapon[axis] = value;
    }
    weapons.push(weapon);
  });

  if (errors.length) throw new SheetConversionError(sheet, errors);
  return weapons;
}

export function convertQuestions(rows, sheet = 'Wilds_Question', axisFields = AXIS_FIELDS) {
  const errors = [];
  const columns = questionColumns(axisFields);
  const header = (rows[0] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : cell));
  for (const legacy of LEGACY_columns) {
    if (header.includes(legacy)) errors.push(`이전 구조의 '${legacy}' 열이 있습니다. 다축 가중치 구조로 바꿔야 합니다.`);
  }
  const index = readHeader(sheet, rows, columns, errors, axisFields);
  const questions = [];
  const seenIds = new Set();
  const seenOrders = new Set();

  rows.slice(1).forEach((row, offset) => {
    const line = `${offset + 2}행`;
    const cells = cellsOf(row ?? [], index, columns);
    const baseBlank = ['question_id', 'question_order', 'question_text'].every((name) => isBlank(cells[name]));
    const weightsEmpty = axisFields.every((axis) => isBlank(cells[axis]) || cells[axis] === 0);
    if (baseBlank && weightsEmpty) return;
    if (baseBlank) {
      errors.push(`${line}: question_id·question_order·question_text 없이 가중치만 있습니다.`);
      return;
    }

    const question_id = readText(cells.question_id);
    const question_text = typeof cells.question_text === 'string' ? cells.question_text.trim() : null;
    const order = cells.question_order;
    if (!question_id) errors.push(`${line}: question_id가 비어 있습니다.`);
    else if (seenIds.has(question_id)) errors.push(`${line}: question_id '${question_id}'가 중복되었습니다.`);
    else seenIds.add(question_id);

    let question_order = null;
    if (typeof order !== 'number' || !Number.isInteger(order) || order < 1) {
      errors.push(`${line}: question_order '${order ?? ''}'는 양의 정수가 아닙니다.`);
    } else if (seenOrders.has(order)) {
      errors.push(`${line}: question_order ${order}가 중복되었습니다.`);
    } else {
      seenOrders.add(order);
      question_order = order;
    }
    if (!question_text) errors.push(`${line}: question_text가 비어 있습니다.`);

    const question = { question_id, question_order, question_text };
    for (const axis of axisFields) {
      if (isBlank(cells[axis])) {
        question[axis] = 0;
        continue;
      }
      const value = readNumber(cells[axis], -100, 100);
      if (value === null) errors.push(`${line}: ${axis} 가중치 '${cells[axis]}'는 -100~100의 숫자가 아닙니다.`);
      // -0은 JSON에서 0이 되므로 미리 정리한다.
      question[axis] = value === 0 ? 0 : value;
    }
    if (axisFields.every((axis) => question[axis] === 0)) {
      errors.push(`${line}: 0이 아닌 가중치가 하나 이상 필요합니다.`);
    }
    questions.push(question);
  });

  if (errors.length) throw new SheetConversionError(sheet, errors);
  return questions.sort((a, b) => a.question_order - b.question_order);
}

export function buildMeta({ spreadsheetId, sheet, exportedAt, convertedAt }) {
  return {
    format_version: DATA_FORMAT_VERSION,
    source: { spreadsheet_id: spreadsheetId, sheet },
    exported_at: exportedAt,
    converted_at: convertedAt,
  };
}

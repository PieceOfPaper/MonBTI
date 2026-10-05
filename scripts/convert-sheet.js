// MonBTI_테이블 XLSX를 읽어 작품별 사이트용 JSON을 생성한다.
//   npm run data:convert                    원본 시트를 XLSX로 내려받아 변환
//   npm run data:convert -- --input a.xlsx  내보낸 XLSX 파일을 변환
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import readExcelFile from 'read-excel-file/node';
import { SheetConversionError, buildMeta, convertQuestions, convertWeapons } from './sheet-converter.js';

const SPREADSHEET_ID = '124oQusXZQ6_F9-UYUVAzG3TD7u50oBjKdBIEbrT7Ras';
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GAMES = [
  { id: 'wilds', weaponSheet: 'Wilds_Weapon', questionSheet: 'Wilds_Question' },
];

async function loadWorkbook(input) {
  if (input) {
    const path = resolve(input);
    return { buffer: await readFile(path), exportedAt: (await stat(path)).mtime.toISOString() };
  }
  const response = await fetch(EXPORT_URL);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.includes('spreadsheetml')) {
    throw new Error(`시트를 XLSX로 내려받지 못했습니다 (HTTP ${response.status}, ${type}). 시트에서 직접 내보낸 뒤 --input으로 지정하세요.`);
  }
  return { buffer: Buffer.from(await response.arrayBuffer()), exportedAt: new Date().toISOString() };
}

function sheetRows(sheets, name) {
  const found = sheets.find(({ sheet }) => sheet === name);
  if (!found) throw new SheetConversionError(name, [`'${name}' 탭을 찾을 수 없습니다.`]);
  return found.data;
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`생성: ${path.replace(`${ROOT}/`, '')}`);
}

async function main() {
  const { values } = parseArgs({ options: { input: { type: 'string' } } });
  const { buffer, exportedAt } = await loadWorkbook(values.input);
  const sheets = await readExcelFile(buffer);
  const convertedAt = new Date().toISOString();

  // 모든 작품을 먼저 검증한 뒤 기록해 일부만 갱신되는 상황을 막는다.
  const outputs = GAMES.map((game) => {
    const weapons = convertWeapons(sheetRows(sheets, game.weaponSheet), game.weaponSheet);
    const questions = convertQuestions(sheetRows(sheets, game.questionSheet), game.questionSheet);
    const meta = (sheet) => buildMeta({ spreadsheetId: SPREADSHEET_ID, sheet, exportedAt, convertedAt });
    return { game, weapons, questions, meta };
  });

  for (const { game, weapons, questions, meta } of outputs) {
    const dir = resolve(ROOT, 'src/data', game.id);
    await writeJson(resolve(dir, 'weapons.json'), { meta: meta(game.weaponSheet), weapons });
    await writeJson(resolve(dir, 'questions.json'), { meta: meta(game.questionSheet), questions });
    console.log(`${game.id}: 무기 ${weapons.length}개, 질문 ${questions.length}개`);
  }
}

main().catch((error) => {
  console.error(error instanceof SheetConversionError ? error.message : error);
  process.exitCode = 1;
});

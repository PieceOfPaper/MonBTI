// MonBTI_테이블 XLSX를 읽어 작품별 사이트용 JSON을 생성한다.
//   npm run data:convert                    원본 시트를 XLSX로 내려받아 변환
//   npm run data:convert -- --input a.xlsx  내보낸 XLSX 파일을 변환
//   npm run data:convert -- --sheet Wilds_V2 한 검사의 탭만 검증·변환(검사 이름은 원본 탭 접두사: Wilds, Wilds_V2)
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import readExcelFile from 'read-excel-file/node';
import { SheetConversionError, buildMeta, convertQuestions, convertWeapons } from './sheet-converter.js';
import { sameSheetData } from './json-output.js';

const SPREADSHEET_ID = '124oQusXZQ6_F9-UYUVAzG3TD7u50oBjKdBIEbrT7Ras';
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// sheet는 데이터 갱신에서 검사를 가리키는 내부 이름이자 원본 탭 접두사(<sheet>_Weapon·<sheet>_Question)다.
// id는 사이트 작품 ID이자 src/data/<id>/ 경로이며 공유 링크·저장소 키에 쓰이므로 바꾸지 않는다.
export const GAMES = [
  { sheet: 'Wilds', id: 'wilds' },
  { sheet: 'Wilds_V2', id: 'wilds_v2' },
].map((game) => ({ ...game, weaponSheet: `${game.sheet}_Weapon`, questionSheet: `${game.sheet}_Question` }));

// --sheet가 없으면 모든 검사, 있으면 그 검사 하나. 알 수 없는 이름은 가능한 이름과 함께 오류를 낸다.
export function selectGames(sheet, games = GAMES) {
  if (sheet === undefined) return games;
  const found = games.filter((game) => game.sheet === sheet);
  if (!found.length) throw new Error(`알 수 없는 검사 이름입니다: ${sheet} (가능: ${games.map((game) => game.sheet).join(', ')})`);
  return found;
}

async function loadWorkbook(input) {
  if (input) {
    const path = resolve(input);
    return { buffer: await readFile(path), exportedAt: (await stat(path)).mtime.toISOString() };
  }
  const response = await fetch(EXPORT_URL, { signal: AbortSignal.timeout(60_000) });
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

async function writeJson(path, data, ifChanged) {
  if (ifChanged) {
    let current;
    try {
      current = JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (current && sameSheetData(current, data)) {
      console.log(`변경 없음: ${path.replace(`${ROOT}/`, '')}`);
      return;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`생성: ${path.replace(`${ROOT}/`, '')}`);
}

async function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string' },
    'if-changed': { type: 'boolean', default: false },
    sheet: { type: 'string' },
  } });
  let games;
  try {
    games = selectGames(values.sheet);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  const { buffer, exportedAt } = await loadWorkbook(values.input);
  const sheets = await readExcelFile(buffer);
  const convertedAt = new Date().toISOString();

  // 선택한 작품을 모두 먼저 검증한 뒤 기록해 일부만 갱신되는 상황을 막는다.
  const outputs = games.map((game) => {
    const weapons = convertWeapons(sheetRows(sheets, game.weaponSheet), game.weaponSheet);
    const questions = convertQuestions(sheetRows(sheets, game.questionSheet), game.questionSheet);
    const meta = (sheet) => buildMeta({ spreadsheetId: SPREADSHEET_ID, sheet, exportedAt, convertedAt });
    return { game, weapons, questions, meta };
  });

  for (const { game, weapons, questions, meta } of outputs) {
    const dir = resolve(ROOT, 'src/data', game.id);
    await writeJson(resolve(dir, 'weapons.json'), { meta: meta(game.weaponSheet), weapons }, values['if-changed']);
    await writeJson(resolve(dir, 'questions.json'), { meta: meta(game.questionSheet), questions }, values['if-changed']);
    console.log(`${game.id}: 무기 ${weapons.length}개, 질문 ${questions.length}개`);
  }
}

// 테스트에서 GAMES·selectGames를 불러올 때는 실행하지 않는다.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(error instanceof SheetConversionError ? error.message : error);
  process.exitCode = 1;
});

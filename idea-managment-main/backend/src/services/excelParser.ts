import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as XLSX from 'xlsx';

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_COLUMNS = 100;

function parse(buffer: Buffer): Record<string, unknown>[] {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (!signature.startsWith('504b0304') && signature !== 'd0cf11e0a1b11ae1') throw new Error('Chỉ chấp nhận tệp XLS/XLSX hợp lệ');
  const workbook = XLSX.read(buffer, { type: 'buffer', sheets: 0, sheetRows: MAX_IMPORT_ROWS + 2,
    cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false });
  if (!workbook.SheetNames.length || workbook.SheetNames.length > 10) throw new Error('Tệp phải có từ 1 đến 10 sheet');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r > MAX_IMPORT_ROWS || range.e.c >= MAX_IMPORT_COLUMNS) throw new Error('Tệp vượt giới hạn 5000 dòng dữ liệu hoặc 100 cột');
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

if (!isMainThread) {
  try { parentPort!.postMessage({ rows: parse(Buffer.from(workerData)) }); }
  catch (error) { parentPort!.postMessage({ error: error instanceof Error ? error.message : 'Tệp Excel không hợp lệ' }); }
}

/** Bound parser CPU time and V8 heap; parsing never blocks the HTTP event loop. */
export function parseExcel(buffer: Buffer): Promise<Record<string, unknown>[]> {
  if (buffer.length > 10 * 1024 * 1024) return Promise.reject(new Error('Tệp vượt giới hạn 10MB'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: buffer, resourceLimits: { maxOldGenerationSizeMb: 128 },
      execArgv: __filename.endsWith('.ts') ? ['-r', 'ts-node/register/transpile-only'] : [] });
    const timer = setTimeout(() => { reject(new Error('Hết thời gian xử lý tệp Excel')); void worker.terminate(); }, 10000);
    worker.once('message', message => {
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error)); else resolve(message.rows);
      void worker.terminate();
    });
    worker.once('error', () => { clearTimeout(timer); reject(new Error('Không thể xử lý tệp Excel trong giới hạn tài nguyên')); });
    worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new Error('Đã dừng xử lý tệp Excel')); });
  });
}

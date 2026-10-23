// 展開した CSV が47ファイルあり、列の並びが想定どおりかを確かめる: node scripts/check-data.mjs <フォルダ>
import fs from 'node:fs';
import path from 'node:path';
import { HEADER } from './lib/load.mjs';

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /\.csv$/i.test(f));
if (files.length !== 47) { console.error(`CSV が47ファイルありません（${files.length}）`); process.exit(1); }
for (const f of files) {
  const fd = fs.openSync(path.join(dir, f), 'r');
  const buf = Buffer.alloc(4096);
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  const first = new TextDecoder('shift_jis').decode(buf).split(/\r?\n/)[0];
  if (first !== HEADER.map((h) => `"${h}"`).join(',')) { console.error(`列の並びが想定と違います: ${f}\n${first}`); process.exit(1); }
}
console.log(`CSV 47ファイル・列の並び OK（${dir}）`);

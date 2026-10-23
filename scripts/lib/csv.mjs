import fs from 'node:fs';

// RFC4180 の CSV を1行ずつ読む（引用符の中の改行・"" のエスケープに対応）。
// encoding は TextDecoder の名前（'utf-8' / 'shift_jis'）。onRow には列の配列が渡る。
export async function readCSV(file, encoding, onRow) {
  const dec = new TextDecoder(encoding);
  let row = [];
  let field = '';
  let inQuote = false;
  let pendingQuote = false;
  let first = true;

  const feed = (s) => {
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (c === '"') { field += '"'; continue; }
        inQuote = false;
      }
      if (inQuote) {
        if (c === '"') { pendingQuote = true; continue; }
        field += c;
        continue;
      }
      if (c === '"') { inQuote = true; continue; }
      if (c === ',') { row.push(field); field = ''; continue; }
      if (c === '\r') continue;
      if (c === '\n') { row.push(field); onRow(row); row = []; field = ''; continue; }
      field += c;
    }
  };

  for await (const chunk of fs.createReadStream(file, { highWaterMark: 1 << 20 })) {
    let s = dec.decode(chunk, { stream: true });
    if (first) {
      if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
      first = false;
    }
    feed(s);
  }
  feed(dec.decode());
  if (field.length || row.length) { row.push(field); onRow(row); }
}

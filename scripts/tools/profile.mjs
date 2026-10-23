// データの中身を調べる（開発用）: node scripts/tools/profile.mjs data/raw/torihiki
import fs from 'node:fs';
import path from 'node:path';
import { readCSV } from '../lib/csv.mjs';

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort();
const cnt = (m, k) => m.set(k, (m.get(k) || 0) + 1);
const kindCat = new Map(), year = new Map(), chiiki = new Map(), menseki = new Map(), chikunen = new Map(), eki = new Map(), madori = new Map(), kozo = new Map(), yoto = new Map(), toshi = new Map(), jijo = new Map(), kaiso = new Map(), riyo = new Map(), shape = new Map(), tsubo = new Map(), nobeyuka = new Map();
const cities = new Set(), districts = new Set(), stations = new Set();
let header, rows = 0, bad = 0;
for (const f of files) {
  let first = true;
  await readCSV(path.join(dir, f), 'shift_jis', (r) => {
    if (first) { first = false; header ??= r; if (r.join() !== header.join()) throw new Error(`header mismatch ${f}`); return; }
    if (r.length !== header.length) { bad++; return; }
    rows++;
    const [kind, cat, region, code, pref, city, dist, st, stMin, price, tsuboP, mad, area, m2p, shp, maguchi, floor, built, struct, use, purpose, , , , plan, , , period, reno, circ] = r;
    cnt(kindCat, `${kind}|${cat}`);
    cnt(year, `${period.slice(0, 4)}|${cat}`);
    cnt(chiiki, `${kind}|${region}`);
    if (!/^\d+(\.\d+)?$/.test(area)) cnt(menseki, area);
    if (!/^\d{4}年$/.test(built)) cnt(chikunen, built);
    if (!/^\d+$/.test(stMin)) cnt(eki, stMin);
    cnt(madori, mad);
    cnt(kozo, struct);
    for (const u of use.split('、')) cnt(yoto, `${kind}|${u}`);
    cnt(toshi, plan);
    for (const c of circ.split('、')) cnt(jijo, `${cat}|${c}`);
    cnt(kaiso, `${kind}|${reno}`);
    cnt(riyo, purpose);
    cnt(shape, shp);
    if (!/^\d+$/.test(tsuboP)) cnt(tsubo, `${kind}|${cat}|${tsuboP}`);
    if (!/^\d+(\.\d+)?$/.test(floor)) cnt(nobeyuka, `${kind}|${floor}`);
    cities.add(code); districts.add(`${code}|${dist}`); stations.add(`${pref}|${st}`);
  });
  process.stderr.write(`${f} ${rows}\n`);
}
const top = (m, n = 60) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}=${v}`).join('\n  ');
console.log('header', header.join(','));
console.log('rows', rows, 'bad', bad, 'cities', cities.size, 'districts', districts.size, 'stations', stations.size);
for (const [name, m, n] of [['kind|cat', kindCat], ['year|cat', year, 100], ['kind|region', chiiki], ['menseki(non-num)', menseki], ['built(non-YYYY)', chikunen], ['station min(non-num)', eki], ['madori', madori, 40], ['struct', kozo, 30], ['use', yoto, 40], ['plan', toshi, 30], ['circ', jijo, 40], ['reno', kaiso], ['purpose', riyo], ['shape', shape], ['tsubo(non-num)', tsubo], ['nobeyuka(non-num)', nobeyuka]]) {
  console.log(`== ${name} (${m.size})\n  ${top(m, n)}`);
}

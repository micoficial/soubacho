// 地区・駅ごとの件数分布と、取引価格／成約価格の差を調べる（開発用）
import fs from 'node:fs';
import path from 'node:path';
import { readCSV } from '../lib/csv.mjs';

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort();
const q = (p) => { const m = /^(\d{4})年第(\d)四半期$/.exec(p); return m ? +m[1] * 4 + (+m[2] - 1) : null; };
const LAST = 2026 * 4 + 0; // 2026Q1
const dist10 = new Map(), dist2 = new Map(), st10 = new Map(), st2 = new Map(), city2 = new Map();
const cmp = new Map(); // city|cat -> [m2 prices] for condos 2024Q2-2026Q1
const add = (m, k) => m.set(k, (m.get(k) || 0) + 1);
let condoM2Empty = 0, condoM2Has = 0, landTsuboHas = 0, landTsuboEmpty = 0;
for (const f of files) {
  let first = true;
  await readCSV(path.join(dir, f), 'shift_jis', (r) => {
    if (first) { first = false; return; }
    const [kind, cat, region, code, pref, city, dist, st, stMin, price, tsuboP, mad, area, m2p, , , , built, , use, , , , , , , , period, , circ] = r;
    const t = q(period);
    if (kind === '農地' || kind === '林地') return;
    if (circ) return;
    const recent10 = t > LAST - 40, recent2 = t > LAST - 8;
    const key = `${code}|${dist}`;
    if (recent10) { add(dist10, key); if (st) add(st10, `${pref}|${st}`); }
    if (recent2) { add(dist2, key); if (st) add(st2, `${pref}|${st}`); add(city2, `${code}|${city}`); }
    if (kind === '中古マンション等') { if (m2p) condoM2Has++; else condoM2Empty++; }
    if (kind === '宅地(土地)') { if (tsuboP) landTsuboHas++; else landTsuboEmpty++; }
    if (kind === '中古マンション等' && recent2 && /^\d+$/.test(area) && +area >= 20) {
      const k = `${code}|${city}|${cat}`;
      (cmp.get(k) || cmp.set(k, []).get(k)).push(+price / +area);
    }
  });
}
const hist = (m, cuts) => cuts.map((c) => `>=${c}:${[...m.values()].filter((v) => v >= c).length}`).join(' ');
const cuts = [1, 5, 10, 20, 30, 50, 100, 200];
console.log('districts 10y', dist10.size, hist(dist10, cuts));
console.log('districts 2y', dist2.size, hist(dist2, cuts));
console.log('stations 10y', st10.size, hist(st10, cuts));
console.log('stations 2y', st2.size, hist(st2, cuts));
console.log('cities 2y', city2.size, hist(city2, cuts));
console.log('condo m2 has/empty', condoM2Has, condoM2Empty, 'land tsubo has/empty', landTsuboHas, landTsuboEmpty);
const med = (a) => { a.sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const cities = ['13104|新宿区', '13113|渋谷区', '13112|世田谷区', '14133|川崎市中原区', '27127|大阪市北区', '40133|福岡市中央区', '40134|福岡市南区', '01101|札幌市中央区', '23101|名古屋市千種区', '13201|八王子市'];
for (const c of cities) {
  const a = cmp.get(`${c}|不動産取引価格情報`) || [], b = cmp.get(`${c}|成約価格情報`) || [];
  console.log(c, '取引', a.length, Math.round(med(a) || 0), '成約', b.length, Math.round(med(b) || 0));
}

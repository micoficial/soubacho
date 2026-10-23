// 不動産情報ライブラリの CSV（都道府県ごと・Shift_JIS）を読み、列ごとの配列にする。
// 列の並びが変わっていたら止まる（黙って変な数字を出さない）。
import fs from 'node:fs';
import path from 'node:path';
import { readCSV } from './csv.mjs';

export const HEADER = ['種類', '価格情報区分', '地域', '市区町村コード', '都道府県名', '市区町村名', '地区名', '最寄駅：名称', '最寄駅：距離（分）', '取引価格（総額）', '坪単価', '間取り', '面積（㎡）', '取引価格（㎡単価）', '土地の形状', '間口', '延床面積（㎡）', '建築年', '建物の構造', '用途', '今後の利用目的', '前面道路：方位', '前面道路：種類', '前面道路：幅員（ｍ）', '都市計画', '建ぺい率（％）', '容積率（％）', '取引時期', '改装', '取引の事情等'];

// 種類 → T
export const TYPE = { '宅地(土地)': 1, '宅地(土地と建物)': 2, '中古マンション等': 3, '農地': 4, '林地': 5 };
// 価格情報区分 → S
export const SRC = { '不動産取引価格情報': 0, '成約価格情報': 1 };
// 地域 → R
export const REGION = { '': 0, '住宅地': 1, '商業地': 2, '工業地': 3, '宅地見込地': 4 };
export const WALK_UNKNOWN = 255;
const WALK_TEXT = { '30分～60分': 30, '1H～1H30': 60, '1H30～2H': 90, '2H～': 120 };

export const quarterIndex = (y, q) => y * 4 + (q - 1);
export const yearOfQ = (qi) => Math.floor(qi / 4);
export const quarterOfQ = (qi) => (qi % 4) + 1;

export function madoriCode(s) {
  if (!s) return 0;
  const t = s.normalize('NFKC').toUpperCase();
  const m = /^(\d+)([A-Z+]*)$/.exec(t);
  if (!m) return 8;
  const n = +m[1];
  const rest = m[2].replace(/\+S$/, '');
  if (n === 1 && (rest === 'R' || rest === 'K')) return 1;
  if (n === 1) return 2;
  if (n === 2) return rest.includes('L') ? 4 : 3;
  if (n === 3) return rest.includes('L') ? 6 : 5;
  if (n >= 4) return 7;
  return 8;
}

const num = (s) => (/^\d+(\.\d+)?$/.test(s) ? +s : NaN);

class Columns {
  constructor(cap) {
    this.cap = 0;
    this.n = 0;
    this.spec = { T: Uint8Array, S: Uint8Array, R: Uint8Array, C: Uint16Array, D: Int32Array, E: Int32Array, W: Uint8Array, P: Float64Array, A: Float32Array, F: Float32Array, B: Int16Array, M: Uint8Array, U: Uint8Array, Q: Uint16Array };
    this.grow(cap);
  }

  grow(cap) {
    for (const [k, Type] of Object.entries(this.spec)) {
      const a = new Type(cap);
      if (this[k]) a.set(this[k].subarray(0, this.n));
      this[k] = a;
    }
    this.cap = cap;
  }

  push() {
    if (this.n >= this.cap) this.grow(Math.ceil(this.cap * 1.5));
    return this.n++;
  }

  trim() {
    for (const k of Object.keys(this.spec)) this[k] = this[k].slice(0, this.n);
    this.cap = this.n;
  }
}

export async function loadAll(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.csv$/i.test(f)).sort();
  if (files.length !== 47) throw new Error(`CSV が47ファイルありません（${files.length}）: ${dir}`);
  const totalBytes = files.reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  const col = new Columns(Math.ceil(totalBytes / 180));

  const cities = []; // {idx, code, name, pref}
  const cityByCode = new Map();
  const districts = []; // {idx, city, name}
  const districtByKey = new Map();
  const stations = []; // {idx, name, prefCount: Map}
  const stationByName = new Map();
  const excluded = new Map();
  const exclude = (why) => excluded.set(why, (excluded.get(why) || 0) + 1);
  let rows = 0;
  let period = null;

  for (const f of files) {
    const m = /_(\d{4})(\d)_(\d{4})(\d)\.csv$/i.exec(f);
    if (m) period = { from: quarterIndex(+m[1], +m[2]), to: quarterIndex(+m[3], +m[4]) };
    let first = true;
    await readCSV(path.join(dir, f), 'shift_jis', (r) => {
      if (first) {
        first = false;
        if (r.join('\t') !== HEADER.join('\t')) throw new Error(`列の並びが想定と違います: ${f}\n${r.join(',')}`);
        return;
      }
      if (r.length !== HEADER.length) { exclude('列数が合わない行'); return; }
      rows++;
      const [kind, cat, region, code, , cityName, dist, st, walk, price, , madori, area, , , , floor, built, , use, , , , , , , , when, , circ] = r;
      if (circ) { exclude(`取引の事情等：${circ.split('、')[0]}`); return; }
      const T = TYPE[kind];
      const S = SRC[cat];
      const R = REGION[region];
      const qm = /^(\d{4})年第(\d)四半期$/.exec(when);
      if (T == null || S == null || R == null || !qm || !/^\d{5}$/.test(code)) { exclude('読めない値がある行'); return; }
      if (!/^\d+$/.test(price) || +price <= 0) { exclude('価格がない行'); return; }

      let city = cityByCode.get(code);
      if (!city) {
        city = { idx: cities.length, code, name: cityName, pref: +code.slice(0, 2) };
        cities.push(city);
        cityByCode.set(code, city);
      }
      let D = -1;
      if (dist && dist !== '（大字なし）') {
        const key = `${city.idx}\t${dist}`;
        let d = districtByKey.get(key);
        if (!d) {
          d = { idx: districts.length, city: city.idx, name: dist };
          districts.push(d);
          districtByKey.set(key, d);
        }
        D = d.idx;
      }
      let E = -1;
      if (st) {
        let s = stationByName.get(st);
        if (!s) {
          s = { idx: stations.length, name: st, prefCount: new Map() };
          stations.push(s);
          stationByName.set(st, s);
        }
        s.prefCount.set(city.pref, (s.prefCount.get(city.pref) || 0) + 1);
        E = s.idx;
      }

      const i = col.push();
      col.T[i] = T;
      col.S[i] = S;
      col.R[i] = R;
      col.C[i] = city.idx;
      col.D[i] = D;
      col.E[i] = E;
      col.W[i] = /^\d+$/.test(walk) ? Math.min(+walk, 29) : (WALK_TEXT[walk] ?? WALK_UNKNOWN);
      col.P[i] = +price;
      col.A[i] = num(area);
      col.F[i] = num(floor);
      col.B[i] = built === '戦前' ? 1945 : (/^(\d{4})年$/.test(built) ? +built.slice(0, 4) : 0);
      col.M[i] = T === 3 ? madoriCode(madori) : 0;
      col.U[i] = use === '' ? 0 : (use === '住宅' ? 1 : 2);
      col.Q[i] = quarterIndex(+qm[1], +qm[2]);
    });
  }
  col.trim();

  for (const s of stations) {
    // 駅が一番多く出てくる都道府県を、その駅の都道府県とする（県境の駅は隣の県の取引にも出てくる）
    s.pref = [...s.prefCount].sort((a, b) => b[1] - a[1])[0][0];
  }
  let lastQ = 0;
  let firstQ = Infinity;
  for (let i = 0; i < col.n; i++) {
    if (col.Q[i] > lastQ) lastQ = col.Q[i];
    if (col.Q[i] < firstQ) firstQ = col.Q[i];
  }
  return { col, cities, districts, stations, rows, excluded: Object.fromEntries([...excluded].sort((a, b) => b[1] - a[1])), lastQ, firstQ, period, files };
}

// 地域ごとの取引の一覧（行番号の配列）をまとめて作る
export function groupBy(n, keyOf, size) {
  const count = new Uint32Array(size + 1);
  for (let i = 0; i < n; i++) {
    const k = keyOf(i);
    if (k >= 0) count[k + 1]++;
  }
  for (let k = 1; k <= size; k++) count[k] += count[k - 1];
  const out = new Uint32Array(count[size]);
  const pos = count.slice(0, size);
  for (let i = 0; i < n; i++) {
    const k = keyOf(i);
    if (k >= 0) out[pos[k]++] = i;
  }
  return (k) => out.subarray(count[k], count[k + 1]);
}

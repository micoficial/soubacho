// 集計：種類ごとの条件、期間、中央値と四分位
import { TSUBO, WINDOWS, MIN_N, PREFER_N, CHANGE_MIN_N, STRATUM_MIN_N } from './meta.mjs';
import { yearOfQ } from './load.mjs';

let C = null;
let LAST = 0;
export function initStats(col, lastQ) {
  C = col;
  LAST = lastQ;
}
export const lastQ = () => LAST;

// 集計に入れる取引の条件（取引の事情等がある取引は読み込みの時点で外してある）
// A（面積）が「2,000㎡以上」などの丸めた値は NaN なので、比べると false になって外れる
export const KINDS = {
  // 土地のみの取引のうち住宅地。30〜1,000㎡（大きな造成用地などを外す）
  tochi: (i) => C.T[i] === 1 && C.R[i] === 1 && C.A[i] >= 30 && C.A[i] <= 1000,
  // 土地のみの取引のうち商業地
  shogyo: (i) => C.T[i] === 1 && C.R[i] === 2 && C.A[i] >= 30 && C.A[i] <= 1000,
  // 中古マンション等のうち住宅（用途が住宅か空欄）、専有30〜200㎡
  mansion: (i) => C.T[i] === 3 && (C.S[i] === 1 || C.U[i] <= 1) && C.A[i] >= 30 && C.A[i] <= 200,
  // 間取り別の表に使う（30㎡未満のワンルームなども入れる）
  mansionAll: (i) => C.T[i] === 3 && (C.S[i] === 1 || C.U[i] <= 1) && C.A[i] >= 15 && C.A[i] <= 200,
  // 土地と建物の取引のうち、住宅地で用途が住宅だけのもの（成約価格情報は戸建てだけなのでそのまま）
  kodate: (i) => C.T[i] === 2 && (C.S[i] === 1 || (C.R[i] === 1 && C.U[i] === 1)) && C.A[i] >= 30 && C.A[i] <= 1000 && !(C.F[i] > 500) && !(C.F[i] < 30),
  nochi: (i) => C.T[i] === 4 && C.A[i] >= 100,
};
// 種類ごとの「主な値」：土地は坪単価、マンションは㎡単価、戸建ては総額、農地は10aあたり
const MAIN = {
  tochi: (i) => (C.P[i] / C.A[i]) * TSUBO,
  shogyo: (i) => (C.P[i] / C.A[i]) * TSUBO,
  mansion: (i) => C.P[i] / C.A[i],
  mansionAll: (i) => C.P[i] / C.A[i],
  kodate: (i) => C.P[i],
  nochi: (i) => (C.P[i] / C.A[i]) * 1000,
};

export function quantile(sorted, p) {
  const n = sorted.length;
  if (!n) return null;
  const pos = (n - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const asc = (a, b) => a - b;
function summary(vals, withQ = false) {
  if (!vals.length) return null;
  vals.sort(asc);
  return withQ ? { med: quantile(vals, 0.5), p25: quantile(vals, 0.25), p75: quantile(vals, 0.75) } : { med: quantile(vals, 0.5) };
}

// indices の中から条件に合う取引を groupOf(i) ごとに集計する（groupOf が -1 なら入れない）
// opt: { from, to（四半期の番号）, src（0=取引価格情報, 1=成約価格情報, 省略=両方）, extra(i) }
export function aggregate(indices, kind, opt = {}, groupOf = null, nGroups = 1) {
  const ok = KINDS[kind];
  const main = MAIN[kind];
  const from = opt.from ?? 0;
  const to = opt.to ?? LAST;
  const src = opt.src ?? -1;
  const extra = opt.extra || null;
  const g = Array.from({ length: nGroups }, () => ({ v: [], p: [], a: [], f: [], age: [] }));
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const q = C.Q[i];
    if (q < from || q > to) continue;
    if (src >= 0 && C.S[i] !== src) continue;
    if (!ok(i)) continue;
    if (extra && !extra(i)) continue;
    const gi = groupOf ? groupOf(i) : 0;
    if (gi < 0) continue;
    const b = g[gi];
    b.v.push(main(i));
    b.p.push(C.P[i]);
    b.a.push(C.A[i]);
    if (C.F[i] > 0) b.f.push(C.F[i]);
    if (C.B[i] > 0) b.age.push(Math.max(0, yearOf(q) - C.B[i]));
  }
  return g.map((b) => (b.v.length ? {
    n: b.v.length, v: summary(b.v, true), p: summary(b.p), a: summary(b.a), f: summary(b.f), age: summary(b.age), from, to,
  } : { n: 0, from, to }));
}
const yearOf = yearOfQ;

export const windowFrom = (q) => LAST - q + 1;

export function stat(indices, kind, opt = {}) {
  return aggregate(indices, kind, opt)[0];
}

// 新しい期間から順に試し、件数が足りる最初の期間で集計する
export function pick(indices, kind, opt = {}) {
  for (let w = 0; w < WINDOWS.length; w++) {
    const last = w === WINDOWS.length - 1;
    const s = stat(indices, kind, { ...opt, from: windowFrom(WINDOWS[w].q) });
    if (s.n >= (last ? MIN_N : PREFER_N)) return { ...s, window: WINDOWS[w] };
  }
  return null;
}

// 年ごとの中央値（主な値）
export function yearly(indices, kind, { src = -1, fromYear, toYear, minN = MIN_N } = {}) {
  const ok = KINDS[kind];
  const main = MAIN[kind];
  const buckets = Array.from({ length: toYear - fromYear + 1 }, () => []);
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const y = yearOf(C.Q[i]);
    if (y < fromYear || y > toYear) continue;
    if (src >= 0 && C.S[i] !== src) continue;
    if (!ok(i)) continue;
    buckets[y - fromYear].push(main(i));
  }
  return buckets.map((vals, k) => ({ y: fromYear + k, n: vals.length, med: vals.length >= minN ? summary(vals).med : null }));
}

// 5年前と比べた変化（取引価格情報だけで比べる。成約価格情報は2021年からしかないため）
// 取引された物件の組み合わせが変わっただけで数字が跳ねないよう、マンションは築年数の区分ごと、
// 土地は地区ごとに「5年前の2年間」と「直近2年」の中央値を比べ、件数で重みをつけた中央値をとる
// （一部の区分の大きな変化に引っぱられないよう、平均ではなく中央値）。
// 両方の期間に5件以上ある区分だけを使い、使えた件数や区分の数が足りなければ出さない。
const AGE_STRATA = [5, 10, 15, 20, 25, 30, 40, Infinity];
const strataOf = {
  mansion: (i) => { const a = ageOf(i); return a == null ? -1 : AGE_STRATA.findIndex((x) => a <= x); },
  tochi: (i) => C.D[i],
};
export function change(indices, kind) {
  const ok = KINDS[kind];
  const main = MAIN[kind];
  const sOf = strataOf[kind];
  const A = new Map();
  const B = new Map();
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    if (C.S[i] !== 0) continue;
    const q = C.Q[i];
    const inB = q > LAST - 8;
    const inA = q > LAST - 28 && q <= LAST - 20;
    if (!inA && !inB) continue;
    if (!ok(i)) continue;
    const s = sOf(i);
    if (s < 0) continue;
    const m = inA ? A : B;
    (m.get(s) || m.set(s, []).get(s)).push(main(i));
  }
  const rs = [];
  let nA = 0;
  let nB = 0;
  for (const [s, a] of A) {
    const b = B.get(s);
    if (!b || a.length < STRATUM_MIN_N || b.length < STRATUM_MIN_N) continue;
    rs.push([Math.log(summary(b).med / summary(a).med), Math.min(a.length, b.length)]);
    nA += a.length;
    nB += b.length;
  }
  if (nA < CHANGE_MIN_N || nB < CHANGE_MIN_N || rs.length < (kind === 'tochi' ? 5 : 3)) return null;
  rs.sort((x, y) => x[0] - y[0]);
  const half = rs.reduce((t, r) => t + r[1], 0) / 2;
  let acc = 0;
  let lr = rs[rs.length - 1][0];
  for (const [l, w] of rs) { acc += w; if (acc >= half) { lr = l; break; } }
  const strata = rs.length;
  const a = stat(indices, kind, { from: LAST - 27, to: LAST - 20, src: 0 });
  const b = stat(indices, kind, { from: LAST - 7, to: LAST, src: 0 });
  return { a, b, ratio: Math.exp(lr) - 1, nA, nB, strata, by: kind === 'mansion' ? '築年数の区分' : '地区' };
}

// 区切りごとの集計（築年数・広さ・駅からの時間など）
export function byBands(indices, kind, opt, valueOf, bands) {
  const groupOf = (i) => {
    const x = valueOf(i);
    if (x == null || Number.isNaN(x)) return -1;
    for (let k = 0; k < bands.length; k++) if (x >= bands[k][0] && x <= bands[k][1]) return k;
    return -1;
  };
  return aggregate(indices, kind, opt, groupOf, bands.length).map((s, k) => ({ ...s, label: bands[k][2] }));
}

export const ageOf = (i) => (C.B[i] > 0 ? Math.max(0, yearOf(C.Q[i]) - C.B[i]) : null);
export const areaOf = (i) => C.A[i];
export const walkOf = (i) => (C.W[i] === 255 ? null : C.W[i]);
export const madoriOf = (i) => C.M[i];
export const col = () => C;

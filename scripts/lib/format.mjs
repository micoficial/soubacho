// 表示用の小さな関数
import { quarterOfQ, yearOfQ } from './load.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const comma = (n) => Number(n).toLocaleString('ja-JP');

// 円 → 「3,980万円」「1億2,300万円」。上2桁に丸められた元データに合わせ、10万円単位で丸める
export function yen(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v < 1e6) return `${comma(Math.round(v / 1e4))}万円`;
  const man = Math.round(v / 1e5) * 10;
  if (man < 10000) return `${comma(man)}万円`;
  const oku = Math.floor(man / 10000);
  const rest = man % 10000;
  return rest ? `${oku}億${comma(rest)}万円` : `${oku}億円`;
}
// 単価（円）→「58.3万円」「120万円」「8,600円」
export function unit(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v < 1e4) return `${comma(Math.round(v / 100) * 100)}円`;
  const man = v / 1e4;
  if (man < 10) return `${man.toFixed(1)}万円`;
  if (man < 100) return `${man.toFixed(1)}万円`;
  return `${comma(Math.round(man))}万円`;
}
// 単価の数字だけ（万円、ランキングの表など）
export const manNum = (v) => (v == null ? '—' : (v / 1e4 < 100 ? (v / 1e4).toFixed(1) : comma(Math.round(v / 1e4))));
export const sqm = (v) => (v == null || !Number.isFinite(v) ? '—' : `${comma(Math.round(v))}㎡`);
export const years = (v) => (v == null || !Number.isFinite(v) ? '—' : `築${Math.round(v)}年`);
export const pct = (r, digits = 0) => (r == null ? '—' : `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(digits)}%`);

// 四半期の番号 → 「2024年4月」（始まり）／「2026年3月」（終わり）
export const qStart = (q) => `${yearOfQ(q)}年${(quarterOfQ(q) - 1) * 3 + 1}月`;
export const qEnd = (q) => `${yearOfQ(q)}年${quarterOfQ(q) * 3}月`;
export const qLabel = (q) => `${yearOfQ(q)}年第${quarterOfQ(q)}四半期`;
export const period = (from, to) => `${qStart(from)}〜${qEnd(to)}`;

// 駅名「大宮(埼玉)」→「大宮駅（埼玉）」
export function stationLabel(name) {
  const m = /^(.*?)\((.+)\)$/.exec(name);
  return m ? `${m[1]}駅（${m[2]}）` : `${name}駅`;
}
export const stationBase = (name) => name.replace(/\(.+\)$/, '');

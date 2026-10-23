// 市区町村・地区・駅・都道府県のページで共通に使う部品
import { KIND_LABEL, AGE_BANDS_M, AGE_BANDS_H, AREA_BANDS_L, WALK_BANDS, MADORI, MIN_N, TREND_FROM, TSUBO, WINDOWS } from '../lib/meta.mjs';
import { esc, yen, unit, sqm, comma, period, pct } from '../lib/format.mjs';
import { table, lineChart, href } from '../lib/html.mjs';
import { aggregate, byBands, yearly, ageOf, areaOf, walkOf, madoriOf, windowFrom, lastQ } from '../lib/stats.mjs';
import { yearOfQ, quarterOfQ } from '../lib/load.mjs';

export const lastFullYear = () => (quarterOfQ(lastQ()) === 4 ? yearOfQ(lastQ()) : yearOfQ(lastQ()) - 1);
export const dataYear = () => yearOfQ(lastQ());

// 期間と件数の注記
export const nNote = (s) => `${esc(s.window ? s.window.label : '')}（${period(s.from, s.to)}）・${comma(s.n)}件`;
const ok = (s) => s && s.n >= MIN_N;

// ---- 相場のカード ----
export function cards(sum) {
  const out = [];
  if (ok(sum.tochi)) {
    const s = sum.tochi;
    out.push(`<div class="kc kc-l"><p class="kc-t">${KIND_LABEL.tochi}の坪単価</p>
<p class="kc-v">${unit(s.v.med)}<small>／坪</small></p>
<p class="kc-s">㎡単価 ${unit(s.v.med / TSUBO)}・真ん中の半分は坪${unit(s.v.p25)}〜${unit(s.v.p75)}</p>
<p class="kc-s">総額の中央値 ${yen(s.p.med)}（広さ ${sqm(s.a.med)}）</p>
<p class="kc-n">${nNote(s)}</p></div>`);
  }
  if (ok(sum.mansion)) {
    const s = sum.mansion;
    out.push(`<div class="kc kc-m"><p class="kc-t">${KIND_LABEL.mansion}の価格</p>
<p class="kc-v">${yen(s.p.med)}</p>
<p class="kc-s">70㎡に直すと 約${yen(s.v.med * 70)}（㎡単価 ${unit(s.v.med)}・坪単価 ${unit(s.v.med * TSUBO)}）</p>
<p class="kc-s">広さ ${sqm(s.a.med)}${s.age ? `・築${Math.round(s.age.med)}年` : ''}（いずれも中央値）</p>
<p class="kc-n">${nNote(s)}</p></div>`);
  }
  if (ok(sum.kodate)) {
    const s = sum.kodate;
    out.push(`<div class="kc kc-k"><p class="kc-t">${KIND_LABEL.kodate}の価格</p>
<p class="kc-v">${yen(s.p.med)}</p>
<p class="kc-s">真ん中の半分は ${yen(s.v.p25)}〜${yen(s.v.p75)}</p>
<p class="kc-s">土地 ${sqm(s.a.med)}・建物 ${sqm(s.f?.med)}${s.age ? `・築${Math.round(s.age.med)}年` : ''}（いずれも中央値）</p>
<p class="kc-n">${nNote(s)}</p></div>`);
  }
  if (!out.length) return '<p class="note">集計できるだけの取引がまだありません（同じ種類の取引が直近10年で5件以上あると表示します）。</p>';
  return `<div class="cards">${out.join('\n')}</div>
<p class="note">金額は取引価格の中央値（安い順に並べてちょうど真ん中の値）です。「真ん中の半分」は、安い方から25%〜75%に入る取引の幅です。</p>`;
}

// ---- 推移のグラフ ----
export function trends(indices, name, { minN = 10 } = {}) {
  const to = lastFullYear();
  const out = [];
  const t = yearly(indices, 'tochi', { src: 0, fromYear: TREND_FROM, toYear: to, minN });
  const ch1 = lineChart([{ name: '土地の坪単価（取引価格情報）', cls: 's1', pts: t }], { fmt: shortMan, label: `${name}の土地（住宅地）の坪単価の推移` });
  if (ch1) out.push(`<h3>土地（住宅地）の坪単価</h3>${ch1}`);
  const m0 = yearly(indices, 'mansion', { src: 0, fromYear: TREND_FROM, toYear: to, minN });
  const m1 = yearly(indices, 'mansion', { src: 1, fromYear: 2021, toYear: to, minN });
  const ch2 = lineChart([{ name: '取引価格情報（アンケート）', cls: 's1', pts: m0 }, { name: '成約価格情報（レインズ）', cls: 's2', pts: m1 }], { fmt: shortMan, label: `${name}の中古マンションの㎡単価の推移` });
  if (ch2) out.push(`<h3>中古マンションの㎡単価</h3>${ch2}`);
  const h0 = yearly(indices, 'kodate', { src: 0, fromYear: TREND_FROM, toYear: to, minN });
  const h1 = yearly(indices, 'kodate', { src: 1, fromYear: 2021, toYear: to, minN });
  const ch3 = lineChart([{ name: '取引価格情報（アンケート）', cls: 's1', pts: h0 }, { name: '成約価格情報（レインズ）', cls: 's2', pts: h1 }], { fmt: shortMan, label: `${name}の戸建ての価格の推移` });
  if (ch3) out.push(`<h3>戸建ての価格</h3>${ch3}`);
  if (!out.length) return '';
  return `<section class="sec"><h2>${esc(name)}の価格の推移</h2>
<p class="note">年ごとの中央値です（その年の取引が${minN}件未満の年は線を切っています）。国の取引価格情報（取引した人へのアンケート）と、不動産会社の物件情報網レインズの成約価格情報は、集め方が違うため線を分けています。中央値は、その年に取引された物件の広さ・築年数などの組み合わせでも動きます。</p>
${out.join('\n')}</section>`;
}
// 目盛り用の短い表記（万円）
export function shortMan(v) {
  const man = v / 1e4;
  if (man >= 10000) return `${(man / 10000).toFixed(man >= 100000 ? 0 : 1)}億`;
  if (man >= 100) return `${comma(Math.round(man))}万`;
  return `${man.toFixed(man >= 10 ? 0 : 1)}万`;
}

// ---- 中古マンション：築年数別 ----
export function mansionByAge(indices, s, name) {
  if (!ok(s)) return '';
  const rows = byBands(indices, 'mansion', { from: s.from }, ageOf, AGE_BANDS_M).filter((r) => r.n > 0);
  if (rows.filter(ok).length < 2) return '';
  const base = rows.find(ok);
  const body = rows.map((r) => [esc(r.label), ok(r) ? yen(r.p.med) : '—', ok(r) ? unit(r.v.med) : '—', ok(r) ? `約${yen(r.v.med * 70)}` : '—', ok(r) ? sqm(r.a.med) : '—', `${comma(r.n)}件`]);
  return `<section class="sec"><h2>${esc(name)}の中古マンション：築年数別の相場</h2>
${table(['築年数', '価格', '㎡単価', '70㎡に直すと', '広さ', '件数'], body, { num: [1, 2, 3, 4, 5] })}
<p class="note">${nNote(s)}の取引。築年数は取引した年から建築年を引いた目安です。件数が${MIN_N}件未満の区分は価格を出していません。${base && rows.filter(ok).length >= 3 ? `築年数による㎡単価の下がり方の目安になります。` : ''}</p></section>`;
}

// ---- 中古マンション：間取り別 ----
export function mansionByMadori(indices, s, name) {
  if (!ok(s)) return '';
  const g = aggregate(indices, 'mansionAll', { from: s.from }, (i) => { const m = madoriOf(i); return m >= 1 && m <= 7 ? m - 1 : -1; }, 7);
  const rows = g.map((r, k) => ({ ...r, label: MADORI[k + 1] })).filter((r) => r.n > 0);
  if (rows.filter(ok).length < 2) return '';
  const body = rows.map((r) => [esc(r.label), ok(r) ? yen(r.p.med) : '—', ok(r) ? sqm(r.a.med) : '—', ok(r) ? unit(r.v.med) : '—', `${comma(r.n)}件`]);
  return `<section class="sec"><h2>${esc(name)}の中古マンション：間取り別の相場</h2>
${table(['間取り', '価格', '広さ', '㎡単価', '件数'], body, { num: [1, 2, 3, 4] })}
<p class="note">${nNote(s)}の取引（この表は30㎡未満のワンルームなども含めています）。</p></section>`;
}

// ---- 戸建て：築年数別 ----
export function kodateByAge(indices, s, name) {
  if (!ok(s)) return '';
  const rows = byBands(indices, 'kodate', { from: s.from }, ageOf, AGE_BANDS_H).filter((r) => r.n > 0);
  if (rows.filter(ok).length < 2) return '';
  const body = rows.map((r) => [esc(r.label), ok(r) ? yen(r.p.med) : '—', ok(r) ? sqm(r.a.med) : '—', ok(r) ? sqm(r.f?.med) : '—', `${comma(r.n)}件`]);
  return `<section class="sec"><h2>${esc(name)}の戸建て：築年数別の相場</h2>
${table(['築年数', '価格', '土地', '建物', '件数'], body, { num: [1, 2, 3, 4] })}
<p class="note">${nNote(s)}の取引（土地と建物をいっしょに売り買いしたもの）。古い家ほど、価格の多くは土地の値段です。</p></section>`;
}

// ---- 土地：広さ別 ----
export function tochiByArea(indices, s, name) {
  if (!ok(s)) return '';
  const rows = byBands(indices, 'tochi', { from: s.from }, areaOf, AREA_BANDS_L.map(([a, b, l]) => [a, b - 0.001, l])).filter((r) => r.n > 0);
  if (rows.filter(ok).length < 2) return '';
  const body = rows.map((r) => [esc(r.label), ok(r) ? `${unit(r.v.med)}／坪` : '—', ok(r) ? yen(r.p.med) : '—', `${comma(r.n)}件`]);
  return `<section class="sec"><h2>${esc(name)}の土地：広さ別の相場</h2>
${table(['広さ', '坪単価', '総額', '件数'], body, { num: [1, 2, 3] })}
<p class="note">${nNote(s)}の住宅地の土地の取引。広い土地ほど坪単価は低くなりがちです。</p></section>`;
}

// ---- 駅からの時間別 ----
export function byWalk(indices, sum, name) {
  const cols = [];
  for (const kind of ['mansion', 'tochi']) {
    const s = sum[kind];
    if (!ok(s)) continue;
    const rows = byBands(indices, kind, { from: s.from }, walkOf, WALK_BANDS);
    if (rows.filter(ok).length < 2) continue;
    cols.push({ kind, s, rows });
  }
  if (!cols.length) return '';
  const head = ['駅からの時間', ...cols.map((c) => (c.kind === 'mansion' ? 'マンション㎡単価' : '土地の坪単価'))];
  const body = WALK_BANDS.map((b, k) => [esc(b[2]), ...cols.map((c) => { const r = c.rows[k]; return ok(r) ? `${unit(r.v.med)}<small>${comma(r.n)}件</small>` : (r.n ? `—<small>${comma(r.n)}件</small>` : '—'); })]);
  return `<section class="sec"><h2>${esc(name)}からの時間別の相場</h2>
${table(head, body, { num: cols.map((_, k) => k + 1) })}
<p class="note">${cols.map((c) => `${c.kind === 'mansion' ? 'マンション' : '土地'}：${nNote(c.s)}`).join('／')}。時間は国のデータの「最寄駅までの時間距離」です。</p></section>`;
}

// ---- よくある質問 ----
export function faq(items) {
  if (!items.length) return '';
  return `<section class="sec faq"><h2>よくある質問</h2>${items.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join('\n')}</section>`;
}

// ---- 読み方の注意 ----
export function readNotes() {
  return `<section class="card"><h2>この数字の見方</h2>
<ul class="ul">
<li>国土交通省が公表している、実際に取引された不動産の価格（取引価格情報・成約価格情報）を集計しています。売り出し中の価格ではなく、取引が成立した価格です。</li>
<li>中央値は、その期間に取引された物件の広さ・築年数・立地の組み合わせでも変わります。件数が少ない地域では、数件の取引で大きく動きます。</li>
<li>競売・親族間の取引・隣の土地の購入など、事情のある取引は集計から外しています。</li>
<li>土地は「住宅地」の土地だけの取引（30〜1,000㎡）、マンションは住宅用の専有30〜200㎡、戸建ては住宅用の土地と建物の取引です。</li>
<li>個々の物件の価格を決めるものではありません。売却や購入の判断には、不動産会社の査定や専門家の意見もあわせてご確認ください。</li>
</ul></section>`;
}

// ---- 地域の一覧（リンク） ----
export function chips(list) {
  return `<ul class="chips">${list.join('')}</ul>`;
}

export const changeSentence = (ch) => (ch.by === '地区' ? `同じ地区どうしで比べると、土地の坪単価は5年前より${changeText(ch.ratio)}。` : `築年数をそろえて比べると、中古マンションの㎡単価は5年前より${changeText(ch.ratio)}。`);
export const changeAnswer = (ch) => `国の取引価格情報で、${ch.by === '地区' ? '土地の坪単価' : '中古マンションの㎡単価'}の中央値は5年前（${period(ch.a.from, ch.a.to)}）の${unit(ch.a.v.med)}から、直近2年（${period(ch.b.from, ch.b.to)}）は${unit(ch.b.v.med)}になりました。取引された物件の組み合わせの違いをならすため、${ch.by}ごとに比べると${pct(ch.ratio)}の変化です。`;
export const changeText = (r) => (Math.abs(r) < 0.02 ? 'ほぼ変わっていません' : `約${Math.round(Math.abs(r) * 100)}%${r >= 0 ? '上がって' : '下がって'}います`);

// ---- 読み方の注意（短い版：地区のページ用） ----
export function readNotesShort() {
  return `<p class="note">国土交通省が公表した実際の取引価格（取引価格情報・成約価格情報）の中央値です。競売・親族間の取引など事情のある取引は除いています。件数が少ないと数件の取引で大きく動くため、個々の物件の価格の目安にはなりません。<a href="${href('about/')}">集計のしかた</a></p>`;
}

export const kindsShown = (sum) => ['tochi', 'mansion', 'kodate'].filter((k) => ok(sum[k]));
export { ok, WINDOWS, pct, windowFrom };

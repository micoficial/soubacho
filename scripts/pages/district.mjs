// 地区（町・大字）のページ
import { SITE_NAME, MIN_N, TSUBO, PREF_BY_CODE } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, table, sourceLine } from '../lib/html.mjs';
import { yearly } from '../lib/stats.mjs';
import { cards, mansionByAge, faq, readNotesShort, ok, lastFullYear } from './common.mjs';

// 市区町村全体と比べた一言（同じ「直近5年」の中央値どうしで比べる）
function compare(a, b) {
  if (!ok(a) || !ok(b)) return null;
  const r = a.v.med / b.v.med - 1;
  if (Math.abs(r) < 0.05) return 'ほぼ同じ';
  return `約${Math.round(Math.abs(r) * 100)}%${r > 0 ? '高い' : '低い'}`;
}

export function renderDistrict(d, ctx) {
  const c = ctx.cities[d.city];
  const pref = PREF_BY_CODE.get(c.pref);
  const name = d.name;
  const where = `${c.name}${name}`;
  const s = d.sum;
  const idx = ctx.byDist(d.idx);
  const bc = breadcrumbs([['トップ', ''], [pref.name, `ken/${pref.slug}/`], [c.name, `city/${c.code}/`], [name, null]]);

  const lines = [];
  if (ok(s.tochi)) {
    const cmp = compare(d.sum.f5.tochi, c.sum.f5.tochi);
    lines.push(`${esc(where)}の住宅地の土地は、1坪あたり約${unit(s.tochi.v.med)}（中央値）で取引されています${cmp ? `。直近5年で比べると、${esc(c.name)}全体より${cmp}水準です` : ''}。`);
  }
  if (ok(s.mansion)) {
    const cmp = compare(d.sum.f5.mansion, c.sum.f5.mansion);
    lines.push(`中古マンションは約${yen(s.mansion.p.med)}（㎡単価${unit(s.mansion.v.med)}）${cmp ? `で、㎡単価は${esc(c.name)}全体より${cmp}` : ''}です。`);
  }
  if (ok(s.kodate)) lines.push(`戸建ては約${yen(s.kodate.p.med)}です。`);

  // 年ごとの表（直近10年）
  const to = lastFullYear();
  const from = to - 9;
  const t = yearly(idx, 'tochi', { fromYear: from, toYear: to });
  const m = yearly(idx, 'mansion', { fromYear: from, toYear: to });
  const h = yearly(idx, 'kodate', { fromYear: from, toYear: to });
  const cols = [['土地の坪単価', t, unit], ['マンション㎡単価', m, unit], ['戸建て価格', h, yen]].filter(([, a]) => a.some((x) => x.n > 0));
  const cell = (x, f) => (x.med != null ? `${f(x.med)}<small>${x.n}件</small>` : (x.n ? `—<small>${x.n}件</small>` : '—'));
  const yRows = [];
  for (let k = t.length - 1; k >= 0; k--) {
    if (!cols.some(([, a]) => a[k].n > 0)) continue;
    yRows.push([`${from + k}年`, ...cols.map(([, a, f]) => cell(a[k], f))]);
  }
  const yTable = yRows.length >= 2 ? `<section class="sec"><h2>${esc(name)}の価格の推移（年ごと）</h2>
${table(['年', ...cols.map(([l]) => l)], yRows, { num: cols.map((_, k) => k + 1) })}
<p class="note">年ごとの中央値。その年の取引が${MIN_N}件未満のときは価格を出していません（取引の価格や広さの組み合わせで大きく動くため、推移は${esc(c.name)}のページのグラフもあわせてご覧ください）。</p></section>` : '';

  // 最寄駅
  const st = (d.stations || []).slice(0, 8);
  const stHtml = st.length ? `<section class="sec"><h2>${esc(name)}の最寄駅</h2>
${table(['駅', '駅までの時間（中央値）', '件数'], st.map((x) => [x.st.page ? `<a href="${href(x.st.path)}">${esc(stationLabel(x.st.name))}</a>` : esc(stationLabel(x.st.name)), x.walk != null ? (x.walk >= 30 ? '30分以上' : `${x.walk}分`) : '—', `${comma(x.n)}件`]), { num: [1, 2] })}
<p class="note">${esc(name)}の取引で「最寄駅」とされた駅です（直近10年）。</p></section>` : '';

  const sib = (c.districts || []).filter((x) => x.page && x !== d).slice(0, 15);
  const sibHtml = sib.length ? `<section class="sec"><h2>${esc(c.name)}のほかの地区</h2><ul class="chips">${sib.map((x) => `<li><a href="${href(x.path)}">${esc(x.name)}</a></li>`).join('')}</ul>
<p class="more"><a href="${href(`city/${c.code}/`)}#chiku">${esc(c.name)}の地区をすべて見る</a></p></section>` : '';

  const q = [];
  if (ok(s.tochi)) q.push([`${where}の土地の坪単価（地価）はいくらですか？`, `${esc(s.tochi.window.label)}（${period(s.tochi.from, s.tochi.to)}）に取引された住宅地の土地${comma(s.tochi.n)}件の中央値は、1坪あたり${unit(s.tochi.v.med)}（1㎡あたり${unit(s.tochi.v.med / TSUBO)}）です。実際に取引された価格（実勢価格）で、国の地価公示の価格とは別のものです。`]);
  if (ok(s.mansion)) q.push([`${where}の中古マンションの相場は？`, `${esc(s.mansion.window.label)}に取引された中古マンション${comma(s.mansion.n)}件の中央値は${yen(s.mansion.p.med)}、㎡単価は${unit(s.mansion.v.med)}です。`]);
  const body = `${bc.html}
<header class="ph"><p class="eyebrow">${esc(pref.name)}${esc(c.name)}・実際に売れた価格</p>
<h1>${esc(name)}（${esc(c.name)}）の不動産相場</h1>
<p class="lead">国土交通省が公表した${esc(where)}の取引${comma(d.total)}件（2005年〜${esc(ctx.dataToLabel)}）から、相場をまとめました。</p></header>
${lines.length ? `<p class="lede">${lines.join('')}</p>` : ''}
${cards(s)}
${yTable}
${ok(s.mansion) && s.mansion.n >= 30 ? mansionByAge(idx, s.mansion, name) : ''}
${stHtml}
${faq(q)}
${readNotesShort()}
${sibHtml}
<p class="more"><a href="${href(`city/${c.code}/`)}">${esc(c.name)}全体の相場を見る</a></p>
<p class="src-l">${sourceLine(true)}</p>`;
  const desc = [ok(s.tochi) && `土地の坪単価は約${unit(s.tochi.v.med)}`, ok(s.mansion) && `中古マンションは約${yen(s.mansion.p.med)}`, ok(s.kodate) && `戸建ては約${yen(s.kodate.p.med)}`].filter(Boolean).join('、');
  return layout({
    title: `${name}（${c.name}）の地価・坪単価、マンション・戸建て相場｜${SITE_NAME}`,
    description: `${pref.name}${where}で実際に取引された不動産の価格を国の公開データから集計。${desc}（中央値）。年ごとの推移と最寄駅も。`,
    path: d.path, body, ld: [bc.ld],
  });
}

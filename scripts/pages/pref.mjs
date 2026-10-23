// 都道府県のページと、都道府県の一覧
import { SITE_NAME, PREFS, AREAS, PREF_BY_CODE, MIN_N, TSUBO } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, table, shareButtons, sourceLine } from '../lib/html.mjs';
import { cards, trends, mansionByAge, kodateByAge, readNotes, ok, dataYear } from './common.mjs';
import { RANKINGS, rankList, rankPath } from './ranking.mjs';

export const prefPath = (p) => `ken/${p.slug}/`;

export function renderPref(p, ctx) {
  const s = ctx.prefSum.get(p.code);
  const idx = ctx.byPref(p.code);
  const cities = ctx.cities.filter((c) => c.pref === p.code);
  const bc = breadcrumbs([['トップ', ''], ['都道府県から探す', 'ken/'], [p.name, null]]);

  const rows = cities.map((c) => {
    const f = c.sum.f2;
    return [`<a href="${href(`city/${c.code}/`)}">${esc(c.name)}</a>`,
      ok(f.tochi) ? `<span data-v="${Math.round(f.tochi.v.med)}">${unit(f.tochi.v.med)}</span>` : '—',
      ok(f.mansion) ? `<span data-v="${Math.round(f.mansion.p.med)}">${yen(f.mansion.p.med)}</span>` : '—',
      ok(f.mansion) ? `<span data-v="${Math.round(f.mansion.v.med)}">${unit(f.mansion.v.med)}</span>` : '—',
      ok(f.kodate) ? `<span data-v="${Math.round(f.kodate.p.med)}">${yen(f.kodate.p.med)}</span>` : '—',
      `<span data-v="${c.n2}">${comma(c.n2)}件</span>`];
  });
  const cityTable = `<section class="sec" id="shi"><h2>${esc(p.name)}の市区町村別の相場</h2>
${table(['市区町村', '土地の坪単価', 'マンション価格', 'マンション㎡単価', '戸建て価格', '件数'], rows, { num: [1, 2, 3, 4, 5], sortable: true })}
<p class="note">直近2年（${period(ctx.lastQ - 7, ctx.lastQ)}）の中央値。その期間の取引が${MIN_N}件未満のときは「—」です（市区町村のページでは、期間を広げた数字を見られます）。見出しを押すと並べ替えられます。</p></section>`;

  const eki = rankList(ctx, RANKINGS.find((r) => r.slug === 'eki'), p.code).slice(0, 20);
  const ekiHtml = eki.length ? `<section class="sec"><h2>${esc(p.name)}の駅別 中古マンションの坪単価（上位20駅）</h2>
${table(['順位', '駅', '坪単価', '70㎡に直すと', '件数'], eki.map((e, k) => [`${k + 1}`, `<a href="${href(e.x.path)}">${esc(stationLabel(e.x.name))}</a>`, unit(e.s.v.med * TSUBO), `約${yen(e.s.v.med * 70)}`, `${comma(e.s.n)}件`]), { num: [2, 3, 4], cls: 'dt rt' })}
<p class="more"><a href="${href(rankPath(RANKINGS.find((r) => r.slug === 'eki'), p))}">${esc(p.name)}の駅別ランキングをすべて見る</a></p></section>` : '';

  const lines = [];
  if (ok(s.tochi)) lines.push(`${esc(p.name)}の住宅地の土地は、1坪あたり約${unit(s.tochi.v.med)}（中央値）で取引されています。`);
  if (ok(s.mansion)) lines.push(`中古マンションは約${yen(s.mansion.p.med)}、70㎡に直すと約${yen(s.mansion.v.med * 70)}です。`);
  if (ok(s.kodate)) lines.push(`戸建ては約${yen(s.kodate.p.med)}です。`);
  const topT = rankList(ctx, RANKINGS[0], p.code)[0];
  if (topT) lines.push(`土地の坪単価がいちばん高いのは${esc(topT.x.name)}（坪${unit(topT.s.v.med)}）です。`);

  const body = `${bc.html}
<header class="ph"><p class="eyebrow">実際に売れた価格</p><h1>${esc(p.name)}の不動産相場</h1>
<p class="lead">国土交通省が公表した${esc(p.name)}の取引${comma(ctx.prefTotal.get(p.code) || 0)}件から、土地・中古マンション・戸建ての相場を市区町村別・駅別にまとめました。</p></header>
${lines.length ? `<p class="lede">${lines.join('')}</p>` : ''}
${cards(s)}
${cityTable}
${ekiHtml}
<section class="card"><h2>${esc(p.name)}のランキング</h2><ul class="chips">${RANKINGS.map((r) => `<li><a href="${href(rankPath(r, p))}">${esc(r.short)}</a></li>`).join('')}</ul></section>
${trends(idx, p.name, { minN: 20 })}
${mansionByAge(idx, s.mansion, p.name)}
${kodateByAge(idx, s.kodate, p.name)}
${shareButtons(abs(prefPath(p)), `${p.name}の不動産相場（市区町村別・駅別）`)}
${readNotes()}
<p class="src-l">${sourceLine(true)}</p>`;
  return layout({
    title: `${p.name}の不動産相場｜市区町村別の土地坪単価・マンション・戸建て価格【${dataYear()}年】｜${SITE_NAME}`,
    description: `${p.name}の市区町村別・駅別に、土地の坪単価、中古マンション・戸建ての価格（実際の取引価格の中央値）を一覧で比較。国土交通省の公開データから無料で。`,
    path: prefPath(p), body, ld: [bc.ld],
  });
}

export function prefGrid(ctx) {
  return AREAS.map(([area, codes]) => `<div class="area"><p class="sub">${esc(area)}</p><ul class="grid">${codes.map((code) => { const p = PREF_BY_CODE.get(code); return `<li><a href="${href(prefPath(p))}">${esc(p.short)}</a></li>`; }).join('')}</ul></div>`).join('');
}

export function renderPrefIndex(ctx) {
  const bc = breadcrumbs([['トップ', ''], ['都道府県から探す', null]]);
  const rows = PREFS.map((p) => {
    const s = ctx.prefSum.get(p.code);
    const f = s.f2;
    return [`<a href="${href(prefPath(p))}">${esc(p.name)}</a>`, ok(f.tochi) ? `<span data-v="${Math.round(f.tochi.v.med)}">${unit(f.tochi.v.med)}</span>` : '—', ok(f.mansion) ? `<span data-v="${Math.round(f.mansion.p.med)}">${yen(f.mansion.p.med)}</span>` : '—', ok(f.kodate) ? `<span data-v="${Math.round(f.kodate.p.med)}">${yen(f.kodate.p.med)}</span>` : '—'];
  });
  const body = `${bc.html}<header class="ph"><h1>都道府県から探す</h1><p class="lead">都道府県を選ぶと、市区町村別・駅別の相場が見られます。</p></header>
<section class="sec">${prefGrid(ctx)}</section>
<section class="sec"><h2>都道府県別の相場</h2>${table(['都道府県', '土地の坪単価', 'マンション価格', '戸建て価格'], rows, { num: [1, 2, 3], sortable: true })}
<p class="note">直近2年（${period(ctx.lastQ - 7, ctx.lastQ)}）の中央値。見出しを押すと並べ替えられます。</p></section>`;
  return layout({ title: `都道府県別の不動産相場（土地の坪単価・マンション・戸建て）｜${SITE_NAME}`, description: '47都道府県の土地の坪単価、中古マンション・戸建ての価格（実際の取引価格の中央値）を一覧で比較。市区町村別・駅別の相場へ。', path: 'ken/', body, ld: [bc.ld] });
}

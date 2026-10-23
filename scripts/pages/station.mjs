// 駅のページ
import { SITE_NAME, TSUBO, PREF_BY_CODE } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, pct, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, table, shareButtons, sourceLine } from '../lib/html.mjs';
import { cards, trends, mansionByAge, mansionByMadori, kodateByAge, byWalk, faq, readNotes, ok, dataYear, changeSentence, changeAnswer } from './common.mjs';

export function renderStation(st, ctx) {
  const pref = PREF_BY_CODE.get(st.pref);
  const label = stationLabel(st.name);
  const s = st.sum;
  const idx = ctx.bySt(st.idx);
  const bc = breadcrumbs([['トップ', ''], [pref.name, `ken/${pref.slug}/`], [label, null]]);

  const lines = [];
  if (ok(s.mansion)) {
    const r = st.rank?.mansion;
    lines.push(`${esc(label)}が最寄りの中古マンションは、約${yen(s.mansion.p.med)}（中央値）で取引されています。70㎡に直すと約${yen(s.mansion.v.med * 70)}、坪単価は${unit(s.mansion.v.med * TSUBO)}${r ? `で、${esc(pref.name)}の${r.of}駅のなかで${r.rank}番目に高い水準です` : 'です'}。`);
  }
  if (ok(s.tochi)) lines.push(`住宅地の土地は1坪あたり約${unit(s.tochi.v.med)}です。`);
  const ch = s.chg?.mansion;
  if (ch) lines.push(changeSentence(ch));
  if (ok(s.kodate)) lines.push(`戸建ては約${yen(s.kodate.p.med)}です。`);

  const cities = (st.cities || []).slice(0, 10);
  const cityHtml = cities.length > 1 ? `<p class="note">この駅が最寄りの取引がある市区町村（直近10年の件数）：${cities.map((x) => `<a href="${href(`city/${x.c.code}/`)}">${esc(x.c.name)}</a>（${comma(x.n)}件）`).join('、')}</p>` : '';
  const ds = (st.districts || []).slice(0, 20);
  const dHtml = ds.length ? `<section class="sec"><h2>${esc(label)}が最寄りの地区</h2><ul class="chips">${ds.map((x) => `<li>${x.d.page ? `<a href="${href(x.d.path)}">${esc(x.d.name)}</a>` : esc(x.d.name)}<small>${esc(ctx.cities[x.d.city].name)}・${comma(x.n)}件</small></li>`).join('')}</ul></section>` : '';
  const near = (st.near || []).slice(0, 24);
  const nearHtml = near.length ? `<section class="sec"><h2>近くの駅の相場</h2><ul class="chips">${near.map((x) => `<li><a href="${href(x.path)}">${esc(stationLabel(x.name))}</a>${ok(x.sum.mansion) ? `<small>マンション ${yen(x.sum.mansion.p.med)}</small>` : (ok(x.sum.tochi) ? `<small>土地 坪${unit(x.sum.tochi.v.med)}</small>` : '')}</li>`).join('')}</ul>
<p class="note">同じ市区町村で取引の多い駅です。</p></section>` : '';

  const q = [];
  if (ok(s.mansion)) q.push([`${label}周辺の中古マンションの相場はいくらですか？`, `${esc(s.mansion.window.label)}（${period(s.mansion.from, s.mansion.to)}）に取引された、${esc(label)}が最寄りの中古マンション${comma(s.mansion.n)}件の中央値は${yen(s.mansion.p.med)}です。㎡単価は${unit(s.mansion.v.med)}（坪単価${unit(s.mansion.v.med * TSUBO)}）なので、70㎡なら約${yen(s.mansion.v.med * 70)}が目安です。`]);
  if (ok(s.tochi)) q.push([`${label}周辺の土地の坪単価は？`, `${esc(s.tochi.window.label)}に取引された住宅地の土地${comma(s.tochi.n)}件の中央値は1坪あたり${unit(s.tochi.v.med)}です。駅からの時間別の表もご覧ください。`]);
  if (ch) q.push([`${label}周辺のマンションの価格は上がっていますか？`, changeAnswer(ch)]);
  if (ok(s.kodate)) q.push([`${label}周辺の戸建ての相場は？`, `${esc(s.kodate.window.label)}に取引された戸建て${comma(s.kodate.n)}件の中央値は${yen(s.kodate.p.med)}です。`]);

  const body = `${bc.html}
<header class="ph"><p class="eyebrow">${esc(pref.name)}・実際に売れた価格</p>
<h1>${esc(label)}周辺の不動産相場</h1>
<p class="lead">国土交通省が公表した取引のうち、最寄駅が${esc(label)}の${comma(st.total)}件（2005年〜${esc(ctx.dataToLabel)}）から、中古マンション・土地・戸建ての相場をまとめました。</p>
${cityHtml}</header>
${lines.length ? `<p class="lede">${lines.join('')}</p>` : ''}
${cards(s)}
${byWalk(idx, s, label)}
${trends(idx, label)}
${mansionByAge(idx, s.mansion, label)}
${mansionByMadori(idx, s.mansion, label)}
${kodateByAge(idx, s.kodate, label)}
${dHtml}
${faq(q)}
${shareButtons(abs(st.path), `${label}周辺の不動産相場（実際に売れた価格）`)}
${readNotes()}
${nearHtml}
<p class="src-l">${sourceLine(true)}</p>`;
  const desc = [ok(s.mansion) && `中古マンションは約${yen(s.mansion.p.med)}（坪単価${unit(s.mansion.v.med * TSUBO)}）`, ok(s.tochi) && `土地は坪${unit(s.tochi.v.med)}`, ok(s.kodate) && `戸建ては約${yen(s.kodate.p.med)}`].filter(Boolean).join('、');
  return layout({
    title: `${label}のマンション相場・土地坪単価【${dataYear()}年】実際の取引価格｜${SITE_NAME}`,
    description: `${label}（${pref.name}）が最寄りの不動産で実際に売れた価格を国の公開データから集計。${desc}（中央値）。駅からの時間別・築年数別の相場と推移も無料で。`,
    path: st.path, body, ld: [bc.ld],
  });
}

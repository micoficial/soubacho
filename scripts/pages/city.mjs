// 市区町村のページ
import { SITE_NAME, MIN_N, TSUBO, PREF_BY_CODE } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, pct, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, table, shareButtons, sourceLine } from '../lib/html.mjs';
import { cards, trends, mansionByAge, mansionByMadori, kodateByAge, tochiByArea, faq, readNotes, ok, dataYear, changeSentence, changeAnswer } from './common.mjs';

export const cityPath = (c) => `city/${c.code}/`;

export function citySummaryText(c, ctx) {
  const s = c.sum;
  const pref = PREF_BY_CODE.get(c.pref);
  const parts = [];
  if (ok(s.tochi)) {
    const r = c.rank?.tochi;
    parts.push(`${esc(c.name)}の住宅地の土地は、1坪あたり約${unit(s.tochi.v.med)}（中央値）で取引されています${r ? `。${esc(pref.name)}内で比べられる${r.of}市区町村のなかで${r.rank}番目に高い水準です` : ''}。`);
  }
  if (ok(s.mansion)) {
    const r = c.rank?.mansion;
    parts.push(`中古マンションは約${yen(s.mansion.p.med)}が中心で、70㎡に直すと約${yen(s.mansion.v.med * 70)}です${r ? `（㎡単価は${esc(pref.name)}内の${r.of}市区町村で${r.rank}番目）` : ''}。`);
  }
  const ch = s.chg?.mansion || s.chg?.tochi;
  if (ch) parts.push(changeSentence(ch));
  if (ok(s.kodate)) parts.push(`戸建ては約${yen(s.kodate.p.med)}です。`);
  return parts.join('');
}

export function renderCity(c, ctx) {
  const pref = PREF_BY_CODE.get(c.pref);
  const name = c.name;
  const full = `${pref.name}${name}`;
  const s = c.sum;
  const idx = ctx.byCity(c.idx);
  const bc = breadcrumbs([['トップ', ''], [pref.name, `ken/${pref.slug}/`], [name, null]]);
  const summary = citySummaryText(c, ctx);

  // 地区の表（直近5年の中央値で比べる）
  const ds = (c.districts || []).filter((d) => d.n10 >= MIN_N);
  const shownD = ds.slice(0, 150);
  const dRows = shownD.map((d) => {
    const f = d.sum.f5;
    const label = d.page ? `<a href="${href(d.path)}">${esc(d.name)}</a>` : esc(d.name);
    return [label, ok(f.tochi) ? `${unit(f.tochi.v.med)}` : '—', ok(f.mansion) ? yen(f.mansion.p.med) : '—', ok(f.kodate) ? yen(f.kodate.p.med) : '—', `${comma(d.n10)}件`];
  });
  const dTable = dRows.length ? `<section class="sec" id="chiku"><h2>${esc(name)}の地区（町・大字）別の相場</h2>
${table(['地区', '土地の坪単価', 'マンション価格', '戸建て価格', '件数（10年）'], dRows, { num: [1, 2, 3, 4], sortable: true })}
<p class="note">価格は直近5年（${period(ctx.from5, ctx.lastQ)}）の中央値で、その期間の取引が${MIN_N}件未満のときは「—」です。件数は直近10年の土地・マンション・戸建ての取引の合計。${ds.length > shownD.length ? `取引の多い順に${shownD.length}地区を表示しています（ほか${ds.length - shownD.length}地区）。` : ''}</p></section>` : '';

  // 駅の表（駅ごとの全体の相場）
  const st = (c.stations || []).slice(0, 40);
  const sRows = st.map((x) => {
    const f = x.sum;
    const label = x.page ? `<a href="${href(x.path)}">${esc(stationLabel(x.name))}</a>` : esc(stationLabel(x.name));
    return [label, ok(f.mansion) ? yen(f.mansion.p.med) : '—', ok(f.mansion) ? unit(f.mansion.v.med) : '—', ok(f.tochi) ? unit(f.tochi.v.med) : '—', `${comma(x.local)}件`];
  });
  const sTable = sRows.length ? `<section class="sec" id="eki"><h2>${esc(name)}の駅別の相場</h2>
${table(['駅', 'マンション価格', 'マンション㎡単価', '土地の坪単価', 'この市区町村での件数'], sRows, { num: [1, 2, 3, 4] })}
<p class="note">駅ごとの価格は、その駅が最寄りの取引全体（ほかの市区町村の分も含む）の中央値です。期間は駅のページに書いています。</p></section>` : '';

  const nochi = ok(s.nochi) ? `<section class="sec"><h2>${esc(name)}の農地の取引</h2><p>農地の取引は10aあたり約${yen(s.nochi.v.med)}（中央値、${esc(s.nochi.window.label)}（${period(s.nochi.from, s.nochi.to)}）・${comma(s.nochi.n)}件）でした。農地の売買には農地法の許可などが必要で、宅地とは価格の決まり方が大きく違います。</p></section>` : '';

  const shogyo = ok(s.shogyo) ? `<p class="note">商業地の土地の取引は、坪単価の中央値が${unit(s.shogyo.v.med)}でした（${esc(s.shogyo.window.label)}・${comma(s.shogyo.n)}件）。上の住宅地の数字には入れていません。</p>` : '';

  const q = [];
  if (ok(s.tochi)) q.push([`${name}の土地の坪単価はいくらですか？`, `${esc(s.tochi.window.label)}（${period(s.tochi.from, s.tochi.to)}）に取引された住宅地の土地${comma(s.tochi.n)}件の中央値は、1坪あたり${unit(s.tochi.v.med)}（1㎡あたり${unit(s.tochi.v.med / TSUBO)}）です。半分の取引が坪${unit(s.tochi.v.p25)}〜${unit(s.tochi.v.p75)}の間に入っています。`]);
  if (ok(s.mansion)) q.push([`${name}の中古マンションの相場はいくらですか？`, `${esc(s.mansion.window.label)}に取引された中古マンション${comma(s.mansion.n)}件の価格の中央値は${yen(s.mansion.p.med)}です。広さで割った㎡単価は${unit(s.mansion.v.med)}で、70㎡の部屋なら約${yen(s.mansion.v.med * 70)}が目安です。築年数別の表もご覧ください。`]);
  if (ok(s.kodate)) q.push([`${name}の戸建ての相場はいくらですか？`, `${esc(s.kodate.window.label)}に取引された戸建て（土地と建物）${comma(s.kodate.n)}件の中央値は${yen(s.kodate.p.med)}です。土地の広さの中央値は${Math.round(s.kodate.a.med)}㎡でした。`]);
  const ch = s.chg?.mansion || s.chg?.tochi;
  if (ch) q.push([`${name}の不動産の価格は上がっていますか？`, changeAnswer(ch)]);
  q.push(['このページの価格で売れますか？', '実際の価格は、広さ・築年数・駅からの距離・日当たりなど個々の条件で大きく変わります。ここの数字は「この地域でどのくらいの価格の取引が多いか」の目安として使い、売却のときは複数の不動産会社の査定もあわせて確かめてください。']);

  const kinds = [ok(s.tochi) && '土地', ok(s.mansion) && '中古マンション', ok(s.kodate) && '戸建て'].filter(Boolean);
  const body = `${bc.html}
<header class="ph"><p class="eyebrow">${esc(pref.name)}・実際に売れた価格</p>
<h1>${esc(name)}の不動産相場</h1>
<p class="lead">国土交通省が公表した${esc(full)}の取引${comma(c.total)}件（2005年〜${esc(ctx.dataToLabel)}）から、${kinds.length ? kinds.join('・') : '土地・マンション・戸建て'}の相場をまとめました。</p></header>
${summary ? `<p class="lede">${summary}</p>` : ''}
${cards(s)}
${shogyo}
${trends(idx, name)}
${mansionByAge(idx, s.mansion, name)}
${mansionByMadori(idx, s.mansion, name)}
${kodateByAge(idx, s.kodate, name)}
${tochiByArea(idx, s.tochi, name)}
${sTable}
${dTable}
${nochi}
${faq(q)}
${shareButtons(abs(cityPath(c)), `${full}の不動産相場（実際に売れた価格）`)}
${readNotes()}
<section class="sec"><h2>${esc(pref.name)}のほかの市区町村</h2>${ctx.prefCityLinks(c.pref, c.idx)}</section>
<p class="src-l">${sourceLine(true)}</p>`;

  const descParts = [];
  if (ok(s.tochi)) descParts.push(`土地の坪単価は約${unit(s.tochi.v.med)}`);
  if (ok(s.mansion)) descParts.push(`中古マンションは約${yen(s.mansion.p.med)}`);
  if (ok(s.kodate)) descParts.push(`戸建ては約${yen(s.kodate.p.med)}`);
  return layout({
    title: `${name}${c.ambiguous ? `（${pref.name}）` : ''}の地価・土地坪単価、マンション・戸建て相場【${dataYear()}年】｜${SITE_NAME}`,
    description: `${full}で実際に売れた不動産の価格を国の公開データから集計。${descParts.join('、')}（中央値）。築年数別・間取り別・駅別・地区別の相場と推移も無料で。`,
    path: cityPath(c), body, ld: [bc.ld],
  });
}

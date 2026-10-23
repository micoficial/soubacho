// ランキング（全国・都道府県別）
import { SITE_NAME, PREFS, PREF_BY_CODE, TSUBO, RANK_MIN_N, CHANGE_MIN_N, STRATUM_MIN_N } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, pct, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, table, shareButtons, sourceLine } from '../lib/html.mjs';
import { dataYear } from './common.mjs';

const f2 = (x, k) => { const s = x.sum.f2[k]; return s && s.n >= RANK_MIN_N ? s : null; };

// value: 並べる値（大きい順）、cells: 表の列
export const RANKINGS = [
  {
    slug: 'tochi', entity: 'city', short: '土地の坪単価', title: '土地の坪単価ランキング（市区町村別）',
    lead: '住宅地の土地だけの取引（30〜1,000㎡）の坪単価の中央値が高い順',
    get: (x) => f2(x, 'tochi'), value: (s) => s.v.med,
    head: ['坪単価', '㎡単価', '件数'], cells: (s) => [`${unit(s.v.med)}`, unit(s.v.med / TSUBO), `${comma(s.n)}件`],
    low: '坪単価が安い市区町村',
  },
  {
    slug: 'mansion', entity: 'city', short: 'マンションの坪単価', title: '中古マンションの坪単価ランキング（市区町村別）',
    lead: '中古マンション（住宅用・専有30〜200㎡）の坪単価（㎡単価×3.3）の中央値が高い順',
    get: (x) => f2(x, 'mansion'), value: (s) => s.v.med,
    head: ['坪単価', '70㎡に直すと', '件数'], cells: (s) => [unit(s.v.med * TSUBO), `約${yen(s.v.med * 70)}`, `${comma(s.n)}件`],
    low: '中古マンションが安い市区町村',
  },
  {
    slug: 'eki', entity: 'station', short: '駅別マンション坪単価', title: '駅別 中古マンションの坪単価ランキング',
    lead: '最寄駅ごとの中古マンション（住宅用・専有30〜200㎡）の坪単価の中央値が高い順',
    get: (x) => f2(x, 'mansion'), value: (s) => s.v.med,
    head: ['坪単価', '70㎡に直すと', '件数'], cells: (s) => [unit(s.v.med * TSUBO), `約${yen(s.v.med * 70)}`, `${comma(s.n)}件`],
    low: '中古マンションが安い駅',
  },
  {
    slug: 'kodate', entity: 'city', short: '戸建ての価格', title: '戸建ての価格ランキング（市区町村別）',
    lead: '住宅用の土地と建物の取引（戸建て）の価格の中央値が高い順',
    get: (x) => f2(x, 'kodate'), value: (s) => s.p.med,
    head: ['価格', '土地・建物・築年数', '件数'], cells: (s) => [yen(s.p.med), `${Math.round(s.a.med)}㎡・${s.f ? `${Math.round(s.f.med)}㎡` : '—'}・${s.age ? `築${Math.round(s.age.med)}年` : '—'}`, `${comma(s.n)}件`],
    low: '戸建てが安い市区町村',
  },
  {
    slug: 'neagari-mansion', entity: 'city', short: 'マンションの値上がり率', title: '中古マンションの値上がり率ランキング（5年前比・市区町村別）',
    lead: '中古マンションの㎡単価の中央値が、5年前より大きく上がった順',
    get: (x) => x.sum.chg?.mansion || null, value: (c) => c.ratio, change: true,
    head: ['変化', '中央値（参考）5年前 → 直近', '比べた件数'], cells: (c) => [pct(c.ratio), `${unit(c.a.v.med)} → ${unit(c.b.v.med)}`, `${comma(c.nA)}件・${comma(c.nB)}件`],
    low: '中古マンションの㎡単価が下がった市区町村',
  },
  {
    slug: 'neagari-tochi', entity: 'city', short: '土地の値上がり率', title: '土地の値上がり率ランキング（5年前比・市区町村別）',
    lead: '住宅地の土地の坪単価の中央値が、5年前より大きく上がった順',
    get: (x) => x.sum.chg?.tochi || null, value: (c) => c.ratio, change: true,
    head: ['変化', '中央値（参考）5年前 → 直近', '比べた件数'], cells: (c) => [pct(c.ratio), `坪${unit(c.a.v.med)} → ${unit(c.b.v.med)}`, `${comma(c.nA)}件・${comma(c.nB)}件`],
    low: '土地の坪単価が下がった市区町村',
  },
];

export const rankPath = (r, pref) => `ranking/${r.slug}/${pref ? `${pref.slug}/` : ''}`;

export function rankList(ctx, r, prefCode) {
  const pool = r.entity === 'city' ? ctx.cities : ctx.stations.filter((s) => s.page);
  const list = [];
  for (const x of pool) {
    if (prefCode && x.pref !== prefCode) continue;
    const s = r.get(x);
    if (s) list.push({ x, s, v: r.value(s) });
  }
  list.sort((a, b) => b.v - a.v || b.s.n - a.s.n);
  return list;
}

const nameCell = (ctx, r, x, showPref) => {
  if (r.entity === 'city') return `<a href="${href(`city/${x.code}/`)}">${esc(x.name)}</a>${showPref ? `<small>${esc(PREF_BY_CODE.get(x.pref).name)}</small>` : ''}`;
  const cityNames = (x.cities || []).slice(0, 2).map((c) => c.c.name).join('・');
  return `<a href="${href(x.path)}">${esc(stationLabel(x.name))}</a><small>${esc([showPref ? PREF_BY_CODE.get(x.pref).name : '', cityNames].filter(Boolean).join('・'))}</small>`;
};

function rankTable(ctx, r, rows, showPref, start = 1) {
  return table(['順位', r.entity === 'city' ? '市区町村' : '駅', ...r.head], rows.map((e, k) => [`${start + k}`, nameCell(ctx, r, e.x, showPref), ...r.cells(e.s)]), { num: [2, 3, 4], cls: 'dt rt' });
}

const changeDef = (r) => (r.change ? `<p class="def">変化率は、${r.slug === 'neagari-mansion' ? '築年数の区分' : '地区（町・大字）'}ごとに5年前と直近の中央値を比べたものです。全体の中央値（参考）が下がっていても変化率がプラスになることがあり、それは「取引が安い${r.slug === 'neagari-mansion' ? '古い物件' : '地区'}に移った」など、取引された物件の組み合わせが変わったためです。</p>` : '');

function periodNote(ctx, r) {
  if (r.change) return `直近2年（${period(ctx.lastQ - 7, ctx.lastQ)}）と5年前の2年間（${period(ctx.lastQ - 27, ctx.lastQ - 20)}）を比べました。新しい物件の取引が増えた・広い土地の取引が多かったなど、取引された物件の組み合わせが変わっただけで数字が跳ねないよう、${r.slug === 'neagari-mansion' ? '築年数の区分ごと' : '地区（町・大字）ごと'}に両方の期間の中央値を比べ、その変化率を件数で重みをつけて真ん中の値をとっています（両方の期間に${STRATUM_MIN_N}件以上ある区分だけを使用）。比べやすさのため国の取引価格情報（アンケート）だけを使い、比べられた取引がどちらの期間も${CHANGE_MIN_N}件以上の${r.entity === 'city' ? '市区町村' : '駅'}が対象です。表の中央値は参考で、変化率とは一致しないことがあります。`;
  return `直近2年（${period(ctx.lastQ - 7, ctx.lastQ)}）の取引が${RANK_MIN_N}件以上の${r.entity === 'city' ? '市区町村' : '駅'}が対象です。`;
}

function notes(ctx, r) {
  return `<section class="card"><h2>このランキングについて</h2><ul class="ul">
<li>${esc(r.lead)}に並べました。${periodNote(ctx, r)}</li>
<li>中央値は、その期間に取引された物件の構成（広さ・築年数・立地）でも変わります。${r.change ? '新しいマンションの取引が増えた、駅前の取引が多かった、などでも値上がり率は大きくなります。' : ''}件数もあわせてご覧ください。</li>
<li>国土交通省の「不動産取引価格情報」「成約価格情報」を集計したものです${r.change ? '（値上がり率は取引価格情報のみ）' : ''}。競売・親族間の取引など事情のある取引は除いています。</li>
<li>${sourceLine(true)}。</li>
</ul></section>`;
}

const prefLinks = (r) => `<ul class="grid">${PREFS.map((p) => `<li><a href="${href(rankPath(r, p))}">${esc(p.short)}</a></li>`).join('')}</ul>`;
const otherLinks = (r, pref) => `<ul class="chips">${RANKINGS.filter((x) => x !== r).map((x) => `<li><a href="${href(rankPath(x, pref))}">${esc(pref ? `${pref.name}の${x.short}` : x.short)}</a></li>`).join('')}</ul>`;

export function renderRanking(ctx, r) {
  const list = rankList(ctx, r);
  const top = list.slice(0, r.entity === 'station' ? 200 : 100);
  const low = list.slice(-50).reverse();
  const bc = breadcrumbs([['トップ', ''], ['ランキング', 'ranking/'], [r.title, null]]);
  const top3 = top.slice(0, 3).map((e) => (r.entity === 'city' ? e.x.name : stationLabel(e.x.name))).join('、');
  const body = `${bc.html}
<header class="ph"><p class="eyebrow">${dataYear()}年版・実際に売れた価格</p><h1>${esc(r.title)}</h1>
<p class="lead">${esc(r.lead)}に、全国の${r.entity === 'city' ? '市区町村' : '駅'}を並べました（対象 ${comma(list.length)}${r.entity === 'city' ? '市区町村' : '駅'}）。1位は${esc(top3.split('、')[0] || '—')}でした。</p></header>
${changeDef(r)}
<section class="sec"><h2>上位${top.length}${r.entity === 'city' ? '市区町村' : '駅'}</h2>${rankTable(ctx, r, top, true)}</section>
${low.length && list.length > top.length ? `<section class="sec"><h2>${esc(r.low)}（下から${low.length}）</h2>${table(['', r.entity === 'city' ? '市区町村' : '駅', ...r.head], low.map((e) => ['', nameCell(ctx, r, e.x, true), ...r.cells(e.s)]), { num: [2, 3, 4], cls: 'dt rt' })}</section>` : ''}
<section class="card"><h2>都道府県別に見る</h2>${prefLinks(r)}</section>
${shareButtons(abs(rankPath(r)), `${r.title}（${dataYear()}年）トップ3：${top3}`)}
${notes(ctx, r)}
<section class="sec"><h2>ほかのランキング</h2>${otherLinks(r)}</section>`;
  return layout({
    title: `${r.title}【${dataYear()}年】全国｜${SITE_NAME}`,
    description: `${r.lead}。国土交通省の取引価格の公開データから全国の${r.entity === 'city' ? '市区町村' : '駅'}を比較。上位は${top3}。都道府県別ランキングも。`,
    path: rankPath(r), body, ld: [bc.ld, itemList(top.slice(0, 10), r)],
  });
}

export function renderRankingPref(ctx, r, pref) {
  const list = rankList(ctx, r, pref.code);
  const shown = list.slice(0, 300);
  const bc = breadcrumbs([['トップ', ''], ['ランキング', 'ranking/'], [r.title, rankPath(r)], [pref.name, null]]);
  const title = `${pref.name}の${r.title.replace(/（.*?）$/, '')}`;
  const top3 = shown.slice(0, 3).map((e) => (r.entity === 'city' ? e.x.name : stationLabel(e.x.name))).join('、');
  const body = `${bc.html}
<header class="ph"><p class="eyebrow">${dataYear()}年版・実際に売れた価格</p><h1>${esc(title)}</h1>
<p class="lead">${esc(r.lead)}に、${esc(pref.name)}の${r.entity === 'city' ? '市区町村' : '駅'}を並べました（対象 ${comma(list.length)}）。</p></header>
${changeDef(r)}
${shown.length ? `<section class="sec">${rankTable(ctx, r, shown, false)}</section>` : `<p>${esc(pref.name)}には、ランキングの条件（件数）を満たす${r.entity === 'city' ? '市区町村' : '駅'}がありませんでした。<a href="${href(`ken/${pref.slug}/`)}">${esc(pref.name)}のページ</a>で、件数の少ない地域の相場も見られます。</p>`}
${shown.length ? shareButtons(abs(rankPath(r, pref)), `${title}（${dataYear()}年）トップ3：${top3}`) : ''}
${notes(ctx, r)}
<section class="sec"><h2>${esc(pref.name)}のほかのランキング</h2>${otherLinks(r, pref)}</section>
<section class="card"><h2>ほかの都道府県</h2>${prefLinks(r)}</section>`;
  return layout({
    title: `${title}【${dataYear()}年】｜${SITE_NAME}`,
    description: `${pref.name}の${r.entity === 'city' ? '市区町村' : '駅'}を、${r.lead}に並べたランキング。国土交通省の取引価格の公開データから。${top3 ? `上位は${top3}。` : ''}`,
    path: rankPath(r, pref), body, ld: [bc.ld],
  });
}

function itemList(list, r) {
  return { '@type': 'ItemList', itemListElement: list.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(r.entity === 'city' ? `city/${e.x.code}/` : e.x.path), name: r.entity === 'city' ? e.x.name : stationLabel(e.x.name) })) };
}

export function renderRankingIndex(ctx) {
  const bc = breadcrumbs([['トップ', ''], ['ランキング', null]]);
  const tiles = RANKINGS.map((r) => {
    const top = rankList(ctx, r).slice(0, 5);
    return `<li class="tile"><a class="tile-h" href="${href(rankPath(r))}">${esc(r.title)}</a><ol>${top.map((e, k) => `<li><span>${k + 1}</span><a href="${href(r.entity === 'city' ? `city/${e.x.code}/` : e.x.path)}">${esc(r.entity === 'city' ? `${e.x.name}（${PREF_BY_CODE.get(e.x.pref).short}）` : stationLabel(e.x.name))}</a><em>${r.cells(e.s)[0]}</em></li>`).join('')}</ol></li>`;
  }).join('');
  const body = `${bc.html}<header class="ph"><h1>不動産の相場ランキング</h1>
<p class="lead">国土交通省が公表した実際の取引価格から、土地の坪単価・中古マンションの坪単価・戸建ての価格・値上がり率を、市区町村別・駅別に並べました。</p></header>
<ul class="tiles">${tiles}</ul>
<section class="card"><h2>都道府県別のランキング</h2>${PREFS.map((p) => `<p class="sub">${esc(p.name)}</p><ul class="chips">${RANKINGS.map((r) => `<li><a href="${href(rankPath(r, p))}">${esc(r.short)}</a></li>`).join('')}</ul>`).join('')}</section>`;
  return layout({
    title: `不動産の相場ランキング（土地の坪単価・マンション・駅別・値上がり率）【${dataYear()}年】｜${SITE_NAME}`,
    description: '土地の坪単価、中古マンションの坪単価、駅別のマンション相場、戸建ての価格、5年間の値上がり率のランキング。国土交通省の取引価格の公開データから、全国・都道府県別に。',
    path: 'ranking/', body, ld: [bc.ld],
  });
}

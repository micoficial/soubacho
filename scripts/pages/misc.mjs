// トップ・このサイトについて・検索・404
import { SITE_NAME, OPERATOR, OPERATOR_ID, CONTACT, SOURCE, TSUBO, MIN_N, PREFER_N, RANK_MIN_N, CHANGE_MIN_N, DISTRICT_MIN_N, STATION_MIN_N } from '../lib/meta.mjs';
import { esc, yen, unit, comma, period, qLabel, stationLabel } from '../lib/format.mjs';
import { layout, breadcrumbs, href, abs, sourceLine, buildInfo } from '../lib/html.mjs';
import { cards, ok, dataYear } from './common.mjs';
import { RANKINGS, rankList, rankPath } from './ranking.mjs';
import { prefGrid } from './pref.mjs';

export function renderTop(ctx) {
  const info = buildInfo();
  const total = ctx.rows;
  const tiles = RANKINGS.slice(0, 4).map((r) => {
    const top = rankList(ctx, r).slice(0, 5);
    return `<li class="tile"><a class="tile-h" href="${href(rankPath(r))}">${esc(r.title.replace(/（.*?）$/, ''))}</a><ol>${top.map((e, k) => `<li><span>${k + 1}</span><a href="${href(r.entity === 'city' ? `city/${e.x.code}/` : e.x.path)}">${esc(r.entity === 'city' ? e.x.name : stationLabel(e.x.name))}</a><em>${r.cells(e.s)[0]}</em></li>`).join('')}</ol></li>`;
  }).join('');
  const feat = ctx.featured.map((x) => `<a href="${href(x.path)}">${esc(x.label)}</a>`).join('');
  const body = `<section class="hero">
<p class="hero-k">無料・登録なし・${comma(Math.floor(total / 10000))}万件の取引から</p>
<h1>まちの<span>相場帳</span></h1>
<p class="hero-l">土地・中古マンション・戸建てが、<b>実際にいくらで売れたか</b>。国土交通省が公表している取引価格を、市区町村・駅・町ごとに見やすくまとめました。</p>
<form class="sb sb-big" role="search" action="${href('search/')}">
<input class="sb-i" name="q" type="search" placeholder="市区町村・駅・町名を入れてください（例：吉祥寺）" autocomplete="off" aria-label="市区町村・駅・町名で検索" enterkeyhint="search">
<div class="sb-r" hidden></div>
</form>
<p class="hero-ex">よく調べられる駅：${feat}</p>
</section>
<section class="sec"><h2>全国の相場（直近）</h2>${cards(ctx.national)}</section>
<section class="sec"><h2>都道府県から探す</h2>${prefGrid(ctx)}</section>
<section class="sec"><h2>ランキング</h2><ul class="tiles">${tiles}</ul><p class="more"><a href="${href('ranking/')}">すべてのランキングを見る（駅別・値上がり率・都道府県別も）</a></p></section>
<section class="card why"><h2>なぜ無料なのか</h2>
<p>「このあたりの土地はいくら？」「この駅のマンションは築20年でいくら？」——こうした相場は、不動産会社の査定や、相場サイトの有料会員でしか見られないと思われがちです。でも実は、国土交通省が、実際に取引された価格を毎四半期公表しています（取引した人へのアンケートと、不動産会社の物件情報網レインズの成約価格）。</p>
<p>ただ、国のデータは1件ずつの一覧で、地域の相場として読むには集計が必要でした。${SITE_NAME}は、その${comma(total)}件をプログラムで集計し、市区町村・駅・町ごとの中央値、築年数別・広さ別の相場、推移にまとめています。人の手で調べて書く代わりにプログラムで処理しているので、無料で、国のデータが新しくなるたびに作り直せます。</p>
<p class="more"><a href="${href('about/')}">データと集計のしかたを見る</a></p></section>
<section class="card"><h2>使い方</h2><ol class="ul">
<li>上の検索に、市区町村・駅・町の名前を入れます。</li>
<li>土地の坪単価、中古マンション・戸建ての価格の中央値と、築年数別・駅からの時間別の相場が出ます。</li>
<li>売る・買うの前の「相場の目安」に。実際の価格は個々の条件で変わるので、査定や専門家の意見とあわせて使ってください。</li>
</ol></section>
<p class="updated">データ：${esc(info.dataTo)}までの取引（${esc(info.built)}に更新）</p>`;
  const ld = [{
    '@type': 'WebSite', name: SITE_NAME, url: abs(''), inLanguage: 'ja',
    potentialAction: { '@type': 'SearchAction', target: `${abs('search/')}?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  }];
  return layout({
    title: `${SITE_NAME}｜土地の坪単価・マンション・戸建ての「実際に売れた価格」を市区町村・駅ごとに（無料）`,
    description: `国土交通省が公表した${comma(Math.floor(total / 10000))}万件の不動産取引価格から、土地の坪単価、中古マンション・戸建ての相場を市区町村・駅・町ごとに集計。築年数別・駅からの時間別の相場、推移、ランキングも。無料・登録不要。`,
    path: '', body, ld,
  });
}

export function renderAbout(ctx) {
  const info = buildInfo();
  const bc = breadcrumbs([['トップ', ''], ['このサイトについて', null]]);
  const ex = Object.entries(ctx.excluded).map(([k, v]) => `<li>${esc(k)}：${comma(v)}件</li>`).join('');
  const body = `${bc.html}<header class="ph"><h1>このサイトについて</h1>
<p class="lead">${SITE_NAME}は、国土交通省が公表している不動産の取引価格を、地域ごとの相場として読みやすく集計した無料のサイトです。</p></header>
<section class="card"><h2>使っているデータ</h2>
<ul class="ul">
<li><b>不動産取引価格情報</b>（国土交通省）：土地や建物を取引した人へのアンケートをもとに、物件が特定されないよう加工して公表されている取引価格です。2005年7月以降。</li>
<li><b>成約価格情報</b>（国土交通省）：不動産会社が使う物件情報網「レインズ」に登録された成約価格を、国が加工して公表しているものです。2021年以降のマンションと戸建て。</li>
<li>どちらも国土交通省の「<a href="${SOURCE.url}" rel="noopener">不動産情報ライブラリ</a>」からダウンロードしたものです（公共データ利用規約 第1.0版。商用利用可、出典の記載が必要）。</li>
<li>いま使っているデータ：${esc(info.dataTo)}までの取引 ${comma(ctx.rows)}件（国のファイルの作成日：${esc(info.fileDate || '—')}）。国は四半期ごとにデータを追加しており、${SITE_NAME}も公表を確かめてから作り直します。</li>
</ul></section>
<section class="card"><h2>集計のしかた</h2>
<ul class="ul">
<li><b>中央値</b>：取引の価格を安い順に並べて、ちょうど真ん中の値です。ごく一部の高い取引に引っぱられにくいため、平均ではなく中央値を使っています。「真ん中の半分」は、安い方から25%〜75%の範囲です。</li>
<li><b>期間</b>：まず直近2年（8四半期）で集計し、件数が${PREFER_N}件に満たないときは直近5年、それでも足りないときは直近10年に広げます。どの期間の何件かは、数字の横に書いています。${MIN_N}件未満のときは数字を出しません（個々の取引が分かってしまうのを避けるため）。</li>
<li><b>土地（住宅地）</b>：「宅地（土地）」のうち、地域が「住宅地」で、広さが30〜1,000㎡の取引。坪単価は「総額÷広さ×${TSUBO}」で計算しています。</li>
<li><b>中古マンション</b>：「中古マンション等」のうち、用途が住宅（または空欄）で、専有面積が30〜200㎡の取引。㎡単価は「総額÷専有面積」、坪単価は㎡単価×${TSUBO}、「70㎡に直すと」は㎡単価×70㎡です。間取り別の表だけは15㎡以上を含めています。</li>
<li><b>戸建て</b>：「宅地（土地と建物）」のうち、住宅地で用途が住宅だけの取引（成約価格情報は戸建ての取引）。土地30〜1,000㎡、建物30〜500㎡。</li>
<li><b>除いた取引</b>：「取引の事情等」に記載がある取引（競売・調停、関係者間の取引、隣の土地の購入、私道を含む取引など）は、相場から外れやすいため集計していません。<ul class="ul">${ex}</ul></li>
<li><b>推移</b>：年ごとの中央値です。取引価格情報が全国をほぼ対象にした2008年からの線にしています。取引価格情報と成約価格情報は集め方が違い、同じ地域でも水準が違うことがあるため、線を分けています。</li>
<li><b>ページを作る地域</b>：地区（町・大字）は直近10年の取引が${DISTRICT_MIN_N}件以上、駅は${STATION_MIN_N}件以上の場合にページを作っています。駅は国のデータの「最寄駅」でまとめています。</li>
<li><b>ランキング</b>：直近2年の取引が${RANK_MIN_N}件以上の地域が対象です。値上がり率は、直近2年と5年前の2年間を、取引価格情報だけで比べています（どちらも${CHANGE_MIN_N}件以上）。</li>
</ul></section>
<section class="card"><h2>読むときの注意</h2>
<ul class="ul">
<li>価格は実際に取引された価格の集計で、個々の物件の価値を示すものではありません。広さ・築年数・駅からの距離・日当たり・道路の状況などで価格は大きく変わります。</li>
<li>中央値は、その期間にどんな物件が取引されたか（新しい物件が多い、広い土地が多いなど）でも動きます。件数の少ない地域では、数件の取引で大きく変わります。</li>
<li>「実際の取引価格（実勢価格）」は、国が毎年公表する「地価公示」「都道府県地価調査」の価格（標準的な土地の1㎡あたりの価格）とは別のものです。</li>
<li>国のデータは、最新の四半期の件数が次の公表で増えることがあります。また、取引価格情報と成約価格情報には、同じ取引が両方に入っている場合があります。</li>
<li>このサイトの情報をもとにした判断で生じた損害について、運営者は責任を負いかねます。売却・購入のときは、不動産会社の査定や専門家の意見もあわせてご確認ください。</li>
</ul></section>
<section class="card"><h2>出典</h2><p>${sourceLine()}</p>
<p>このサイトは国土交通省や不動産情報ライブラリが運営・監修しているものではありません。</p></section>
<section class="card" id="privacy"><h2>プライバシー</h2>
<p>このサイトは、Cookie やアクセス解析を使っていません。検索は、索引をお使いの端末に読み込んで照合しており、入力した文字を外に送りません。ページは GitHub Pages で配信しているため、配信のしくみ上、GitHub がアクセスの記録（IPアドレスなど）を扱います。</p></section>
<section class="card"><h2>運営者</h2>
<dl class="dl"><div><dt>運営</dt><dd>${OPERATOR}（法人番号 ${OPERATOR_ID}）</dd></div><div><dt>連絡先</dt><dd>${esc(CONTACT)}</dd></div></dl>
<p class="note">誤りに気づいたときは、上の連絡先までお知らせください。国のデータそのものの誤りは、出典元の不動産情報ライブラリでご確認ください。</p></section>`;
  return layout({ title: `このサイトについて（データと集計のしかた）｜${SITE_NAME}`, description: `${SITE_NAME}が使っている国土交通省の取引価格データ、中央値・期間・除外の決め方、読むときの注意、出典、運営者について。`, path: 'about/', body, ld: [bc.ld] });
}

export function renderSearch() {
  const bc = breadcrumbs([['トップ', ''], ['検索', null]]);
  const body = `${bc.html}<header class="ph"><h1>検索</h1></header>
<form class="sb sb-big sb-page" role="search" action="${href('search/')}">
<input class="sb-i" name="q" type="search" placeholder="市区町村・駅・町名（例：武蔵小杉）" autocomplete="off" aria-label="市区町村・駅・町名で検索" enterkeyhint="search">
<div class="sb-r" hidden></div>
</form>
<div id="results" class="results"><p class="note">市区町村・駅・町（地区）の名前の一部を入れてください。</p></div>`;
  return layout({ title: `検索｜${SITE_NAME}`, description: '市区町村・駅・町名から不動産の相場を探す', path: 'search/', body, noindex: true });
}

export function render404() {
  const body = `<header class="ph"><h1>ページが見つかりません</h1>
<p class="lead">お探しのページは移動したか、まだ作られていません（取引の少ない地区・駅はページを作っていないことがあります）。市区町村・駅・町の名前で探してください。</p></header>
<form class="sb sb-big sb-page" role="search" action="${href('search/')}">
<input class="sb-i" name="q" type="search" placeholder="市区町村・駅・町名" autocomplete="off" aria-label="市区町村・駅・町名で検索" enterkeyhint="search">
<div class="sb-r" hidden></div>
</form>
<p class="more"><a href="${href('')}">トップへ</a>・<a href="${href('ken/')}">都道府県から探す</a></p>`;
  return layout({ title: `ページが見つかりません｜${SITE_NAME}`, description: 'お探しのページは見つかりませんでした。', path: '404.html', body, noindex: true });
}

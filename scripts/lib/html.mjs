// ページの枠・パンくず・出典・表・グラフ
import { SITE_NAME, OPERATOR, SOURCE } from './meta.mjs';
import { esc } from './format.mjs';

export const ORIGIN = process.env.SITE_ORIGIN || 'https://micoficial.github.io';
export const BASE = process.env.SITE_BASE || '/soubacho/';
// ページ内のリンクは日本語のまま書く（ブラウザが送るときに % に置き換える。% にすると1文字9バイトで重い）
// 正式な URL（canonical・サイトマップ・シェア）は % に置き換える
export const href = (p) => `${BASE}${esc(p)}`;
export const abs = (p) => `${ORIGIN}${BASE}${encodeURI(p)}`;

let ASSET_V = '1';
export const setAssetVersion = (v) => { ASSET_V = v; };
let BUILD = { built: '', dataTo: '', fileDate: '' };
export const setBuildInfo = (b) => { BUILD = b; };
export const buildInfo = () => BUILD;

export function breadcrumbs(items) {
  // items: [[名前, パス|null], ...]
  const li = items.map(([name, p], i) => (p != null && i < items.length - 1
    ? `<li><a href="${href(p)}">${esc(name)}</a></li>`
    : `<li aria-current="page">${esc(name)}</li>`)).join('');
  const ld = {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(p != null ? { item: abs(p) } : {}) })),
  };
  return { html: `<nav class="bc" aria-label="現在地"><ol>${li}</ol></nav>`, ld };
}

// 出典（不動産情報ライブラリ利用規約の記載例に合わせる）
export function sourceLine(short = false) {
  const link = `<a href="${SOURCE.url}" rel="noopener">${SOURCE.name}</a>`;
  if (short) return `出典：${SOURCE.org} ${link}（「${SOURCE.contents.join('」「')}」を加工して作成）`;
  return `出典：${SOURCE.org}　${link}（${SOURCE.url}）。「${SOURCE.contents.join('」「')}」（${SOURCE.org}）をもとに${OPERATOR}が加工して作成。国が作成したものではありません。`;
}

export function shareButtons(url, text) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const hatena = url.replace(/^https:\/\//, 's/');
  return `<div class="share" data-url="${esc(url)}">
<span class="share-l">シェア</span>
<a class="sh sh-x" href="https://x.com/intent/post?text=${t}&amp;url=${u}" target="_blank" rel="noopener">X</a>
<a class="sh sh-line" href="https://social-plugins.line.me/lineit/share?url=${u}" target="_blank" rel="noopener">LINE</a>
<a class="sh sh-hb" href="https://b.hatena.ne.jp/entry/${esc(hatena)}" target="_blank" rel="noopener">はてブ</a>
<button class="sh sh-copy" type="button">リンクをコピー</button>
</div>`;
}

export function layout({ title, description, path, body, ld = [], noindex = false }) {
  const canonical = abs(path);
  const graph = ld.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}</script>\n` : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${abs('assets/og.png')}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#24543f">
<link rel="icon" href="${href('assets/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${href('assets/icon-180.png')}">
<link rel="stylesheet" href="${href(`assets/style.css?v=${ASSET_V}`)}">
<script defer src="${href(`assets/app.js?v=${ASSET_V}`)}"></script>
${graph}</head>
<body>
<header class="hd">
<div class="wrap hd-in">
<a class="logo" href="${href('')}"><span class="logo-m" aria-hidden="true">相</span><span>${SITE_NAME}</span></a>
<form class="sb" role="search" action="${href('search/')}">
<input class="sb-i" name="q" type="search" placeholder="市区町村・駅・町名で検索（例：武蔵小杉）" autocomplete="off" aria-label="市区町村・駅・町名で検索" enterkeyhint="search">
<div class="sb-r" hidden></div>
</form>
<nav class="nv" aria-label="メニュー"><a href="${href('ken/')}">都道府県</a><a href="${href('ranking/')}">ランキング</a><a href="${href('about/')}">使い方</a></nav>
</div>
</header>
<main class="wrap">
${body}
</main>
<footer class="ft">
<div class="wrap">
<p class="ft-src">${sourceLine()}</p>
<p>価格は実際に取引された物件の価格を集計したもので、個々の物件の価値や「この価格で売れる・買える」ことを示すものではありません。広さ・築年数・立地などの条件で価格は大きく変わります。</p>
<nav class="ft-nv"><a href="${href('')}">トップ</a><a href="${href('ken/')}">都道府県から探す</a><a href="${href('ranking/')}">ランキング</a><a href="${href('about/')}">このサイトについて</a><a href="${href('about/#privacy')}">プライバシー</a></nav>
<p class="ft-c">© ${new Date().getFullYear()} ${OPERATOR}　｜　データ：${esc(BUILD.dataTo)}まで（${esc(BUILD.built)}更新）</p>
</div>
</footer>
</body>
</html>
`;
}

// 表。head: 見出しの配列、rows: 行（セルの HTML の配列）。数字の列は右寄せ（num に列番号）
export function table(head, rows, { caption = '', num = [], cls = 'dt', sortable = false } = {}) {
  if (!rows.length) return '';
  const th = head.map((h, k) => `<th${num.includes(k) ? ' class="r"' : ''}${sortable ? ' data-k="' + k + '"' : ''}>${h}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c, k) => `<td${num.includes(k) ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('\n');
  return `<div class="tw"><table class="${cls}${sortable ? ' sortable' : ''}">${caption ? `<caption>${caption}</caption>` : ''}<thead><tr>${th}</tr></thead><tbody>
${tr}
</tbody></table></div>`;
}

// 折れ線グラフ（年ごとの中央値）。series: [{ name, cls, pts: [{ y, med }] }]
export function lineChart(series, { fmt, label }) {
  const pts = series.flatMap((s) => s.pts.filter((p) => p.med != null));
  if (pts.filter((p) => p).length < 3) return '';
  const years = series.flatMap((s) => s.pts.map((p) => p.y));
  const x0 = Math.min(...years);
  const x1 = Math.max(...years);
  let lo = Math.min(...pts.map((p) => p.med));
  let hi = Math.max(...pts.map((p) => p.med));
  const pad = (hi - lo) * 0.12 || hi * 0.1;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const W = 600;
  const H = 210;
  const L = 58;
  const R = 14;
  const T = 12;
  const B = 26;
  const sx = (y) => L + ((y - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const sy = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  // 目盛り（4本）
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/><text x="${L - 6}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(v))}</text>`).join('');
  const step = x1 - x0 > 12 ? 4 : x1 - x0 > 6 ? 2 : 1;
  const xl = [];
  for (let y = x1; y >= x0; y -= step) xl.unshift(y);
  const xs = xl.map((y) => `<text x="${sx(y).toFixed(1)}" y="${H - 6}" text-anchor="middle">${y}</text>`).join('');
  const lines = series.map((s) => {
    const segs = [];
    let cur = [];
    for (const p of s.pts) {
      if (p.med == null) { if (cur.length) segs.push(cur); cur = []; continue; }
      cur.push(`${sx(p.y).toFixed(1)},${sy(p.med).toFixed(1)}`);
    }
    if (cur.length) segs.push(cur);
    const last = [...s.pts].reverse().find((p) => p.med != null);
    return segs.map((sg) => (sg.length > 1 ? `<polyline class="${s.cls}" points="${sg.join(' ')}"/>` : `<circle class="${s.cls}" cx="${sg[0].split(',')[0]}" cy="${sg[0].split(',')[1]}" r="2.5"/>`)).join('')
      + (last ? `<circle class="${s.cls} dot" cx="${sx(last.y).toFixed(1)}" cy="${sy(last.med).toFixed(1)}" r="3.5"/>` : '');
  }).join('');
  const legend = series.filter((s) => s.pts.some((p) => p.med != null)).map((s) => `<span class="lg ${s.cls}">${esc(s.name)}</span>`).join('');
  return `<figure class="ch"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><g class="ch-g">${grid}${xs}</g>${lines}</svg><figcaption>${legend}</figcaption></figure>`;
}

export function pager(basePath, page, pages) {
  if (pages <= 1) return '';
  const link = (p) => (p === page ? `<span aria-current="page">${p}</span>` : `<a href="${href(p === 1 ? basePath : `${basePath}${p}/`)}">${p}</a>`);
  const items = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) items.push(link(p));
    else if (items[items.length - 1] !== '…') items.push('…');
  }
  return `<nav class="pg" aria-label="ページ">${items.join('')}</nav>`;
}

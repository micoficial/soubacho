// 不動産情報ライブラリの CSV → 静的サイト（dist/）
// 使い方: node scripts/build.mjs   （先に bash scripts/fetch.sh でデータを data/raw/torihiki/ に置く）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadAll, groupBy } from './lib/load.mjs';
import { initStats, stat, change, windowFrom, KINDS } from './lib/stats.mjs';
import { PREFS, PREF_BY_CODE, WINDOWS, MIN_N, PREFER_N, RANK_MIN_N, DISTRICT_MIN_N, STATION_MIN_N, SITE_NAME } from './lib/meta.mjs';
import { qEnd, stationLabel, stationBase, comma } from './lib/format.mjs';
import { setAssetVersion, setBuildInfo, abs, BASE } from './lib/html.mjs';
import { renderCity, cityPath } from './pages/city.mjs';
import { renderDistrict } from './pages/district.mjs';
import { renderStation } from './pages/station.mjs';
import { renderPref, renderPrefIndex, prefPath } from './pages/pref.mjs';
import { RANKINGS, renderRanking, renderRankingPref, renderRankingIndex, rankList } from './pages/ranking.mjs';
import { renderTop, renderAbout, renderSearch, render404 } from './pages/misc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw', 'torihiki');
const DIST = path.join(ROOT, 'dist');
const LIMIT = process.env.LIMIT ? +process.env.LIMIT : 0; // 試しに地区・駅のページを少しだけ作るとき

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const data = await loadAll(RAW);
const { col, cities, districts, stations, lastQ } = data;
log('loaded', comma(data.rows), 'rows,', comma(col.n), 'used,', cities.length, 'cities,', districts.length, 'districts,', stations.length, 'stations, last', qEnd(lastQ));
initStats(col, lastQ);

// ---- 地域ごとの取引の一覧 ----
const byCity = groupBy(col.n, (i) => col.C[i], cities.length);
const byDist = groupBy(col.n, (i) => col.D[i], districts.length);
const bySt = groupBy(col.n, (i) => col.E[i], stations.length);
const byPref = groupBy(col.n, (i) => cities[col.C[i]].pref, 48);
const all = new Uint32Array(col.n).map((_, i) => i);

// ---- 集計 ----
const choose = (ws) => {
  for (let w = 0; w < ws.length; w++) {
    const last = w === ws.length - 1;
    if (ws[w].n >= (last ? MIN_N : PREFER_N)) return { ...ws[w], window: WINDOWS[w] };
  }
  return null;
};
function sumOf(idx, { farm = false, chg = false } = {}) {
  const out = { f2: {}, f5: {}, f10: {} };
  for (const k of ['tochi', 'mansion', 'kodate', 'shogyo', ...(farm ? ['nochi'] : [])]) {
    const ws = WINDOWS.map((w) => stat(idx, k, { from: windowFrom(w.q) }));
    [out.f2[k], out.f5[k], out.f10[k]] = ws;
    out[k] = choose(ws);
  }
  if (chg) out.chg = { tochi: change(idx, 'tochi'), mansion: change(idx, 'mansion') };
  return out;
}
const resN = (f) => f.tochi.n + f.mansion.n + f.kodate.n;

const nameCount = new Map();
for (const c of cities) nameCount.set(c.name, (nameCount.get(c.name) || 0) + 1);
for (const c of cities) {
  c.ambiguous = nameCount.get(c.name) > 1;
  const idx = byCity(c.idx);
  c.sum = sumOf(idx, { farm: true, chg: true });
  c.total = idx.length;
  c.n2 = resN(c.sum.f2);
  c.n10 = resN(c.sum.f10);
  c.path = cityPath(c);
}
log('city stats');

// パスに使えない文字を置き換える（Windows でも Linux でも同じ名前になるように）
const used = new Set();
function seg(prefix, name) {
  let s = name.replace(/[\\/:*?"<>|#%\u0000-\u001f]/g, '_').replace(/[. ]+$/, '');
  let p = `${prefix}${s}/`;
  for (let k = 2; used.has(p); k++) p = `${prefix}${s}-${k}/`;
  used.add(p);
  return p;
}
for (const d of districts) {
  const idx = byDist(d.idx);
  d.sum = sumOf(idx);
  d.total = idx.length;
  d.n10 = resN(d.sum.f10);
  d.page = d.n10 >= DISTRICT_MIN_N;
  if (d.page) d.path = seg(`city/${cities[d.city].code}/`, d.name);
}
log('district stats', districts.filter((d) => d.page).length, 'pages');
for (const s of stations) {
  const idx = bySt(s.idx);
  s.sum = sumOf(idx, { chg: true });
  s.total = idx.length;
  s.n10 = resN(s.sum.f10);
  s.page = s.n10 >= STATION_MIN_N;
  if (s.page) s.path = seg('eki/', s.name);
}
log('station stats', stations.filter((s) => s.page).length, 'pages');
const prefSum = new Map();
const prefTotal = new Map();
for (const p of PREFS) {
  const idx = byPref(p.code);
  prefSum.set(p.code, sumOf(idx, { chg: true }));
  prefTotal.set(p.code, idx.length);
}
const national = sumOf(all);
log('pref & national stats');

// ---- 県内の順位（直近2年・件数が足りる地域だけ） ----
function rankWithin(list, kind, key) {
  const byPrefList = new Map();
  for (const x of list) {
    const s = x.sum.f2[kind];
    if (!s || s.n < RANK_MIN_N) continue;
    (byPrefList.get(x.pref) || byPrefList.set(x.pref, []).get(x.pref)).push([x, s.v.med]);
  }
  for (const l of byPrefList.values()) {
    l.sort((a, b) => b[1] - a[1]);
    l.forEach(([x], k) => { (x.rank ||= {})[key] = { rank: k + 1, of: l.length }; });
  }
}
rankWithin(cities, 'tochi', 'tochi');
rankWithin(cities, 'mansion', 'mansion');
rankWithin(stations.filter((s) => s.page), 'mansion', 'mansion');

// ---- 市区町村・地区・駅のつながり（直近10年の住宅の取引で数える） ----
const from10 = windowFrom(40);
const isRes = (i) => KINDS.tochi(i) || KINDS.mansion(i) || KINDS.kodate(i);
const cityStation = new Map();
const distStation = new Map();
const stationDist = new Map();
const stationCity = new Map();
for (let i = 0; i < col.n; i++) {
  if (col.Q[i] < from10 || !isRes(i)) continue;
  const c = col.C[i];
  const e = col.E[i];
  const d = col.D[i];
  if (e >= 0) {
    const k1 = c * 10000 + e;
    cityStation.set(k1, (cityStation.get(k1) || 0) + 1);
    if (d >= 0) {
      const k2 = d * 10000 + e;
      let x = distStation.get(k2);
      if (!x) distStation.set(k2, (x = { n: 0, w: [] }));
      x.n++;
      if (col.W[i] !== 255) x.w.push(col.W[i]);
    }
  }
}
for (const [k, n] of cityStation) {
  const c = Math.floor(k / 10000);
  const e = k % 10000;
  const city = cities[c];
  (city.stations ||= []).push({ ...stationRef(stations[e]), local: n });
  (stationCity.get(e) || stationCity.set(e, []).get(e)).push({ c: city, n });
}
function stationRef(s) { return { name: s.name, path: s.path, page: s.page, sum: s.sum, n10: s.n10 }; }
for (const [k, x] of distStation) {
  const d = Math.floor(k / 10000);
  const e = k % 10000;
  x.w.sort((a, b) => a - b);
  (districts[d].stations ||= []).push({ st: stations[e], n: x.n, walk: x.w.length ? x.w[Math.floor(x.w.length / 2)] : null });
  (stationDist.get(e) || stationDist.set(e, []).get(e)).push({ d: districts[d], n: x.n });
}
for (const c of cities) c.stations = (c.stations || []).filter((x) => x.local >= MIN_N).sort((a, b) => b.local - a.local);
for (const d of districts) {
  d.stations = (d.stations || []).sort((a, b) => b.n - a.n);
  (cities[d.city].districts ||= []).push(d);
}
for (const c of cities) (c.districts || []).sort((a, b) => b.n10 - a.n10 || a.name.localeCompare(b.name, 'ja'));
for (const s of stations) {
  s.cities = (stationCity.get(s.idx) || []).sort((a, b) => b.n - a.n);
  s.districts = (stationDist.get(s.idx) || []).sort((a, b) => b.n - a.n);
  s.mainCity = s.cities[0]?.c || null;
}
const stationsByCity = new Map();
for (const s of stations) {
  if (!s.page || !s.mainCity) continue;
  (stationsByCity.get(s.mainCity.idx) || stationsByCity.set(s.mainCity.idx, []).get(s.mainCity.idx)).push(s);
}
for (const l of stationsByCity.values()) l.sort((a, b) => b.n10 - a.n10);
for (const s of stations) if (s.page && s.mainCity) s.near = stationsByCity.get(s.mainCity.idx).filter((x) => x !== s);
log('links');

// ---- 出力の準備 ----
const fileDate = (() => {
  const zip = fs.readdirSync(path.join(ROOT, 'data', 'raw')).find((f) => /^All_\d+_\d+\.zip$/.test(f));
  const csv = fs.readdirSync(RAW)[0];
  const st = fs.statSync(path.join(RAW, csv));
  return { zip: zip || '', date: st.mtime };
})();
const now = new Date();
const jst = new Date(now.getTime() + 9 * 3600e3);
const built = `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
const fd = new Date(fileDate.date.getTime() + 9 * 3600e3);
setBuildInfo({ built, dataTo: qEnd(lastQ), fileDate: `${fd.getUTCFullYear()}年${fd.getUTCMonth() + 1}月${fd.getUTCDate()}日` });

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const ASSETS_SRC = path.join(ROOT, 'src', 'assets');
fs.cpSync(ASSETS_SRC, path.join(DIST, 'assets'), { recursive: true });
if (fs.existsSync(path.join(ROOT, 'src', 'root'))) fs.cpSync(path.join(ROOT, 'src', 'root'), DIST, { recursive: true });
const hash = crypto.createHash('sha1');
for (const f of ['style.css', 'app.js']) hash.update(fs.readFileSync(path.join(ASSETS_SRC, f)));
setAssetVersion(hash.digest('hex').slice(0, 8));

let pages = 0;
let bytes = 0;
const urls = { hubs: [], cities: [], districts: [], stations: [] };
function write(p, html, kind = 'hubs', sitemap = true) {
  const file = p === '' ? path.join(DIST, 'index.html') : p.endsWith('.html') ? path.join(DIST, p) : path.join(DIST, p, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  pages++;
  bytes += Buffer.byteLength(html);
  if (sitemap) urls[kind].push(abs(p));
}

// よく調べられる駅（直近2年のマンションの取引が多い駅）
const featured = stations.filter((s) => s.page).sort((a, b) => b.sum.f2.mansion.n - a.sum.f2.mansion.n).slice(0, 12).map((s) => ({ path: s.path, label: stationBase(s.name) }));
const prefCityLinks = (prefCode, except) => `<ul class="chips">${cities.filter((c) => c.pref === prefCode && c.idx !== except).map((c) => `<li><a href="${BASE}${encodeURI(c.path)}">${c.name}</a></li>`).join('')}</ul>`;
const ctx = {
  ...data, byCity, byDist, bySt, byPref, prefSum, prefTotal, national, featured, prefCityLinks,
  lastQ, from5: windowFrom(20), dataToLabel: qEnd(lastQ),
};

write('', renderTop(ctx));
write('ken/', renderPrefIndex(ctx));
for (const p of PREFS) write(prefPath(p), renderPref(p, ctx));
write('ranking/', renderRankingIndex(ctx));
for (const r of RANKINGS) {
  write(`ranking/${r.slug}/`, renderRanking(ctx, r));
  for (const p of PREFS) write(`ranking/${r.slug}/${p.slug}/`, renderRankingPref(ctx, r, p), 'hubs', rankList(ctx, r, p.code).length > 0);
}
write('about/', renderAbout(ctx));
write('search/', renderSearch(ctx), 'hubs', false);
write('404.html', render404(ctx), 'hubs', false);
log('hub pages', pages);

for (const c of cities) write(c.path, renderCity(c, ctx), 'cities');
log('city pages', cities.length, `${(bytes / 1e6).toFixed(0)}MB`);
const dPages = districts.filter((d) => d.page);
for (const d of LIMIT ? dPages.slice(0, LIMIT) : dPages) write(d.path, renderDistrict(d, ctx), 'districts');
log('district pages', LIMIT ? Math.min(LIMIT, dPages.length) : dPages.length, `${(bytes / 1e6).toFixed(0)}MB`);
const sPages = stations.filter((s) => s.page);
for (const s of LIMIT ? sPages.slice(0, LIMIT) : sPages) write(s.path, renderStation(s, ctx), 'stations');
log('station pages', LIMIT ? Math.min(LIMIT, sPages.length) : sPages.length, `${(bytes / 1e6).toFixed(0)}MB`);

// ---- 検索用の索引 ----
const cityList = cities.filter((c) => c.total > 0);
const cityPos = new Map(cityList.map((c, k) => [c.idx, k]));
const index = {
  v: 1,
  p: PREFS.map((p) => p.name),
  c: cityList.map((c) => [c.code, c.name, c.pref, c.n10]),
  s: sPages.map((s) => [s.name, s.pref, s.n10, ...(s.path !== `eki/${s.name}/` ? [s.path.slice(4, -1)] : [])]),
  d: dPages.map((d) => [cityPos.get(d.city), d.name, d.n10, ...(d.path !== `city/${cities[d.city].code}/${d.name}/` ? [d.path.split('/')[2]] : [])]),
};
fs.writeFileSync(path.join(DIST, 'assets', 'idx.json'), JSON.stringify(index));

// ---- サイトマップ ----
const lastmod = now.toISOString().slice(0, 10);
const smFiles = [];
const writeSitemap = (name, list) => {
  fs.writeFileSync(path.join(DIST, name), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((u) => `<url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  smFiles.push(name);
};
for (const kind of Object.keys(urls)) {
  for (let i = 0; i < urls[kind].length; i += 40000) writeSitemap(`sitemap-${kind}-${i / 40000 + 1}.xml`, urls[kind].slice(i, i + 40000));
}
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${smFiles.map((f) => `<sitemap><loc>${abs(f)}</loc><lastmod>${lastmod}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

// ---- 更新の記録（GitHub Actions で全件を作ったときだけ書く） ----
const summary = {
  site: SITE_NAME, built, base: BASE, dataTo: qEnd(lastQ), sourceFile: fileDate.zip, rows: data.rows, used: col.n,
  pages, megabytes: Math.round(bytes / 1e6), cities: cities.length, districtPages: dPages.length, stationPages: sPages.length, excluded: data.excluded,
};
if (process.env.GITHUB_ACTIONS === 'true' && !LIMIT) {
  fs.writeFileSync(path.join(ROOT, 'data', 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
}
log('done', summary);

// 不動産情報ライブラリの「不動産価格（取引価格・成約価格）情報の検索・ダウンロード」画面を、このパソコンの Edge を
// 画面なしで動かして操作し、全国・すべての種類・全期間の CSV（ZIP）を取る。人が画面でボタンを押すのと同じ操作で、
// サイトの中の仕組み（画面の裏の API）を直接は使わない（利用規約 第6条）。新しい四半期が出たときだけダウンロードする。
//
// 使い方: node scripts/download-reinfolib.mjs [--current 20261] [--force] [--out data/raw]
//   新しいファイルを取れたら、最後の行にそのパスを出す。新しい四半期がなければ「no-new-data」と出す。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL = 'https://www.reinfolib.mlit.go.jp/realEstatePrices/';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const current = +(opt('--current', '0'));
const force = args.includes('--force');
const outDir = path.resolve(opt('--out', 'data/raw'));
const log = (...a) => console.error(`[${new Date().toLocaleTimeString('ja-JP')}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!exe) throw new Error('Edge か Chrome が見つかりません');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'soubacho-browser-'));
const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soubacho-dl-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(exe, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();
const listeners = [];
function send(method, params = {}, sessionId) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}
function waitEvent(pred, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { listeners.splice(listeners.indexOf(l), 1); reject(new Error('timeout')); }, ms);
    const l = (m) => { if (pred(m)) { clearTimeout(t); listeners.splice(listeners.indexOf(l), 1); resolve(m); } };
    listeners.push(l);
  });
}

async function main() {
  // ブラウザの起動を待つ
  let info = null;
  for (let k = 0; k < 60 && !info; k++) {
    try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(500); }
  }
  if (!info) throw new Error('ブラウザが起動しません');
  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`)); else p.resolve(m.result);
    } else for (const l of [...listeners]) l(m);
  };

  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir, eventsEnabled: true });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
    return r.result.value;
  };
  await send('Page.enable', {}, sessionId);
  log('画面を開きます', URL);
  await send('Page.navigate', { url: URL }, sessionId);

  // 時期の選択肢が出るまで待つ
  let seasons = null;
  for (let k = 0; k < 90 && !seasons; k++) {
    await sleep(1000);
    seasons = await evaluate(`(() => {
      const s = [...document.querySelectorAll('select')].filter((x) => [...x.options].some((o) => o.value === '20053'));
      if (s.length < 2) return null;
      return [...new Set(s.flatMap((x) => [...x.options].map((o) => o.value)).filter((v) => /^\\d{5}$/.test(v)))].sort();
    })()`).catch(() => null);
  }
  if (!seasons) throw new Error('画面の「時期」の選択肢が見つかりません（画面が変わった可能性があります）');
  const latest = +seasons[seasons.length - 1];
  log('画面で選べる最新の時期:', latest, '／いまのデータ:', current || '(なし)');
  if (!force && latest <= current) { console.log('no-new-data'); return; }

  // 全都道府県・すべて・2005年第3四半期〜最新 を選ぶ（React の画面なので、値を入れてから change を送る）
  const chosen = await evaluate(`(() => {
    const setv = (el, v) => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const sel = [...document.querySelectorAll('select')];
    const has = (el, v) => [...el.options].some((o) => o.value === v);
    sel.filter((el) => has(el, '99') && has(el, '47')).forEach((el) => setv(el, '99'));
    sel.filter((el) => has(el, 'all') && has(el, 'used')).forEach((el) => setv(el, 'all'));
    const ss = sel.filter((el) => has(el, '20053'));
    ss.forEach((el, k) => setv(el, k % 2 === 0 ? '20053' : '${latest}'));
    for (const cb of document.querySelectorAll('input[type=checkbox]')) if (!cb.checked) cb.click();
    return sel.map((el) => el.value).join(',');
  })()`);
  log('選んだ条件:', chosen);
  await sleep(3000);
  const count = await evaluate(`(document.body.innerText.match(/現在の条件での検索結果：([\\d,]+)件/) || [])[1] || ''`);
  log('画面の件数:', count);

  const begin = waitEvent((m) => m.method === 'Browser.downloadWillBegin', 180000);
  const clicked = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'ダウンロード' && x.offsetParent !== null);
    if (!b) return false;
    b.click();
    return true;
  })()`);
  if (!clicked) throw new Error('「ダウンロード」ボタンが見つかりません');
  log('ダウンロードボタンを押しました');
  let start;
  try { start = await begin; } catch {
    const alert = await evaluate('document.body.innerText.slice(0, 3000)').catch(() => '');
    throw new Error(`ダウンロードが始まりませんでした（国のサイトで準備中の可能性があります）\n${alert.split('\n').filter((l) => /ダウンロード|時間/.test(l)).slice(0, 5).join('\n')}`);
  }
  const name = start.params.suggestedFilename;
  log('ダウンロード開始:', name);
  const done = await waitEvent((m) => m.method === 'Browser.downloadProgress' && m.params.guid === start.params.guid && m.params.state !== 'inProgress', 45 * 60000);
  if (done.params.state !== 'completed') throw new Error(`ダウンロードが止まりました（${done.params.state}）`);
  const src = path.join(dlDir, name);
  if (!/^All_\d{5}_\d{5}\.zip$/.test(name) || !fs.existsSync(src)) throw new Error(`思っていたファイル名と違います: ${name}`);
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, name);
  fs.copyFileSync(src, dest);
  log('保存しました:', dest, `${(fs.statSync(dest).size / 1e6).toFixed(1)}MB`);
  console.log(dest);
}

try {
  await main();
} catch (e) {
  console.error(`失敗: ${e.message}`);
  process.exitCode = 1;
} finally {
  try { if (ws) await Promise.race([send('Browser.close'), sleep(3000)]); } catch {}
  try { proc.kill(); } catch {}
  await sleep(1000);
  for (const d of [profile, dlDir]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
  process.exit(process.exitCode || 0);
}

// 市区町村・駅・地区の検索（索引は端末に読み込んで照合する。入力した文字は外に送らない）、表の並べ替え、リンクのコピー
(() => {
  const script = document.currentScript;
  const base = script ? script.src.replace(/assets\/app\.js.*$/, '') : '/';
  const ver = script ? (script.src.split('?v=')[1] || '') : '';
  let index = null;
  let loading = null;

  const norm = (s) => s.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[ゖヵ]/g, (c) => (c === 'ゖ' ? 'け' : 'か')).replace(/[\s・･.,，、。\-‐－—―〜~'’"“”]/g, '');
  // 「武蔵小杉駅 マンション 相場」のような検索語から、地名だけを取り出す
  const WORDS = /(中古|新築)?(マンション|一戸建て|戸建て?|土地|坪単価|地価|相場|価格|売買|取引|周辺|推移|ランキング|いくら)/g;
  const normQ = (s) => norm(s.normalize('NFKC').replace(WORDS, ' ').replace(/駅(?=\s|$)/g, ' ').replace(/(の|で)(?=\s|$)/g, ' ').trim());

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(`${base}assets/idx.json${ver ? `?v=${ver}` : ''}`)
        .then((r) => r.json())
        .then((j) => {
          const items = [];
          // [種類(0=駅,1=市区町村,2=地区), 表示名, 補足, URL, 件数, 照合用の名前]
          for (const [name, pref, n, seg] of j.s) {
            const base0 = name.replace(/\(.+\)$/, '');
            const m = /\((.+)\)$/.exec(name);
            items.push([0, `${base0}駅${m ? `（${m[1]}）` : ''}`, `駅・${j.p[pref - 1]}`, `eki/${seg || name}/`, n, norm(base0), norm(name)]);
          }
          for (const [code, name, pref, n] of j.c) items.push([1, name, `市区町村・${j.p[pref - 1]}`, `city/${code}/`, n, norm(name), norm(j.p[pref - 1] + name)]);
          for (const [ci, name, n, seg] of j.d) {
            const c = j.c[ci];
            items.push([2, name, `町・地区・${j.p[c[2] - 1]}${c[1]}`, `city/${c[0]}/${seg || name}/`, n, norm(name), norm(c[1] + name)]);
          }
          index = items;
          return index;
        });
    }
    return loading;
  }

  function search(q, limit) {
    const k = normQ(q);
    if (!k) return [];
    const out = [];
    for (let i = 0; i < index.length; i++) {
      const it = index[i];
      let rank;
      if (it[5] === k) rank = 0;
      else if (it[5].startsWith(k)) rank = 1;
      else if (it[5].includes(k)) rank = 2;
      else if (it[6].includes(k)) rank = 3;
      else continue;
      out.push([rank, it[0], -it[4], i]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return out.slice(0, limit).map((x) => index[x[3]]);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const url = (it) => base + encodeURI(it[3]);

  function bind(form) {
    const input = form.querySelector('.sb-i');
    const box = form.querySelector('.sb-r');
    if (!input || !box) return;
    let rows = [];
    let sel = -1;
    const close = () => { box.hidden = true; sel = -1; };
    const render = () => {
      if (!input.value.trim()) { close(); return; }
      rows = search(input.value, 10);
      box.innerHTML = rows.length
        ? rows.map((r, i) => `<a href="${url(r)}"${i === sel ? ' class="on"' : ''}>${esc(r[1])}<small>${esc(r[2])}</small></a>`).join('')
        : '<div class="sb-none">見つかりませんでした。「駅」「市」などを外したり、名前の一部だけで探してください。</div>';
      box.hidden = false;
    };
    input.addEventListener('focus', () => { load().then(() => input.value && render()); });
    input.addEventListener('input', () => { sel = -1; load().then(render); });
    input.addEventListener('keydown', (e) => {
      if (box.hidden || !rows.length) return;
      if (e.key === 'ArrowDown') { sel = Math.min(rows.length - 1, sel + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(-1, sel - 1); render(); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    form.addEventListener('submit', (e) => {
      if (sel >= 0 && rows[sel]) { e.preventDefault(); location.href = url(rows[sel]); }
    });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) close(); });
  }
  document.querySelectorAll('form.sb').forEach(bind);

  // 検索ページ
  const results = document.getElementById('results');
  if (results) {
    const q = new URLSearchParams(location.search).get('q') || '';
    const input = document.querySelector('.sb-page .sb-i');
    if (input) input.value = q;
    if (q) {
      results.textContent = '読み込み中…';
      load().then(() => {
        const rows = search(q, 100);
        const exact = rows.filter((r) => r[5] === normQ(q));
        if (rows.length === 1 || exact.length === 1) {
          // 名前がぴったり合うのが1件だけなら、そのページへ
          location.replace(url(exact[0] || rows[0]));
          return;
        }
        results.innerHTML = `<p>「${esc(q)}」の結果：${rows.length >= 100 ? '100件以上（上位100件）' : `${rows.length}件`}</p>`
          + (rows.length ? `<ul>${rows.map((r) => `<li><a href="${url(r)}">${esc(r[1])}<small>${esc(r[2])}</small></a></li>`).join('')}</ul>` : '<p class="note">見つかりませんでした。名前の一部だけで探してみてください。</p>');
      }).catch(() => { results.textContent = '索引を読み込めませんでした。時間をおいてお試しください。'; });
    }
  }

  // 表の並べ替え（data-v があればその数値で、なければ文字で）
  document.querySelectorAll('table.sortable').forEach((t) => {
    const ths = t.querySelectorAll('thead th');
    const body = t.tBodies[0];
    const val = (tr, k) => {
      const td = tr.children[k];
      const el = td && td.querySelector('[data-v]');
      if (el) return +el.dataset.v;
      const s = td ? td.textContent.trim() : '';
      const n = parseFloat(s.replace(/[,，]/g, ''));
      return s === '—' ? null : (Number.isFinite(n) && /^[\d,.]/.test(s) ? n : s);
    };
    ths.forEach((th, k) => {
      th.addEventListener('click', () => {
        const desc = th.getAttribute('aria-sort') !== 'descending';
        ths.forEach((x) => x.removeAttribute('aria-sort'));
        th.setAttribute('aria-sort', desc ? 'descending' : 'ascending');
        const rows = [...body.rows];
        rows.sort((a, b) => {
          const x = val(a, k);
          const y = val(b, k);
          if (x == null && y == null) return 0;
          if (x == null) return 1;
          if (y == null) return -1;
          const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ja');
          return desc ? -c : c;
        });
        rows.forEach((r) => body.appendChild(r));
      });
    });
  });

  // リンクのコピー
  document.querySelectorAll('.share').forEach((el) => {
    const btn = el.querySelector('.sh-copy');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const u = el.dataset.url || location.href;
      const done = () => { btn.textContent = 'コピーしました'; setTimeout(() => { btn.textContent = 'リンクをコピー'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, () => prompt('このリンクをコピーしてください', u));
      else prompt('このリンクをコピーしてください', u);
    });
  });
})();

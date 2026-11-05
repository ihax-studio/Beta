'use strict';
/* 30日 — 共テ（数学・化学・英語）／英検／IELTS／小論文・面接 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAYS = 30;
const jst = () => Math.floor((Date.now() + 324e5) / 864e5);
const dayOf = iso => Math.floor((Date.parse(iso + 'T00:00:00+09:00') + 324e5) / 864e5);
const isoOf = n => new Date(n * 864e5).toISOString().slice(0, 10);
const md = n => { const d = new Date(n * 864e5); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const EXAM = dayOf('2027-01-16');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ───── 触覚（触覚Ultra）＋音 ───── */
const H = window.HapticUltra;
let S;
function buzz(kind) {
  if (!S.hap || !H) return;
  if (kind === 'ok') H.burstN(2, 90); else if (kind === 'ng') H.burstN(3, 90); else if (kind === 'end') H.pattern([0, 120, 240, 600, 720, 840]); else H.fire();
}
// 実タップで確実に1発（iOS 26.5+ 対策）。onTap はスイッチ経由で呼ばれる
function tap(el, fn, burst) {
  if (!el) return el;
  if (H && S.hap) H.bind(el, { onTap: ev => { fn(ev); try { ev.target.blur(); } catch {} }, burst });
  else el.addEventListener('click', fn);
  return el;
}
let AC;
function tone(f, d = .07, v = .05) {
  if (!S.snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = f; o.type = 'sine'; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
  } catch {}
}

/* ───── デッキ ───── */
const EN = window.EN || {};
const enc = p => x => ({ id: p + x.i, q: x.w, a: x.j, x: x.x, y: x.y, n: x.n, h: x.h, f: x.f, r: x.r, en: 1 });
function chunk(list, n, pre, label, g) {
  const z = Math.ceil(list.length / n) || 1, out = [];
  for (let i = 0; i < n; i++) {
    const c = list.slice(i * z, (i + 1) * z);
    if (c.length) out.push({ id: pre + (i + 1), name: `${label} ${i * z + 1}–${i * z + c.length}`, g, cards: c });
  }
  return out;
}
const KTE = [
  ['tango', '単語', 15], ['to', 'to不定詞', 1], ['ing', '動名詞', 1], ['gohou', '語法', 3], ['tagigo', '多義語', 15],
  ['bunpou', '文法', 8], ['kyote', '共テ表現', 8], ['kobetsu', '私大（中央・青学）', 15],
];
const EIK = [['hw', '見出し語', 15], ['id', '熟語', 15], ['dv', '派生語', 15]];
const intv = PASSERS.map((p, i) => ({ id: 'iv' + i, name: p.p.replace(/^慶應義塾大学\s*/, '慶應 '), g: p.s,
  cards: p.q.map((q, k) => ({ id: `iv${i}-${k}`, q, a: p.p, x: p.i.join(' / ') })) }));
const DECKS = [
  { id: 'math', name: '数学', units: UNITS.filter(u => u.s === '数') },
  { id: 'chem', name: '化学', units: UNITS.filter(u => u.s === '化') },
  { id: 'kte', name: '共テ英語', units: KTE.flatMap(([k, l, n]) => chunk((EN[k] || []).map(enc('k')), n, 'k' + k, l, l)) },
  { id: 'eiken', name: '英検', units: EIK.flatMap(([k, l, n]) => chunk((EN[k] || []).map(enc('e')), n, 'e' + k, l, l)) },
  { id: 'ielts', name: 'IELTS', units: UNITS.filter(u => u.s === 'I') },
  { id: 'essay', name: '小論文・面接', units: [...UNITS.filter(u => u.s === '論').map(u => ({ ...u, g: '小論文' })), ...intv.map(u => ({ ...u, g: '面接' }))] },
];
const UNIT = {}, CARD = {}, DECK = {};
for (const d of DECKS) { DECK[d.id] = d; for (const u of d.units) { u.deck = d.id; UNIT[u.id] = u; for (const c of u.cards) { c.u = u.id; CARD[c.id] = c; } } }
const G = (deck, g) => DECK[deck].units.filter(u => u.g === g);

/* ───── 保存 ───── */
const KEY = 'thirty.v1';
S = { start: jst(), on: { math: 1, chem: 1, kte: 1, eiken: 1, ielts: 1, essay: 1 }, lv: {}, ng: {}, laps: {}, done: {}, hap: 1, snd: 0, drafts: [], deck: 'math', ms: {} };
try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) { Object.assign(S, o); S.on = { ...{ math: 1, chem: 1, kte: 1, eiken: 1, ielts: 1, essay: 1 }, ...o.on }; } } catch {}
let saveT;
const save = now => { clearTimeout(saveT); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }; now ? f() : (saveT = setTimeout(f, 250)); };
S.on = { math: 1, chem: 1, kte: 1, eiken: 1, ielts: 1, essay: 1 }; S.hap = 1; S.snd = 0;
save();
const dayNow = () => Math.max(1, Math.min(DAYS, jst() - S.start + 1));
let VD = dayNow();

/* ───── 計画 ───── */
const span = (a, k, n) => a.slice(Math.floor(k * a.length / n), Math.floor((k + 1) * a.length / n));
const ngOf = (deck, units) => Object.keys(S.ng).filter(id => CARD[id] && (units ? units.includes(CARD[id].u) : UNIT[CARD[id].u].deck === deck));
const rot = (list, d) => list[(d - 1) % list.length];
const names = us => us.map(u => u.name).join('・');
function plan(d) {
  const out = [];
  const add = (id, lap, tasks) => { if (S.on[id]) out.push({ id, name: DECK[id].name, lap, tasks: tasks.filter(Boolean) }); };
  const ngTask = id => ({ k: 'ng', t: '✕ 復習', s: ngOf(id).length + '枚', act: { ng: id } });

  for (const id of ['math', 'chem']) {
    const us = DECK[id].units, T = [];
    let lap;
    if (d <= 15) { lap = '1周目'; const u = us[d - 1]; T.push({ k: 'in', t: 'インプット', s: u.name, act: { in: [u.id] } }, { k: 'out', t: 'アウトプット', s: u.name, act: { out: [u.id] } }); }
    else if (d <= 23) { lap = '2周目'; const g = span(us, d - 16, 8); T.push({ k: 'out', t: 'アウトプット', s: names(g), act: { out: g.map(u => u.id) } }); }
    else if (d <= 27) { lap = '3周目'; const g = span(us, d - 24, 4); T.push({ k: 'out', t: 'アウトプット', s: names(g), act: { out: g.map(u => u.id) } }); }
    else { lap = '仕上げ'; T.push({ k: 'rnd', t: '全範囲ランダム', s: '40枚', act: { rnd: id, n: 40 } }); }
    if (id === 'chem' && d <= 23) {
      const g = d <= 15 ? [us[d - 1]] : span(us, d - 16, 8);
      const pg = g.flatMap(u => (CHEM_PAGES[u.id] || []).map(([b, r]) => b + ' p.' + r));
      if (pg.length) T.push({ k: 'book', t: '問題集', s: pg.join('・'), act: { link: CHEM_SITE } });
    }
    T.push(ngTask(id));
    const past = id === 'math' ? { 21: ['数学ⅠA', 70], 24: ['数学ⅡBC', 70], 28: ['数学ⅠA', 70], 29: ['数学ⅡBC', 70] }[d] : { 22: ['化学', 60], 26: ['化学', 60], 30: ['化学', 60] }[d];
    if (past) T.push({ k: 'past', t: '過去問 ' + past[0], s: past[1] + '分', act: { timer: past[1], label: past[0] + ' 過去問' } });
    add(id, lap, T);
  }
  {
    const k = (d - 1) % 15, lap = d <= 15 ? '1周目' : '2周目';
    const wu = G('kte', '単語')[k], tg = G('kte', '多義語')[k];
    const pat = [...G('kte', 'to不定詞'), ...G('kte', 'ing'), ...G('kte', '動名詞'), ...G('kte', '語法'), ...G('kte', '文法'), ...G('kte', '共テ表現')];
    const pu = span(pat, k, 15);
    const R = ['R 第1・2問', 'L 第1・2問', 'R 第3・4問', 'L 第3・4問', 'R 第5問', 'L 第5問', 'R 第6問', 'L 第6問', 'R 第7問', 'R 第8問'];
    const full = { 22: ['英語R', 80], 25: ['英語L', 30], 28: ['英語R', 80], 30: ['英語L', 30] }[d];
    add('kte', lap, [
      wu && { k: 'w', t: '単語', s: wu.name.replace('単語 ', ''), act: { out: [wu.id] } },
      tg && { k: 'm', t: '多義語', s: tg.name.replace('多義語 ', ''), act: { out: [tg.id] } },
      pu.length && { k: 'p', t: '語法・文法・表現', s: pu.reduce((a, u) => a + u.cards.length, 0) + '枚', act: { out: pu.map(u => u.id) } },
      ngTask('kte'),
      full ? { k: 'past', t: '過去問 ' + full[0], s: full[1] + '分', act: { timer: full[1], label: '共テ' + full[0] } } : { k: 'past', t: '過去問 ' + rot(R, d), s: '大問演習', act: { check: 1 } },
    ]);
  }
  {
    const k = (d - 1) % 15, lap = d <= 15 ? '1周目' : '2周目';
    const W = [['p1s', '要約'], ['p1o', '意見論述'], ['', '長文 1題'], ['', 'リスニング Part1'], ['', '語彙 18問'], ['', 'リスニング Part2・3']];
    const w = rot(W, d);
    add('eiken', lap, [
      ...EIK.map(([, l]) => { const u = G('eiken', l)[k]; return u && { k: l, t: l, s: u.name.replace(l + ' ', ''), act: { out: [u.id] } }; }),
      ngTask('eiken'),
      w[0] ? { k: 'wr', t: '準1級 ' + w[1], s: WRITE.find(x => x.id === w[0]).t + '分', act: { write: w[0] } } : { k: 'pr', t: '準1級 ' + w[1], s: '演習', act: { check: 1 } },
    ]);
  }
  {
    const us = DECK.ielts.units, u = rot(us, d);
    const P = [['it1', 'Writing Task 1'], ['', 'Reading 1パッセージ', 20], ['it2', 'Writing Task 2'], ['', 'Listening 1パート', 10], ['', 'Speaking Part 2', 3]];
    const p = rot(P, d);
    add('ielts', '', [
      { k: 'c', t: 'カード', s: u.name, act: { out: [u.id] } },
      p[0] ? { k: 'pr', t: p[1], s: WRITE.find(x => x.id === p[0]).t + '分', act: { write: p[0] } } : { k: 'pr', t: p[1], s: p[2] + '分', act: { timer: p[2], label: 'IELTS ' + p[1] } },
    ]);
  }
  {
    const su = DECK.essay.units.filter(u => u.g === '小論文'), iv = DECK.essay.units.filter(u => u.g === '面接');
    const wp = rot(['jp800', 'jp600', 'jp1000'], d);
    add('essay', '', [
      { k: 'c', t: '小論文カード', s: rot(su, d).name, act: { out: [rot(su, d).id] } },
      { k: 'wr', t: WRITE.find(x => x.id === wp).n, s: WRITE.find(x => x.id === wp).t + '分', act: { write: wp, theme: 1 } },
      iv.length && { k: 'iv', t: '面接 質問', s: rot(iv, d).name, act: { out: [rot(iv, d).id] } },
    ]);
  }
  return out;
}
const isDone = (d, key) => !!(S.done[d] && S.done[d][key]);
function setDone(d, key, v = true) { (S.done[d] = S.done[d] || {}); if (v) S.done[d][key] = 1; else delete S.done[d][key]; save(); }

/* ───── 今日 ───── */
function renderToday() {
  const now = dayNow(), d = VD, P = plan(d);
  const date = S.start + d - 1;
  $('#dTitle').textContent = 'Day ' + d;
  const left = EXAM - date;
  $('#dSub').textContent = `${md(date)}${d === now ? ' · 今日' : ''}${left > 0 ? ' · 共テまで ' + left + '日' : ''}`;
  $('#dPrev').disabled = d <= 1; $('#dNext').disabled = d >= DAYS;
  let all = 0, dn = 0;
  const host = $('#plan'); host.innerHTML = '';
  for (const g of P) {
    const sec = document.createElement('div'); sec.className = 'grp';
    sec.innerHTML = `<h3>${esc(g.name)}<span>${esc(g.lap)}</span></h3><div class="box"></div>`;
    const box = $('.box', sec);
    for (const t of g.tasks) {
      const key = g.id + '-' + t.k; const done = isDone(d, key); all++; if (done) dn++;
      const row = document.createElement('div'); row.className = 'task' + (done ? ' done' : '');
      row.innerHTML = `<button class="ck" aria-label="完了"></button><button class="main"><span class="tx"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span><span class="go">›</span></button>`;
      tap($('.ck', row), () => { setDone(d, key, !isDone(d, key)); buzz(isDone(d, key) ? 'ok' : ''); renderToday(); });
      tap($('.main', row), () => runTask(d, key, t));
      box.append(row);
    }
    if (g.tasks.length) host.append(sec);
  }
  $('#dBar').style.width = (all ? dn / all * 100 : 0) + '%';
  NEXT = null;
  for (const g of P) { for (const t of g.tasks) if (!isDone(d, g.id + '-' + t.k)) { NEXT = { d, key: g.id + '-' + t.k, t, g }; break; } if (NEXT) break; }
  $('#nextIn').innerHTML = NEXT ? `<span class="pl">▶</span><span class="tx"><small>次 · ${esc(NEXT.g.name)}</small><b>${esc(NEXT.t.t)}</b><small>${esc(NEXT.t.s)}</small></span>` : `<span class="tx"><b>${d === dayNow() ? '今日' : 'Day ' + d}の分は完了</b><small>${dn}/${all}</small></span>`;
  $('#next').classList.toggle('fin', !NEXT);
}
let NEXT = null;
tap($('#next'), () => { if (NEXT) runTask(NEXT.d, NEXT.key, NEXT.t); });
function runTask(d, key, t) {
  const a = t.act, meta = { day: d, key, title: t.t + (t.s ? ' · ' + t.s : '') };
  if (a.in) openInput(a.in, meta);
  else if (a.out) startCards(a.out.flatMap(u => UNIT[u].cards.map(c => c.id)), { ...meta, units: a.out });
  else if (a.ng) { const ids = ngOf(a.ng); if (!ids.length) { setDone(d, key); renderToday(); toast('✕ はありません'); return; } startCards(ids, meta); }
  else if (a.rnd) startCards(shuffle(DECK[a.rnd].units.flatMap(u => u.cards.map(c => c.id))).slice(0, a.n), meta);
  else if (a.timer) openTimer(a.timer, a.label, meta);
  else if (a.write) { openWrite(a.write, a.theme, meta); }
  else if (a.link) { window.open(a.link, '_blank'); setDone(d, key); renderToday(); }
  else if (a.check) { setDone(d, key, !isDone(d, key)); buzz('ok'); renderToday(); }
}

/* ───── カード ───── */
let SES = null;
function startCards(ids, meta) {
  if (!ids.length) return;
  SES = { q: shuffle([...ids]), i: 0, ok: 0, bad: [], meta, shown: false };
  $('#sTitle').textContent = meta.title || '';
  $('#ses').classList.remove('end');
  openOv('#ses'); drawCard();
}
function hl(text, words) {
  let s = esc(text);
  for (const w of words || []) { const e = esc(w); if (e) s = s.split(e).join('<mark>' + e + '</mark>'); }
  return s;
}
function drawCard() {
  const c = CARD[SES.q[SES.i]], fc = $('#fc');
  SES.shown = false;
  fc.className = 'fc' + (c.en ? ' en' : '');
  $('#fq').textContent = c.q;
  $('#fqx').innerHTML = c.f && c.x ? hl(c.x, c.h) : '';
  $('#fa').textContent = c.a;
  $('#fax').innerHTML = [c.x && !c.f ? hl(c.x, c.h) : '', c.y ? esc(c.y) : '', c.n ? esc(c.n) : ''].filter(Boolean).join('<br>');
  $('#sCnt').textContent = `${SES.i + 1}/${SES.q.length}`;
  $('#sBar').style.width = SES.i / SES.q.length * 100 + '%';
  $('#judge').classList.add('off');
}
function reveal() {
  if (!SES || SES.shown) return;
  SES.shown = true; $('#fc').classList.add('show'); $('#judge').classList.remove('off'); tone(660, .05, .03);
}
function judge(ok) {
  if (!SES || !SES.shown) return;
  const id = SES.q[SES.i];
  if (ok) { S.lv[id] = Math.min(3, (S.lv[id] || 0) + 1); delete S.ng[id]; SES.ok++; tone(880); }
  else { S.lv[id] = 0; S.ng[id] = 1; SES.bad.push(id); tone(220, .12); }
  save();
  const fc = $('#fc'); fc.classList.add(ok ? 'sw-r' : 'sw-l');
  setTimeout(() => { if (++SES.i >= SES.q.length) finish(); else drawCard(); }, 140);
}
function finish() {
  const m = SES.meta;
  $('#rOk').textContent = SES.ok; $('#rAll').textContent = SES.q.length;
  $('#rSub').textContent = SES.bad.length ? `✕ ${SES.bad.length}` : '全問 ○';
  $('#rRetry').style.display = SES.bad.length ? '' : 'none';
  $('#sBar').style.width = '100%';
  $('#ses').classList.add('end');
  if (!m.retry) {
    if (m.key) setDone(m.day, m.key);
    for (const u of m.units || []) S.laps[u] = (S.laps[u] || 0) + 1;
    save(true);
  }
  buzz('end');
}
{
  const fc = $('#fc');
  let x0 = null, dx = 0;
  fc.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; });
  fc.addEventListener('pointermove', e => { if (x0 == null || !SES?.shown) return; dx = e.clientX - x0; fc.style.transform = `translateX(${dx * .6}px) rotate(${dx / 40}deg)`; });
  const up = () => { if (x0 == null) return; fc.style.transform = ''; const d = dx; x0 = null; if (SES?.shown && Math.abs(d) > 70) { buzz(d > 0 ? 'ok' : 'ng'); judge(d > 0); } };
  fc.addEventListener('pointerup', up); fc.addEventListener('pointercancel', up);
  tap(fc, () => { if (Math.abs(dx) > 10) return; if (!SES?.shown) reveal(); });
  tap($('#bOk'), () => judge(true), 'confirm');
  tap($('#bNg'), () => judge(false), 'error');
  tap($('#rRetry'), () => { const b = SES.bad; startCards(b, { ...SES.meta, retry: true }); });
}

/* ───── インプット ───── */
let INP = null;
function openInput(unitIds, meta) {
  INP = meta;
  $('#iTitle').textContent = meta.title || '';
  const L = $('#iList'); L.className = 'ilist'; $('#iHide').classList.remove('on');
  L.innerHTML = unitIds.flatMap(u => UNIT[u].cards).map(c =>
    `<li><div class="iq">${esc(c.q)}</div><div class="ia">${esc(c.a)}</div>${c.x ? `<div class="ix">${hl(c.x, c.h)}${c.y ? '<br>' + esc(c.y) : ''}</div>` : ''}</li>`).join('');
  L.scrollTop = 0; openOv('#inp');
}
$('#iList').addEventListener('click', e => { const li = e.target.closest('li'); if (li && $('#iList').classList.contains('hide')) { li.classList.toggle('open'); buzz(); } });
tap($('#iHide'), () => { const on = $('#iList').classList.toggle('hide'); $('#iHide').classList.toggle('on', on); });
tap($('#iDone'), () => { if (INP?.key) setDone(INP.day, INP.key); closeOv('#inp'); buzz('ok'); });

/* ───── タイマー ───── */
const T = { total: 0, left: 0, end: 0, run: false, meta: null, label: '' };
let tInt;
function openTimer(min, label, meta) {
  if (!T.run || T.label !== label) { T.total = T.left = min * 60; T.run = false; T.label = label; T.meta = meta; }
  drawTimer(); openOv('#tmr');
}
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function drawTimer() {
  const left = T.run ? Math.max(0, (T.end - Date.now()) / 1000) : T.left;
  $('#tTitle').textContent = T.label; $('#tNum').textContent = fmt(Math.ceil(left));
  $('#tRing').style.strokeDashoffset = 339.3 * (1 - left / (T.total || 1));
  $('#tGoTx').textContent = T.run ? '一時停止' : (T.left < T.total ? '再開' : '開始');
  const pill = $('#pill'); $('#pillTx').textContent = T.label + '  ' + fmt(Math.ceil(left));
  pill.classList.toggle('on', T.run && !$('#tmr').classList.contains('on'));
  $('#wTime').textContent = T.run ? fmt(Math.ceil(left)) : '';
  if (T.run && left <= 0) { T.run = false; T.left = 0; clearInterval(tInt); buzz('end'); tone(880, .4, .08); if (T.meta?.key) setDone(T.meta.day, T.meta.key); renderToday(); drawTimer(); toast('時間です'); }
}
function timerGo() {
  if (T.run) { T.left = Math.max(0, (T.end - Date.now()) / 1000); T.run = false; clearInterval(tInt); }
  else { if (T.left <= 0) T.left = T.total; T.end = Date.now() + T.left * 1000; T.run = true; clearInterval(tInt); tInt = setInterval(drawTimer, 250); }
  drawTimer();
}
tap($('#tGo'), timerGo);
tap($('#tReset'), () => { T.run = false; clearInterval(tInt); T.left = T.total; drawTimer(); });
tap($('#tDone'), () => { if (T.meta?.key) setDone(T.meta.day, T.meta.key); T.run = false; clearInterval(tInt); T.left = T.total; drawTimer(); closeOv('#tmr'); renderToday(); });
tap($('#pill'), () => openOv('#tmr'));

/* ───── 書く（小論文・英作文） ───── */
let WP = WRITE[1], WD = null, WM = null;
const count = (txt, u) => u === '語' ? (txt.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length : txt.replace(/\s/g, '').length;
function renderWriteChips() {
  $('#wChips').innerHTML = WRITE.map(p => `<button data-id="${p.id}" class="${p.id === WP.id ? 'on' : ''}">${esc(p.n)}</button>`).join('');
}
$('#wChips').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; WP = WRITE.find(p => p.id === b.dataset.id); renderWriteChips(); drawCount(); buzz(); });
function drawCount() {
  const n = count($('#wText').value, WP.u), el = $('#wCount');
  const range = WP.hi ? `${WP.lo}〜${WP.hi}` : WP.lo ? `${WP.lo}+` : '';
  el.innerHTML = `<b>${n}</b>${WP.u}${range ? ' / ' + range : ''}`;
  el.className = 'wc' + (WP.hi && n > WP.hi ? ' over' : WP.lo && n >= WP.lo ? ' ok' : '');
  $('#wText').setAttribute('lang', WP.u === '語' ? 'en' : 'ja');
}
$('#wText').addEventListener('input', () => { drawCount(); if (WD) { WD.text = $('#wText').value; WD.at = Date.now(); save(); } });
$('#wTheme').addEventListener('input', () => { if (WD) { WD.theme = $('#wTheme').value; save(); } });
function newDraft() {
  WD = { id: Date.now().toString(36), p: WP.id, theme: $('#wTheme').value, text: '', at: Date.now() };
  S.drafts.unshift(WD); save();
}
function openWrite(pid, theme, meta) {
  WP = WRITE.find(p => p.id === pid) || WP; WM = meta || null;
  WD = null; $('#wText').value = '';
  $('#wTheme').value = theme ? randTheme() : '';
  renderWriteChips(); drawCount(); renderDrafts(); show('write');
}
const randTheme = () => { const L = WP.u === '語' ? THEMES_EN : THEMES_JP; return L[Math.random() * L.length | 0]; };
tap($('#wRand'), () => { $('#wTheme').value = randTheme(); if (WD) { WD.theme = $('#wTheme').value; save(); } });
tap($('#wNew'), () => { WD = null; $('#wText').value = ''; $('#wTheme').value = ''; drawCount(); renderDrafts(); });
tap($('#wTimer'), () => openTimer(WP.t, WP.n, WM));
tap($('#wSave'), () => {
  if (!$('#wText').value.trim()) return;
  if (!WD) newDraft();
  WD.text = $('#wText').value; WD.theme = $('#wTheme').value; WD.p = WP.id; WD.at = Date.now(); save(true);
  if (WM?.key) setDone(WM.day, WM.key);
  renderDrafts(); toast('保存'); buzz('ok');
});
tap($('#wGuide'), () => $('#wTpl').classList.toggle('on'));
function renderDrafts() {
  const L = $('#wDrafts');
  L.innerHTML = S.drafts.slice(0, 50).map(d => {
    const p = WRITE.find(x => x.id === d.p) || WRITE[0];
    const dt = new Date(d.at);
    return `<li data-id="${d.id}"><div class="row"><span class="nm">${esc(d.theme || d.text.slice(0, 30) || '（空）')}</span><span class="mt">${dt.getMonth() + 1}/${dt.getDate()} · ${esc(p.n)} · ${count(d.text, p.u)}${p.u}</span></div></li>`;
  }).join('');
  $('#wDraftsH').style.display = S.drafts.length ? '' : 'none';
}
$('#wDrafts').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const d = S.drafts.find(x => x.id === li.dataset.id); if (!d) return;
  sheet(`<h5>${esc(d.theme || '下書き')}</h5><button class="btn pri" data-a="open">開く</button><button class="btn" data-a="copy">コピー</button><button class="btn danger" data-a="del">削除</button>`, a => {
    if (a === 'open') { WD = d; WP = WRITE.find(x => x.id === d.p) || WP; $('#wText').value = d.text; $('#wTheme').value = d.theme || ''; renderWriteChips(); drawCount(); window.scrollTo(0, 0); }
    if (a === 'copy') { navigator.clipboard?.writeText((d.theme ? d.theme + '\n\n' : '') + d.text); toast('コピー'); }
    if (a === 'del') { S.drafts = S.drafts.filter(x => x !== d); if (WD === d) WD = null; save(); renderDrafts(); }
  });
});

/* ───── 過去問：答え合わせ＋手元の資料 ───── */
function renderPast() {
  $('#keys').innerHTML = KEYS.map(k => {
    const r = S.ms[k.id]?.score;
    return `<li data-k="${k.id}"><div class="row"><span class="nm">${esc(k.n)}</span><span class="mt">${r != null ? r + '点' : k.min + '分'}</span></div></li>`;
  }).join('');
  renderFiles();
}
let MK = null;
function openMark(id) {
  MK = KEYS.find(k => k.id === id);
  const st = S.ms[id] = S.ms[id] || { a: {} };
  $('#mTitle').textContent = MK.n;
  const nums = MK.g.flatMap(g => g[1]);
  let sec = 0, html = '';
  for (const g of MK.g) {
    if (g[0] !== sec) { sec = g[0]; html += `<li class="msec">第${sec}問</li>`; }
    for (const n of g[1]) {
      html += `<li class="mrow" data-n="${n}"><span class="mn">${n}</span><span class="mb">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => `<button data-v="${v}" class="${st.a[n] === v ? 'on' : ''}">${v}</button>`).join('')}</span></li>`;
    }
  }
  $('#mList').innerHTML = html; $('#mList').classList.remove('graded'); $('#mScore').textContent = '';
  $('#mList').dataset.max = nums.length;
  openOv('#mark');
}
$('#mList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const n = +b.closest('.mrow').dataset.n, v = +b.dataset.v, st = S.ms[MK.id];
  st.a[n] = st.a[n] === v ? undefined : v;
  $$('button', b.parentNode).forEach(x => x.classList.toggle('on', +x.dataset.v === st.a[n]));
  save(); buzz();
});
function grade(k, ans) {
  const secs = {}; let tot = 0; const wrong = new Set();
  for (const [s, ns, a, p, f = ''] of k.g) {
    const u = ns.map(n => ans[n]);
    let pts = 0;
    const eqSorted = (x, y) => [...x].sort().join() === [...y].sort().join();
    if (f === 'u') { const pool = [...a]; for (const v of u) { const i = pool.indexOf(v); if (i >= 0) { pool.splice(i, 1); pts += p; } } if (pts < p * ns.length) ns.forEach(n => wrong.add(n)); }
    else if (f === 'au') { pts = eqSorted(u, a) ? p : 0; }
    else if (f === 'a2') { pts = eqSorted(u.slice(0, 2), a.slice(0, 2)) && u.slice(2).join() === a.slice(2).join() ? p : 0; }
    else { pts = u.join() === a.join() ? p : 0; }
    if (!pts && f !== 'u') ns.forEach(n => wrong.add(n));
    secs[s] = (secs[s] || 0) + pts; tot += pts;
  }
  return { tot, secs, wrong };
}
tap($('#mGrade'), () => {
  const st = S.ms[MK.id], r = grade(MK, st.a);
  st.score = r.tot; save(true);
  $('#mList').classList.add('graded');
  $$('.mrow', $('#mList')).forEach(li => li.classList.toggle('bad', r.wrong.has(+li.dataset.n)));
  // 正解を表示
  const ansOf = {}; for (const g of MK.g) g[1].forEach((n, i) => ansOf[n] = g[2][i]);
  $$('.mrow', $('#mList')).forEach(li => { const n = +li.dataset.n; $$('button', li).forEach(b => b.classList.toggle('key', +b.dataset.v === ansOf[n])); });
  $('#mScore').innerHTML = `<b>${r.tot}</b> / 100　` + Object.entries(r.secs).map(([s, v]) => `第${s}問 ${v}`).join('　');
  buzz('end'); renderPast();
});
tap($('#mClear'), () => { S.ms[MK.id] = { a: {} }; save(); openMark(MK.id); });
tap($('#mTimer'), () => openTimer(MK.min, MK.n, null));
$('#keys').addEventListener('click', e => { const li = e.target.closest('li'); if (li) { buzz(); openMark(li.dataset.k); } });

/* 手元の PDF・画像・ノート（端末内 IndexedDB のみ。サーバーには送らない） */
const DB = (() => {
  let p;
  const db = () => p = p || new Promise((res, rej) => { const r = indexedDB.open('thirty-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (m, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('f', m), s = t.objectStore('f'), r = fn(s); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };
  return { put: o => tx('readwrite', s => s.put(o)), all: () => tx('readonly', s => s.getAll()), get: id => tx('readonly', s => s.get(id)), del: id => tx('readwrite', s => s.delete(id)) };
})();
async function renderFiles() {
  let all = [];
  try { all = await DB.all(); } catch {}
  const files = all.filter(f => f.kind === 'file').sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  $('#files').innerHTML = files.map(f => `<li data-id="${f.id}"><div class="row"><span class="nm">${esc(f.name)}</span><span class="mt">${(f.size / 1048576).toFixed(1)}MB</span></div></li>`).join('') || '<li class="nil"><span class="mt">PDF・画像はこの端末の中だけに保存</span></li>';
}
$('#fAdd').addEventListener('change', async e => {
  for (const f of e.target.files) {
    await DB.put({ id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'file', name: f.name.replace(/^[0-9a-f]{8}-/, ''), type: f.type, size: f.size, blob: f, at: Date.now() });
  }
  e.target.value = ''; buzz('ok'); renderFiles();
});
$('#files').addEventListener('click', async e => {
  const li = e.target.closest('li[data-id]'); if (!li) return;
  const f = await DB.get(li.dataset.id); if (!f) return;
  sheet(`<h5>${esc(f.name)}</h5><button class="btn pri" data-a="open">開く</button><button class="btn" data-a="t60">開く＋60分</button><button class="btn" data-a="t80">開く＋80分</button><button class="btn" data-a="t120">開く＋120分</button><button class="btn danger" data-a="del">削除</button>`, async a => {
    if (a === 'del') { await DB.del(f.id); renderFiles(); return; }
    window.open(URL.createObjectURL(f.blob), '_blank');
    const m = { t60: 60, t80: 80, t120: 120 }[a];
    if (m) { openTimer(m, f.name.replace(/\.pdf$/i, ''), null); if (!T.run) timerGo(); }
  });
});

/* ───── 教材 ───── */
const CHEM_TEXT = {
  c1: [['理論', 1, '物質の成り立ちと構成', 1], ['理論', 2, '原子の構成とイオン化', 16], ['理論', 3, '化学結合', 27], ['無機', 1, '周期表', 1]],
  c2: [['理論', 10, '結晶格子', 121]], c3: [['理論', 4, '原子量と分子量・式量', 43]], c4: [['理論', 11, '気体', 134]],
  c5: [['理論', 12, '溶解度', 152]], c6: [['理論', 9, '化学反応と熱', 110]], c7: [['理論', 7, '電池', 93], ['理論', 8, '電気分解', 100]],
  c8: [['理論', 13, '反応速度', 168], ['理論', 14, '化学平衡', 173]], c9: [['理論', 5, '酸と塩基', 62]], c10: [['理論', 6, '酸化と還元', 80]],
  c11: [['無機', 2, '水素と貴ガス', 25], ['無機', 3, 'ハロゲン', 30], ['無機', 4, '16族', 43], ['無機', 5, '15族', 56], ['無機', 6, '14族', 68], ['無機', 7, '気体の性質', 81]],
  c12: [['無機', 8, 'アルカリ金属', 90], ['無機', 9, 'アルカリ土類金属', 100], ['無機', 10, '両性元素', 109], ['無機', 11, '遷移元素', 122], ['無機', 12, '金属イオンの分離', 141]],
};
const ICON = { math: '∑', chem: '⚗', kte: 'A', eiken: 'E', ielts: 'I', essay: '✎' };
let LD = null;
const mastered = cs => cs.filter(c => (S.lv[c.id] || 0) >= 2).length;
function renderLearn() {
  const q = $('#q').value.trim();
  $('#hits').style.display = q ? '' : 'none';
  $('#lib').style.display = !q && !LD ? '' : 'none';
  $('#deckView').style.display = !q && LD ? '' : 'none';
  if (q) return renderHits(q);
  if (!LD) {
    const allNg = Object.keys(S.ng).filter(id => CARD[id]).length;
    $('#lib').innerHTML = DECKS.map(d => {
      const cs = d.units.flatMap(u => u.cards), m = mastered(cs);
      return `<button class="tile" data-d="${d.id}"><i>${ICON[d.id]}</i><b>${esc(d.name)}</b><small>${cs.length}枚 · ${Math.round(m / (cs.length || 1) * 100)}%</small><span class="bar"><em style="width:${m / (cs.length || 1) * 100}%"></em></span></button>`;
    }).join('') +
      `<button class="tile ext" data-x="book"><i>📕</i><b>化学問題集</b><small>理論・無機 / 教科書</small></button>` +
      `<button class="tile ext" data-x="ng"><i>✕</i><b>✕ まとめて復習</b><small>${allNg}枚</small></button>` +
      `<button class="tile ext d3" data-x="3d"><i>🏁</i><b>3D レース</b><small>レース / 勉強レース</small></button>`;
    return;
  }
  const D = DECK[LD], cards = D.units.flatMap(u => u.cards), m = mastered(cards), ng = ngOf(LD).length;
  $('#deckName').textContent = D.name;
  $('#deckHead').innerHTML = `<div class="dh"><button data-a="ng"><b>${ng}</b><small>✕ 復習</small></button><button data-a="rnd"><b>30</b><small>ランダム</small></button>${LD === 'chem' ? '<button data-a="book"><b>📕</b><small>問題集</small></button>' : `<button data-a="all" disabled><b>${Math.round(m / (cards.length || 1) * 100)}%</b><small>${m}/${cards.length}</small></button>`}</div>`;
  let g0 = null, html = '';
  for (const u of D.units) {
    if (u.g && u.g !== g0) { g0 = u.g; html += `<li class="gh">${esc(g0)}</li>`; }
    const n = u.cards.length, k = mastered(u.cards), x = u.cards.filter(c => S.ng[c.id]).length, lap = S.laps[u.id] || 0;
    html += `<li data-u="${u.id}"><div class="row"><span class="nm">${esc(u.g ? u.name.replace(u.g + ' ', '') : u.name)}</span><span class="mt">${lap ? lap + '周 · ' : ''}${x ? `<span class="n">✕${x}</span> · ` : ''}${k}/${n}</span></div><div class="bar"><i style="width:${k / n * 100}%"></i></div></li>`;
  }
  $('#units').innerHTML = html;
}
const openBook = () => window.open(CHEM_SITE, '_blank');
$('#lib').addEventListener('click', e => {
  const b = e.target.closest('.tile'); if (!b) return; buzz();
  if (b.dataset.d) { LD = b.dataset.d; renderLearn(); window.scrollTo(0, 0); }
  else if (b.dataset.x === 'book') openBook();
  else if (b.dataset.x === '3d') location.href = '3d.html';
  else if (b.dataset.x === 'ng') { const ids = Object.keys(S.ng).filter(id => CARD[id]); ids.length ? startCards(ids, { title: '✕ まとめて復習' }) : toast('✕ はありません'); }
});
tap($('#back'), () => { LD = null; renderLearn(); window.scrollTo(0, 0); });
$('#deckHead').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.a === 'ng') { const ids = ngOf(LD); if (ids.length) startCards(ids, { title: DECK[LD].name + ' ✕ 復習' }); else toast('✕ はありません'); }
  if (b.dataset.a === 'rnd') startCards(shuffle(DECK[LD].units.flatMap(u => u.cards.map(c => c.id))).slice(0, 30), { title: DECK[LD].name + ' ランダム' });
  if (b.dataset.a === 'book') openBook();
});
function unitSheet(u) {
  const x = u.cards.filter(c => S.ng[c.id]).map(c => c.id);
  const pages = (CHEM_PAGES[u.id] || []).map(([b, r]) => `問題集 ${b} p.${r}`);
  const text = (CHEM_TEXT[u.id] || []).map(([b, ch, t, p]) => `教科書 ${b} 第${ch}章 ${t} p.${p}`);
  const ref = [...pages, ...text];
  buzz();
  sheet(`<h5>${esc(u.name)}</h5><div class="sm">${u.cards.length}枚${S.laps[u.id] ? ' · ' + S.laps[u.id] + '周' : ''}</div>${ref.length ? `<div class="refs">${ref.map(r => `<div>${esc(r)}</div>`).join('')}</div>` : ''}<button class="btn" data-a="in">インプット</button><button class="btn pri" data-a="out">アウトプット</button>${x.length ? `<button class="btn" data-a="ng">✕ だけ（${x.length}）</button>` : ''}${ref.length ? '<button class="btn" data-a="book">📕 問題集・教科書を開く</button>' : ''}`, a => {
    if (a === 'in') openInput([u.id], { title: u.name });
    if (a === 'out') startCards(u.cards.map(c => c.id), { title: u.name, units: [u.id] });
    if (a === 'ng') startCards(x, { title: u.name + ' ✕' });
    if (a === 'book') openBook();
  });
}
$('#units').addEventListener('click', e => { const li = e.target.closest('li[data-u]'); if (li) unitSheet(UNIT[li.dataset.u]); });
/* さがす：全教材のカードから */
const ALL = Object.values(CARD);
const norm = t => String(t || '').toLowerCase().normalize('NFKC');
let hitT;
function renderHits(q) {
  const k = norm(q), out = [];
  for (const c of ALL) { if (norm(c.q).includes(k) || norm(c.a).includes(k)) { out.push(c); if (out.length >= 80) break; } }
  $('#hits').innerHTML = out.length ? out.map(c => { const u = UNIT[c.u]; return `<li data-u="${u.id}"><div class="hq">${esc(c.q)}</div><div class="ha">${esc(c.a)}</div><div class="hm">${esc(DECK[u.deck].name)} · ${esc(u.name)}</div></li>`; }).join('') : '<li class="nil"><span class="mt">見つかりません</span></li>';
}
$('#q').addEventListener('input', () => { clearTimeout(hitT); hitT = setTimeout(renderLearn, 120); });
$('#hits').addEventListener('click', e => { const li = e.target.closest('li[data-u]'); if (li) unitSheet(UNIT[li.dataset.u]); });

/* ───── 傾向 ───── */
const TCAT = (() => {
  const base = { '共テ': [], '英検': [], 'IELTS・TEAP': [], '小論文': [] };
  for (const t of TRENDS) base[/英検/.test(t.t) ? '英検' : /IELTS/.test(t.t) ? 'IELTS・TEAP' : '共テ'].push(t);
  const X = typeof TRENDS_X !== 'undefined' ? TRENDS_X : {};
  for (const k in base) base[k] = [...base[k], ...(X[k] || [])];
  return base;
})();
let TC = '共テ';
function renderTrends() {
  $('#tseg').innerHTML = Object.keys(TCAT).map(k => `<button data-c="${esc(k)}" class="${k === TC ? 'on' : ''}">${esc(k)}</button>`).join('');
  $('#trends').innerHTML = TCAT[TC].map(t => `<div class="tr"><h4>${esc(t.t)}</h4><div class="ts">${esc(t.sub)}</div><table>${t.rows.map(r => `<tr><td class="k">${esc(r[0])}</td><td>${esc(r[1])}</td><td class="p">${esc(r[2] === '' ? '' : (typeof r[2] === 'number' ? r[2] + '点' : r[2]))}</td></tr>`).join('')}</table>${t.notes.length ? `<ul>${t.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>`).join('');
}
$('#tseg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; TC = b.dataset.c; renderTrends(); buzz(); window.scrollTo(0, 0); });

/* ───── 画面・シート ───── */
function show(v) {
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'today') renderToday(); if (v === 'learn') renderLearn(); if (v === 'past') renderPast(); if (v === 'write') { renderWriteChips(); drawCount(); renderDrafts(); }
  window.scrollTo(0, 0);
}
$$('#tabs button').forEach(b => tap(b, () => show(b.dataset.v)));
function openOv(sel) { $(sel).classList.add('on'); document.body.style.overflow = 'hidden'; }
function closeOv(sel) {
  $(sel).classList.remove('on');
  if (!$$('.ov.on').length) document.body.style.overflow = '';
  if (sel === '#ses') SES = null;
  if (sel === '#tmr') drawTimer();
  const v = $('.view.on')?.id; if (v === 'v-today') renderToday(); if (v === 'v-learn') renderLearn();
}
$$('[data-close]').forEach(b => tap(b, () => closeOv('#' + b.closest('.ov').id)));
let SH = null;
function sheet(html, cb) {
  const s = $('#sheet'); s.innerHTML = html; SH = cb;
  $$('[data-a]', s).forEach(b => tap(b, () => { closeSheet(); cb(b.dataset.a); }));
  $('#sheetBg').classList.add('on'); s.classList.add('on');
}
function closeSheet() { $('#sheetBg').classList.remove('on'); $('#sheet').classList.remove('on'); }
$('#sheetBg').addEventListener('click', closeSheet);
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1400); }

tap($('#dPrev'), () => { if (VD > 1) { VD--; renderToday(); } });
tap($('#dNext'), () => { if (VD < DAYS) { VD++; renderToday(); } });

/* キーボード */
document.addEventListener('keydown', e => {
  if (e.target.matches('textarea,input:not(.hu-overlay)')) return;
  if ($('#ses').classList.contains('on') && !$('#ses').classList.contains('end')) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); SES?.shown ? judge(true) : reveal(); }
    if (e.key === 'ArrowRight') judge(true);
    if (e.key === 'ArrowLeft') judge(false);
  }
  if (e.key === 'Escape') { const o = $$('.ov.on').pop(); if (o) closeOv('#' + o.id); closeSheet(); }
});

renderTrends();
show('today');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

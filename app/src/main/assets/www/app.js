/* LeaveBy — routine runner that learns how long your steps really take. Offline, vanilla JS. */
'use strict';

const KEY = 'leaveby.v1';
const MIN = 60000;
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n) => String(n).padStart(2, '0');

/* ---------- Icons ---------- */
const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 4H7a3 3 0 0 0-3 3v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M6 5.5v13l9-6.5zM18 5v14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><path d="M3 17h18M7 17a5 5 0 0 1 10 0M12 7V4M5.6 10.6L3.5 8.5M18.4 10.6l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="M4 20L15 9M14 4v3M19 9h-3M18 5l-2 2M10 6h0M18 13h0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

const EMOJIS = ['🚿', '🪥', '👕', '👗', '🧦', '👟', '🥣', '☕', '🍳', '🥪', '💊', '💄', '🪒', '💇', '🎒', '💼', '🔑', '📱', '🧥', '☂️', '🐶', '🐱', '👶', '🧒', '🛏️', '🧺', '🗑️', '🪴', '🚗', '🚲', '🏋️', '🧘', '🛒', '📝', '💧', '🧴', '📚', '💻', '🎧', '🌅', '🏫', '🏃'];

/* ---------- State ---------- */
function sid() { return 's_' + uid(); }
function seed() {
  const now = Date.now();
  return {
    routines: [
      {
        id: 'r_morning', name: 'Morning out-the-door', emoji: '🌅', createdAt: now,
        steps: [
          { id: sid(), emoji: '🚿', name: 'Shower', estMin: 10 },
          { id: sid(), emoji: '👕', name: 'Get dressed', estMin: 7 },
          { id: sid(), emoji: '🥣', name: 'Breakfast', estMin: 10 },
          { id: sid(), emoji: '🎒', name: 'Pack bag', estMin: 5 },
          { id: sid(), emoji: '👟', name: 'Shoes & keys', estMin: 3 }
        ]
      },
      {
        id: 'r_errand', name: 'Quick errand', emoji: '🛒', createdAt: now + 1,
        steps: [
          { id: sid(), emoji: '💧', name: 'Bathroom & water', estMin: 3 },
          { id: sid(), emoji: '📝', name: 'Grab list & bags', estMin: 3 },
          { id: sid(), emoji: '🧥', name: 'Jacket & shoes', estMin: 3 },
          { id: sid(), emoji: '🔑', name: 'Keys, wallet, phone', estMin: 2 }
        ]
      }
    ],
    runs: [],
    activeRun: null,
    settings: { clock24: false, vibrate: true, defaultBuffer: 5 },
    lastPlan: { routineId: 'r_morning', leaveBy: null, bufferMin: 5, arriveMode: false, travelMin: 20, mode: 'real' }
  };
}

function validRun(a) {
  return !!(a && Array.isArray(a.steps) && a.steps.length && Number.isInteger(a.stepIndex) && a.stepIndex >= 0 && a.stepIndex < a.steps.length &&
    a.steps.every((s) => s && +s.plannedSec > 0) && isFinite(a.stepStartedAt) && isFinite(a.startedAt) && isFinite(a.leaveBy) && (a.log == null || Array.isArray(a.log)) && (a.log = a.log || []));
}
function normalize(o) {
  const d = seed();
  if (!o || typeof o !== 'object' || !Array.isArray(o.routines)) throw new Error('Not LeaveBy data');
  const s = {
    routines: o.routines.filter((r) => r && Array.isArray(r.steps)).map((r) => ({
      id: String(r.id || 'r_' + uid()), name: String(r.name || 'Untitled routine'), emoji: String(r.emoji || '⏰'), createdAt: +r.createdAt || Date.now(),
      steps: r.steps.map((st) => ({ id: String(st.id || sid()), name: String(st.name || 'Step'), emoji: String(st.emoji || '✅'), estMin: clamp(Math.round(+st.estMin || 1), 1, 180) }))
    })),
    runs: Array.isArray(o.runs) ? o.runs.filter((r) => r && Array.isArray(r.steps)) : [],
    activeRun: validRun(o.activeRun) ? o.activeRun : null,
    settings: Object.assign({}, d.settings, o.settings || {}),
    lastPlan: Object.assign({}, d.lastPlan, o.lastPlan || {})
  };
  return s;
}

let S;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    S = raw ? normalize(JSON.parse(raw)) : seed();
  } catch (e) { S = seed(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save — storage unavailable'); }
}

/* ---------- Helpers ---------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2300);
}
function vibrate(ms) {
  if (!S.settings.vibrate) return;
  try {
    if (window.Android && window.Android.vibrate) window.Android.vibrate(ms);
    else if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms);
  } catch (e) { /* ignore */ }
}
function shareText(text) {
  try {
    if (window.Android && window.Android.share) { window.Android.share(text); return; }
  } catch (e) { /* fall through */ }
  copyText(text, 'Summary copied — paste it anywhere');
}
function copyText(text, okMsg) {
  const fallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      toast(okMsg || 'Copied');
    } catch (e) { toast('Select the text and copy it manually'); }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(okMsg || 'Copied'), fallback);
    else fallback();
  } catch (e) { fallback(); }
}
function fmtTime(ts, html) {
  const d = new Date(ts); const h = d.getHours(); const m = d.getMinutes();
  if (S.settings.clock24) return pad(h) + ':' + pad(m);
  const ap = h < 12 ? 'AM' : 'PM';
  const base = ((h % 12) || 12) + ':' + pad(m);
  return html ? base + '<span class="ampm"> ' + ap + '</span>' : base + ' ' + ap;
}
function fmtTimeSmall(ts) {
  const d = new Date(ts); const h = d.getHours(); const m = d.getMinutes();
  if (S.settings.clock24) return pad(h) + ':' + pad(m);
  return ((h % 12) || 12) + ':' + pad(m) + '<small>' + (h < 12 ? 'am' : 'pm') + '</small>';
}
function fmtMin(sec, approx) {
  if (sec > 0 && sec < 30) return '<1 min';
  const m = Math.max(0, Math.round(sec / 60));
  const s = m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
  return (approx ? '~' : '') + s;
}
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
}
function fmtDate(ts) {
  const d = new Date(ts); const today = new Date(); const y = new Date(Date.now() - 864e5);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
const floorMin = (ts) => Math.floor(ts / MIN) * MIN;
function relMin(ms) {
  const m = Math.round(ms / MIN);
  if (m <= 0) return 'now';
  return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
}

/* ---------- Learning ---------- */
function samples(stepId) {
  const out = [];
  for (let i = S.runs.length - 1; i >= 0 && out.length < 7; i--) {
    const st = S.runs[i].steps.find((x) => x.stepId === stepId);
    if (st && !st.skipped && st.actualSec > 0) out.push(st.actualSec);
  }
  return out;
}
function median(a) {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function learnedSec(stepId) { return median(samples(stepId)); }
function stepSec(step, mode) {
  if (mode === 'real') { const l = learnedSec(step.id); if (l) return l; }
  return step.estMin * 60;
}
function routineSec(r, mode) { return r.steps.reduce((a, s) => a + stepSec(s, mode), 0); }
function hasLearning(r) { return r.steps.some((s) => learnedSec(s.id)); }
function getRoutine(id) { return S.routines.find((r) => r.id === id); }

function computePlan(r, leaveTs, bufferMin, mode) {
  const steps = r.steps.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, estMin: s.estMin, sec: stepSec(s, mode), learned: learnedSec(s.id) }));
  const total = steps.reduce((a, s) => a + s.sec, 0);
  const readyBy = leaveTs - bufferMin * MIN;
  const start = floorMin(readyBy - total * 1000);
  let t = start;
  steps.forEach((s) => { s.at = t; t += s.sec * 1000; });
  return { steps, total, start, readyBy, leave: leaveTs };
}

/* ---------- Plan inputs ---------- */
function ensurePlan() {
  const p = S.lastPlan;
  if (!getRoutine(p.routineId)) p.routineId = S.routines[0] ? S.routines[0].id : null;
  if (!p.leaveBy || !/^\d{1,2}:\d{2}$/.test(p.leaveBy)) {
    const d = new Date(Date.now() + 60 * MIN);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    p.leaveBy = d.getHours() + ':' + pad(d.getMinutes());
  }
  if (p.bufferMin == null) p.bufferMin = S.settings.defaultBuffer;
}
function hmToNext(hm) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now() - MIN) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function targetTs() { return hmToNext(S.lastPlan.leaveBy); }
function leaveTs() {
  const p = S.lastPlan; const t = targetTs();
  return p.arriveMode ? t - p.travelMin * MIN : t;
}
function setTargetFromTs(ts) {
  const d = new Date(ts); S.lastPlan.leaveBy = d.getHours() + ':' + pad(d.getMinutes());
}

/* ---------- Streaks ---------- */
function streak() {
  let n = 0;
  for (let i = S.runs.length - 1; i >= 0; i--) { if (S.runs[i].onTimeDeltaMin >= 0) n++; else break; }
  return n;
}
function bestStreak() {
  let b = 0, c = 0;
  S.runs.forEach((r) => { if (r.onTimeDeltaMin >= 0) { c++; b = Math.max(b, c); } else c = 0; });
  return b;
}

/* ---------- Router ---------- */
let view = { name: 'home' };
let navLockUntil = 0;
let stack = [];
function go(name, params) {
  stack.push(view);
  view = Object.assign({ name }, params || {});
  render(true);
}
function goTab(tab) { stack = []; view = { name: tab }; render(true); }
function back() {
  if (dialogOpen()) { closeDialog(); return true; }
  if (view.name === 'home') return false;
  view = stack.pop() || { name: 'home' };
  if (view.name === 'run' && !S.activeRun) view = { name: 'home' };
  render(true);
  return true;
}
window.onAndroidBack = back;

const screens = {};
function render(anim) {
  const el = $('#screen');
  const fn = screens[view.name] || screens.home;
  const keep = anim ? 0 : el.scrollTop;
  el.innerHTML = fn();
  el.classList.remove('anim');
  if (anim) navLockUntil = Date.now() + 250; // swallow ghost taps landing on the new screen
  if (anim) { void el.offsetWidth; el.classList.add('anim'); el.scrollTop = 0; } else el.scrollTop = keep;
  const tabsVisible = ['home', 'history', 'settings'].includes(view.name);
  $('#tabs').classList.toggle('hidden', !tabsVisible);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === view.name));
  if (view.name === 'run') { tickRun(); requestWake(); } else releaseWake();
  liveUpdate();
  const sel = el.querySelector('[data-act="pickRoutine"].on');
  if (sel) { const row = sel.parentElement; row.scrollLeft = sel.offsetLeft - row.offsetLeft - 18; }
}

/* ---------- Screens ---------- */
screens.home = function () {
  ensurePlan();
  const p = S.lastPlan; const r = getRoutine(p.routineId);
  const st = streak();
  let h = `<header class="top"><div class="brand"><div class="brand-mark">${I.sun}</div><h1>LeaveBy</h1></div>
    ${st ? `<span class="streak-badge" title="On-time streak">🔥 ${st} on time</span>` : ''}</header>`;

  if (S.activeRun) {
    const ar = S.activeRun; const cur = ar.steps[ar.stepIndex];
    h += `<button class="resume" data-act="resume"><span class="pulse"></span><div class="grow" style="flex:1"><b>${esc(ar.routineName)} is running</b><div class="small muted">Step ${ar.stepIndex + 1} of ${ar.steps.length} · ${esc(cur ? cur.emoji + ' ' + cur.name : '')}</div></div><span class="chev">${I.chev}</span></button>`;
  }

  if (!S.routines.length) {
    h += `<div class="card empty"><div class="big-emo">🧭</div><h3>No routines yet</h3><p>Create a routine — the steps you go through before you head out.</p><button class="btn primary" data-act="newRoutine">${I.plus} New routine</button></div>`;
    return h;
  }

  const plan = r && r.steps.length ? computePlan(r, leaveTs(), p.bufferMin, 'real') : null;
  h += `<section class="card hero">
    <p class="label">Next up</p>
    <div class="chips" role="radiogroup" aria-label="Routine">${S.routines.map((x) => `<button class="chip ${x.id === p.routineId ? 'on' : ''}" data-act="pickRoutine" data-id="${x.id}">${esc(x.emoji)} ${esc(x.name)}</button>`).join('')}</div>
    <div class="seg" style="margin-top:14px">
      <button class="${!p.arriveMode ? 'on' : ''}" data-act="arriveMode" data-v="0">Leave by</button>
      <button class="${p.arriveMode ? 'on' : ''}" data-act="arriveMode" data-v="1">Arrive by</button>
    </div>
    <div class="time-setter">
      <button class="step-btn" data-act="nudgeTime" data-v="-5" aria-label="5 minutes earlier">−5</button>
      <button class="time-big time" data-act="pickTime" aria-label="Change time" id="target-time">${fmtTime(targetTs(), true)}</button>
      <button class="step-btn" data-act="nudgeTime" data-v="5" aria-label="5 minutes later">+5</button>
    </div>
    <div class="chips wrap quick">${[30, 45, 60, 90].map((m) => `<button class="chip" data-act="inMin" data-v="${m}">in ${m < 60 ? m + 'm' : m === 60 ? '1h' : '1½h'}</button>`).join('')}</div>
    ${p.arriveMode ? `<div class="field-row"><span>🚗 Travel time</span><div class="stepper"><button data-act="travel" data-v="-5" aria-label="Less travel">−</button><span class="val">${p.travelMin} min</span><button data-act="travel" data-v="5" aria-label="More travel">+</button></div></div>
    <div class="small muted" style="margin-top:6px">Leave the house at <b class="time" style="color:var(--text)">${fmtTime(leaveTs())}</b></div>` : ''}
    <div class="field-row"><span>⏳ Buffer</span><div class="chips wrap">${[0, 5, 10, 15].map((b) => `<button class="chip ${p.bufferMin === b ? 'on' : ''}" data-act="buffer" data-v="${b}" style="padding:0 13px">${b}m</button>`).join('')}</div></div>
    <div class="sep"></div>
    ${plan ? `<div class="startby"><div><div class="k">Start by</div><div class="v" id="home-start">${fmtTime(plan.start, true)}</div></div><div class="countdown" id="home-count" data-start="${plan.start}"></div></div>
    <div class="compare">${esc(r.emoji)} ${r.steps.length} steps · ${hasLearning(r) ? `<b>${fmtMin(plan.total, true)}</b> based on your real times` : `<b>${fmtMin(plan.total)}</b> from your guesses`} + ${p.bufferMin} min buffer</div>
    <button class="btn primary big block" style="margin-top:16px" data-act="openPlan">See my plan ${I.chev}</button>`
    : `<p class="muted">This routine has no steps yet.</p><button class="btn block" data-act="editRoutine" data-id="${r ? r.id : ''}">Add steps</button>`}
  </section>`;

  h += `<div class="section-head"><h3>Your routines</h3></div>`;
  h += S.routines.map((x) => {
    const g = routineSec(x, 'guess'); const real = routineSec(x, 'real'); const lrn = hasLearning(x);
    return `<div class="routine-card" role="button" tabindex="0" data-act="editRoutine" data-id="${x.id}">
      <div class="emo">${esc(x.emoji)}</div>
      <div class="info"><div class="name">${esc(x.name)}</div>
      <div class="meta">${x.steps.length} step${x.steps.length === 1 ? '' : 's'} · ${lrn ? `<b>${fmtMin(real, true)}</b> real · you guess ${fmtMin(g)}` : `${fmtMin(g)} estimated`}</div></div>
      ${x.steps.length ? `<button class="play" data-act="quickPlan" data-id="${x.id}" aria-label="Plan ${esc(x.name)}">${I.play}</button>` : ''}
    </div>`;
  }).join('');
  h += `<button class="new-card" data-act="newRoutine">${I.plus} New routine</button>`;
  return h;
};

screens.editor = function () {
  const r = getRoutine(view.id);
  if (!r) { view = { name: 'home' }; return screens.home(); }
  const g = routineSec(r, 'guess'); const real = routineSec(r, 'real'); const lrn = hasLearning(r);
  const canApply = r.steps.some((s) => { const l = learnedSec(s.id); return l && Math.max(1, Math.round(l / 60)) !== s.estMin; });
  let h = `<header class="top"><button class="icon-btn" data-act="back" aria-label="Back">${I.back}</button><h2>Edit routine</h2>
    <button class="icon-btn danger" data-act="deleteRoutine" aria-label="Delete routine">${I.trash}</button></header>`;
  h += `<section class="card"><div class="name-row"><button class="emoji-btn" data-act="pickEmoji" data-target="routine" aria-label="Routine icon">${esc(r.emoji)}</button>
    <input class="text-in" data-in="routineName" value="${esc(r.name)}" placeholder="Routine name" maxlength="40" aria-label="Routine name"></div>
    <div class="totals"><div class="total-box"><div class="k">Your guess</div><div class="v" id="tot-guess">${fmtMin(g)}</div></div>
    <div class="total-box real"><div class="k">Real</div><div class="v">${lrn ? fmtMin(real, true) : '—'}</div></div></div>
    ${lrn ? `<button class="btn ${canApply ? 'primary' : ''} block" style="margin-top:14px" data-act="applyReal" ${canApply ? '' : 'disabled'}>${I.wand} ${canApply ? 'Use my real times' : 'Estimates match reality'}</button>`
      : `<p class="small muted" style="margin:12px 0 0">Run this routine once and LeaveBy will start measuring how long each step <i>really</i> takes.</p>`}
  </section>`;
  h += `<div class="section-head"><h3>Steps</h3><span class="small muted">${r.steps.length} total</span></div>`;
  if (!r.steps.length) h += `<div class="note plain">No steps yet. Add the things you do before leaving — shower, dress, breakfast, keys…</div>`;
  h += r.steps.map((s, i) => {
    const l = learnedSec(s.id); const n = samples(s.id).length;
    let hint = '';
    if (l) {
      const f = l / (s.estMin * 60); const cls = f > 1.15 ? 'over' : f < 0.87 ? 'under' : 'even';
      hint = `<div class="hint"><span>You guess <b>${s.estMin} min</b>, you actually take <b>${fmtMin(l, true)}</b> <span class="tiny">(${n} run${n === 1 ? '' : 's'})</span></span><span class="factor ${cls}">×${f.toFixed(1)}</span></div>`;
    }
    return `<div class="step-card" data-i="${i}">
      <div class="row1"><span class="idx">${i + 1}</span><button class="emoji-btn sm" data-act="pickEmoji" data-target="step" data-i="${i}" aria-label="Step icon">${esc(s.emoji)}</button>
      <input class="text-in sm" data-in="stepName" data-i="${i}" value="${esc(s.name)}" placeholder="Step name" maxlength="40" aria-label="Step name"></div>
      <div class="row2"><div class="stepper"><button data-act="est" data-i="${i}" data-v="-1" aria-label="Less time">−</button><span class="val">${s.estMin} min</span><button data-act="est" data-i="${i}" data-v="1" aria-label="More time">+</button></div>
      <div class="step-actions"><button data-act="moveStep" data-i="${i}" data-v="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${I.up}</button><button data-act="moveStep" data-i="${i}" data-v="1" ${i === r.steps.length - 1 ? 'disabled' : ''} aria-label="Move down">${I.down}</button><button data-act="dupStep" data-i="${i}" aria-label="Duplicate">${I.copy}</button><button class="del" data-act="delStep" data-i="${i}" aria-label="Delete step">${I.trash}</button></div></div>
      ${hint}</div>`;
  }).join('');
  h += `<button class="new-card" data-act="addStep">${I.plus} Add step</button>`;
  if (r.steps.length) h += `<div class="sticky-cta"><button class="btn primary big block" data-act="quickPlan" data-id="${r.id}">Plan this routine ${I.chev}</button></div>`;
  return h;
};

screens.plan = function () {
  ensurePlan();
  const p = S.lastPlan; const r = getRoutine(p.routineId);
  if (!r || !r.steps.length) { view = { name: 'home' }; return screens.home(); }
  const lrn = hasLearning(r);
  const mode = lrn ? p.mode : 'guess';
  const lv = leaveTs();
  const plan = computePlan(r, lv, p.bufferMin, mode);
  const realP = computePlan(r, lv, p.bufferMin, 'real'); const guessP = computePlan(r, lv, p.bufferMin, 'guess');
  let h = `<header class="top"><button class="icon-btn" data-act="back" aria-label="Back">${I.back}</button><h2>${esc(r.emoji)} ${esc(r.name)}</h2></header>`;
  h += `<div class="seg" style="margin-bottom:14px"><button class="${mode === 'real' ? 'on' : ''}" data-act="planMode" data-v="real" ${lrn ? '' : 'disabled'}>My real times</button><button class="${mode === 'guess' ? 'on' : ''}" data-act="planMode" data-v="guess">My guesses</button></div>`;
  if (!lrn) h += `<div class="note">No history yet, so this plan uses your guesses. After your first run, LeaveBy plans with your <b>real</b> times.</div>`;
  h += `<section class="card hero"><div class="startby"><div><div class="k">Start by</div><div class="v" id="plan-start">${fmtTime(plan.start, true)}</div></div><div class="countdown" id="plan-count" data-start="${plan.start}"></div></div>`;
  if (lrn && realP.start !== guessP.start) {
    h += `<div class="compare" id="plan-compare">Your guesses say start at <b>${fmtTime(guessP.start)}</b>, your real history says start at <b>${fmtTime(realP.start)}</b>.</div>`;
  } else if (lrn) h += `<div class="compare">Your guesses match your real history — nice calibration.</div>`;
  h += `</section>`;
  h += `<section class="card"><ul class="timeline">`;
  h += plan.steps.map((s, i) => `<li class="${i === 0 ? 'start' : ''}"><span class="t">${fmtTimeSmall(s.at)}</span><span class="dot">${esc(s.emoji)}</span>
      <div class="body"><div class="nm">${esc(s.name)}</div><div class="sub">${mode === 'real' && s.learned ? `<span class="lrn">learned</span> · you guess ${s.estMin} min` : mode === 'real' ? 'no data yet · your guess' : 'your guess'}</div></div>
      <span class="d">${fmtMin(s.sec, mode === 'real' && !!s.learned)}</span></li>`).join('');
  if (p.bufferMin) h += `<li class="buffer"><span class="t">${fmtTimeSmall(plan.readyBy)}</span><span class="dot">⏳</span><div class="body"><div class="nm">Buffer</div><div class="sub">breathing room</div></div><span class="d">${p.bufferMin} min</span></li>`;
  h += `<li class="leave"><span class="t">${fmtTimeSmall(lv)}</span><span class="dot">🚪</span><div class="body"><div class="nm">Out the door</div>${p.arriveMode ? `<div class="sub">arrive ${fmtTime(targetTs())} after ${p.travelMin} min travel</div>` : '<div class="sub">leave by</div>'}</div></li>`;
  h += `</ul></section>`;
  h += `<div class="sticky-cta"><button class="btn primary big block" data-act="startRun" ${S.activeRun ? 'disabled' : ''}>${I.play} Start routine</button>${S.activeRun ? '<p class="tiny muted" style="text-align:center;margin:8px 0 0">Finish your current run first.</p>' : ''}</div>`;
  return h;
};

screens.run = function () {
  const ar = S.activeRun;
  if (!ar) { view = { name: 'home' }; return screens.home(); }
  const cur = ar.steps[ar.stepIndex]; const next = ar.steps[ar.stepIndex + 1];
  const C = 2 * Math.PI * 130;
  return `<div class="run">
    <div class="run-top"><button class="icon-btn" data-act="back" aria-label="Minimize run">${I.down}</button>
      <div class="leave-banner" id="leave-banner"><span class="door">🚪</span><span>Leave at <span class="time">${fmtTime(ar.leaveBy)}</span></span><span class="left" id="leave-left"></span></div>
      <button class="icon-btn" data-act="runMenu" aria-label="Run options">${I.close}</button></div>
    <div class="run-meta"><div class="progress-dots">${ar.steps.map((s, i) => `<i class="${i < ar.stepIndex ? 'done' : i === ar.stepIndex ? 'cur' : ''}"></i>`).join('')}</div>
      <span class="pace" id="pace">On pace</span></div>
    <div class="ring-wrap" id="ring"><svg viewBox="0 0 300 300"><circle class="ring-bg" cx="150" cy="150" r="130" fill="none" stroke-width="18"/>
      <circle class="ring-fg" id="ring-fg" cx="150" cy="150" r="130" fill="none" stroke-width="18" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
      <div class="ring-center"><div class="emo">${esc(cur.emoji)}</div><div class="remain" id="remain">0:00</div><div class="rl" id="remain-l">left</div></div></div>
    <div class="step-title">${esc(cur.name)}</div>
    <div class="step-deadline">Step ${ar.stepIndex + 1} of ${ar.steps.length} · done by <b id="deadline" class="time"></b></div>
    <div class="run-actions">
      <div class="btn-row"><button class="btn outline" data-act="skipStep">${I.skip} Skip</button><button class="btn outline" data-act="plus2">+2 min</button></div>
      <button class="btn primary block done-btn" data-act="doneStep">${I.check} ${next ? 'Done' : 'Done — out the door!'}</button>
      <div class="peek">${next ? `Up next: <b>${esc(next.emoji)} ${esc(next.name)}</b> · ${fmtMin(next.plannedSec)}` : 'Last step — grab everything!'}</div>
    </div></div>`;
};

screens.summary = function () {
  const run = S.runs.find((x) => x.id === view.id);
  if (!run) { view = { name: 'home' }; return screens.home(); }
  const ok = run.onTimeDeltaMin >= 0; const d = Math.abs(run.onTimeDeltaMin);
  const planned = run.steps.reduce((a, s) => a + s.plannedSec, 0);
  const actual = run.steps.reduce((a, s) => a + s.actualSec, 0);
  const r = getRoutine(run.routineId);
  const canApply = r && r.steps.some((s) => { const l = learnedSec(s.id); return l && Math.max(1, Math.round(l / 60)) !== s.estMin; });
  const st = streak();
  let h = `<header class="top"><button class="icon-btn" data-act="back" aria-label="Back">${I.back}</button><h2>${fmtDate(run.finishedAt)} · ${fmtTime(run.finishedAt)}</h2>
    <button class="icon-btn" data-act="shareRun" data-id="${run.id}" aria-label="Share">${I.share}</button></header>`;
  h += `<section class="card hero result"><div class="big-emo">${ok ? '🎉' : '⏰'}</div><h1>${ok ? 'Out the door!' : 'Out the door'}</h1>
    <span class="verdict ${ok ? 'ok' : 'late'}">${ok ? (d === 0 ? 'Right on time' : `On time · ${d} min early`) : `Late by ${d} min`}</span>
    <div class="stat-row"><div class="stat"><div class="v">${fmtMin(actual)}</div><div class="k">Actual</div></div><div class="stat"><div class="v">${fmtMin(planned)}</div><div class="k">Planned</div></div><div class="stat"><div class="v">${st}🔥</div><div class="k">Streak</div></div></div>
    <p class="small muted" style="margin:14px 0 0">${esc(run.emoji || '')} ${esc(run.routineName)} · leave-by ${fmtTime(run.leaveBy)}</p></section>`;
  h += `<section class="card"><p class="label">Planned vs actual</p><table class="steps"><thead><tr><th>Step</th><th>Plan</th><th>Actual</th><th>Δ</th></tr></thead><tbody>`;
  h += run.steps.map((s) => {
    const diff = s.actualSec - s.plannedSec; const dm = Math.round(diff / 60);
    return `<tr><td>${esc(s.emoji || '')} ${esc(s.name)}${s.skipped ? '<span class="tag">skipped</span>' : ''}</td><td>${fmtClock(s.plannedSec)}</td><td>${fmtClock(s.actualSec)}</td>
    <td class="${s.skipped ? 'muted' : dm > 0 ? 'd-over' : dm < 0 ? 'd-under' : 'muted'}">${s.skipped ? '—' : (dm > 0 ? '+' : '') + dm + 'm'}</td></tr>`;
  }).join('');
  h += `</tbody></table></section>`;
  if (canApply) {
    h += `<section class="card"><p class="label">Update estimates?</p><p class="small muted" style="margin:0 0 12px">Your real times differ from your guesses for ${esc(r.name)}. Use them so next time's plan is honest.</p>
      <button class="btn primary block" data-act="applyRealFor" data-id="${r.id}">${I.wand} Use my real times</button></section>`;
  }
  h += `<div class="btn-row" style="margin-top:4px"><button class="btn" data-act="shareRun" data-id="${run.id}">${I.share} Share</button><button class="btn primary" data-act="tab" data-tab="home">Done</button></div>`;
  return h;
};

screens.history = function () {
  const st = streak(); const best = bestStreak(); const n = S.runs.length;
  const okN = S.runs.filter((r) => r.onTimeDeltaMin >= 0).length;
  let h = `<header class="top"><h1>History</h1>${n ? `<button class="icon-btn" data-act="shareStreak" aria-label="Share streak">${I.share}</button>` : ''}</header>`;
  if (!n) {
    h += `<section class="card empty"><div class="big-emo">📈</div><h3>No runs yet</h3><p>Every run you finish is logged here. LeaveBy measures each step so your plans get more honest over time.</p><button class="btn primary" data-act="tab" data-tab="home">Plan a routine</button></section>`;
    return h;
  }
  h += `<section class="card hero streak-card"><div class="streak-num">${st}</div><div class="info"><b>on-time run${st === 1 ? '' : 's'} in a row</b><span class="small muted">Best ${best} · ${Math.round(okN / n * 100)}% on time over ${n} run${n === 1 ? '' : 's'}</span></div><div style="font-size:34px">🔥</div></section>`;

  const withRuns = S.routines.filter((r) => S.runs.some((x) => x.routineId === r.id));
  if (withRuns.length) {
    if (!withRuns.find((r) => r.id === view.chart)) view.chart = withRuns[0].id;
    const r = getRoutine(view.chart);
    const rows = r.steps.map((s) => ({ s, l: learnedSec(s.id), g: s.estMin * 60 }));
    const max = Math.max(60, ...rows.map((x) => Math.max(x.g, x.l || 0)));
    h += `<section class="card"><p class="label">Guess vs reality</p>
      ${withRuns.length > 1 ? `<div class="chips" style="margin-bottom:6px">${withRuns.map((x) => `<button class="chip ${x.id === r.id ? 'on' : ''}" data-act="chartRoutine" data-id="${x.id}">${esc(x.emoji)} ${esc(x.name)}</button>`).join('')}</div>` : ''}
      <div class="bars">${rows.map((x) => `<div class="bar-row"><div class="bl"><span>${esc(x.s.emoji)} ${esc(x.s.name)}</span><span>${x.s.estMin}m → ${x.l ? fmtMin(x.l, true) : 'no data'}</span></div>
        <div class="bar" style="width:${(x.g / max * 100).toFixed(1)}%"></div>${x.l ? `<div class="bar actual ${x.l > x.g * 1.15 ? 'over' : ''}" style="width:${(x.l / max * 100).toFixed(1)}%"></div>` : ''}</div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--surface3)"></i>Your guess</span><span><i style="background:var(--accent)"></i>Real (median)</span><span><i style="background:var(--coral)"></i>Way over</span></div></section>`;
  }
  h += `<div class="section-head"><h3>Runs</h3></div>`;
  h += S.runs.slice().reverse().map((x) => {
    const ok = x.onTimeDeltaMin >= 0; const d = Math.abs(x.onTimeDeltaMin);
    const dur = Math.round((x.finishedAt - x.startedAt) / 1000);
    return `<button class="run-item" data-act="openRun" data-id="${x.id}"><span class="emo">${esc(x.emoji || '⏰')}</span><div class="info"><div class="nm">${esc(x.routineName)}</div><div class="sub">${fmtDate(x.finishedAt)} · ${fmtTime(x.finishedAt)} · ${fmtMin(dur)}</div></div>
      <span class="badge ${ok ? 'ok' : 'late'}">${ok ? (d ? `${d} min early` : 'on time') : `${d} min late`}</span></button>`;
  }).join('');
  return h;
};

screens.settings = function () {
  const s = S.settings;
  const sw = (k, on) => `<span class="switch-hit"><span class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}"></span></span>`;
  return `<header class="top"><h1>Settings</h1></header>
  <p class="label" style="margin-left:4px">Display & runs</p>
  <div class="set-group">
    <button class="set-row" data-act="toggleSet" data-k="clock24"><span class="ico">🕐</span><div class="info"><b>24-hour clock</b><span>Now showing ${fmtTime(Date.now())}</span></div>${sw('clock24', s.clock24)}</button>
    <button class="set-row" data-act="toggleSet" data-k="vibrate"><span class="ico">📳</span><div class="info"><b>Vibration</b><span>Buzz on step done & overtime</span></div>${sw('vibrate', s.vibrate)}</button>
    <div class="set-row"><span class="ico">⏳</span><div class="info"><b>Default buffer</b><span>Breathing room before leaving</span></div></div>
    <div style="padding:0 16px 14px"><div class="chips wrap">${[0, 5, 10, 15].map((b) => `<button class="chip ${s.defaultBuffer === b ? 'on' : ''}" data-act="defBuffer" data-v="${b}">${b} min</button>`).join('')}</div></div>
    <div class="set-row"><span class="ico">🔆</span><div class="info"><b>Keep the screen awake</b><span>LeaveBy asks your phone to keep the screen on during a run. If it still dims, raise Screen timeout in Android Settings › Display.</span></div></div>
  </div>
  <p class="label" style="margin-left:4px">Your data</p>
  <div class="set-group">
    <button class="set-row" data-act="exportData"><span class="ico">📤</span><div class="info"><b>Export data</b><span>${S.routines.length} routines · ${S.runs.length} runs as JSON</span></div><span class="chev">${I.chev}</span></button>
    <button class="set-row" data-act="importData"><span class="ico">📥</span><div class="info"><b>Import data</b><span>Paste a LeaveBy backup</span></div><span class="chev">${I.chev}</span></button>
    <button class="set-row danger" data-act="resetData"><span class="ico">🧹</span><div class="info"><b>Reset everything</b><span>Back to the starter routines</span></div><span class="chev">${I.chev}</span></button>
  </div>
  <p class="label" style="margin-left:4px">About</p>
  <div class="card small muted" style="line-height:1.55"><b style="color:var(--text)">LeaveBy</b> helps with time blindness by doing the "time trials" ADHD coaches recommend — automatically. Every run measures how long your steps really take, then plans backward from when you need to leave.<br><br>No account, no ads, no network. Everything stays on this phone.</div>`;
};

/* ---------- Dialogs ---------- */
let dlg = null;
function dialogOpen() { return !!dlg; }
function openDialog(html, onMount) {
  closeDialog(true);
  const root = $('#dialog-root');
  root.innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  dlg = { root };
  if (onMount) onMount($('.sheet', root));
}
function closeDialog(instant) {
  if (!dlg) return;
  const root = dlg.root; dlg = null;
  const sc = $('.scrim', root);
  if (instant || !sc) { root.innerHTML = ''; return; }
  sc.classList.add('closing');
  setTimeout(() => { if (!dlg) root.innerHTML = ''; }, 180);
}
let dlgActions = {};
function confirmDialog(title, text, okLabel, onOk, danger) {
  dlgActions.ok = () => { closeDialog(); onOk(); };
  openDialog(`<h3>${esc(title)}</h3><p>${text}</p><div class="actions"><button class="btn block ${danger ? 'danger' : 'primary'}" data-act="dlgOk">${esc(okLabel)}</button><button class="btn block" data-act="dlgCancel">Cancel</button></div>`);
}

function timePicker() {
  const [h0, m0] = S.lastPlan.leaveBy.split(':').map(Number);
  const t = { h: h0, m: m0 };
  const draw = () => {
    const sheet = $('.sheet');
    if (!sheet) return;
    const disp = S.settings.clock24 ? pad(t.h) : String((t.h % 12) || 12);
    $('#pk-h', sheet).textContent = disp;
    $('#pk-m', sheet).textContent = pad(t.m);
    const seg = $('#pk-ampm', sheet);
    if (seg) seg.innerHTML = `<button class="${t.h < 12 ? 'on' : ''}" data-act="pk" data-k="am">AM</button><button class="${t.h >= 12 ? 'on' : ''}" data-act="pk" data-k="pm">PM</button>`;
  };
  dlgActions.pk = (ds) => {
    const k = ds.k;
    if (k === 'h+') t.h = (t.h + 1) % 24;
    if (k === 'h-') t.h = (t.h + 23) % 24;
    if (k === 'am' && t.h >= 12) t.h -= 12;
    if (k === 'pm' && t.h < 12) t.h += 12;
    if (k.startsWith('m')) { const v = +k.slice(1); t.m = (t.m + v + 60) % 60; }
    draw();
  };
  dlgActions.ok = () => { S.lastPlan.leaveBy = t.h + ':' + pad(t.m); save(); closeDialog(); render(); };
  openDialog(`<h3>${S.lastPlan.arriveMode ? 'Arrive by' : 'Leave by'}</h3>
    <div class="picker"><div class="col"><button data-act="pk" data-k="h+" aria-label="Hour up">${I.up}</button><span class="pv" id="pk-h"></span><button data-act="pk" data-k="h-" aria-label="Hour down">${I.down}</button></div>
    <span class="colon">:</span>
    <div class="col"><div class="fine"><button data-act="pk" data-k="m+1">+1</button><button data-act="pk" data-k="m+5">+5</button></div><span class="pv" id="pk-m"></span><div class="fine"><button data-act="pk" data-k="m-1">−1</button><button data-act="pk" data-k="m-5">−5</button></div></div></div>
    ${S.settings.clock24 ? '' : '<div class="seg ampm-seg" id="pk-ampm"></div>'}
    <div class="actions"><button class="btn primary block" data-act="dlgOk">Set time</button><button class="btn block" data-act="dlgCancel">Cancel</button></div>`, () => draw());
  // icons inside picker buttons need centering
  document.querySelectorAll('.picker .col > button').forEach((b) => { b.style.display = 'grid'; b.style.placeItems = 'center'; });
}

function emojiPicker(current, onPick) {
  dlgActions.emoji = (ds) => { closeDialog(); onPick(ds.e); };
  openDialog(`<h3>Choose an icon</h3><div class="emoji-grid" style="margin-top:12px">${EMOJIS.map((e) => `<button class="${e === current ? 'on' : ''}" data-act="dlgEmoji" data-e="${e}">${e}</button>`).join('')}</div>`);
}

/* ---------- Run engine ---------- */
let wake = null;
function requestWake() {
  try {
    if (wake || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then((w) => { wake = w; w.addEventListener('release', () => { wake = null; }); }).catch(() => {});
  } catch (e) { /* unsupported */ }
}
function releaseWake() { try { if (wake) wake.release().catch(() => {}); } catch (e) { /* ignore */ } wake = null; }

function runState(now) {
  const ar = S.activeRun; const cur = ar.steps[ar.stepIndex];
  const el = (now - ar.stepStartedAt) / 1000;
  const allowed = cur.plannedSec + (ar.extraSec || 0);
  const remaining = allowed - el;
  const banked = ar.log.reduce((a, s) => a + (s.plannedSec - s.actualSec), 0);
  const pace = banked + Math.min(0, cur.plannedSec - el);
  return { cur, el, allowed, remaining, pace };
}
function tickRun() {
  if (view.name !== 'run' || !S.activeRun) return;
  const ar = S.activeRun; const now = Date.now();
  const st = runState(now);
  const ring = $('#ring'); if (!ring) return;
  const C = 2 * Math.PI * 130;
  const over = st.remaining < 0;
  ring.classList.toggle('over', over);
  const frac = over ? 1 : clamp(st.remaining / st.allowed, 0, 1);
  $('#ring-fg').setAttribute('stroke-dashoffset', String(over ? 0 : C * (1 - frac)));
  $('#remain').textContent = over ? '+' + fmtClock(-st.remaining) : fmtClock(Math.ceil(st.remaining));
  $('#remain-l').textContent = over ? 'overtime' : 'left';
  $('#deadline').textContent = fmtTime(ar.stepStartedAt + st.allowed * 1000);
  const pm = Math.abs(st.pace) < 30 ? 0 : Math.sign(st.pace) * Math.max(1, Math.round(Math.abs(st.pace) / 60));
  const pace = $('#pace');
  pace.className = 'pace ' + (pm > 0 ? 'ahead' : pm < 0 ? 'behind' : '');
  pace.textContent = pm > 0 ? `+${pm} min ahead` : pm < 0 ? `−${-pm} min behind` : 'On pace';
  const leftMs = ar.leaveBy - now;
  const lb = $('#leave-banner');
  lb.classList.toggle('late', leftMs < 0);
  $('#leave-left').textContent = leftMs >= 0 ? `${Math.ceil(leftMs / MIN)} min left` : `${Math.ceil(-leftMs / MIN)} min late`;
  if (over && !ar.overNotified) { ar.overNotified = true; save(); vibrate(400); }
}
function startRun() {
  const p = S.lastPlan; const r = getRoutine(p.routineId);
  if (!r || !r.steps.length || S.activeRun) return;
  const mode = hasLearning(r) ? p.mode : 'guess';
  const lv = leaveTs();
  const plan = computePlan(r, lv, p.bufferMin, mode);
  const now = Date.now();
  S.activeRun = {
    id: 'run_' + uid(), routineId: r.id, routineName: r.name, emoji: r.emoji, leaveBy: lv, bufferMin: p.bufferMin, mode,
    steps: plan.steps.map((s) => ({ stepId: s.id, name: s.name, emoji: s.emoji, plannedSec: Math.round(s.sec) })),
    stepIndex: 0, startedAt: now, stepStartedAt: now, extraSec: 0, overNotified: false, log: []
  };
  save();
  stack = [{ name: 'home' }];
  view = { name: 'run' };
  render(true);
}
function advance(skipped) {
  const ar = S.activeRun; if (!ar) return;
  const now = Date.now(); const cur = ar.steps[ar.stepIndex];
  // Ignore accidental double-taps: they'd skip a step and log a bogus ~0s sample into learning.
  if (now - ar.stepStartedAt < 300 && ar.stepIndex > 0) return;
  ar.log.push({ stepId: cur.stepId, name: cur.name, emoji: cur.emoji, plannedSec: cur.plannedSec, actualSec: Math.max(1, Math.round((now - ar.stepStartedAt) / 1000)), skipped: !!skipped, extraSec: ar.extraSec || 0 });
  if (!skipped) vibrate(60);
  if (ar.stepIndex + 1 >= ar.steps.length) return finishRun(now);
  ar.stepIndex++; ar.stepStartedAt = now; ar.extraSec = 0; ar.overNotified = false;
  save();
  render(false);
}
function finishRun(now) {
  const ar = S.activeRun;
  now = now || Date.now();
  // Partial finish: mark remaining steps skipped with zero time
  for (let i = ar.log.length; i < ar.steps.length; i++) {
    const s = ar.steps[i];
    ar.log.push({ stepId: s.stepId, name: s.name, emoji: s.emoji, plannedSec: s.plannedSec, actualSec: 0, skipped: true, extraSec: 0 });
  }
  const run = {
    id: ar.id, routineId: ar.routineId, routineName: ar.routineName, emoji: ar.emoji, startedAt: ar.startedAt, leaveBy: ar.leaveBy, bufferMin: ar.bufferMin,
    finishedAt: now, onTimeDeltaMin: Math.floor((ar.leaveBy - now) / MIN), steps: ar.log
  };
  S.runs.push(run);
  S.activeRun = null;
  save();
  vibrate(250);
  stack = [{ name: 'home' }];
  view = { name: 'summary', id: run.id };
  render(true);
}
function applyReal(r) {
  let n = 0;
  r.steps.forEach((s) => { const l = learnedSec(s.id); if (l) { const v = clamp(Math.round(l / 60), 1, 180); if (v !== s.estMin) { s.estMin = v; n++; } } });
  save();
  toast(n ? `Updated ${n} estimate${n === 1 ? '' : 's'} to your real times` : 'Estimates already match');
}

/* ---------- Actions ---------- */
function curRoutine() { return getRoutine(view.id); }
const A = {
  tab: (d) => goTab(d.tab),
  back: () => back(),
  scrim: (d, el, ev) => { if (ev.target === el) closeDialog(); },
  dlgOk: () => dlgActions.ok && dlgActions.ok(),
  dlgCancel: () => closeDialog(),
  dlgEmoji: (d) => dlgActions.emoji && dlgActions.emoji(d),
  pk: (d) => dlgActions.pk && dlgActions.pk(d),
  resume: () => go('run'),
  pickRoutine: (d) => { S.lastPlan.routineId = d.id; save(); render(); },
  arriveMode: (d) => {
    const want = d.v === '1'; const p = S.lastPlan;
    if (want === p.arriveMode) return;
    const lv = leaveTs(); p.arriveMode = want;
    setTargetFromTs(want ? lv + p.travelMin * MIN : lv); // keep the same departure time
    save(); render();
  },
  nudgeTime: (d) => { setTargetFromTs(targetTs() + (+d.v) * MIN); save(); render(); },
  inMin: (d) => { setTargetFromTs(Math.ceil((Date.now() + (+d.v) * MIN) / MIN) * MIN); save(); render(); },
  pickTime: () => timePicker(),
  travel: (d) => { S.lastPlan.travelMin = clamp(S.lastPlan.travelMin + (+d.v), 0, 240); save(); render(); },
  buffer: (d) => { S.lastPlan.bufferMin = +d.v; save(); render(); },
  openPlan: () => go('plan'),
  quickPlan: (d) => { S.lastPlan.routineId = d.id; save(); go('plan'); },
  planMode: (d) => { S.lastPlan.mode = d.v; save(); render(); },
  startRun: () => startRun(),
  editRoutine: (d) => go('editor', { id: d.id }),
  newRoutine: () => {
    const r = { id: 'r_' + uid(), name: 'New routine', emoji: '⏰', createdAt: Date.now(), steps: [{ id: sid(), emoji: '✅', name: 'First step', estMin: 5 }] };
    S.routines.push(r); save(); go('editor', { id: r.id });
    setTimeout(() => { const i = $('[data-in="routineName"]'); if (i) { i.focus(); i.select(); } }, 350);
  },
  deleteRoutine: () => {
    const r = curRoutine(); if (!r) return;
    if (S.activeRun && S.activeRun.routineId === r.id) { toast('This routine is running — finish it first'); return; }
    confirmDialog('Delete routine?', `“${esc(r.name)}” will be removed. Past runs stay in your history.`, 'Delete routine', () => {
      S.routines = S.routines.filter((x) => x.id !== r.id); save(); toast('Routine deleted'); back();
    }, true);
  },
  pickEmoji: (d) => {
    const r = curRoutine(); if (!r) return;
    const target = d.target === 'routine' ? r : r.steps[+d.i];
    emojiPicker(target.emoji, (e) => { target.emoji = e; save(); render(); });
  },
  est: (d) => { const r = curRoutine(); const s = r.steps[+d.i]; s.estMin = clamp(s.estMin + (+d.v), 1, 180); save(); render(); },
  moveStep: (d) => {
    const r = curRoutine(); const i = +d.i; const j = i + (+d.v);
    if (j < 0 || j >= r.steps.length) return;
    [r.steps[i], r.steps[j]] = [r.steps[j], r.steps[i]]; save(); render();
  },
  dupStep: (d) => { const r = curRoutine(); const s = r.steps[+d.i]; r.steps.splice(+d.i + 1, 0, { id: sid(), name: s.name, emoji: s.emoji, estMin: s.estMin }); save(); render(); toast('Step duplicated'); },
  delStep: (d) => {
    const r = curRoutine(); const i = +d.i; const removed = r.steps.splice(i, 1)[0]; save(); render();
    toast(`Deleted “${removed.name}”`);
  },
  addStep: () => {
    const r = curRoutine(); r.steps.push({ id: sid(), emoji: '✅', name: 'New step', estMin: 5 }); save(); render();
    setTimeout(() => { const ins = document.querySelectorAll('[data-in="stepName"]'); const last = ins[ins.length - 1]; if (last) { last.focus(); last.select(); last.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 30);
  },
  applyReal: () => { const r = curRoutine(); if (r) { applyReal(r); render(); } },
  applyRealFor: (d) => { const r = getRoutine(d.id); if (r) { applyReal(r); render(); } },
  doneStep: () => advance(false),
  skipStep: () => advance(true),
  plus2: () => {
    const ar = S.activeRun; if (!ar) return;
    ar.extraSec = (ar.extraSec || 0) + 120;
    if (runState(Date.now()).remaining > 0) ar.overNotified = false;
    save(); tickRun(); toast('+2 min added to this step');
  },
  runMenu: () => {
    dlgActions.finish = () => { closeDialog(); finishRun(); };
    dlgActions.discard = () => { closeDialog(); S.activeRun = null; save(); goTab('home'); toast('Run discarded'); };
    openDialog(`<h3>End this run?</h3><p>Finish now to log it (remaining steps count as skipped), or discard it entirely.</p>
      <div class="actions"><button class="btn primary block" data-act="dlgFinish">I'm out the door — finish</button><button class="btn danger block" data-act="dlgDiscard">Discard run</button><button class="btn block" data-act="dlgCancel">Keep going</button></div>`);
  },
  dlgFinish: () => dlgActions.finish && dlgActions.finish(),
  dlgDiscard: () => dlgActions.discard && dlgActions.discard(),
  openRun: (d) => go('summary', { id: d.id }),
  chartRoutine: (d) => { view.chart = d.id; render(); },
  shareRun: (d) => {
    const run = S.runs.find((x) => x.id === d.id); if (!run) return;
    const ok = run.onTimeDeltaMin >= 0; const st = streak();
    shareText(`${ok ? '✅ Out the door on time' : `⏰ Out the door, ${Math.abs(run.onTimeDeltaMin)} min late`} for “${run.routineName}”${st > 1 ? ` — ${st} on-time runs in a row` : ''} with LeaveBy.`);
  },
  shareStreak: () => {
    const st = streak(); const n = S.runs.length; const ok = S.runs.filter((r) => r.onTimeDeltaMin >= 0).length;
    shareText(st ? `🔥 On time ${st} run${st === 1 ? '' : 's'} straight with LeaveBy (${ok}/${n} on time overall).` : `Working on my on-time streak with LeaveBy — ${ok}/${n} runs on time so far.`);
  },
  toggleSet: (d) => { S.settings[d.k] = !S.settings[d.k]; save(); render(); if (d.k === 'vibrate' && S.settings.vibrate) vibrate(40); },
  defBuffer: (d) => { S.settings.defaultBuffer = +d.v; S.lastPlan.bufferMin = +d.v; save(); render(); },
  exportData: () => {
    const json = JSON.stringify(S, null, 1);
    dlgActions.copy = () => copyText(json, 'Backup copied to clipboard');
    dlgActions.share = () => shareText(json);
    openDialog(`<h3>Export data</h3><p>Copy this backup and keep it somewhere safe. Paste it into Import to restore.</p><textarea readonly id="exp-ta" aria-label="Exported data">${esc(json)}</textarea>
      <div class="actions"><div class="btn-row"><button class="btn primary" data-act="dlgCopy">${I.copy} Copy</button><button class="btn" data-act="dlgShare">${I.share} Share</button></div><button class="btn block" data-act="dlgCancel">Close</button></div>`);
  },
  dlgCopy: () => dlgActions.copy && dlgActions.copy(),
  dlgShare: () => dlgActions.share && dlgActions.share(),
  importData: () => {
    dlgActions.ok = () => {
      const ta = $('#imp-ta'); const err = $('#imp-err');
      try {
        const next = normalize(JSON.parse(ta.value));
        S = next; save(); closeDialog(); stack = []; view = { name: 'settings' }; render();
        toast(`Imported ${S.routines.length} routines and ${S.runs.length} runs`);
      } catch (e) { err.textContent = 'That doesn’t look like a LeaveBy backup. Check you pasted the whole thing.'; }
    };
    openDialog(`<h3>Import data</h3><p>Paste a LeaveBy backup. This replaces your current routines and history.</p><textarea id="imp-ta" placeholder='{"routines": [...]}' aria-label="Paste backup"></textarea>
      <p id="imp-err" style="color:var(--coral);margin:8px 0 0;min-height:1.2em"></p>
      <div class="actions"><button class="btn primary block" data-act="dlgOk">Import & replace</button><button class="btn block" data-act="dlgCancel">Cancel</button></div>`);
  },
  resetData: () => confirmDialog('Reset everything?', 'All routines, runs and settings will be erased and the starter routines restored. Export first if you want a backup.', 'Erase and reset', () => {
    S = seed(); save(); stack = []; view = { name: 'settings' }; render(); toast('LeaveBy has been reset');
  }, true)
};

/* ---------- Events ---------- */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (Date.now() < navLockUntil && el.closest('#screen')) return;
  if (act === 'scrim' && ev.target !== el) return;
  if (A[act]) { if (act !== 'scrim') ev.stopPropagation(); A[act](el.dataset, el, ev); }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') back();
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('[role="button"]')) ev.target.click();
});
document.addEventListener('input', (ev) => {
  const el = ev.target; const k = el.dataset && el.dataset.in; if (!k) return;
  const r = curRoutine(); if (!r) return;
  if (k === 'routineName') r.name = el.value.trim() ? el.value : 'Untitled routine';
  if (k === 'stepName') r.steps[+el.dataset.i].name = el.value.trim() ? el.value : 'Step';
  save();
});

function liveUpdate() {
  ['home-count', 'plan-count'].forEach((id) => {
    const el = document.getElementById(id); if (!el) return;
    const ms = +el.dataset.start - Date.now();
    el.classList.toggle('late', ms < -30000);
    el.textContent = ms > 30000 ? `in ${relMin(ms)}` : ms > -30000 ? 'Start now!' : `${relMin(-ms)} behind`;
  });
}
let lastMinute = new Date().getMinutes();
setInterval(() => {
  if (document.hidden) return;
  if (view.name === 'run') tickRun();
  else {
    liveUpdate();
    const m = new Date().getMinutes();
    if (m !== lastMinute && (view.name === 'home' || view.name === 'plan') && !dialogOpen() && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.in)) render();
    lastMinute = m;
  }
}, 250);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { if (view.name === 'run') { tickRun(); requestWake(); } else liveUpdate(); }
});

/* ---------- Boot ---------- */
load();
ensurePlan();
if (S.activeRun) { stack = [{ name: 'home' }]; view = { name: 'run' }; }
save();
render(true);

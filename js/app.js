import { EX, DAYS, RX, TOP_REPS, ZONES, PROGRAM_START, FOODS, METRIC_PICKER, YT } from './data.js';
import { lowerMap, upperMap } from './maps.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get: (k, d) => { try { return JSON.parse(localStorage.getItem('hz:' + k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem('hz:' + k, JSON.stringify(v)), del: k => localStorage.removeItem('hz:' + k) };
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const t12 = d => { d = new Date(d); let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad(d.getMinutes())} ${ap}`; };
const hms = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60); };
const dPretty = s => new Date(s + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 13);
const toast = (m, ms = 2200) => { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), ms); };
const EXBY = Object.fromEntries(EX.map(e => [e.name, e]));

// ---------- API + offline queue ----------
const API = () => (window.HZ && window.HZ.api) || '';
async function api(action, payload = {}) {
  if (!API()) throw Object.assign(new Error('Sheet not connected yet'), { offline: true });
  const r = await fetch(API(), { method: 'POST', body: JSON.stringify({ action, user: S.user?.id, pin: S.pin, ...payload }), redirect: 'follow' });
  const j = await r.json().catch(() => ({ ok: false, error: 'bad response' }));
  if (!j.ok && j.error === 'pin') throw Object.assign(new Error('pin'), { pin: true });
  return j;
}
function queue(action, payload) { const q = LS.get('q:' + S.user.id, []); q.push({ action, payload, id: uid() }); LS.set('q:' + S.user.id, q); flush(); }
async function flush() {
  if (!S.user) return; const k = 'q:' + S.user.id; let q = LS.get(k, []);
  if (!API()) return setSync(q.length ? 'pending' : 'ok', q.length ? `Sheet not connected · ${q.length} saved on phone` : 'Saved on phone');
  setSync(q.length ? 'pending' : 'ok', q.length ? `${q.length} to sync` : 'Synced');
  while (q.length) {
    try { const j = await api(q[0].action, q[0].payload); if (!j.ok) throw new Error(j.error); q.shift(); LS.set(k, q); }
    catch (e) { setSync('pending', navigator.onLine ? `${q.length} waiting` : `Offline · ${q.length} saved on phone`); return; }
  }
  setSync('ok', 'Synced');
}
const setSync = (c, t) => { const el = $('#sync'); el.className = 'sync ' + c; el.textContent = t === 'Synced' ? '✓ Synced to Sheet' : (c === 'ok' ? '✓ ' : '⟳ ') + t; };
addEventListener('online', flush);

// ---------- state ----------
const S = { user: null, pin: '', data: null, active: null };
const D = () => S.data || { sessions: [], sets: [], meals: [], goals: [], metrics: [], photos: [], devices: [] };
const isJahan = () => S.user?.id === 'jahan';
const hasPlan = () => isJahan() || S.user?.planStatus === 'plan ready';
function cacheSave() { LS.set('cache:' + S.user.id, S.data); }
const byKey = (arr, f) => { const m = new Map(); for (const x of arr || []) m.set(f(x), x); return [...m.values()]; };
async function loadData() {
  const cached = LS.get('cache:' + S.user.id, null);
  S.data = cached;
  // 1) Jahan: always open the encrypted seed (rebuilt from the Healthzilla sheet tabs: Daily, Sleep, Weight, Workouts, Meals, HealthMetrics + labs)
  let sd = null;
  if (isJahan() && LS.get('jkey', '')) { try { sd = await decryptSeed(LS.get('jkey', '')); } catch (er) { console.warn('seed', er); } }
  // 2) live sheet via Apps Script (when config.js api is set). Its rows win; the seed keeps labs.
  let live = null;
  try { const j = await api('getData'); if (j.ok) { live = j; S.user = { ...S.user, ...j.profile }; LS.set('user', S.user); } }
  catch (e) { if (e.pin) { S.pin = ''; LS.del('pin:' + S.user.id); return pickProfile(true); } }
  const local = (cached?.metrics || []).filter(m => String(m.source || '').startsWith('upload') || m.source === 'manual');
  const mk = m => m.date + '|' + m.metric;
  if (sd || live) {
    const base = { sessions: [], sets: [], meals: [], goals: [], metrics: [], workouts: [], photos: [], devices: [], ...(cached || {}) };
    S.data = { ...base, ...(sd || {}), ...(live || {}),
      labs: sd?.labs || live?.labs || base.labs || [],
      metrics: byKey([...(sd?.metrics || []), ...local, ...(live?.metrics || [])], mk),
      meals: live ? (live.meals || []) : byKey([...(sd?.meals || []), ...(base.meals || [])], m => m.meal_id || JSON.stringify(m)),
      workouts: live?.workouts || sd?.workouts || base.workouts || [],
      sessions: live ? (live.sessions || []) : (base.sessions || []), sets: live ? (live.sets || []) : (base.sets || []),
      goals: (live?.goals?.length ? live.goals : sd?.goals) || base.goals || [],
      sheetMeta: live ? { ...(sd?.sheetMeta || {}), live: true } : (sd?.sheetMeta || null) };
    cacheSave();
  }
  // merge in local-only (queued) sessions/meals so history is complete offline
  const q = LS.get('q:' + S.user.id, []);
  for (const it of q) { const d = D(); if (it.action === 'saveSession' && !d.sessions.some(s => s.session_id === it.payload.session.session_id)) { d.sessions.push(it.payload.session); d.sets.push(...it.payload.sets.map(x => ({ ...x, session_id: it.payload.session.session_id }))); } if (it.action === 'addMeal' && !d.meals.some(m => m.meal_id === it.payload.meal.meal_id)) d.meals.push(it.payload.meal); }
  S.data = D();
}

async function decryptSeed(k) {
  const j = await (await fetch('seed/jahan.enc.json?v=' + Date.now(), { cache: 'no-store' })).json(), b = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', b(k.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - k.length % 4) % 4)), 'AES-GCM', false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(j.iv) }, key, b(j.ct))));
}
// ---------- plan logic ----------
const START = new Date(PROGRAM_START + 'T00:00');
const weekOf = (d = new Date()) => Math.floor((new Date(ymd(d) + 'T00:00') - START) / 864e5 / 7) + 1;
const dow = d => (new Date(d).getDay() + 6) % 7; // Mon=0
function plannedFor(date) {
  const w = weekOf(date), x = dow(date);
  if (w < 1) return null;
  if (w <= 2) return ({ 0: 'pushA', 2: 'pullA', 4: 'legs', ...(w === 2 ? { 5: 'ppb' } : {}) })[x] || null;
  return ({ 0: 'pushA', 1: 'pullA', 3: 'legs', 5: 'ppb' })[x] || null;
}
const rxIdx = w => Math.min(Math.max(w, 1), 5) - 1;
function rxFor(e, w) {
  if (w >= 7) return 'Deload week: cut sets by a third, same weights';
  if (e.rx) return e.rx[rxIdx(w)];
  return RX[e.role]?.[rxIdx(w)] || 'Swap option';
}
function suggestion() {
  const now = new Date(), w = weekOf(now), td = ymd(now);
  const sess = D().sessions;
  const doneOn = (date, k) => sess.some(s => s.date === date && (s.day_key === k || s.day_type === DAYS[k].name));
  const weekStart = new Date(START.getTime() + (w - 1) * 7 * 864e5);
  const thisWeekDone = k => sess.some(s => s.date >= ymd(weekStart) && s.date <= td && (s.day_key === k || s.day_type === DAYS[k].name));
  const today = plannedFor(now);
  if (today && !doneOn(td, today)) return { key: today, why: `Planned for today (Week ${w})`, hing: `Aaj plan ke mutabiq: ${DAYS[today].name}`, today: true };
  // catch up on a missed session from earlier this week
  for (let i = 0; i < dow(now); i++) { const d = new Date(weekStart.getTime() + i * 864e5), k = plannedFor(d); if (k && !thisWeekDone(k)) return { key: k, why: `Missed on ${dPretty(ymd(d))} — catch-up is fine`, hing: `Aaj plan nahi, lekin ${DAYS[k].name} reh gaya tha`, rest: !today }; }
  for (let i = 1; i <= 7; i++) { const d = new Date(now.getTime() + i * 864e5), k = plannedFor(d); if (k) return { key: k, why: today ? `Today's session is done. Next: ${DAYS[k].name} on ${dPretty(ymd(d))}` : `Rest day in the plan. Next: ${DAYS[k].name} on ${dPretty(ymd(d))}`, hing: today ? 'Aaj ka session ho gaya 💪' : 'Aaj rest day hai — walk ya cardio dance', rest: true, nextDate: ymd(d) }; }
  return { key: 'pushA', why: 'Start the plan', hing: '' };
}
function exercisesFor(dk, w) {
  return EX.filter(e => e.days[dk]).sort((a, b) => a.days[dk] - b.days[dk]).map(e => { const r = e.weeks?.[dk]; return { ...e, active: !r || (w >= r[0] && w <= r[1]), weeksLabel: r ? (r[1] > 50 ? `W${r[0]}+` : `W${r[0]}-${r[1]}`) : '' }; });
}

// ---------- streaks, PRs, overload ----------
function streaks() {
  const days = [...new Set(D().sessions.map(s => s.date))].sort();
  let cur = 0, best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && (new Date(d) - new Date(prev)) / 864e5 <= 3 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  cur = prev && (new Date(ymd()) - new Date(prev)) / 864e5 <= 3 ? run : 0;
  const w = weekOf(), ws = ymd(new Date(START.getTime() + (w - 1) * 7 * 864e5));
  const thisWeek = D().sessions.filter(s => s.date >= ws).length, target = isJahan() || hasPlan() ? (w <= 2 ? 3 : 4) : 3;
  return { cur, best, thisWeek, target, total: D().sessions.length };
}
function topSets() { // exercise -> [{date, session, w, r}] in session order
  const bySess = Object.fromEntries(D().sessions.map(s => [s.session_id, s]));
  const m = {};
  for (const x of D().sets) { const s = bySess[x.session_id]; if (!s) continue; const k = x.exercise; m[k] = m[k] || {}; const cur = m[k][x.session_id]; const wv = +x.weight_kg || 0, rv = +x.reps || 0; if (!cur || wv > cur.w || (wv === cur.w && rv > cur.r)) m[k][x.session_id] = { date: s.date, ts: s.clock_in, w: wv, r: rv }; }
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Object.values(v).sort((a, b) => String(a.ts).localeCompare(String(b.ts)))]));
}
function prs() { return Object.entries(topSets()).map(([k, a]) => { const best = a.reduce((b, x) => x.w > b.w || (x.w === b.w && x.r > b.r) ? x : b, a[0]); return { ex: k, ...best, last: a[a.length - 1] }; }).filter(p => p.w > 0).sort((a, b) => b.date.localeCompare(a.date)); }
function overload() {
  const out = [], w = weekOf();
  for (const [k, a] of Object.entries(topSets())) {
    const e = EXBY[k]; if (!e || !['main', 'acc', 'core'].includes(e.role) || a.length < 2) continue;
    const top = TOP_REPS[e.role]?.[rxIdx(w)] || 12, L = a.slice(-3), last = a[a.length - 1], prev = a[a.length - 2];
    const step = e.role === 'main' ? 2.5 : (/DB/.test(k) ? 1 : 2.5);
    if (L.length === 3 && L.every(x => x.w === L[0].w && x.w > 0) && L[2].r <= L[0].r) {
      out.push(L[2].r >= top ? { k, lvl: 'good', msg: `${k}: ${L[0].w} kg × ${L[2].r} for 3 sessions at the top of the range. Next time try ${+(L[0].w + step).toFixed(1)} kg (or the next pin) and build reps back up.` }
        : { k, lvl: '', msg: `${k}: stuck at ${L[0].w} kg × ${L[2].r} for 3 sessions. Add 1 rep per set before adding weight (target ${top}).` });
    } else if (last.w > 0 && last.r >= top && last.w >= prev.w && last.r >= prev.r) out.push({ k, lvl: 'good', msg: `${k}: hit ${last.r} reps at ${last.w} kg. Ready for +${step} kg next session.` });
    if (last.w < prev.w || (last.w === prev.w && last.r < prev.r - 1)) { if (a.length >= 3 && (prev.w < a[a.length - 3].w || prev.r < a[a.length - 3].r)) out.push({ k, lvl: 'bad', msg: `${k}: dropping two sessions in a row (${a[a.length - 3].w}→${prev.w}→${last.w} kg). Check sleep/recovery, repeat last week's numbers.` }); }
  }
  return out;
}

// ---------- recovery recommender ----------
function latest(metric, maxAgeDays = 3) {
  const rows = D().metrics.filter(m => m.metric === metric && m.value !== '' && !isNaN(+m.value)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const l = rows[rows.length - 1]; if (!l) return null; const age = (new Date(ymd()) - new Date(l.date)) / 864e5; return age <= maxAgeDays ? { ...l, value: +l.value, age } : null;
}
const median = a => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
function recovery() {
  const sleep = latest('sleep_h', 2), hrv = latest('hrv_ms', 3), rhr = latest('resting_hr', 3), rec = latest('recovery_pct', 2);
  const hist = m => D().metrics.filter(x => x.metric === m && (new Date(ymd()) - new Date(x.date)) / 864e5 <= 21).map(x => +x.value);
  const usual = isJahan() ? [17, 19] : (() => { const md = median(hist('hrv_ms')); return md ? [md * 0.9, md * 1.1] : null; })();
  const rhrBase = median(hist('resting_hr'));
  const why = [], flags = [];
  if (sleep) { why.push(`Sleep ${sleep.value.toFixed(1)} h (${dPretty(sleep.date)})`); if (sleep.value < 6) flags.push('sleep under 6 h'); }
  if (hrv) { why.push(`HRV ${hrv.value.toFixed(0)} ms${usual ? ` (usual ${Math.round(usual[0])}-${Math.round(usual[1])})` : ''}`); if (usual && hrv.value < usual[0] * 0.8) flags.push('HRV well below usual'); }
  if (rhr && rhrBase) { why.push(`Resting HR ${rhr.value} (3-wk median ${rhrBase})`); if (rhr.value > rhrBase + 7) flags.push('resting HR up'); }
  if (rec) { why.push(`Whoop recovery ${rec.value}%`); if (rec.value < 34) flags.push('low Whoop recovery'); }
  if (!sleep && !hrv && !rec) return { lvl: '', head: 'No fresh sleep/HRV data', msg: 'Go by feel today: warm up, stay at RPE 6-7, no failure. Sync your Watch export to get a recommendation.', why };
  if (flags.length >= 2 || (rec && rec.value < 34)) return { lvl: 'bad', head: 'Back off today', msg: `Rest or a 30-min easy walk. (${flags.join(', ')})`, why };
  if (flags.length) return { lvl: '', head: 'Go lighter today', msg: `Repeat last week's numbers, keep RPE ≤ 6-7. (${flags.join(', ')})`, why };
  return { lvl: 'good', head: 'Good to push', msg: 'Recovery looks fine. Follow the plan at the target RPE. Still no failure, exhale on effort.', why };
}

// ---------- rest timer ----------
let restEnd = 0, restInt = null;
function startRest(sec) {
  restEnd = Date.now() + sec * 1000; clearInterval(restInt);
  const bar = $('#timerbar'); bar.classList.remove('hidden');
  const tick = () => { const left = (restEnd - Date.now()) / 1000; if (left <= 0) { clearInterval(restInt); bar.innerHTML = `<span class="okc">Rest done — next set!</span><span class="sp"></span><button class="btn sm" id="rx">✕</button>`; $('#rx').onclick = () => bar.classList.add('hidden'); beep(); navigator.vibrate?.([300, 100, 300]); return; }
    bar.innerHTML = `<span>Rest</span><span class="timer" style="font-size:26px">${hms(left)}</span><span class="sp"></span><button class="btn sm" id="r15">+15s</button><button class="btn sm" id="rx">✕</button>`;
    $('#r15').onclick = () => restEnd += 15000; $('#rx').onclick = () => { clearInterval(restInt); bar.classList.add('hidden'); }; };
  tick(); restInt = setInterval(tick, 500);
}
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, .35].forEach(t => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.25, c.currentTime + t); o.start(c.currentTime + t); o.stop(c.currentTime + t + .2); }); } catch { } }
const restButtons = () => `<div class="row wrap">${[45, 60, 90, 120].map(s => `<button class="btn sm" data-rest="${s}">${s}s</button>`).join('')}</div>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-rest]'); if (b) startRest(+b.dataset.rest); });

// ---------- active workout ----------
const ACT = () => LS.get('active:' + S.user.id, null);
const setAct = a => { a ? LS.set('active:' + S.user.id, a) : LS.del('active:' + S.user.id); };
function elapsed(a) { const now = a.breakStart ? a.breakStart : Date.now(); return (now - a.clockIn) / 1000 - a.breakSec; }
let tickInt = null;
function startTick() { clearInterval(tickInt); tickInt = setInterval(() => { const a = ACT(); const el = $('#elapsed'); if (a && el) { el.textContent = hms(elapsed(a)); const b = $('#brk'); if (b && a.breakStart) b.textContent = 'On break ' + hms(a.breakSec + (Date.now() - a.breakStart) / 1000); } }, 1000); }


// ---------- daily snapshot ----------
const PLAN_PDF = 'plan/healthzilla-plan.pdf';
const fmt = (v, d = 0) => (+v).toLocaleString('en-US', { maximumFractionDigits: d });
const daysUntil = ds => Math.ceil((new Date(ds + 'T00:00') - new Date(ymd() + 'T00:00')) / 864e5);
function nextPlanned(from = new Date(), skipToday = true) { for (let i = skipToday ? 1 : 0; i <= 14; i++) { const d = new Date(from.getTime() + i * 864e5), k = plannedFor(d); if (k) return { k, d: ymd(d) }; } return null; }
function avgMetric(m, days) { const v = D().metrics.filter(x => x.metric === m && !/partial/.test(x.source || '') && (new Date(ymd()) - new Date(x.date)) / 864e5 <= days && x.value !== '').map(x => +x.value); return v.length ? { v: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null; }
function lastFull(m, maxAge = 4) { const r = D().metrics.filter(x => x.metric === m && !/partial/.test(x.source || '') && x.value !== '' && (new Date(ymd()) - new Date(x.date)) / 864e5 <= maxAge).sort((a, b) => String(a.date).localeCompare(String(b.date))); return r.length ? { ...r[r.length - 1], value: +r[r.length - 1].value } : null; }
function snapshot() {
  const now = new Date(), td = ymd(now), w = Math.max(weekOf(now), 1), rc = recovery(), st = streaks(), ol = overload();
  const todayK = hasPlan() ? plannedFor(now) : null, nx = hasPlan() ? nextPlanned(now) : null;
  const doneToday = D().sessions.filter(s => s.date === td);
  const sess = D().sessions.slice().sort((a, b) => String(b.clock_in).localeCompare(String(a.clock_in)));
  const meals = D().meals.filter(m => m.date === td), kcal = meals.reduce((a, m) => a + (+m.calories || 0), 0), prot = meals.reduce((a, m) => a + (+m.protein_g || 0), 0);
  const ptarget = isJahan() ? 125 : 0, stepT = isJahan() ? [7000, 7500, 8000, 8000, 8500][Math.min(w, 5) - 1] : 8000;
  const m = { sleep: latest('sleep_h', 2), hrv: latest('hrv_ms', 3), rhr: latest('resting_hr', 3), steps: lastFull('steps'), kcal: lastFull('active_kcal'), weight: latest('weight_kg', 30), vo2: latest('vo2max', 400) };
  m.exmin = lastFull('exercise_min'); m.rhr = m.rhr || null;
  const steps7 = avgMetric('steps', 7), sleep7 = avgMetric('sleep_h', 7), hrv7 = avgMetric('hrv_ms', 7), rhr7 = avgMetric('resting_hr', 7);
  const wo = (D().workouts || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const wo7 = wo.filter(r => (new Date(td) - new Date(r.date)) / 864e5 <= 7);
  const wl = D().wellness || {}, wlRows = k => (Array.isArray(wl[k]) ? wl[k] : []).filter(r => r && r.date);
  const water = wlRows('water').filter(r => r.date === td), prayers = wlRows('prayers').sort((a, b) => b.date.localeCompare(a.date))[0], mood = wlRows('mood').sort((a, b) => b.date.localeCompare(a.date))[0];
  const allMeals = (D().meals || []).slice().sort((a, b) => String(b.date + b.time).localeCompare(String(a.date + a.time)));
  const sm = D().sheetMeta || null, dDates = D().metrics.filter(r => /Daily tab|Sleep tab/.test(r.source || '')).map(r => r.date).sort();
  const prov = sm || dDates.length ? { daily: sm?.latest_full_daily || dDates[dDates.length - 1], dailyAny: sm?.latest_daily, sleep: sm?.latest_sleep, live: !!sm?.live, read: sm?.read_at } : null;
  const wkStart = ymd(new Date(START.getTime() + (w - 1) * 7 * 864e5)), wkDone = new Set(D().sessions.filter(s => s.date >= wkStart && s.date <= td).map(s => s.session_id)).size;
  const sg = suggestion(), finds = [];
  // headline: most useful takeaway first
  let head;
  if (rc.lvl === 'bad') head = { lvl: 'bad', t: 'Back off today', d: rc.msg };
  else if (rc.head === 'Go lighter today') head = { lvl: '', t: 'Train, but lighter', d: rc.msg };
  else if (todayK && !doneToday.length) head = { lvl: 'good', t: `Push today: ${DAYS[todayK].name}`, d: `Week ${w} session is on the plan today. ${rc.lvl === 'good' ? 'Recovery looks fine — follow the target RPE.' : 'Warm up well and go by feel.'}` };
  else if (doneToday.length) head = { lvl: 'good', t: 'Win: workout done today', d: `${doneToday[0].day_type} logged${doneToday[0].clock_out ? ' at ' + t12(doneToday[0].clock_out) : ''}. Eat your protein and sleep 7+ h.` };
  else if (hasPlan()) head = { lvl: 'good', t: 'Rest day — keep moving', d: `No lifting planned today.${nx ? ` Next: ${DAYS[nx.k].name} on ${dPretty(nx.d)}.` : ''} A 30-min walk helps hit ${fmt(stepT)} steps.` };
  else head = { lvl: '', t: 'Pick a session', d: 'Clock in when you get to the gym.' };
  if (sg.rest && /Missed/.test(sg.why) && !todayK && !doneToday.length) finds.push({ i: '🏋', t: `Optional catch-up: ${DAYS[sg.key].name}`, d: `${sg.why}. Only if you slept OK; otherwise just walk.` });
  if (m.steps && m.steps.value < stepT) finds.push({ i: '🚶', t: 'Walk more', d: `${fmt(m.steps.value)} steps on ${dPretty(m.steps.date)} vs ${fmt(stepT)} target this week.` });
  else if (m.steps) finds.push({ i: '✅', t: 'Steps on target', d: `${fmt(m.steps.value)} steps on ${dPretty(m.steps.date)}.` });
  if (m.sleep && m.sleep.value < 7) finds.push({ i: '😴', t: 'Aim for 7+ h sleep', d: `Last logged ${m.sleep.value.toFixed(1)} h (${dPretty(m.sleep.date)}).` });
  if (st.cur >= 2) finds.push({ i: '🔥', t: `${st.cur}-session streak`, d: 'Keep the chain going.' });
  ol.slice(0, 2).forEach(o => finds.push({ i: '📈', t: 'Overload check', d: o.msg }));
  if (ptarget && (now.getHours() >= 15) && prot < ptarget * 0.5) finds.push({ i: '🍗', t: 'Protein is behind', d: `${prot} g of ${ptarget} g logged so far.` });
  // longer-term (from his private, encrypted seed only)
  const labs = D().labs || [], L = n => labs.find(x => x.marker === n), long = [];
  if (isJahan() && labs.length) {
    const tc = L('Total Cholesterol'), ldl = L('LDL (direct)'), nh = L('Non-HDL'), vd = L('25-OH Vitamin D'), ua = L('Uric Acid');
    if (tc || ldl) long.push({ i: '🫀', t: 'Lipids (8 Nov)', d: `Total ${tc?.value}, LDL ${ldl?.value}, non-HDL ${nh?.value} mg/dL. Training, oats/soluble fibre and less fried food all help; fasting retest late Dec.` });
    if (vd) long.push({ i: '☀️', t: 'Vitamin D', d: `${vd.value} ng/mL — some midday sun; ask your doctor about D3.` });
    if (ua) long.push({ i: '💧', t: 'Uric acid', d: `${ua.value} mg/dL (high-normal) — water through the day, go easy on sugary drinks.` });
  }
  const goals = D().goals || [], G = k => goals.find(g => g.key === k);
  if (G('vape')) { const n = daysUntil(G('vape').due || '2026-12-09'); long.push({ i: '🚭', t: 'Vaping phase-out', d: n > 0 ? `${n} days to your ${dPretty(G('vape').due || '2026-12-09')} target. Taper a little each week — you've got this.` : 'Target date reached — keep it up.' }); }
  if (G('bp')) { const n = daysUntil(G('bp').due || '2026-11-23'); long.push({ i: '🩺', t: 'BP cuff check', d: n > 0 ? `Start a 7-day home BP check by ${dPretty(G('bp').due || '2026-11-23')} (${n} days) before Week 4.` : 'Due now: 7 days of home BP readings before Week 4.' }); }
  return { now, td, w, rc, st, ol, todayK, nx, doneToday, sess, meals, kcal, prot, ptarget, stepT, m, steps7, sleep7, hrv7, rhr7, wo, wo7, water, prayers, mood, allMeals, prov, wkDone, wkTarget: w <= 2 ? 3 : 4, head, finds, long };
}
function provLine(x) {
  if (!x.prov) return isJahan() ? 'Health sheet data not loaded on this phone yet — open your personal Healthzilla link once.' : '';
  const p = x.prov; return `From your Healthzilla sheet · latest Daily ${p.daily ? dPretty(p.daily) : '–'}${p.dailyAny && p.dailyAny !== p.daily ? ` (${dPretty(p.dailyAny)} partial)` : ''} · Sleep ${p.sleep ? dPretty(p.sleep) : '–'}${p.live ? ' · live' : p.read ? ` · read from sheet ${dPretty(ymd(new Date(p.read)))} ${t12(new Date(p.read))}` : ''}`;
}
function snapCard() {
  const x = snapshot();
  return `<div class="card snap"><div class="row"><h3 class="sp">Today's snapshot</h3><a class="small" href="#/snapshot">Full snapshot →</a></div>
    <div class="alert ${x.head.lvl}" style="margin-top:6px"><b>${esc(x.head.t)}</b><div class="small">${esc(x.head.d)}</div></div>
    <div class="grid3">${[['Sleep', x.m.sleep ? x.m.sleep.value.toFixed(1) + ' h' : '–'], ['HRV', x.m.hrv ? fmt(x.m.hrv.value) + ' ms' : '–'], ['Steps', x.m.steps ? fmt(x.m.steps.value) : '–']].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
    ${x.finds[0] ? `<div class="small" style="margin-top:6px">${x.finds[0].i} <b>${esc(x.finds[0].t)}</b> — ${esc(x.finds[0].d)}</div>` : ''}
    ${provLine(x) ? `<div class="small mut" style="margin-top:6px">${esc(provLine(x))}</div>` : ''}</div>`;
}
function snapView() {
  const x = snapshot(), mrow = (k, r, u, d = 0) => `<div class="row small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="sp">${k}</span>${r ? `<b>${fmt(r.value, d)}${u}</b><span class="mut">&nbsp;· ${dPretty(r.date)}</span>` : '<span class="mut">no recent data</span>'}</div>`;
  const li = a => a.map(f => `<div class="row" style="align-items:flex-start;padding:6px 0"><span style="font-size:20px;width:30px">${f.i}</span><div class="sp"><b>${esc(f.t)}</b><div class="small">${esc(f.d)}</div></div></div>`).join('');
  return `<h1>Daily snapshot</h1><div class="small mut">${x.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · updated ${t12(x.now)} · Lahore</div>${provLine(x) ? `<div class="small mut">${esc(provLine(x))}</div>` : ''}
  <div class="alert ${x.head.lvl}" style="margin-top:10px"><b style="font-size:17px">${esc(x.head.t)}</b><div>${esc(x.head.d)}</div>${x.rc.why.length ? `<div class="small mut" style="margin-top:4px">${x.rc.why.map(esc).join(' · ')}</div>` : ''}</div>
  ${x.finds.length ? `<h2>Findings & recommendations</h2><div class="card">${li(x.finds)}</div>` : ''}
  <h2>Apple Watch · Daily + Sleep tabs</h2><div class="card">
    ${mrow('Sleep' + (x.m.sleep && /manual/i.test(x.m.sleep.source || '') ? ' (self-reported)' : ''), x.m.sleep, ' h', 1)}${mrow('HRV', x.m.hrv, ' ms')}${mrow('Resting HR', x.m.rhr, ' bpm')}${mrow('Steps (last full day)', x.m.steps, '')}${mrow('Active energy', x.m.kcal, ' kcal')}${mrow('Exercise minutes', x.m.exmin, ' min')}${mrow('Weight', x.m.weight, ' kg', 1)}${mrow('VO₂ max', x.m.vo2, '', 1)}
    <div class="small" style="margin-top:8px"><b>Recent Apple Watch workouts</b> <span class="mut">(Workouts tab)</span></div>
    ${x.wo.length ? x.wo.slice(0, 4).map(r => `<div class="row small" style="padding:2px 0"><span class="sp">⌚ ${esc(r.type)}</span><span>${dPretty(r.date)} · ${fmt(r.minutes)} min · ${fmt(r.kcal)} kcal</span></div>`).join('') : '<div class="small mut">None on the sheet yet.</div>'}
    ${x.wo[0] && /ring/i.test(x.wo[0].type) ? '<div class="small mut">“Exercise (Watch ring)” = the day’s exercise-ring total, not a logged gym session.</div>' : ''}
    <div class="small mut" style="margin-top:6px">Rest-day rule: sleep under 6 h, HRV well below usual, or resting HR up → go lighter or rest.</div></div>
  <h2>Training</h2><div class="card small">
    <div class="row" style="padding:4px 0"><span class="sp">Today (Week ${x.w})</span><b>${x.todayK ? esc(DAYS[x.todayK].name) : hasPlan() ? 'Not a lifting day' : '–'}</b></div>
    ${x.nx ? `<div class="row" style="padding:4px 0"><span class="sp">Next planned</span><b>${esc(DAYS[x.nx.k].name)} · ${dPretty(x.nx.d)}</b></div>` : ''}
    <div class="row" style="padding:4px 0"><span class="sp">This week</span><b>${x.wkDone}/${x.wkTarget} sessions</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Streak</span><b>${x.st.cur} (best ${x.st.best})</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Last Healthzilla gym session</span><b>${x.sess[0] ? `${esc(x.sess[0].day_type)} · ${dPretty(x.sess[0].date)}${x.sess[0].clock_in ? ' · ' + t12(x.sess[0].clock_in) : ''}` : 'none logged yet'}</b></div>
    ${x.sess.slice(1, 4).map(s => `<div class="row mut" style="padding:2px 0"><span class="sp">${esc(s.day_type)}</span><span>${dPretty(s.date)} · ${hms(s.duration_seconds)}</span></div>`).join('')}
    ${x.ol.length ? x.ol.slice(0, 4).map(o => `<div class="alert ${o.lvl}">${esc(o.msg)}</div>`).join('') : '<div class="mut" style="margin-top:4px">No stalled lifts flagged.</div>'}
    <div class="row" style="margin-top:8px"><a class="btn sm pri" href="#/train">Train</a><a class="btn sm" href="#/plan">Plan PDF</a></div></div>
  <h2>Food & wellness</h2><div class="card small">
    <div class="row" style="padding:4px 0"><span class="sp">Calories today</span><b>${x.kcal} kcal</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Protein today</span><b>${x.prot} g${x.ptarget ? ' / ' + x.ptarget : ''}</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Meals logged</span><b>${x.meals.length}</b></div>
    ${x.meals.slice(-3).map(m => `<div class="mut">${m.time ? t12(m.date + 'T' + m.time) + ' · ' : ''}${esc(m.food)} (${m.calories} kcal)</div>`).join('')}
    ${!x.meals.length ? `<div class="mut">${x.allMeals[0] ? `Last meal on the sheet: ${esc(x.allMeals[0].food)} · ${dPretty(x.allMeals[0].date)}` : 'No meals on the Meals tab yet.'}</div>` : ''}
    ${x.water.length ? `<div class="row" style="padding:4px 0"><span class="sp">Water today</span><b>${fmt(x.water.reduce((a, r) => a + (+r.ml || 0), 0))} ml</b></div>` : ''}
    ${x.prayers ? `<div class="row" style="padding:4px 0"><span class="sp">Prayers (${dPretty(x.prayers.date)})</span><b>${esc(x.prayers.count || '')}/5</b></div>` : ''}
    ${x.mood ? `<div class="row" style="padding:4px 0"><span class="sp">Mood (${dPretty(x.mood.date)})</span><b>${esc(x.mood.mood)}</b></div>` : ''}
    ${(() => { const miss = [!x.water.length && 'water', !x.prayers && 'prayers', !x.mood && 'mood'].filter(Boolean); return `<div class="mut" style="margin-top:6px">${['Carbs/fat', ...miss].join(', ').replace(/, ([^,]*)$/, ' and $1')} aren't logged in your sheet yet, so they're not shown here.</div>`; })()}
    <a class="btn sm" style="margin-top:8px" href="#/food">Log a meal</a></div>
  <h2>Weekly picture</h2><div class="card small">
    <div class="row" style="padding:4px 0"><span class="sp">Avg steps (7 days)</span><b>${x.steps7 ? fmt(x.steps7.v) + ` <span class="mut">(${x.steps7.n} days)</span>` : '–'}</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Avg HRV (7 days)</span><b>${x.hrv7 ? fmt(x.hrv7.v) + ' ms' : '–'}</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Avg resting HR (7 days)</span><b>${x.rhr7 ? fmt(x.rhr7.v) + ' bpm' : '–'}</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Avg sleep (7 days)</span><b>${x.sleep7 ? x.sleep7.v.toFixed(1) + ' h' : '–'}</b></div><div class="mut">Watch sleep only counts the time it was worn, so short nights may be under-counted.</div>
    <div class="row" style="padding:4px 0"><span class="sp">Healthzilla gym sessions this week</span><b>${x.wkDone}/${x.wkTarget}</b></div>
    <div class="row" style="padding:4px 0"><span class="sp">Apple Watch workouts (7 days)</span><b>${x.wo7.length}${x.wo7.length ? ' · ' + fmt(x.wo7.reduce((a, r) => a + (+r.minutes || 0), 0)) + ' min' : ''}</b></div></div>
  ${x.long.length ? `<h2>Longer-term focus</h2><div class="card">${li(x.long)}<div class="small mut">Encouragement, not a diagnosis — follow your doctor's advice.</div></div>` : ''}`;
};

// ---------- 3D character ----------
const ANIM_OF = { chest_press: 'chest', incline_db: 'chest', smith_incline: 'chest', lat_pulldown: 'pulldown', leg_press45: 'legpress', seated_lp: 'legpress', cable_low_row: 'row', seated_row: 'row', goblet: 'squat', back_squat: 'squat', smith_squat: 'squat', belt_squat: 'squat' };
const DAY_ANIM = { pushA: 'chest', pullA: 'pulldown', legs: 'legpress', ppb: 'row', leg: 'legpress', back: 'row', pull: 'pulldown' };
const ANIM_NAMES = { idle: 'Idle', chest: 'Chest press', pulldown: 'Lat pulldown', legpress: 'Leg press', row: 'Cable row', squat: 'Squat' };
const C3NOTE = 'Stylized 3D body with your real face from your selfie — not a body scan. Drag to rotate.';
let C3 = null;
function char3d(el, anim, opts = {}) {
  if (!el) return;
  (C3 ||= import('./char3d.js')).then(m => {
    if (!el.isConnected) return;
    if (!m.webglOK()) { el.innerHTML = '<div class="small mut" style="padding:20px">This phone/browser has 3D (WebGL) turned off.</div>'; return; }
    el.innerHTML = ''; el._c = m.mount(el, { anim, ...opts });
  }).catch(() => { C3 = null; el.innerHTML = '<div class="small mut" style="padding:20px">Could not load the 3D engine — needs an internet connection the first time.</div>'; });
}
const c3box = (cls = '') => `<div class="c3 ${cls}"><div class="small mut" style="padding:20px">Loading your 3D character…</div></div>`;

// ---------- views ----------
const V = {};
V.snapshot = snapView;
V.home = () => {
  const a = ACT(), sg = suggestion(), st = streaks(), last = D().sessions.slice().sort((x, y) => String(y.clock_in).localeCompare(String(x.clock_in)))[0];
  const rc = recovery(), ol = overload(), pr = prs().slice(0, 3), w = weekOf();
  const t = ymd(), meals = D().meals.filter(m => m.date === t), kcal = meals.reduce((s, m) => s + (+m.calories || 0), 0), prot = meals.reduce((s, m) => s + (+m.protein_g || 0), 0);
  const ptarget = isJahan() ? 125 : 0;
  return `
  <div class="row"><div><div class="mut small">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${t12(new Date())}</div><h1>Hi ${esc(S.user.name.split(' ')[0])}</h1></div><span class="sp"></span><div id="wx" class="small mut" style="text-align:right">Weather…</div></div>
  ${a ? `<div class="card hero"><h3>Workout running · ${esc(a.dayName || 'pick a day')}</h3><div class="timer" id="elapsed">${hms(elapsed(a))}</div><a class="btn pri big" href="#/train">Open workout</a></div>` : `
  <div class="card hero">
    <div class="mut small">${hasPlan() ? `Week ${Math.max(w, 1)} of the plan` : 'Shared exercise list'}</div>
    <h2 style="margin:4px 0">${sg.rest ? (sg.today === false ? '' : '') : ''}${esc(DAYS[sg.key].name)}${sg.rest ? ' <span class="tag">suggested</span>' : ' <span class="tag or">today</span>'}</h2>
    <div class="small">${esc(sg.why)}</div>${sg.hing ? `<div class="small or" style="margin-top:4px">${esc(sg.hing)}</div>` : ''}
    <button class="btn pri big" id="clockin" style="margin-top:12px">▶ Clock in</button>
  </div>`}
  ${snapCard()}
  <div class="card"><div class="row"><h3 class="sp">Your 3D character</h3><a class="small" href="#/character">Full view & moves →</a></div>
    <div id="homec3">${c3box()}</div>
    <div class="small mut" style="margin-top:6px">${ANIM_NAMES[homeAnim(a, sg)]} · ${C3NOTE}</div></div>
  <div class="alert ${rc.lvl}"><b>${esc(rc.head)}</b> — ${esc(rc.msg)}${rc.why.length ? `<div class="small mut" style="margin-top:4px">${rc.why.map(esc).join(' · ')}</div>` : ''}</div>
  <div class="grid3">
    <div class="stat"><b>${st.cur}</b><span>streak</span></div><div class="stat"><b>${st.best}</b><span>longest</span></div><div class="stat"><b>${st.thisWeek}/${st.target}</b><span>this week</span></div>
  </div>
  <div class="card"><div class="row"><h3>This week</h3><span class="sp"></span><span class="small mut">${hasPlan() ? 'plan days outlined' : ''}</span></div>${weekStrip()}</div>
  <div class="card"><div class="row"><h3>Today's food</h3><span class="sp"></span><a href="#/food" class="small">Log meal →</a></div>
    <div class="row"><div class="sp"><b style="font-size:22px">${kcal}</b> <span class="mut">kcal</span></div><div><b style="font-size:22px">${prot}</b> <span class="mut">g protein${ptarget ? ' / ' + ptarget : ''}</span></div></div>
    ${ptarget ? `<div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, prot / ptarget * 100)}%"></i></div>` : ''}</div>
  ${ol.length ? `<h2>Overload alerts</h2>${ol.slice(0, 4).map(o => `<div class="alert ${o.lvl}">${esc(o.msg)}</div>`).join('')}` : ''}
  ${pr.length ? `<h2>Personal records</h2><div class="card">${pr.map(p => `<div class="row small" style="padding:4px 0"><span class="sp">${esc(p.ex)}</span><b>${p.w} kg × ${p.r}</b><span class="mut">&nbsp;${dPretty(p.date)}</span></div>`).join('')}</div>` : ''}
  <div class="card"><div class="small mut">Last workout</div><div>${last ? `${esc(last.day_type)} · ${dPretty(last.date)} · ${hms(last.duration_seconds)} · ${last.exercise_count} exercises` : 'None yet — clock in to start.'}</div>
  <div class="row" style="margin-top:10px"><a class="btn sm" href="#/history">History</a><a class="btn sm" href="#/goals">Goals</a><a class="btn sm" href="#/plan">📄 Plan PDF</a><a class="btn sm" href="#/research">Research</a></div></div>`;
};
function weekStrip() {
  const w = Math.max(weekOf(), 1), ws = new Date(START.getTime() + (w - 1) * 7 * 864e5), td = ymd();
  return `<div class="week">${Array.from({ length: 7 }, (_, i) => { const d = new Date(ws.getTime() + i * 864e5), ds = ymd(d), k = hasPlan() ? plannedFor(d) : null, done = D().sessions.filter(s => s.date === ds);
    return `<div class="${k ? 'pl' : ''} ${ds === td ? 'td' : ''} ${done.length ? 'dn' : ''}"><span class="mut">${'MTWTFSS'[i]}</span><b>${d.getDate()}</b>${k ? `<span class="or">${DAYS[k].name.replace('Legs + Core', 'Legs').replace('Push-Pull B', 'PPB')}</span>` : '<span class="mut">rest</span>'}${done.length ? '<div class="okc">✓</div>' : ''}</div>`; }).join('')}</div>`;
}
function homeAnim(a, sg) { return (a && a.day ? DAY_ANIM[a.day] : sg && DAY_ANIM[sg.key]) || 'idle'; }
V.home.after = () => {
  char3d($('#homec3 .c3'), homeAnim(ACT(), suggestion()), { compact: true });
  $('#clockin')?.addEventListener('click', () => { setAct({ id: uid(), clockIn: Date.now(), breakSec: 0, breakStart: 0, day: null, sel: {}, sets: {} }); location.hash = '#/train'; });
  weather(); startTick();
};

V.train = () => {
  const a = ACT();
  if (!a) return `<h1>Train</h1><div class="card"><p>Clock in to start a workout. The timer runs until you clock out; breaks are tracked separately.</p><button class="btn pri big" id="clockin2">▶ Clock in</button></div>
    <h2>Rest timer</h2><div class="card">${restButtons()}</div><h2>Gym maps</h2>${hasPlan() ? `<div class="card"><h3>2nd / lower floor</h3>${lowerMap()}</div><div class="card"><h3>Upper floor</h3>${upperMap()}</div>` : noPlanCard()}`;
  if (!a.day) return dayPicker(a);
  const w = Math.max(weekOf(), 1), list = a.custom ? exercisesFor(a.day, w) : exercisesFor(a.day, w);
  const floor = DAYS[a.day].floor, zones = [...new Set(list.filter(e => e.active || a.sel[e.id]).map(e => e.zone).filter(z => z !== 'Track'))];
  const marks = {}; list.filter(e => e.active && e.floor === floor).forEach((e, i) => { (marks[e.zone] = marks[e.zone] || []).push(i + 1); });
  const nSel = Object.keys(a.sel).filter(k => a.sel[k]).length;
  return `
  <div class="card hero"><div class="row"><div><div class="mut small">Clocked in ${t12(a.clockIn)} · ${esc(DAYS[a.day].name)}${a.followed ? ' (plan)' : ' (custom)'}</div><div class="timer" id="elapsed">${hms(elapsed(a))}</div><div class="small ${a.breakStart ? 'warnc' : 'mut'}" id="brk">${a.breakStart ? 'On break' : `Breaks ${hms(a.breakSec)}`}</div></div></div>
  <div class="grid2" style="margin-top:10px"><button class="btn ${a.breakStart ? 'pri' : ''}" id="brkbtn">${a.breakStart ? '▶ Resume' : '⏸ Break'}</button><button class="btn bad" id="out">■ Clock out</button></div>
  <div style="margin-top:10px">${restButtons()}</div></div>
  ${hasPlan() ? `<details class="card" ${a.mapOpen === false ? '' : 'open'} id="mapd"><summary><b>Today's map · ${floor === 'U' ? 'Upper floor' : '2nd / lower floor'}</b> <span class="small mut">numbers = exercise order</span></summary>${floor === 'U' ? upperMap(zones, marks) : lowerMap(zones, marks)}
    <div class="small mut">${zones.map(z => `<b class="or">${z}</b> ${esc(ZONES[z] || '')}`).join('<br>')}</div></details>` : noPlanCard()}
  <div class="row"><h2 class="sp">Tap what you did</h2><span class="small mut">${nSel} selected</span></div>
  ${list.map((e, i) => exCard(e, i + 1, a, w)).join('')}
  <button class="btn ghost w" id="chday" style="margin-top:10px">Change day type</button>`;
};
function noPlanCard() { return `<div class="card"><h3>Your gym plan</h3><p class="small">Status: <b class="or">${esc(S.user.planStatus || 'needs gym photos')}</b>. Send photos of your gym (More → Gym photos) and you get a plan and floor maps built from that gym's equipment, the same way Jahan's was built from his floor photos. Meanwhile you can log with the shared exercise list.</p><a class="btn sm" href="#/photos">Upload gym photos</a></div>`; }
function exCard(e, n, a, w) {
  const sets = a.sets[e.id] || [], on = !!a.sel[e.id];
  return `<div class="ex ${on ? 'done' : ''} ${e.active ? '' : 'off'}" data-ex="${e.id}">
    <div class="chk">${on ? '✓' : ''}</div>
    <div class="sp"><div class="nm">${n}. ${esc(e.name)}</div>
    <div class="meta"><span class="tag ${e.role === 'main' ? 'or' : ''}">${e.role}</span>${e.floor === 'U' ? 'UF' : '2F'} ${e.zone}${e.weeksLabel ? ` · ${e.weeksLabel}${e.active ? '' : ' (not this week)'}` : ''} · ${esc(rxFor(e, w))}</div>
    ${sets.length ? `<div class="meta or">${sets.map(s => `${s.weight_kg}kg×${s.reps}`).join(' · ')}</div>` : ''}</div>
    <div style="font-size:22px">›</div></div>`;
}
function dayPicker(a) {
  const sg = suggestion();
  const btn = (k, sug) => `<button class="chip ${sug ? 'sug' : ''}" data-day="${k}">${esc(DAYS[k].name)}</button>`;
  return `<div class="card hero"><div class="mut small">Clocked in ${t12(a.clockIn)}</div>
    <h2 style="margin:6px 0">${hasPlan() ? `Aaj plan ke mutabiq: <span class="or">${esc(DAYS[sg.key].name)}</span>` : 'What are you training?'}</h2>
    <div class="small">${esc(sg.why)}</div>${hasPlan() ? `<a class="small" href="#/plan">📄 Open plan PDF</a>` : ''}
    ${hasPlan() ? `<button class="btn pri big" data-day="${sg.key}" data-follow="1" style="margin-top:12px">✓ Follow this plan</button>` : ''}</div>
    <h2>${hasPlan() ? 'Or choose another day' : 'Pick a day type'}</h2>
    <div class="card"><div class="small mut">Plan days</div><div class="chips" style="margin:8px 0 14px">${['pushA', 'pullA', 'legs', 'ppb'].map(k => btn(k, k === sg.key)).join('')}</div>
    <div class="small mut">Custom days</div><div class="chips" style="margin-top:8px">${['bicep', 'tricep', 'leg', 'back', 'pull'].map(k => btn(k)).join('')}</div></div>
    <button class="btn bad w" id="cancel">Cancel workout</button>`;
}
V.train.after = () => {
  startTick();
  $('#clockin2')?.addEventListener('click', () => { setAct({ id: uid(), clockIn: Date.now(), breakSec: 0, breakStart: 0, day: null, sel: {}, sets: {} }); render(); });
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { const a = ACT(), sg = suggestion(); a.day = b.dataset.day; a.dayName = DAYS[a.day].name; a.suggested = DAYS[sg.key].name; a.followed = !!b.dataset.follow || (hasPlan() && a.day === sg.key); a.custom = !DAYS[a.day].plan; setAct(a); render(); });
  $('#cancel')?.addEventListener('click', () => { if (confirm('Cancel this workout? Nothing will be saved.')) { setAct(null); location.hash = '#/home'; } });
  $('#chday')?.addEventListener('click', () => { const a = ACT(); if (Object.values(a.sets).some(s => s.length) && !confirm('Change day type? Logged sets stay with their exercises.')) return; a.day = null; setAct(a); render(); });
  $('#brkbtn')?.addEventListener('click', () => { const a = ACT(); if (a.breakStart) { a.breakSec += (Date.now() - a.breakStart) / 1000; a.breakStart = 0; } else a.breakStart = Date.now(); setAct(a); render(); });
  $('#out')?.addEventListener('click', clockOut);
  $('#mapd')?.addEventListener('toggle', e => { const a = ACT(); a.mapOpen = e.target.open; setAct(a); });
  document.querySelectorAll('[data-ex]').forEach(el => el.onclick = () => openLogger(el.dataset.ex));
};
function openLogger(id) {
  const e = EX.find(x => x.id === id), a = ACT(), w = Math.max(weekOf(), 1);
  const prev = (topSets()[e.name] || []).slice(-1)[0];
  const st = LS.get('last:' + S.user.id + ':' + id, { w: prev?.w || 0, r: prev?.r || (TOP_REPS[e.role]?.[rxIdx(w)] || 10) });
  let wv = st.w, rv = st.r;
  const unit = e.unit ? { min: 'Minutes', rounds: 'Rounds', m: 'Metres' }[e.unit] : 'Reps';
  const m = $('#modal'); m.classList.remove('hidden');
  let c3n = null;
  const draw = () => {
    const sets = ACT().sets[id] || [];
    m.innerHTML = `<div class="sheet"><div class="row"><h2 class="sp" style="margin:0">${esc(e.name)}</h2><button class="btn sm" id="mx">Done</button></div>
    <div class="small mut">${e.floor === 'U' ? 'Upper floor' : '2nd floor'} · ${e.zone} — ${esc(ZONES[e.zone] || '')}</div>
    <div class="alert" style="border-color:var(--or)"><b>Plan:</b> ${esc(rxFor(e, w))}${e.swap ? `<br><b>Swap:</b> ${esc(e.swap)}` : ''}<br><b>Form:</b> ${esc(e.cues)}</div>
    ${ANIM_OF[id] ? `<div id="c3slot"></div><div class="small mut" style="margin-top:4px">3D you · ${ANIM_NAMES[ANIM_OF[id]]} · stylized body, real face, simple stand-in machine. <a href="#/character?a=${ANIM_OF[id]}">Bigger view</a></div>` : ''}
    ${e.likeness ? `<details style="margin-top:8px"><summary class="small">Photo clip (older 6-second AI video)</summary><video class="lk" src="videos/likeness/${e.likeness}" playsinline muted loop controls preload="none"></video><div class="small mut">AI-generated from your photo + gym photos; approximate.</div></details>` : ''}
    <div class="grid2" style="margin:10px 0"><a class="btn pri" href="${YT(e.vid)}" target="_blank" rel="noopener">▶ Watch form</a>${e.vid2 ? `<a class="btn" href="${YT(e.vid2)}" target="_blank" rel="noopener">▶ Alt video</a>` : `<span></span>`}</div>
    ${prev ? `<div class="small mut">Last time: ${prev.w} kg × ${prev.r} (${dPretty(prev.date)})</div>` : ''}
    <label>Weight (kg)</label><div class="stepper"><button data-w="-2.5">−</button><div class="val" id="wv">${wv}</div><button data-w="2.5">+</button></div>
    <div class="row" style="margin-top:6px">${[-1, -0.5, 0.5, 1, 5].map(x => `<button class="btn sm" data-w="${x}">${x > 0 ? '+' : ''}${x}</button>`).join('')}</div>
    <label>${unit}</label><div class="stepper"><button data-r="-1">−</button><div class="val" id="rv">${rv}</div><button data-r="1">+</button></div>
    <button class="btn pri big" id="add" style="margin-top:14px">+ Add set ${sets.length + 1}</button>
    ${sets.map((s, i) => `<div class="setrow"><span>Set ${i + 1}</span><span>${s.weight_kg} kg × ${s.reps}</span><button class="btn sm ghost" data-del="${i}">✕</button></div>`).join('')}
    <div style="margin-top:10px">${restButtons()}</div>
    <button class="btn ghost w" id="tog" style="margin-top:10px">${ACT().sel[id] ? 'Unmark exercise' : 'Mark done without sets'}</button></div>`;
    const slot = $('#c3slot'); if (slot) { if (!c3n) { c3n = document.createElement('div'); c3n.className = 'c3 sm'; slot.replaceWith(c3n); char3d(c3n, ANIM_OF[id], { compact: true }); } else slot.replaceWith(c3n); }
    m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { wv = Math.max(0, +(wv + +b.dataset.w).toFixed(2)); $('#wv').textContent = wv; });
    m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { rv = Math.max(0, rv + +b.dataset.r); $('#rv').textContent = rv; });
    $('#add').onclick = () => { const a = ACT(); a.sets[id] = a.sets[id] || []; a.sets[id].push({ weight_kg: wv, reps: rv, timestamp: new Date().toISOString() }); a.sel[id] = true; setAct(a); LS.set('last:' + S.user.id + ':' + id, { w: wv, r: rv }); navigator.vibrate?.(40); draw(); toast(`Set saved · rest ${e.role === 'main' ? 90 : 60}s?`); };
    m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const a = ACT(); a.sets[id].splice(+b.dataset.del, 1); if (!a.sets[id].length) delete a.sel[id]; setAct(a); draw(); });
    $('#tog').onclick = () => { const a = ACT(); a.sel[id] = !a.sel[id]; setAct(a); draw(); };
    $('#mx').onclick = () => { m.classList.add('hidden'); m.innerHTML = ''; render(); };
  };
  draw();
}
function clockOut() {
  const a = ACT(); if (!a) return;
  const sel = Object.keys(a.sel).filter(k => a.sel[k]);
  if (!confirm(`Clock out and save? ${sel.length} exercise(s) selected.`)) return;
  if (a.breakStart) { a.breakSec += (Date.now() - a.breakStart) / 1000; a.breakStart = 0; }
  const out = Date.now(), dur = Math.round((out - a.clockIn) / 1000 - a.breakSec);
  const session = { session_id: a.id, date: ymd(new Date(a.clockIn)), clock_in: new Date(a.clockIn).toISOString(), clock_out: new Date(out).toISOString(), break_seconds: Math.round(a.breakSec), duration_seconds: dur, day_type: DAYS[a.day].name, day_key: a.day, followed_plan: a.followed ? 'YES' : 'NO', suggested_day: a.suggested || '', week: weekOf(new Date(a.clockIn)), exercise_count: sel.length };
  const sets = []; for (const id of sel) { const e = EX.find(x => x.id === id); (a.sets[id] || []).forEach((s, i) => sets.push({ exercise: e.name, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg, timestamp: s.timestamp })); if (!(a.sets[id] || []).length) sets.push({ exercise: e.name, set_number: 0, reps: '', weight_kg: '', timestamp: new Date(out).toISOString() }); }
  const d = D(); d.sessions.push(session); d.sets.push(...sets.map(x => ({ ...x, session_id: a.id }))); cacheSave();
  queue('saveSession', { session, sets }); setAct(null);
  const vol = sets.reduce((s, x) => s + (+x.reps || 0) * (+x.weight_kg || 0), 0);
  $('#modal').classList.remove('hidden');
  $('#modal').innerHTML = `<div class="sheet"><h1>Workout saved 💪</h1><div class="grid3"><div class="stat"><b>${hms(dur)}</b><span>training</span></div><div class="stat"><b>${hms(a.breakSec)}</b><span>breaks</span></div><div class="stat"><b>${sel.length}</b><span>exercises</span></div></div>
    <p>${esc(session.day_type)} · ${t12(a.clockIn)} → ${t12(out)} · ${sets.filter(s => s.set_number).length} sets · ${Math.round(vol)} kg volume</p>
    <p class="small mut">Saved on this phone and sending to your Google Sheet.</p><button class="btn pri big" id="sdone">Done</button></div>`;
  $('#sdone').onclick = () => { $('#modal').classList.add('hidden'); location.hash = '#/home'; render(); };
}

V.history = () => {
  const ss = D().sessions.slice().sort((x, y) => String(y.clock_in).localeCompare(String(x.clock_in))), st = streaks();
  return `<h1>History</h1><div class="grid3"><div class="stat"><b>${st.total}</b><span>sessions</span></div><div class="stat"><b>${st.cur}</b><span>current streak</span></div><div class="stat"><b>${st.best}</b><span>longest streak</span></div></div>
  <p class="small mut">Streak = sessions with no more than 3 days between them.</p>
  ${ss.length ? ss.map(s => `<div class="ex" data-s="${esc(s.session_id)}"><div class="sp"><div class="nm">${esc(s.day_type)} <span class="tag">${s.followed_plan === 'YES' ? 'plan' : 'custom'}</span></div><div class="meta">${dPretty(s.date)} · ${t12(s.clock_in)} · ${hms(s.duration_seconds)} · ${s.exercise_count} exercises${+s.break_seconds ? ` · break ${hms(s.break_seconds)}` : ''}</div></div><div style="font-size:22px">›</div></div>`).join('') : '<div class="card">No workouts yet.</div>'}`;
};
V.history.after = () => document.querySelectorAll('[data-s]').forEach(el => el.onclick = () => {
  const s = D().sessions.find(x => x.session_id === el.dataset.s), sets = D().sets.filter(x => x.session_id === s.session_id), by = {};
  sets.forEach(x => (by[x.exercise] = by[x.exercise] || []).push(x));
  $('#modal').classList.remove('hidden');
  $('#modal').innerHTML = `<div class="sheet"><div class="row"><h2 class="sp" style="margin:0">${esc(s.day_type)}</h2><button class="btn sm" id="mx">Close</button></div>
  <p class="mut">${dPretty(s.date)} · ${t12(s.clock_in)} → ${t12(s.clock_out)} · ${hms(s.duration_seconds)} training · ${hms(s.break_seconds)} break · Week ${s.week}${s.suggested_day ? ` · suggested ${esc(s.suggested_day)}` : ''}</p>
  ${Object.entries(by).map(([k, v]) => `<div class="card"><h3>${esc(k)}</h3>${v.filter(x => +x.set_number).map(x => `<div class="setrow"><span>Set ${x.set_number}</span><span>${x.weight_kg} kg × ${x.reps}</span></div>`).join('') || '<div class="small mut">Done (no sets logged)</div>'}</div>`).join('') || '<p>No exercises.</p>'}</div>`;
  $('#mx').onclick = () => $('#modal').classList.add('hidden');
});

// ---------- food ----------
V.food = () => {
  const t = ymd(), meals = D().meals.filter(m => m.date === t), kcal = meals.reduce((s, m) => s + (+m.calories || 0), 0), prot = meals.reduce((s, m) => s + (+m.protein_g || 0), 0);
  const ptarget = isJahan() ? 125 : 0, mt = LS.get('mealtype', defaultMealType());
  const days = {}; D().meals.forEach(m => { days[m.date] = days[m.date] || { k: 0, p: 0, n: 0 }; days[m.date].k += +m.calories || 0; days[m.date].p += +m.protein_g || 0; days[m.date].n++; });
  return `<h1>Food</h1>
  <div class="card hero"><div class="row"><div class="sp"><div class="mut small">Today</div><b style="font-size:30px">${kcal}</b> kcal</div><div style="text-align:right"><b style="font-size:30px">${prot}</b> g<div class="mut small">protein${ptarget ? ' / ' + ptarget + ' g' : ''}</div></div></div>${ptarget ? `<div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, prot / ptarget * 100)}%"></i></div><div class="small mut" style="margin-top:4px">${ptarget - prot > 0 ? `${ptarget - prot} g protein to go` : 'Protein target hit ✓'} · banana pre-workout · no sweets</div>` : ''}</div>
  <div class="chips">${['breakfast', 'lunch', 'dinner', 'snack'].map(x => `<button class="chip ${x === mt ? 'on' : ''}" data-mt="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div>
  <h2>Tap to add</h2><div class="card" style="padding:8px">${FOODS.map((f, i) => `<div class="row" style="padding:8px 4px;border-bottom:1px solid var(--line)" data-food="${i}"><span class="sp">${esc(f[0])}</span><span class="mut small">${f[1]} kcal · ${f[2]} g</span><button class="btn sm">+</button></div>`).join('')}</div>
  <details class="card"><summary><b>Custom food</b></summary><label>Name</label><input id="cfn" maxlength="60" placeholder="e.g. Shawarma"><div class="grid2"><div><label>Calories</label><input id="cfk" type="number" inputmode="numeric"></div><div><label>Protein g (optional)</label><input id="cfp" type="number" inputmode="numeric"></div></div><button class="btn pri w" id="cfadd" style="margin-top:10px">Add</button></details>
  <h2>Today's log</h2>${meals.length ? meals.map(m => `<div class="setrow"><span>${t12(m.date + 'T' + m.time)} · ${esc(m.meal_type)}<br><span class="small">${esc(m.food)}</span></span><span>${m.calories} kcal<br><span class="small mut">${m.protein_g || 0} g</span></span><button class="btn sm ghost" data-dm="${esc(m.meal_id)}">✕</button></div>`).join('') : '<div class="card small mut">Nothing logged yet today.</div>'}
  <h2>History</h2><div class="card"><table><tr><th>Date</th><th>kcal</th><th>Protein</th><th>Items</th></tr>${Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([d, v]) => `<tr><td>${dPretty(d)}</td><td>${v.k}</td><td>${v.p} g</td><td>${v.n}</td></tr>`).join('')}</table></div>`;
};
function defaultMealType() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; }
function addMeal(food, cal, prot) {
  const now = new Date(), meal = { meal_id: uid(), date: ymd(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, meal_type: LS.get('mealtype', defaultMealType()), food, calories: +cal || 0, protein_g: prot === '' || prot === undefined ? '' : +prot };
  D().meals.push(meal); cacheSave(); queue('addMeal', { meal }); toast(`Added ${food}`); render();
}
V.food.after = () => {
  document.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { LS.set('mealtype', b.dataset.mt); render(); });
  document.querySelectorAll('[data-food]').forEach(r => r.onclick = () => { const f = FOODS[+r.dataset.food]; addMeal(f[0], f[1], f[2]); });
  $('#cfadd').onclick = () => { const n = $('#cfn').value.trim(), k = $('#cfk').value; if (!n || !k) return toast('Name and calories needed'); addMeal(n, k, $('#cfp').value); };
  document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => { S.data.meals = D().meals.filter(m => m.meal_id !== b.dataset.dm); cacheSave(); queue('deleteMeal', { meal_id: b.dataset.dm }); render(); });
};

// ---------- health ----------
const MLABEL = { steps: 'Steps', resting_hr: 'Resting HR', hrv_ms: 'HRV', sleep_h: 'Sleep', vo2max: 'VO₂ max', active_kcal: 'Active kcal', exercise_min: 'Exercise min', spo2_pct: 'SpO₂', distance_km: 'Distance', weight_kg: 'Weight', recovery_pct: 'Recovery', strain: 'Strain', bp_systolic: 'BP sys', bp_diastolic: 'BP dia' };
V.health = () => {
  const rc = recovery(), show = ['steps', 'resting_hr', 'hrv_ms', 'sleep_h', 'vo2max', 'active_kcal', 'spo2_pct', 'recovery_pct'];
  const tiles = show.map(k => { const l = latest(k, 400); return l ? `<div class="stat"><b>${(+l.value).toLocaleString(undefined, { maximumFractionDigits: 1 })}</b><span>${MLABEL[k]} ${l.unit && l.unit !== 'steps' ? '(' + l.unit + ')' : ''}<br>${dPretty(l.date)}</span></div>` : ''; }).join('');
  const last14 = [...new Set(D().metrics.map(m => m.date))].sort().slice(-10).reverse();
  const val = (d, k) => { const r = D().metrics.find(m => m.date === d && m.metric === k); return r ? (+r.value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '–'; };
  const dev = D().devices || [];
  return `<h1>Health</h1>
  <div class="alert ${rc.lvl}"><b>${esc(rc.head)}</b> — ${esc(rc.msg)}${rc.why.length ? `<div class="small mut">${rc.why.map(esc).join(' · ')}</div>` : ''}</div>
  ${isJahan() ? `<div class="card"><div class="row"><b class="sp">Apple Watch</b><span class="tag or">connected · Health Auto Export</span></div><p class="small mut">Your existing Health Auto Export app sends Apple Watch data to Google Drive. The box sync reads those exports into daily_sync.csv and your HealthMetrics sheet tab, and this screen reads them. Nothing new to install. Whoop isn't connected live; upload a Whoop CSV below to add it.</p></div>` : devicesCards(dev)}
  <div class="grid2">${tiles || '<div class="card small mut">No metrics yet.</div>'}</div>
  ${last14.length ? `<h2>Recent days</h2><div class="card" style="overflow-x:auto"><table><tr><th>Date</th><th>Steps</th><th>Sleep</th><th>HRV</th><th>RHR</th></tr>${last14.map(d => `<tr><td>${dPretty(d)}</td><td>${val(d, 'steps')}</td><td>${val(d, 'sleep_h')}</td><td>${val(d, 'hrv_ms')}</td><td>${val(d, 'resting_hr')}</td></tr>`).join('')}</table><div class="small mut">Partial days (watch off / not synced) show low numbers.</div></div>` : ''}
  <h2>Add a reading</h2><div class="card"><label>Metric</label><select id="mk">${METRIC_PICKER.map(([k, u]) => `<option value="${k}|${u}">${MLABEL[k] || k} (${u})</option>`).join('')}</select><div class="grid2"><div><label>Value</label><input id="mv" type="number" inputmode="decimal" step="any"></div><div><label>Date</label><input id="md" type="date" value="${ymd()}"></div></div><button class="btn pri w" id="madd" style="margin-top:10px">Save reading</button></div>
  <h2>Upload an export</h2><div class="card"><p class="small">CSV from Health Auto Export, a Whoop export (physiological_cycles.csv / sleeps.csv), or any wearable. Columns are matched automatically (date + metrics), rows go to your HealthMetrics tab.</p><input type="file" id="mf" accept=".csv,text/csv"><div id="mfo" class="small mut"></div></div>`;
};
function devicesCards(dev) {
  const st = m => dev.filter(d => d.method === m).slice(-1)[0]?.status || 'not set up';
  const card = (m, t, body) => `<div class="card"><div class="row"><b class="sp">${t}</b><span class="tag">${esc(st(m))}</span></div><div class="small">${body}</div><div class="row" style="margin-top:8px"><button class="btn sm" data-dev="${m}|set up">I've set this up</button><button class="btn sm ghost" data-dev="${m}|not using">Not using</button></div></div>`;
  return `<h2>Connect your devices</h2>
  ${card('Apple Watch · Health Auto Export', '1. Apple Watch (recommended)', 'Install <b>Health Auto Export</b> on your iPhone → Automations → new <i>Google Drive</i> export, format CSV, daily. Then upload the CSV here (or share the Drive folder with Jahan so it can be synced into your sheet).')}
  ${card('Whoop export', '2. Whoop', 'Whoop app → Settings → <i>Data export</i> (you get an email with CSVs). Upload physiological_cycles.csv or sleeps.csv below. No live Whoop login is used.')}
  ${card('Other wearable', '3. Other wearables', 'Export a CSV from Garmin, Fitbit, Samsung, Oura, etc. with a date column and metric columns, and upload it below. Or type readings with the metric picker.')}`;
}
const HEADER_MAP = [[/^(date|day|cycle start time|start|date\/time|sleep onset)/i, 'date'], [/step/i, 'steps', 'steps'], [/resting heart rate|^rhr|resting_hr/i, 'resting_hr', 'bpm'], [/heart rate variability|hrv/i, 'hrv_ms', 'ms'], [/recovery score/i, 'recovery_pct', '%'], [/day strain|^strain/i, 'strain', 'score'],
  [/asleep duration \(min\)/i, 'sleep_min'], [/sleep analysis \[asleep\]|sleep.*\(hr\)|sleep_h|hours of sleep/i, 'sleep_h', 'h'], [/vo2/i, 'vo2max', 'ml/kg/min'], [/active energy|active_kcal|active calories/i, 'active_kcal', 'kcal'], [/blood oxygen|spo2/i, 'spo2_pct', '%'], [/weight|body mass/i, 'weight_kg', 'kg']];
function parseCsv(txt) {
  const lines = txt.replace(/\r/g, '').split('\n').filter(Boolean), split = l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).slice(0, -1).map(s => s.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  const h = split(lines[0]), map = h.map(c => { for (const m of HEADER_MAP) if (m[0].test(c.trim())) return m; return null; });
  const di = map.findIndex(m => m && m[1] === 'date'); if (di < 0) return { rows: [], err: 'No date column found' };
  if (h.map(x => x.toLowerCase()).includes('metric') && h.map(x => x.toLowerCase()).includes('value')) { const mi = h.findIndex(x => /^metric$/i.test(x)), vi = h.findIndex(x => /^value$/i.test(x)), ui = h.findIndex(x => /^unit$/i.test(x)); return { rows: lines.slice(1).map(split).map(r => ({ date: String(r[di]).slice(0, 10), metric: r[mi], value: r[vi], unit: ui >= 0 ? r[ui] : '', source: 'upload' })) }; }
  const rows = [];
  for (const l of lines.slice(1)) { const r = split(l); const d = new Date(r[di]); if (isNaN(d)) continue; const date = ymd(d);
    map.forEach((m, i) => { if (!m || i === di || r[i] === '' || isNaN(+r[i])) return; let v = +r[i], k = m[1], u = m[2]; if (k === 'sleep_min') { k = 'sleep_h'; v = +(v / 60).toFixed(2); u = 'h'; } if (k === 'active_kcal' && /kj/i.test(h[i])) v = Math.round(v / 4.184); rows.push({ date, metric: k, value: v, unit: u, source: 'upload' }); }); }
  return { rows };
}
V.health.after = () => {
  $('#madd').onclick = () => { const [k, u] = $('#mk').value.split('|'), v = $('#mv').value; if (v === '') return toast('Enter a value'); const row = { date: $('#md').value, metric: k, value: +v, unit: u, source: 'manual' }; D().metrics.push(row); cacheSave(); queue('addMetrics', { rows: [row] }); toast('Saved'); render(); };
  $('#mf').onchange = async e => { const f = e.target.files[0]; if (!f) return; const { rows, err } = parseCsv(await f.text()); if (err || !rows.length) { $('#mfo').textContent = err || 'No usable rows found.'; return; } rows.forEach(r => r.source = 'upload: ' + f.name); D().metrics.push(...rows); cacheSave(); for (let i = 0; i < rows.length; i += 500) queue('addMetrics', { rows: rows.slice(i, i + 500) }); if (/whoop|physiological|sleeps/i.test(f.name)) queue('setDevice', { method: 'Whoop export', status: 'uploaded ' + ymd() }); toast(`${rows.length} rows added`); render(); };
  document.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => { const [m, s] = b.dataset.dev.split('|'); S.data.devices = [...D().devices.filter(d => d.method !== m), { method: m, status: s }]; cacheSave(); queue('setDevice', { method: m, status: s }); render(); });
};

// ---------- goals ----------
V.goals = () => {
  const g = D().goals, st = streaks(), t = ymd(), prot = D().meals.filter(m => m.date === t).reduce((s, m) => s + (+m.protein_g || 0), 0);
  const steps = latest('steps', 2), days = d => d ? Math.ceil((new Date(d + 'T00:00') - new Date(t + 'T00:00')) / 864e5) : null;
  const prog = x => { switch (x.key) {
    case 'vape': { const n = days(String(x.due).slice(0, 10)); return n !== null ? `<b class="or">${n > 0 ? n + ' days left' : 'Target date reached'}</b>` : ''; }
    case 'protein': return `Today: <b>${prot} / 125 g</b><div class="bar"><i style="width:${Math.min(100, prot / 1.25)}%"></i></div>`;
    case 'sessions': return `This week: <b>${st.thisWeek} / ${st.target}</b> · total ${st.total}`;
    case 'steps': return steps ? `Latest: <b>${(+steps.value).toLocaleString()}</b> (${dPretty(steps.date)})` : '';
    case 'bp': case 'retest': case 'lipids': case 'vitd': case 'uric': { const n = days(String(x.due).slice(0, 10)); return n !== null ? `Due ${dPretty(String(x.due).slice(0, 10))} · ${n} days` : ''; }
    case 'training': return `Week ${Math.max(weekOf(), 1)} of 6 · ${st.total} sessions logged`;
    case 'sleep': { const r = recovery(); return `<span class="${r.lvl === 'good' ? 'okc' : r.lvl === 'bad' ? 'badc' : 'warnc'}">${esc(r.head)}</span>`; }
    default: return /3x|week/i.test(x.goal) ? `This week: <b>${st.thisWeek} / 3</b>` : ''; } };
  return `<h1>Goals</h1>${g.length ? g.map(x => `<div class="card"><div class="row"><h3 class="sp">${esc(x.goal)}</h3><span class="tag">${esc(x.status)}</span></div><div class="small">${esc(x.target)}</div>${x.notes ? `<div class="small mut" style="margin-top:4px">${esc(x.notes)}</div>` : ''}<div class="small" style="margin-top:6px">${prog(x)}</div></div>`).join('') : '<div class="card">No goals yet.</div>'}
  <p class="small mut">Goals live in the Goals tab of your own Google Sheet.</p>`;
};

// ---------- research / more / photos / profile ----------
V.research = () => `<h1>Research</h1><p class="small mut">Checked links for reading in your free time.</p><div id="rs">Loading…</div>`;
V.research.after = async () => { const r = await (await fetch('research.json')).json(); const by = {}; r.forEach(x => (by[x.topic] = by[x.topic] || []).push(x)); $('#rs').innerHTML = Object.entries(by).map(([t, a]) => `<h2>${esc(t)}</h2><div class="list">${a.map(x => `<a href="${x.url}" ${x.url.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}><b>${esc(x.title)}</b><div class="small mut">${esc(x.why)}</div></a>`).join('')}</div>`).join(''); };
V.catalog = () => `<h1>Exercise catalog</h1><p class="small mut">Every exercise with its form video, floor and zone.</p>${EX.map(e => `<div class="card"><div class="row"><h3 class="sp">${esc(e.name)}</h3><span class="tag">${e.floor === 'U' ? 'UF' : '2F'} ${e.zone}</span></div><div class="small mut">${Object.keys(e.days).map(k => DAYS[k].name).join(' · ')}</div><div class="small" style="margin:6px 0">${esc(e.cues)}</div><div class="row"><a class="btn sm pri" target="_blank" rel="noopener" href="${YT(e.vid)}">▶ Watch form</a>${e.vid2 ? `<a class="btn sm" target="_blank" rel="noopener" href="${YT(e.vid2)}">Alt</a>` : ''}${ANIM_OF[e.id] ? `<a class="btn sm" href="#/character?a=${ANIM_OF[e.id]}">3D you</a>` : ''}</div></div>`).join('')}`;
V.maps = () => `<h1>Gym maps</h1>${hasPlan() ? `<div class="card"><h3>2nd / lower floor</h3><div class="small mut">From the red BOB dummy facing the Champions mural. Push A, Pull A, Push-Pull B and custom arm/back/pull days.</div>${lowerMap()}</div><div class="card"><h3>Upper floor</h3><div class="small mut">From the far-end doors facing the entrance. Legs + Core and custom leg day.</div>${upperMap()}</div>` : noPlanCard()}`;

V.plan = () => { const nx = nextPlanned(new Date(), false), url = new URL(PLAN_PDF, location.href).href;
  return `<h1>Training plan</h1><div class="card hero"><b>Healthzilla · Weeks 1–6</b><div class="small mut">Week 1 started Mon 9 Nov 2026 · Week 7 deload</div>${nx ? `<div class="small" style="margin-top:6px">Next planned: <b class="or">${esc(DAYS[nx.k].name)}</b> · ${dPretty(nx.d)}</div>` : ''}
  <div class="grid3" style="margin-top:12px"><a class="btn pri" href="${PLAN_PDF}" target="_blank" rel="noopener">📄 View</a><a class="btn" href="${PLAN_PDF}" download="Healthzilla-plan-weeks-1-6.pdf">⬇ Download</a><button class="btn" id="sharepdf">↗ Share</button></div><div class="small mut" id="shareout" style="margin-top:6px"></div></div>
  <div class="card small"><b>Weeks 1–2</b><div>Mon Push A · Wed Pull A · Fri Legs + Core · (W2: optional Sat Push-Pull B)</div><b style="display:block;margin-top:8px">Weeks 3–6</b><div>Mon Push A · Tue Pull A · Thu Legs + Core · Sat Push-Pull B</div><div class="mut" style="margin-top:6px">Link: ${esc(url)}</div></div>`; };
V.plan.after = () => { $('#sharepdf').onclick = async () => { const url = new URL(PLAN_PDF, location.href).href, out = $('#shareout');
  try { if (navigator.canShare) { const f = new File([await (await fetch(PLAN_PDF)).blob()], 'Healthzilla-plan-weeks-1-6.pdf', { type: 'application/pdf' }); if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Healthzilla plan' }); return; } }
    if (navigator.share) { await navigator.share({ title: 'Healthzilla plan (Weeks 1–6)', url }); return; } throw 0; }
  catch (e) { if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(url); out.textContent = 'Link copied: ' + url; } catch { out.textContent = 'Copy this link: ' + url; } } }; };
V.character = () => { const q = new URLSearchParams(location.hash.split('?')[1] || ''), a0 = ANIM_NAMES[q.get('a')] ? q.get('a') : homeAnim(ACT(), suggestion());
  return `<h1>Your 3D character</h1>
  <div class="chips" id="c3chips" style="margin-bottom:10px">${Object.entries(ANIM_NAMES).map(([k, n]) => `<button class="chip ${k === a0 ? 'on' : ''}" data-a="${k}">${n}</button>`).join('')}</div>
  <div id="bigc3" data-a="${a0}">${c3box('big')}</div>
  <div class="card small" style="margin-top:10px"><b>What this is:</b> a stylized, animated 3D version of you. The face is your real selfie photo mapped onto the head; the body (about 5'9.5", 78 kg, gym tee and joggers) is built to match you but it is <b>not a body scan</b>, and the machines are simple stand-ins, not copies of your gym's exact equipment. Drag to spin it around. For exact technique, use the <b>▶ Watch form</b> videos in each exercise.</div>`; };
V.character.after = () => { const box = $('#bigc3 .c3'); char3d(box, $('#bigc3').dataset.a);
  document.querySelectorAll('#c3chips [data-a]').forEach(b => b.onclick = () => { document.querySelectorAll('#c3chips .chip').forEach(x => x.classList.toggle('on', x === b)); box._c?.set(b.dataset.a); }); };
V.more = () => `<h1>More</h1><div class="list">
  <a href="#/snapshot"><b>Daily snapshot</b><div class="small mut">Today's findings, Watch metrics, training, food, longer-term focus</div></a>
  <a href="#/plan"><b>Training plan (PDF)</b><div class="small mut">View, download or share Weeks 1–6</div></a>
  <a href="#/character"><b>Your 3D character</b><div class="small mut">Animated 3D you — idle, chest press, lat pulldown, leg press, cable row, squat</div></a>
  <a href="#/history"><b>History</b><div class="small mut">All workouts, sets and weights</div></a>
  <a href="#/goals"><b>Goals</b><div class="small mut">Targets and progress</div></a>
  <a href="#/research"><b>Research</b><div class="small mut">Checked reading links</div></a>
  <a href="#/catalog"><b>Exercise catalog + form videos</b><div class="small mut">${EX.length} exercises</div></a>
  <a href="#/maps"><b>Gym maps</b><div class="small mut">Both floors</div></a>
  <a href="#/photos"><b>Gym photos & custom plan</b><div class="small mut">${esc(S.user.planStatus || '')}</div></a>
  <a href="#/profile"><b>Profile, PIN & Sheet</b><div class="small mut">Switch profile, set a PIN</div></a></div>
  <div class="card small mut">Add to Home Screen: Safari → Share → Add to Home Screen.</div>`;
V.photos = () => { const ph = D().photos || []; return `<h1>Gym photos</h1>
  <div class="card"><p class="small">${isJahan() ? 'Your plan and maps were built from your floor photos on Nov 9. Upload more if the gym changes.' : 'Send photos of your gym (each area, plus one wide shot from each end). Your plan, equipment list, floor maps and form-video catalog get built from your gym\'s equipment, the same way Jahan\'s was built from his floor photos. This is done by hand, not instantly.'}</p>
  <p>Status: <b class="or">${esc(S.user.planStatus || 'needs gym photos')}</b></p><input type="file" id="pf" accept="image/*" multiple><div id="pfo" class="small mut"></div></div>
  ${ph.map(p => `<div class="setrow"><span class="small">${esc(p.filename)}<br><span class="mut">${esc(String(p.uploaded_at).slice(0, 10))}</span></span><span class="tag">${esc(p.status)}</span></div>`).join('')}`; };
async function shrink(file) { const img = await createImageBitmap(file); const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * s), height: Math.round(img.height * s) }); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .82).split(',')[1]; }
V.photos.after = () => { $('#pf').onchange = async e => { const fs = [...e.target.files]; let n = 0; for (const f of fs) { $('#pfo').textContent = `Uploading ${++n}/${fs.length}…`; try { if (!API()) throw new Error('Sheet/Drive not connected yet — photos need the live connection'); const data = await shrink(f); const j = await api('uploadPhoto', { filename: f.name.replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', data }); if (!j.ok) throw new Error(j.error); D().photos.push(j.photo); } catch (err) { toast('Upload failed: ' + err.message); } } S.user.planStatus = S.user.planStatus === 'plan ready' ? 'plan ready' : 'awaiting custom plan'; LS.set('user', S.user); cacheSave(); render(); }; };
V.profile = () => `<h1>Profile</h1><div class="card"><b>${esc(S.user.name)}</b><div class="small mut">${esc(S.user.role)} · id ${esc(S.user.id)}</div>${S.user.sheetUrl ? `<a class="btn sm" style="margin-top:8px" target="_blank" href="${esc(S.user.sheetUrl)}">Open my Google Sheet</a>` : '<div class="small mut">Your Google Sheet is created from the template when your profile syncs.</div>'}</div>
  <div class="card"><h3>PIN</h3><p class="small mut">${S.user.hasPin ? 'Your profile is PIN-protected.' : 'No PIN yet. Anyone with the link could open your profile; set one.'}</p><input id="np" type="password" inputmode="numeric" maxlength="8" placeholder="New 4-8 digit PIN"><button class="btn w" id="setpin" style="margin-top:8px">Save PIN</button></div>
  <button class="btn w" id="switch">Switch profile</button>`;
V.profile.after = () => { $('#switch').onclick = () => pickProfile(); $('#setpin').onclick = async () => { const p = $('#np').value.trim(); if (!/^\d{4,8}$/.test(p)) return toast('4-8 digits'); const j = await api('setPin', { newPin: p }).catch(() => ({})); if (j.ok) { S.pin = p; LS.set('pin:' + S.user.id, p); S.user.hasPin = true; LS.set('user', S.user); toast('PIN saved'); render(); } else toast('Could not save (offline?)'); }; };

// ---------- weather ----------
const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm' };
const LAHORE = { lat: 31.5204, lon: 74.3587, name: 'Lahore' };
async function weather() {
  const el = $('#wx'); if (!el) return;
  const c = LS.get('wx2', null); if (c && Date.now() - c.t < 20 * 60e3) return (el.innerHTML = c.h);
  const go = async (lat, lon, where) => { try { const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,apparent_temperature&timezone=auto`)).json(); const cu = j.current; const h = `<b style="font-size:20px;color:var(--tx)">${Math.round(cu.temperature_2m)}°C</b><br>${WMO[cu.weather_code] || ''} · ${cu.relative_humidity_2m}% hum<br>feels ${Math.round(cu.apparent_temperature)}° · ${where}`; LS.set('wx2', { t: Date.now(), h }); const e2 = $('#wx'); if (e2) e2.innerHTML = h; } catch { const e2 = $('#wx'); if (e2) e2.textContent = ''; } };
  go(LAHORE.lat, LAHORE.lon, LAHORE.name); // home city: always Lahore (no device-location prompt)
}

// ---------- profiles ----------
async function pickProfile(pinFailed) {
  $('#nav').classList.add('hidden'); $('#who').classList.add('hidden');
  const v = $('#view'); v.innerHTML = `<h1>Who's training?</h1><div id="pl" class="mut">Loading profiles…</div>`;
  let users = LS.get('users', [{ id: 'jahan', name: 'Jahanzaib (Jahan)', role: 'admin', hasPin: true, planStatus: 'plan ready' }]);
  try { const j = await api('listUsers'); if (j.ok) { users = j.users; LS.set('users', users); } } catch { }
  for (const lu of LS.get('localUsers', [])) if (!users.some(u => u.id === lu.id)) users.push(lu);
  $('#pl').innerHTML = `${pinFailed ? '<div class="alert bad">Wrong or missing PIN.</div>' : ''}${users.map(u => `<button class="btn big" style="margin:8px 0;justify-content:flex-start" data-u="${esc(u.id)}">${u.role === 'admin' ? '👑' : '🙂'} ${esc(u.name)} ${u.hasPin ? '🔒' : ''}</button>`).join('')}
    <h2>New here?</h2><div class="card"><label>Your name</label><input id="nn" maxlength="40" placeholder="e.g. Ali"><label>PIN (4-8 digits, keeps your data private)</label><input id="npn" type="password" inputmode="numeric" maxlength="8"><button class="btn pri w" id="mk" style="margin-top:10px">Create my profile</button><p class="small mut">You get your own Google Sheet for workouts, meals, goals and health. Other people never see your logs.</p></div>`;
  document.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => {
    const u = users.find(x => x.id === b.dataset.u); let pin = LS.get('pin:' + u.id, '');
    if (u.hasPin && !pin) { pin = prompt(`PIN for ${u.name}`) || ''; }
    S.user = u; S.pin = pin;
    try { const j = await api('verify'); if (!j.ok) throw new Error(j.error); S.user = { ...u, ...j.profile }; } catch (e) { if (e.pin) return pickProfile(true); if (u.id === 'jahan' && !LS.get('jkey', '')) toast('Open your personal Healthzilla link once on this phone to load your health data.', 4000); }
    LS.set('user', S.user); LS.set('pin:' + u.id, pin); boot();
  });
  $('#mk').onclick = async () => { const n = $('#nn').value.trim(), p = $('#npn').value.trim(); if (!n) return toast('Enter your name'); if (p && !/^\d{4,8}$/.test(p)) return toast('PIN must be 4-8 digits');
    $('#mk').disabled = true;
    const id = (n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 14) || 'friend') + '-' + Math.random().toString(36).slice(2, 6);
    try { const j = await api('createUser', { id, name: n, pin: p }); if (!j.ok) throw new Error(j.error); S.user = j.user; }
    catch (e) { if (!e.offline) { toast('Could not create profile: ' + e.message); $('#mk').disabled = false; return; }
      S.user = { id, name: n, role: 'friend', hasPin: !!p, planStatus: 'needs gym photos', pendingSheet: true }; LS.set('localUsers', [...LS.get('localUsers', []), S.user]);
      LS.set('q:' + id, [{ action: 'createUser', payload: { id, name: n, pin: p }, id: uid() }]);
      LS.set('cache:' + id, { sessions: [], sets: [], meals: [], metrics: [], photos: [], devices: [], goals: [['Train 3x per week', '3 sessions/week', 'active'], ['Protein daily', '1.6 g per kg bodyweight', 'daily'], ['Daily steps', '8,000 steps', 'daily'], ['Sleep', '7+ hours', 'daily']].map(g => ({ goal: g[0], target: g[1], status: g[2], notes: '', due: '', key: '' })) }); }
    S.pin = p; LS.set('user', S.user); LS.set('pin:' + S.user.id, p); boot(); };
}

// ---------- router ----------
function render() {
  const r = (location.hash.replace('#/', '') || 'home').split('?')[0], f = V[r] || V.home;
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r || (r === 'history' && a.dataset.r === 'more')));
  $('#view').innerHTML = f(); f.after?.(); window.scrollTo?.(0, 0);
}
addEventListener('hashchange', () => { $('#modal').classList.add('hidden'); render(); });
async function boot() {
  $('#nav').classList.remove('hidden'); $('#who').classList.remove('hidden'); $('#who').textContent = S.user.name.split(' ')[0] + ' ▾'; $('#who').onclick = () => location.hash = '#/profile';
  render(); await loadData(); if (S.user) { $('#who').textContent = S.user.name.split(' ')[0] + ' ▾'; render(); flush(); }
}
{ const m = location.hash.match(/k=([\w-]{16,})/); if (m) { LS.set('jkey', m[1]); history.replaceState(null, '', location.pathname + '#/home'); if (!LS.get('user', null)) LS.set('user', { id: 'jahan', name: 'Jahanzaib (Jahan)', role: 'admin', hasPin: true, planStatus: 'plan ready' }); } }
S.user = LS.get('user', null); if (S.user) S.pin = LS.get('pin:' + S.user.id, '');
S.user ? boot() : pickProfile();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

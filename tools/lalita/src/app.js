// Sadhana app: state, storage, home, session, vidhi, naamavali, yatra.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SEC_COLORS = { shuddhi: "#8fb5c8", aavahan: "#eaa93b", nyas: "#c98a5a", pooja: "#d9443a", jap: "#f2d28a", samarpan: "#8fae63" };
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  // ---------- roman style ----------
  const simple = (s) => s.replace(/ā/g, "aa").replace(/Ā/g, "Aa").replace(/ī/g, "ee").replace(/Ī/g, "Ee").replace(/ū/g, "oo").replace(/Ū/g, "Oo")
    .replace(/ṛ/g, "ri").replace(/Ṛ/g, "Ri").replace(/ṁ/g, "m").replace(/[ṅñṇ]/g, "n").replace(/ṭ/g, "t").replace(/ḍ/g, "d")
    .replace(/[śṣ]/g, "sh").replace(/[ŚṢ]/g, "Sh").replace(/ḥ/g, "h");
  const rom = (s) => (state.prefs.roman === "iast" ? s : simple(s));

  // ---------- time helpers ----------
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayStart = () => (state.sadhanas.lalita.sankalp?.dayStart ?? 4);
  const todayKey = (now = new Date()) => keyOf(new Date(now.getTime() - dayStart() * 3600e3));
  const keyToUTC = (k) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const diffDays = (a, b) => Math.round((keyToUTC(b) - keyToUTC(a)) / 864e5);
  const addDays = (k, n) => { const d = new Date(keyToUTC(k) + n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const fmtDur = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}h ${pad(m === 60 ? 59 : m)}m` : `${m}m`; };
  const fmtClock = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`; };
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtDate = (k) => new Date(keyToUTC(k)).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "UTC" });
  const toDeva = (n) => String(n).replace(/\d/g, (d) => "०१२३४५६७८९"[d]);

  // ---------- state ----------
  const LS = "lalita-sadhana-v1";
  const fresh = () => ({
    v: 1, updatedAt: 0,
    prefs: { roman: "simple", scale: 1, bell: true, drone: false, showRoman: true, focus: false, paathMode: "naam" },
    active: "lalita",
    sadhanas: { lalita: { id: "lalita", name: "Shri Lalita Sahasranama Sadhana", sankalp: null, logs: {}, ack: [], session: null, history: [] } }
  });
  let state = fresh();
  try { const raw = localStorage.getItem(LS); if (raw) state = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  const S = () => state.sadhanas.lalita;

  const EMBED = window.parent !== window;
  const A = window.SADHANA_ASSETS || {};
  const CREDITS = [
    "Sri Yantra: artwork by Daniel Conrad under the direction of Harish Johari (1974), public domain, via Wikimedia Commons.",
    "Goddess Lalita Tripura Sundari: image by Ckvicky1992, CC BY-SA 4.0, via Wikimedia Commons."
  ];
  let dbDoc = null, syncMode = "local", saveTimer = null, saving = Promise.resolve();
  function save(now) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {}
    clearTimeout(saveTimer);
    const push = () => { if (EMBED) { if (syncMode === "cloud") window.parent.postMessage({ type: "lalita:save", state: JSON.parse(JSON.stringify(state)) }, location.origin); return; } if (!dbDoc) return; const snap = JSON.parse(JSON.stringify(state)); saving = saving.then(() => dbDoc.set(snap)).catch(() => {}); };
    if (now) push(); else saveTimer = setTimeout(push, 1500);
  }
  function initEmbed() {
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== "lalita:state") return;
      const remote = e.data.state; syncMode = "cloud"; renderSync();
      if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) { state = Object.assign(fresh(), remote); try { localStorage.setItem(LS, JSON.stringify(state)); } catch (err) {} if (!sess) rerender(); }
      else if ((state.updatedAt || 0) > ((remote && remote.updatedAt) || 0)) save(true);
    });
    window.parent.postMessage({ type: "lalita:ready" }, location.origin);
  }
  async function initCloud() {
    if (EMBED) return initEmbed();
    for (let i = 0; i < 30 && !window.claude?.use; i++) await new Promise((r) => setTimeout(r, 100));
    if (!window.claude?.use) return;
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id(); if (!uid) return;
      dbDoc = db.doc(`data/users/${uid}/state`);
      const snap = await dbDoc.get();
      if (snap.exists) {
        const remote = snap.data();
        if ((remote.updatedAt || 0) > (state.updatedAt || 0)) { state = Object.assign(fresh(), remote); try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} rerender(); }
        else if ((state.updatedAt || 0) > (remote.updatedAt || 0)) save(true);
      } else if (state.updatedAt) save(true);
      syncMode = "cloud"; renderSync();
    } catch (e) { syncMode = "local"; renderSync(); }
  }
  function renderSync() { /* sync state is explained in Settings > Backup; no badge on screen */ }

  // ---------- estimates ----------
  const stepsForDay = (dayNo) => STEPS.filter((s) => !s.day1 || dayNo === 1);
  function doneLogs() { const s = S(); return Object.entries(s.logs).filter(([, l]) => l.status === "done").sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, l]) => ({ k, ...l })); }
  function avgStep(id) {
    const xs = doneLogs().slice(-7).map((l) => l.steps?.[id]).filter((x) => x > 5);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }
  function paathSec(o) {
    const xs = doneLogs().flatMap((l) => l.paaths || []).filter((x) => x > 120).slice(-15);
    if (xs.length) return xs.reduce((a, b) => a + b, 0) / xs.length;
    return ((o && o.pmin) || S().sankalp?.paathMin || 22) * 60;
  }
  function estimate(dayNo, o) {
    const sk = S().sankalp; const n = (o && o.n) || sk?.paathPerDay || 5;
    const bySec = {}; let total = 0;
    for (const st of stepsForDay(dayNo)) {
      const v = st.mode === "paath" ? paathSec(o) * n : (avgStep(st.id) ?? st.est);
      bySec[st.sec] = (bySec[st.sec] || 0) + v; total += v;
    }
    return { total, bySec, perPaath: paathSec(o), n, learned: doneLogs().length > 0 };
  }

  // ---------- status ----------
  function status() {
    const s = S(), sk = s.sankalp; if (!sk) return null;
    const today = todayKey(); const logs = s.logs;
    const doneKeys = Object.keys(logs).filter((k) => logs[k].status === "done" && k >= sk.startKey).sort();
    const doneBefore = doneKeys.filter((k) => k < today).length;
    const todayDone = logs[today]?.status === "done";
    const notStarted = today < sk.startKey;
    const missed = [];
    if (!notStarted) for (let k = sk.startKey; k < today; k = addDays(k, 1)) if (logs[k]?.status !== "done") missed.push(k);
    const unack = missed.filter((k) => !s.ack.includes(k));
    let streak = 0; for (let k = todayDone ? today : addDays(today, -1); logs[k]?.status === "done" && k >= sk.startKey; k = addDays(k, -1)) streak++;
    const complete = doneKeys.length >= sk.days;
    const dayNo = Math.min(doneBefore + 1, sk.days);
    const all = doneLogs();
    const totals = all.reduce((a, l) => ({ paath: a.paath + (l.paaths?.length || 0), sec: a.sec + (l.total || 0) }), { paath: 0, sec: 0 });
    // day window: today's sadhana-day ends at the next dayStart boundary
    const now = new Date(); const end = new Date(now); end.setHours(dayStart(), 0, 0, 0); if (end <= now) end.setDate(end.getDate() + 1);
    return { today, doneKeys, doneCount: doneKeys.length, todayDone, notStarted, missed, unack, streak, complete, dayNo, totals, windowEnd: end, windowLeft: (end - now) / 1000 };
  }

  // ---------- milestones ----------
  const MEDALS = [
    ["दीप", "First Lamp", "Completed day 1", (st) => st.doneCount >= 1],
    ["३", "Three Days", "Completed 3 days", (st) => st.doneCount >= 3],
    ["७", "One Week", "Completed 7 days", (st) => st.doneCount >= 7],
    ["११", "Ekadashi", "Completed 11 days", (st) => st.doneCount >= 11],
    ["२१", "Twenty-One", "Completed 21 days", (st) => st.doneCount >= 21],
    ["३१", "One Month", "Completed 31 days", (st) => st.doneCount >= 31],
    ["५०", "Fifty Days", "Completed 50 days", (st) => st.doneCount >= 50],
    ["१०K", "Ten Thousand Names", "Chanted 10,000 names", (st) => st.totals.paath >= 10],
    ["१L", "One Lakh Names", "100 recitations = 1,00,000 names", (st) => st.totals.paath >= 100],
    ["ब्र", "Brahma Muhurta", "Started sadhana between 4 and 6 AM", () => doneLogs().some((l) => { const h = new Date(l.start).getHours(); return h >= 4 && h < 6; })],
    ["पू", "Poornahuti", "Completed the whole sankalpa", (st) => st.complete]
  ];
  const medalsOn = (st) => MEDALS.filter((m) => m[3](st)).map((m) => m[1]);

  // ---------- audio ----------
  let AC = null, droneNodes = null;
  const ac = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === "suspended") AC.resume(); return AC; };
  function bell() {
    window.Hut?.ringBell();
    if (!state.prefs.bell) return; const a = ac(); if (!a) return; const t = a.currentTime;
    const out = a.createGain(); out.gain.value = .16; out.connect(a.destination);
    [[1, .6, 3.2], [2.0, .35, 2.2], [2.76, .3, 1.6], [5.4, .14, 1], [8.9, .06, .6]].forEach(([r, g, d]) => {
      const o = a.createOscillator(), e = a.createGain(); o.type = "sine"; o.frequency.value = 640 * r * (1 + (Math.random() - .5) * .004);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .005); e.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(e); e.connect(out); o.start(t); o.stop(t + d + .1);
    });
  }
  function setDrone(on) {
    if (!on) { if (droneNodes) { const a = ac(); droneNodes.g.gain.linearRampToValueAtTime(0, a.currentTime + 1.2); const n = droneNodes; setTimeout(() => n.osc.forEach((o) => o.stop()), 1400); droneNodes = null; } return; }
    const a = ac(); if (!a || droneNodes) return;
    const g = a.createGain(); g.gain.value = 0; const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(g); g.connect(a.destination);
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .07; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency);
    const osc = [130.81, 196.0, 261.63, 130.81 * 1.003].map((f, i) => { const o = a.createOscillator(); o.type = i === 1 ? "triangle" : "sawtooth"; o.frequency.value = f; const og = a.createGain(); og.gain.value = i === 1 ? .5 : .25; o.connect(og); og.connect(lp); o.start(); return o; });
    lfo.start(); osc.push(lfo); g.gain.linearRampToValueAtTime(.05, a.currentTime + 2.5); droneNodes = { g, osc };
  }

  // ---------- wake lock ----------
  let wake = null;
  async function keepAwake(on) {
    try { if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener?.("release", () => (wake = null)); } else if (!on && wake) { await wake.release(); wake = null; } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sess) keepAwake(true); });

  // ---------- toast ----------
  let toastT; function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2600); }

  function openDarshan() {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog darshan-dialog"><img class="darshan-big" src="${A.lalita}" alt="Mother Lalita Tripura Sundari seated on a throne, holding a sugarcane bow, flower arrows, noose and goad"><div class="deva" style="font-size:22px;color:var(--haldi);text-align:center">श्रीमाता श्रीमहाराज्ञी श्रीमत्सिंहासनेश्वरी</div><p class="hint" style="text-align:center">${esc(CREDITS[1])}</p><button class="btn btn-gold btn-block" id="dk-x">Close</button></div>`;
    document.body.appendChild(o); $("#dk-x", o).onclick = () => o.remove(); o.addEventListener("click", (e) => { if (e.target === o) o.remove(); });
  }

  // =========================================================
  // HOME
  // =========================================================
  let view = "home";
  function setView(v) {
    view = v;
    ["home", "vidhi", "naam", "yatra"].forEach((k) => ($("#v-" + k).hidden = k !== v));
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
    window.Hut?.layout("side"); window.Hut?.rest(v !== "home");
    if (v === "vidhi") renderVidhi(); if (v === "naam") renderNaam(); if (v === "yatra") renderYatra(); if (v === "home") renderHome();
  }

  // ---------- guided setup (three short questions) ----------
  const setup = { step: 0, days: 31, custom: false, startOff: 0, n: 5, name: "", gotra: "", dob: "", wish: "" };
  const estimateFor = (n) => { const e = estimate(1, { n, pmin: 22 }); return e.total; };
  function renderSetup(el) {
    const dots = `<div class="dots">${[0, 1, 2].map((i) => `<i class="${i <= setup.step ? "on" : ""}"></i>`).join("")}</div>`;
    let body = "";
    if (setup.step === 0) {
      body = `<h2 class="q">How long will your sankalpa be?</h2>
        <div class="seg" id="f-days">${[31, 50].map((n) => `<button data-n="${n}" class="${!setup.custom && setup.days === n ? "on" : ""}">${n} days</button>`).join("")}<button data-n="custom" class="${setup.custom ? "on" : ""}">Other</button></div>
        ${setup.custom ? `<div class="field" style="max-width:200px"><label for="f-days-c">Number of days</label><input id="f-days-c" type="number" min="1" max="120" value="${setup.days}"></div>` : ""}
        <p class="quiet">${setup.startOff ? "Starts tomorrow." : "Starts today."} <button class="link" id="f-start">${setup.startOff ? "Start today instead" : "Start tomorrow instead"}</button></p>
        <button class="btn btn-primary" id="f-next">Continue</button>`;
    } else if (setup.step === 1) {
      body = `<h2 class="q">How many recitations each day?</h2>
        <div class="stepper"><button class="round" id="f-minus" aria-label="Fewer">–</button><b class="num">${setup.n}</b><button class="round" id="f-plus" aria-label="More">+</button></div>
        <p class="line">About <b>${fmtDur(estimateFor(setup.n))}</b> a day.</p>${setup.n < 5 ? `<p class="quiet">Fewer than the traditional five is fine. Change it any time in Settings.</p>` : ""}
        <div class="row"><button class="btn btn-primary" id="f-next">Continue</button><button class="link" id="f-back">Back</button></div>`;
    } else {
      body = `<h2 class="q">For your vow</h2><p class="quiet">Spoken in the sankalpa on Day 1. Everything here is optional.</p>
        <div class="fields"><div class="field"><label for="f-name">Your name</label><input id="f-name" value="${esc(setup.name)}" autocomplete="name"></div>
        <div class="grid2"><div class="field"><label for="f-gotra">Gotra</label><input id="f-gotra" value="${esc(setup.gotra)}"></div><div class="field"><label for="f-dob">Date of birth</label><input id="f-dob" value="${esc(setup.dob)}" placeholder="DD-MM-YYYY"></div></div>
        <div class="field"><label for="f-wish">What you ask of the Mother</label><textarea id="f-wish" rows="2">${esc(setup.wish)}</textarea></div></div>
        <div class="row"><button class="btn btn-primary" id="f-go">Set my sankalpa</button><button class="link" id="f-back">Back</button></div>`;
    }
    el.innerHTML = `<div class="inner">${body}${dots}</div>`;
    const go = (n) => { setup.step = n; renderSetup(el); };
    el.querySelectorAll("#f-days button").forEach((b) => b.onclick = () => { if (b.dataset.n === "custom") { setup.custom = true; setup.days = Math.max(1, Math.min(120, setup.days)); } else { setup.custom = false; setup.days = +b.dataset.n; } renderSetup(el); });
    $("#f-days-c", el)?.addEventListener("input", (e) => (setup.days = Math.max(1, Math.min(120, +e.target.value || 1))));
    $("#f-start", el)?.addEventListener("click", () => { setup.startOff = setup.startOff ? 0 : 1; renderSetup(el); });
    $("#f-minus", el)?.addEventListener("click", () => { setup.n = Math.max(1, setup.n - 1); renderSetup(el); });
    $("#f-plus", el)?.addEventListener("click", () => { setup.n = Math.min(21, setup.n + 1); renderSetup(el); });
    $("#f-next", el)?.addEventListener("click", () => go(setup.step + 1));
    $("#f-back", el)?.addEventListener("click", () => go(setup.step - 1));
    ["name", "gotra", "dob", "wish"].forEach((k) => $("#f-" + k, el)?.addEventListener("input", (e) => (setup[k] = e.target.value)));
    $("#f-go", el)?.addEventListener("click", () => {
      S().sankalp = { name: setup.name.trim(), gotra: setup.gotra.trim(), dob: setup.dob.trim(), wish: setup.wish.trim(), days: setup.days, paathPerDay: setup.n, paathMin: 22, dayStart: 4, startKey: addDays(todayKey(), setup.startOff), created: Date.now() };
      S().session = null; S().ack = []; save(true); bell(); toast("Sankalpa set. Jai Maa."); renderHome();
    });
  }

  // ---------- home ----------
  function renderHome() {
    const el = $("#homePanel"); const s = S(), sk = s.sankalp, st = status();
    window.Hut?.setDays(sk ? sk.days : 0, st ? st.doneCount : 0);
    if (!sk) return renderSetup(el);
    const e = estimate(st.dayNo);
    const sess0 = s.session && s.session.key === st.today ? s.session : null;
    const urgentAt = new Date(st.windowEnd - e.total * 1000);
    let line = "", sub = "";
    if (st.complete) line = "Your sankalpa is complete. Pranam.";
    else if (st.notStarted) line = `Your sadhana begins on <b>${fmtDate(sk.startKey)}</b>.`;
    else if (st.todayDone) line = `Today's sadhana is complete.${st.streak > 1 ? ` <b>${st.streak}</b> days in a row.` : ""}`;
    else if (sess0) line = `You are on step <b>${(stepsForDay(st.dayNo)[sess0.i]?.n) ?? 1}</b> of ${stepsForDay(st.dayNo).length}.`;
    else {
      line = `About <b>${fmtDur(e.total)}</b>. Finish by <b>${fmtTime(new Date(Date.now() + e.total * 1000))}</b> if you start now.`;
      sub = urgentAt > new Date() ? `Start before ${fmtTime(urgentAt)} to keep today's lamp.` : "Time is getting short. Start now to keep today's lamp.";
    }
    const alertHTML = st.unack.length && !st.complete ? `<div class="alert"><p>${st.unack.length === 1 ? `You missed ${fmtDate(st.unack[0])}.` : `You missed ${st.unack.length} days.`} Traditionally the sadhana then restarts from Day 1.</p><div class="row"><button class="btn btn-gold btn-sm" id="b-restart">Restart from Day 1</button><button class="link" id="b-ack">Keep going</button></div></div>` : "";
    const btn = st.complete ? `<button class="btn btn-gold" id="b-new">Take a new sankalpa</button>`
      : st.notStarted ? ""
      : st.todayDone ? `<button class="btn btn-ghost" id="b-extra">One more recitation</button>`
      : `<button class="btn btn-primary" id="b-start">${sess0 ? "Resume" : "Begin"}</button>`;
    const order = Object.keys(SECTIONS).filter((k) => e.bySec[k]);
    const inc = st.complete || st.todayDone || st.notStarted ? "" : `<details class="inc"><summary>What today includes</summary><div class="inc-list">${order.map((k) => `<div><span><i style="background:${SEC_COLORS[k]}"></i>${SECTIONS[k].name}</span><span class="num">${k === "jap" ? `${e.n} × ${fmtDur(e.perPaath)}` : fmtDur(e.bySec[k])}</span></div>`).join("")}</div></details>`;
    const naam = NAMES[(st.dayNo - 1) % 1000];
    const totals = st.totals.paath ? `${st.totals.paath} recitations · ${(st.totals.paath * 1000).toLocaleString("en-IN")} names chanted` : "";
    el.innerHTML = `<div class="inner">
      
      <div class="day"><b class="num">Day ${st.complete ? sk.days : st.dayNo}</b><span>of ${sk.days}</span></div>
      <div><p class="line">${line}</p>${sub ? `<p class="quiet" style="margin-top:8px">${sub}</p>` : ""}</div>
      ${alertHTML}${btn}${inc}
      <p class="quiet">${totals ? totals + "<br>" : ""}Name of the day: <span class="deva" style="color:#ffe3b0;font-size:19px">${esc(naam[0])}</span>, ${esc(naam[2].replace(/^She who (is |has |was )?/i, "").replace(/^./, (c) => c.toLowerCase()))}</p>
    </div>`;
    $("#b-start", el)?.addEventListener("click", startSession);
    $("#b-extra", el)?.addEventListener("click", () => startSession({ extra: true }));
    $("#b-restart", el)?.addEventListener("click", () => confirmBox("Restart from Day 1?", "Your earlier progress stays safe in the Journey tab. Day 1 begins today.", "Yes, restart", restartSankalp));
    $("#b-ack", el)?.addEventListener("click", () => { S().ack.push(...st.unack); save(); renderHome(); toast("Okay. Carrying on from today."); });
    $("#b-new", el)?.addEventListener("click", () => restartSankalp(true));
  }
  function archiveSankalp() {
    const s = S(), st = status();
    if (s.sankalp && st?.doneCount) s.history.push({ startKey: s.sankalp.startKey, endKey: todayKey(), days: s.sankalp.days, done: st.doneCount });
  }
  // fresh: the sankalpa is being abandoned or finished, so today's log must not count towards the next one
  function restartSankalp(fresh) {
    const s = S();
    archiveSankalp();
    if (fresh) delete s.logs[todayKey()];
    if (s.sankalp) s.sankalp = { ...s.sankalp, startKey: todayKey(), created: Date.now() };
    s.ack = []; s.session = null; save(true); renderHome(); toast("New sankalpa. Today is Day 1.");
  }
  // back to the three setup questions, prefilled from the sankalpa being replaced
  function newSankalp() {
    const s = S(), sk = s.sankalp;
    archiveSankalp();
    Object.assign(setup, { step: 0, days: sk.days, custom: ![31, 50].includes(sk.days), startOff: 0, n: sk.paathPerDay, name: sk.name || "", gotra: sk.gotra || "", dob: sk.dob || "", wish: sk.wish || "" });
    delete s.logs[todayKey()]; s.sankalp = null; s.ack = []; s.session = null;
    save(true); renderHome(); toast("Set up your new sankalpa.");
  }
  function openRestart(settings) {
    const sk = S().sankalp, st = status();
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>Restart your sankalpa?</h2>
      <p class="hint" style="color:var(--ink-2);font-size:16px">${st && st.doneCount ? `You have completed ${st.doneCount} of ${sk.days} days. ` : ""}Your streak goes back to zero. This sankalpa stays in your Journey as an earlier one, so nothing is lost.</p>
      <div class="col"><button class="btn btn-primary btn-sm" id="r-same">Restart from Day 1</button><button class="btn btn-ghost btn-sm" id="r-new">Change days, recitations or vow</button><button class="link" id="r-n">Keep going</button></div></div>`;
    document.body.appendChild(o);
    const done = () => { o.remove(); settings.remove(); };
    $("#r-n", o).onclick = () => o.remove();
    $("#r-same", o).onclick = () => { done(); restartSankalp(true); };
    $("#r-new", o).onclick = () => { done(); newSankalp(); };
  }
  function confirmBox(title, body, yes, onYes) {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p class="hint" style="color:var(--ink-2);font-size:16px">${esc(body)}</p><div class="row"><button class="btn btn-primary btn-sm" id="c-y">${esc(yes)}</button><button class="link" id="c-n">Cancel</button></div></div>`;
    document.body.appendChild(o);
    $("#c-n", o).onclick = () => o.remove(); $("#c-y", o).onclick = () => { o.remove(); onYes(); };
  }

  // =========================================================
  // SESSION: every step is a few "pages", one thing on screen at a time
  // =========================================================
  let sess = null, steps = [], tick = null, paused = false;
  function startSession(opts = {}) {
    const s = S(), st = status(); ac();
    const dayNo = st.dayNo;
    if (opts.extra) {
      steps = STEPS.filter((x) => x.id === "paath");
      sess = { key: st.today, extra: true, i: 0, li: 0, c: 0, cnt: 0, paaths: [], cur: 0, page: 0, el: 0, st: {}, started: Date.now(), prep: false, target: 1 };
    } else {
      steps = stepsForDay(dayNo);
      if (s.session && s.session.key === st.today) sess = s.session;
      else { sess = { key: st.today, i: 0, li: 0, c: 0, cnt: 0, paaths: [], cur: 0, page: 0, el: 0, st: {}, started: Date.now(), prep: true, target: s.sankalp.paathPerDay }; s.session = sess; }
    }
    sess.dayNo = dayNo;
    $("#app").hidden = true; $("#session").hidden = false; paused = false;
    window.Hut?.layout("side");
    const idx = (id) => steps.findIndex((x) => x.id === id);
    const at = sess.prep ? -1 : sess.i;
    window.Hut?.set({ doors: opts.extra || at > idx("dwaar"), lamp: opts.extra || at >= idx("deep"), smoke: opts.extra || at > idx("panchpooja"), yantra: .25, ganesh: 0, instant: true });
    keepAwake(true); if (state.prefs.drone) setDrone(true);
    clearInterval(tick); tick = setInterval(onTick, 1000);
    renderSession(true);
  }
  function onTick() {
    if (!sess || paused || document.hidden) return;
    sess.el++; const step = steps[sess.i];
    if (!sess.prep && step) { sess.st[step.id] = (sess.st[step.id] || 0) + 1; if (step.mode === "paath") sess.cur++; }
    updateClock(); if (sess.el % 15 === 0 && !sess.extra) save();
  }
  function remainingEst() {
    let r = 0;
    steps.forEach((st, i) => {
      if (i < sess.i) return;
      const full = st.mode === "paath" ? paathSec() * Math.max(0, sess.target - sess.paaths.length) - (i === sess.i ? sess.cur : 0) : (avgStep(st.id) ?? st.est);
      r += i === sess.i && st.mode !== "paath" ? Math.max(15, full - (sess.st[st.id] || 0)) : Math.max(0, full);
    });
    return r;
  }
  function updateClock() {
    const t = $("#s-el"); if (!t) return;
    t.textContent = fmtClock(sess.el);
    $("#s-rem").textContent = `about ${fmtDur(remainingEst())} left`;
    const pt = $("#p-cur"); if (pt) pt.textContent = fmtClock(sess.cur);
  }
  function exitSession() {
    clearInterval(tick); keepAwake(false); setDrone(false);
    if (sess && !sess.extra) { S().session = sess; save(true); }
    sess = null; $("#session").hidden = true; $("#app").hidden = false;
    window.Hut?.set({ doors: true, lamp: true, smoke: true, yantra: .25, ganesh: 0 }); window.Hut?.goto("home"); setView("home");
  }

  const handSVG = (f) => {
    const on = (i) => (f === i || f === 5 ? "var(--haldi)" : "rgba(244,231,212,.18)");
    return `<svg viewBox="0 0 120 140" aria-hidden="true"><g stroke="rgba(244,231,212,.5)" stroke-width="1.5">
      <rect x="28" y="62" width="64" height="64" rx="22" fill="${f === 5 ? "var(--haldi)" : "rgba(244,231,212,.12)"}"/>
      <rect x="4" y="70" width="20" height="46" rx="10" transform="rotate(-32 14 93)" fill="${on(0)}"/>
      <rect x="30" y="16" width="14" height="52" rx="7" fill="${on(1)}"/><rect x="47" y="6" width="14" height="60" rx="7" fill="${on(2)}"/>
      <rect x="64" y="12" width="14" height="55" rx="7" fill="${on(3)}"/><rect x="81" y="30" width="13" height="42" rx="6.5" fill="${on(4)}"/></g></svg>`;
  };
  const bodySVG = (k) => {
    const dot = (x, y, show) => show ? `<circle cx="${x}" cy="${y}" r="6" fill="var(--haldi)"><animate attributeName="r" values="5;8;5" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
    return `<svg viewBox="0 0 120 150" aria-hidden="true"><g fill="rgba(244,231,212,.14)" stroke="rgba(244,231,212,.45)" stroke-width="1.5">
      <circle cx="60" cy="40" r="22"/><path d="M22 140 C22 96 36 74 60 72 C84 74 98 96 98 140 Z"/></g>
      ${dot(60, 100, k === 0)}${dot(60, 24, k === 1)}${dot(72, 18, k === 2)}${dot(34, 82, k === 3)}${dot(86, 82, k === 3)}
      ${dot(52, 40, k === 4)}${dot(68, 40, k === 4)}${dot(60, 32, k === 4)}
      ${k === 5 || k === 6 ? `<circle cx="60" cy="40" r="32" fill="none" stroke="var(--haldi)" stroke-width="2" stroke-dasharray="${k === 6 ? "4 6" : "60 200"}"><animateTransform attributeName="transform" type="rotate" from="0 60 40" to="360 60 40" dur="${k === 6 ? 6 : 2}s" repeatCount="indefinite"/></circle>` : ""}</svg>`;
  };
  function mantraHTML(m) {
    return `<div class="mantra">${m.k ? `<div class="k">${esc(m.k)}</div>` : ""}<div class="d">${esc(m.d)}</div>${state.prefs.showRoman && m.r ? `<div class="r">${esc(rom(m.r))}</div>` : ""}${m.note ? `<div class="note">→ ${esc(m.note)}</div>` : ""}</div>`;
  }

  // Break a step into pages of at most two lines of mantra each
  function chunk(d, r, n = 2) {
    const D = d.split("\n"), Rr = r.split("\n"), out = [];
    for (let i = 0; i < D.length; i += n) out.push({ d: D.slice(i, i + n).join("\n"), r: Rr.slice(i, i + n).join("\n") });
    return out;
  }
  function pagesFor(step) {
    if (step.mode === "paath") return [{ paath: true }];
    if (step.mode === "count") return [{ d: step.m[0].d, r: step.m[0].r, counter: "count" }];
    if (step.mode === "sankalp") {
      const sk = S().sankalp;
      const dev = SANKALP.d({ ...sk, days: toDeva(sk.days) }).split("।").map((x) => x.trim()).filter(Boolean).map((x) => x + "।");
      const en = SANKALP.r(sk).split(/(?<=\.)\s+(?=[A-Z])/);
      return dev.length === en.length ? dev.map((d, i) => ({ d, en: en[i], long: true })) : [{ d: dev.join("\n"), en: en.join(" "), long: true }];
    }
    if (step.mode === "single") {
      return step.m.flatMap((m) => { const cs = chunk(m.d, m.r); if (m.note) cs[cs.length - 1].how = m.note; return cs; });
    }
    // lines
    const g = step.group || 1;
    if (g > 1) {
      const out = [];
      for (let i = 0; i < step.lines.length; i += g) { const part = step.lines.slice(i, i + g); out.push({ d: part.map((l) => l.d).join("\n"), r: part.map((l) => l.r).join("\n") }); }
      return out;
    }
    return step.lines.flatMap((l, li) => chunk(l.d, l.r).map((c, ci) => ({
      ...c, k: l.k, how: l.how, fx: ci === 0 ? l.fx : undefined, counter: l.counter ? "tap" : undefined,
      fig: step.hand ? { t: "hand", f: l.f } : step.id === "angnyas" ? { t: "body", k: li } : undefined
    })));
  }

  function renderSession(moveCam) {
    const root = $("#session"); const step = steps[sess.i];
    const pages = sess.prep ? [] : pagesFor(step);
    if (!sess.prep) sess.li = Math.min(sess.li, pages.length - 1);
    const page = pages[sess.li];
    // progress by section
    const secs = Object.keys(SECTIONS).filter((k) => steps.some((s) => s.sec === k));
    const track = secs.map((k) => {
      const list = steps.filter((s) => s.sec === k); const w = list.reduce((a, s) => a + (s.mode === "paath" ? 4 : 1), 0);
      const frac = !sess.prep && step ? (step.mode === "paath" ? sess.paaths.length / sess.target : sess.li / Math.max(1, pages.length)) : 0;
      const doneN = sess.prep ? 0 : list.filter((s) => steps.indexOf(s) < sess.i).reduce((a, s) => a + (s.mode === "paath" ? 4 : 1), 0) + (step && step.sec === k ? (step.mode === "paath" ? 4 : 1) * frac : 0);
      return `<div class="seg-t" style="--w:${w};--p:${Math.min(100, (doneN / w) * 100)}%"><span></span></div>`;
    }).join("");

    let meta, title, cue, cueAction = false, body = "", nextLabel = "Continue", nextDisabled = false, hideFoot = false, scene = "home";
    const isLastStep = sess.i === steps.length - 1;
    if (sess.prep) {
      scene = "dawn"; meta = `Day ${sess.dayNo}`; title = "Gather your things"; cue = "Tap each item once it is within reach.";
      const checks = sess.checks || (sess.checks = {});
      body = `<div class="checks">${SAMAGRI.map(([a], i) => `<button class="check ${checks[i] ? "on" : ""}" data-i="${i}"><i></i><b>${esc(a)}</b></button>`).join("")}</div>`;
      nextLabel = "Begin";
    } else {
      scene = step.scene; meta = `Step ${sess.i + 1} of ${steps.length} · ${SECTIONS[step.sec].name}`; title = step.t;
      cue = page.how || step.cue || ""; cueAction = !!page.how;
      if (page.paath) {
        body = paathHTML(step);
        const need = sess.target - sess.paaths.length; nextDisabled = need > 0; hideFoot = need > 0; nextLabel = "Continue";
      } else {
        const fig = page.fig ? `<div class="figure">${page.fig.t === "hand" ? handSVG(page.fig.f) : bodySVG(page.fig.k)}</div>` : "";
        const ring = page.counter === "count" ? (() => { const C = 2 * Math.PI * 62; return `<div class="counter"><button class="tapper" id="tap" aria-label="Count"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="62" fill="none" stroke="rgba(244,231,212,.12)" stroke-width="5"/><circle cx="66" cy="66" r="62" fill="none" stroke="var(--haldi)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, sess.c / step.count))}" style="transition:stroke-dashoffset .3s"/></svg><b class="num">${sess.c}</b><small>of ${step.count}</small></button></div>`; })()
          : page.counter === "tap" ? `<div class="counter"><button class="tapper" id="tap2" aria-label="Count"><b class="num">${sess.cnt}</b><small>japa</small></button></div>` : "";
        body = `<div class="pg" key="${sess.i}-${sess.li}">${page.k ? `<div class="meta">${esc(page.k)}</div>` : ""}${fig}<div class="d ${page.long ? "long" : ""}">${esc(page.d)}</div>${page.en ? `<div class="en">${esc(page.en)}</div>` : state.prefs.showRoman && page.r ? `<div class="r">${esc(rom(page.r))}</div>` : ""}${ring}</div>`;
        if (pages.length > 1) body += `<div class="dots" aria-label="Page ${sess.li + 1} of ${pages.length}">${pages.length <= 12 ? pages.map((_, i) => `<i class="${i <= sess.li ? "on" : ""}"></i>`).join("") : `<span class="meta">${sess.li + 1} / ${pages.length}</span>`}</div>`;
      }
      if (isLastStep && sess.li >= pages.length - 1) nextLabel = sess.extra ? "Finish" : "Complete sadhana";
    }
    root.innerHTML = `
      <div class="s-top">
        <button class="round" id="s-x" aria-label="Pause"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5v14M16 5v14"/></svg></button>
        <div class="track" aria-hidden="true">${track}</div>
        <div class="clock"><b class="num" id="s-el">${fmtClock(sess.el)}</b><span id="s-rem"></span></div>
      </div>
      <button class="darshan" id="s-darshan" aria-label="View Mother Lalita"><img src="${A.lalita}" alt=""></button>
      <div class="side stage ${!sess.prep && page?.paath ? "is-paath" : ""}"><div class="inner">
        <div class="meta">${esc(meta)}</div>
        ${!sess.prep && page?.paath ? "" : `<div><h2>${esc(title)}</h2>${cue ? `<p class="cue ${cueAction ? "action" : ""}" style="margin-top:10px">${esc(cue)}</p>` : ""}</div>`}
        ${body}
        ${hideFoot ? "" : `<div class="stage-foot">
          <button class="round" id="s-prev" ${sess.prep ? "disabled" : ""} aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button class="btn ${nextDisabled ? "btn-ghost" : "btn-primary"} btn-next" id="s-next" ${nextDisabled ? "disabled" : ""}>${esc(nextLabel)}</button>
          ${sess.prep ? "" : `<button class="round" id="s-info" aria-label="About this step"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg></button>`}
        </div>`}
      </div></div>`;
    updateClock();
    if (moveCam) window.Hut?.goto(scene);
    $("#s-x").onclick = pauseBox; if ($("#s-next")) { $("#s-next").onclick = next; $("#s-prev").onclick = prev; } $("#s-darshan").onclick = openDarshan;
    $("#s-info", root)?.addEventListener("click", () => infoBox(step));
    root.querySelectorAll(".check").forEach((b) => b.onclick = () => { sess.checks[b.dataset.i] = !sess.checks[b.dataset.i]; b.classList.toggle("on"); });
    $("#tap", root)?.addEventListener("click", () => { sess.c++; if (sess.c === 1 && step.id === "dwaar") window.Hut?.set({ doors: true }); if (sess.c >= step.count) bell(); renderSession(false); });
    $("#tap2", root)?.addEventListener("click", () => { sess.cnt++; renderSession(false); });
    bindPaath(root, step);
  }
  function infoBox(step) {
    paused = true;
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog"><h2>${esc(step.t)}</h2><p class="hint" style="font-size:17px;color:var(--ink)">${esc(step.do)}</p><p class="hint" style="font-size:16px;font-style:italic">${esc(step.bhaav)}</p><button class="btn btn-ghost btn-sm" id="i-x">Close</button></div>`;
    document.body.appendChild(o); const close = () => { paused = false; o.remove(); };
    $("#i-x", o).onclick = close; o.addEventListener("click", (e) => { if (e.target === o) close(); });
  }

  // ----- the full stotram -----
  const PAGE = 8, PAGES = Math.ceil(1000 / PAGE);
  function paathHTML(step) {
    const n = sess.paaths.length, tgt = sess.target, mode = state.prefs.paathMode;
    let h = `<div class="rec"><div><b class="num">${Math.min(n + 1, Math.max(tgt, n + 1))}</b> <span>of ${tgt} recitations</span></div><span>this one <b class="num" id="p-cur" style="font-size:inherit;font-weight:600;color:var(--ink)">${fmtClock(sess.cur)}</b> · average ${fmtDur(paathSec())}</span></div>`;
    if (mode === "naam") {
      const p = sess.page; const from = p * PAGE;
      h += `<div class="pbar"><span style="width:${((p + 1) / PAGES) * 100}%"></span></div>`;
      if (p === 0) h += `<div class="pg"><div class="d long" style="font-size:24px">${esc(step.m[0].d)}</div></div>`;
      h += `<div class="names-page">${NAMES.slice(from, from + PAGE).map((x, i) => `<div><span class="i num">${from + i + 1}</span><span class="d">${esc(x[0])}</span>${state.prefs.showRoman ? `<span class="r">${esc(x[1])}</span>` : ""}</div>`).join("")}</div>`;
      if (p === PAGES - 1) h += `<div class="pg"><div class="d long">${esc(step.end.d)}</div></div>`;
      h += `<div class="pnav"><button class="round" id="p-prev" ${p === 0 ? "disabled" : ""} aria-label="Previous names"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button><span class="lbl num">${from + 1} to ${Math.min(1000, from + PAGE)} of 1000</span>
        ${p < PAGES - 1 ? `<button class="btn btn-gold btn-sm" id="p-next">Next names</button>` : `<button class="btn btn-gold btn-sm" id="p-done">Recitation complete</button>`}</div>
        <button class="link" id="p-switch">Reading from your own book instead</button>`;
    } else {
      h += `<div class="pg"><div class="d">॥ श्रीललितासहस्रनामस्तोत्रम् ॥</div><p class="quiet">Read the full stotram from your own book. The timer keeps running.</p></div>
        <button class="btn btn-gold" id="p-done">Recitation ${n + 1} complete</button><button class="link" id="p-switch">Show the names here instead</button>`;
    }
    if (n >= tgt) h += `<button class="link" id="p-more">One more recitation</button>`;
    return h;
  }
  function bindPaath(root, step) {
    if (!step || step.mode !== "paath") return;
    $("#p-switch", root)?.addEventListener("click", () => { state.prefs.paathMode = state.prefs.paathMode === "naam" ? "book" : "naam"; save(); renderSession(false); });
    $("#p-prev", root)?.addEventListener("click", () => { sess.page = Math.max(0, sess.page - 1); renderSession(false); root.querySelector(".side").scrollTop = 0; });
    $("#p-next", root)?.addEventListener("click", () => { sess.page++; if (sess.page % 25 === 0) window.Hut?.fx("petals"); renderSession(false); root.querySelector(".side").scrollTop = 0; });
    $("#p-done", root)?.addEventListener("click", finishPaath);
    $("#p-more", root)?.addEventListener("click", () => { sess.target++; renderSession(false); });
  }
  function finishPaath() {
    sess.paaths.push(sess.cur); sess.cur = 0; sess.page = 0; bell(); window.Hut?.fx("petals");
    const left = sess.target - sess.paaths.length;
    toast(left > 0 ? `Recitation ${sess.paaths.length} complete. ${left} to go.` : "All recitations complete. Jai Maa Lalita.");
    if (!sess.extra) save(); renderSession(false); $("#session .side").scrollTop = 0;
  }

  function pageFx(step, page) {
    if (page?.fx) window.Hut?.fx(page.fx);
    if (step.id === "ganapati") window.Hut?.set({ ganesh: 1 });
  }
  function enterStep() {
    const step = steps[sess.i]; sess.li = 0; sess.c = 0; sess.cnt = 0;
    window.Hut?.set({ ganesh: step.id === "ganapati" ? 1 : 0, yantra: ["viniyog", "karnyas", "angnyas", "paath"].includes(step.id) ? .9 : .3 });
    if (step.id === "deep") setTimeout(() => window.Hut?.fx("lamp"), 1400);
    if (step.id === "shuddhikaran" || step.id === "sankalp") setTimeout(() => window.Hut?.fx("water"), 600);
    if (step.id === "samarpan") window.Hut?.fx("petals");
    if (step.id === "kshama") window.Hut?.fx("shower");
    pageFx(step, pagesFor(step)[0]);
  }
  const scrollTop = () => { const sd = $("#session .side"); if (sd) sd.scrollTop = 0; };
  function next() {
    ac();
    if (sess.prep) { sess.prep = false; sess.i = 0; bell(); enterStep(); renderSession(true); scrollTop(); return; }
    const step = steps[sess.i]; const pages = pagesFor(step);
    if (sess.li < pages.length - 1) { sess.li++; sess.cnt = 0; pageFx(step, pages[sess.li]); renderSession(false); scrollTop(); return; }
    if (step.id === "dwaar") window.Hut?.set({ doors: true });
    if (step.id === "panchpooja") window.Hut?.set({ smoke: true });
    if (sess.i >= steps.length - 1) return complete();
    sess.i++; bell(); enterStep(); if (!sess.extra) save(); renderSession(true); scrollTop();
  }
  function prev() {
    if (sess.prep) return;
    if (sess.li > 0) { sess.li--; renderSession(false); return; }
    if (sess.i === 0) { sess.prep = true; renderSession(true); return; }
    sess.i--; sess.li = pagesFor(steps[sess.i]).length - 1; renderSession(true);
  }
  function pauseBox() {
    paused = true;
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog"><h2>Paused</h2><p class="hint" style="color:var(--ink-2);font-size:16px">The timer is paused. You can resume from this exact step before today ends (${fmtTime(status().windowEnd)}).</p>
      <div class="row"><button class="btn btn-primary btn-sm" id="pz-go">Resume</button><button class="link" id="pz-x">Save and exit</button></div></div>`;
    document.body.appendChild(o);
    $("#pz-go", o).onclick = () => { paused = false; o.remove(); };
    $("#pz-x", o).onclick = () => { paused = false; o.remove(); exitSession(); };
  }
  function complete() {
    const s = S(); clearInterval(tick); keepAwake(false); setDrone(false);
    const before = medalsOn(status());
    if (sess.extra) {
      const log = s.logs[sess.key]; if (log) { log.paaths = [...(log.paaths || []), ...sess.paaths]; log.total = (log.total || 0) + sess.el; }
    } else {
      s.logs[sess.key] = { status: "done", steps: sess.st, paaths: sess.paaths, total: sess.el, start: sess.started, end: Date.now(), day: sess.dayNo };
      s.session = null;
    }
    save(true);
    const st = status(); const newMedals = medalsOn(st).filter((m) => !before.includes(m));
    window.Hut?.lightNewDay(s.sankalp.days, st.doneCount); window.Hut?.fx("shower"); window.Hut?.goto("offer-all"); bell(); setTimeout(bell, 900);
    const naam = NAMES[(sess.dayNo - 1) % 1000];
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" style="align-items:center;text-align:center"><div class="deva" style="font-size:26px;color:var(--haldi)">श्री जगदम्बा अर्पणमस्तु</div>
      <div class="done-hero"><div class="big num">${sess.extra ? "+" + sess.paaths.length + (sess.paaths.length === 1 ? " recitation" : " recitations") : `Day ${sess.dayNo} complete`}</div></div>
      <p class="line" style="max-width:none">${fmtDur(sess.el)} · ${sess.paaths.length} ${sess.paaths.length === 1 ? "recitation" : "recitations"}${st.streak > 1 ? ` · ${st.streak} days in a row` : ""}</p>
      ${newMedals.length ? `<p class="line" style="color:#ffe3b0;max-width:none">New milestone: ${newMedals.map(esc).join(", ")}</p>` : ""}
      ${sess.extra ? "" : `<p class="quiet">Keep today's name in mind:<br><span class="deva" style="font-size:24px;color:#ffe3b0">${esc(naam[0])}</span></p>`}
      <button class="btn btn-gold" id="d-ok">Pranam</button></div>`;
    document.body.appendChild(o);
    $("#d-ok", o).onclick = () => { o.remove(); sess = null; $("#session").hidden = true; $("#app").hidden = false; window.Hut?.goto("home"); setView("home"); };
  }
  document.addEventListener("keydown", (e) => {
    if (!sess || $(".overlay")) return; if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const step = steps[sess.i];
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); if (!sess.prep && step.mode === "paath") { if (state.prefs.paathMode === "naam" && sess.page < PAGES - 1) $("#p-next")?.click(); } else if ($("#s-next") && !$("#s-next").disabled) next(); }
    if (e.key === "ArrowLeft") { if (!sess.prep && step.mode === "paath") $("#p-prev")?.click(); else prev(); }
  });

  // =========================================================
  // VIDHI (document)
  // =========================================================
  function renderVidhi() {
    const sk = S().sankalp || {};
    let h = `<div><div class="eyebrow">Inspired by Shri Om Swami</div><h1>Guide</h1></div>
      <p class="lead">All 21 steps from your PDF. Instructions are in English; mantras stay in Sanskrit, exactly as written, with a Roman transliteration beneath.</p>
      <div class="sec-h"><h2>What you need</h2><span class="deva">सामग्री</span></div><div class="samagri">${SAMAGRI.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}</div>`;
    for (const [k, sec] of Object.entries(SECTIONS)) {
      const list = STEPS.filter((s) => s.sec === k);
      h += `<div class="sec-h"><h2>${esc(sec.name)}</h2><span class="deva">${esc(sec.hi)}</span><span class="n">${esc(sec.note)}</span></div>`;
      for (const s of list) {
        let ms = "";
        if (s.m) ms += s.m.map(mantraHTML).join("");
        if (s.lines) ms += s.lines.map((l) => mantraHTML({ k: l.k, d: l.d, r: l.r, note: l.how })).join("");
        if (s.mode === "sankalp") ms += mantraHTML({ k: "Sankalpa", d: SANKALP.d({ ...sk, days: sk.days ? toDeva(sk.days) : "" }), r: "" }) + `<p class="hint">${esc(SANKALP.r(sk))}</p>`;
        if (s.end) ms += mantraHTML({ k: "Closing of the stotram", d: s.end.d, r: s.end.r });
        h += `<article class="vstep"><div class="no">${toDeva(s.n)}</div><div class="body"><h3>${esc(s.t)} <span class="deva">${esc(s.th)}</span>${s.day1 ? '<span class="tag">Day 1 only</span>' : ""}</h3>
          <p>${esc(s.do)}</p>${ms}${s.note ? `<p class="hint">${esc(s.note)}</p>` : ""}</div></article>`;
      }
    }
    h += `<p class="hint">The three Ganesha mudras of step 8 are in a photo on page 3 of the PDF. The photo is not clear enough to read, so they are not described here. In steps 16 and 17 the way of touching the fingers and body parts is added from the traditional method; the PDF gives only the mantras.</p>`;
    h += `<div class="sec-h"><h2>Image credits</h2></div>${CREDITS.map((c) => `<p class="hint">${esc(c)}</p>`).join("")}`;
    $("#vidhiBody").innerHTML = h;
  }

  // =========================================================
  // NAAMAVALI
  // =========================================================
  let naamQ = "", naamRows = [], naamShown = 0, naamLow = null, naamIO = null, naamTimer = 0;
  const NAAM_STEP = 40;
  function renderNaam() {
    const el = $("#naamBody");
    if (!el.dataset.ready) {
      el.innerHTML = `<div><div class="eyebrow">१००० नाम</div><h1>1000 Names</h1></div><p class="lead">The meaning of every name. Search in Devanagari, Roman letters or English.</p>
        <div class="search"><input id="n-q" type="search" placeholder="Search: श्रीमाता, mata, mother, 108…" autocomplete="off"></div><div class="nlist" id="n-list"></div><div id="n-end" class="n-end"><button class="link" id="n-more">Show more</button></div>`;
      el.dataset.ready = 1;
      $("#n-q").addEventListener("input", (e) => { clearTimeout(naamTimer); naamTimer = setTimeout(() => { naamQ = e.target.value.trim().toLowerCase(); drawNames(); }, 150); });
      $("#n-more").onclick = () => moreNames();
      // load the next rows when the end of the list scrolls into view
      if ("IntersectionObserver" in window) { naamIO = new IntersectionObserver((en) => { if (en[0].isIntersecting) moreNames(); }, { root: $("#v-naam"), rootMargin: "800px 0px" }); naamIO.observe($("#n-end")); }
    }
    if (!naamRows.length && !naamQ) drawNames();
  }
  function drawNames() {
    if (!naamLow) naamLow = NAMES.map((x) => [x[0], x[1].toLowerCase(), x[2].toLowerCase()]);
    const q = naamQ; const num = /^\d+$/.test(q) ? +q : 0;
    naamRows = [];
    for (let i = 0; i < NAMES.length; i++) { const x = naamLow[i]; if (!q || (num ? i + 1 === num : x[0].includes(q) || x[1].includes(q) || x[2].includes(q))) naamRows.push(i); }
    naamShown = 0; $("#n-list").innerHTML = "";
    if (!naamRows.length) { $("#n-list").innerHTML = `<p class="hint">No name found.</p>`; }
    moreNames();
  }
  function moreNames() {
    const end = Math.min(naamRows.length, naamShown + NAAM_STEP);
    let h = "";
    for (let k = naamShown; k < end; k++) { const i = naamRows[k], x = NAMES[i]; h += `<div class="nrow"><span class="i num">${i + 1}</span><div><div class="d">${esc(x[0])}</div><div class="r">${esc(x[1])}</div></div><div class="m">${esc(x[2])}</div></div>`; }
    if (h) $("#n-list").insertAdjacentHTML("beforeend", h);
    naamShown = end;
    $("#n-more").hidden = naamShown >= naamRows.length;
  }

  // =========================================================
  // YATRA (progress)
  // =========================================================
  function renderYatra() {
    const s = S(), sk = s.sankalp, st = status(); const el = $("#yatraBody");
    if (!sk) { el.innerHTML = `<div><div class="eyebrow">Journey</div><h1>Your journey will appear here</h1></div><p class="lead">After you take your sankalpa, each day's lamp, streak, time and milestones will be recorded here.</p><button class="btn btn-primary" id="y-go">Take your sankalpa</button>`; $("#y-go").onclick = () => setView("home"); return; }
    const cells = Array.from({ length: sk.days }, (_, i) => {
      const k = addDays(sk.startKey, i); const done = s.logs[k]?.status === "done"; const miss = st.missed.includes(k);
      return `<div class="${done ? "lit" : miss ? "miss" : ""} ${k === st.today ? "today" : ""}"><b class="num">${i + 1}</b><span>${fmtDate(k)}</span></div>`;
    }).join("");
    const logs = doneLogs();
    const avgBy = {}; const recent = logs.slice(-7);
    for (const l of recent) for (const stp of STEPS) { const v = l.steps?.[stp.id]; if (v) avgBy[stp.sec] = (avgBy[stp.sec] || 0) + v / recent.length; }
    const maxV = Math.max(1, ...Object.values(avgBy));
    const bars = Object.keys(SECTIONS).filter((k) => avgBy[k]).map((k) => `<div class="bar"><span>${esc(SECTIONS[k].name)}</span><div class="tr"><span style="width:${(avgBy[k] / maxV) * 100}%;background:${SEC_COLORS[k]}"></span></div><span class="v num">${fmtDur(avgBy[k])}</span></div>`).join("");
    const on = medalsOn(st);
    el.innerHTML = `<div><div class="eyebrow">Journey</div><h1>${st.doneCount} of ${sk.days} lamps lit</h1></div>
      <div class="stats"><div class="stat"><b class="num">${st.streak}</b><span>Day streak</span></div><div class="stat"><b class="num">${st.totals.paath}</b><span>Recitations</span></div><div class="stat"><b class="num">${fmtDur(st.totals.sec)}</b><span>Total time</span></div></div>
      <div class="sec-h"><h2>Days of your sankalpa</h2><span class="n">from ${fmtDate(sk.startKey)} · the day changes at ${dayStart()}:00 AM</span></div><div class="cal">${cells}</div>
      <div class="sec-h"><h2>Milestones</h2><span class="n">${on.length} / ${MEDALS.length}</span></div>
      <div class="medals">${MEDALS.map((m) => `<div class="medal ${on.includes(m[1]) ? "on" : ""}"><span class="g">${m[0]}</span><b>${esc(m[1])}</b><span>${esc(m[2])}</span></div>`).join("")}</div>
      <div class="sec-h"><h2>Where the time goes</h2><span class="n">average of the last ${recent.length || 0} days</span></div>
      ${bars ? `<div class="bars">${bars}</div>` : `<p class="hint">After your first sadhana, the time for each part will show here.</p>`}
      <div class="sec-h"><h2>History</h2></div>
      <div class="hist">${logs.slice().reverse().map((l) => `<div><b>${fmtDate(l.k)} · Day ${l.day || ""}</b><span class="num">${fmtDur(l.total)} · ${l.paaths?.length || 0} recitations</span></div>`).join("") || `<p class="hint">No day completed yet.</p>`}
      ${s.history.map((hh) => `<div><b>Earlier sankalpa from ${fmtDate(hh.startKey)}</b><span>${hh.done} / ${hh.days} days</span></div>`).join("")}</div>`;
  }

  // =========================================================
  // SETTINGS
  // =========================================================
  function openSettings() {
    const p = state.prefs, sk = S().sankalp;
    const o = document.createElement("div"); o.className = "overlay";
    const sw = (id, on, label) => `<div class="toggle"><span>${label}</span><button class="sw ${on ? "on" : ""}" id="${id}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}"></button></div>`;
    o.innerHTML = `<div class="dialog"><h2>Settings</h2>
      <div class="sheet-sec"><h3>Mantra</h3>
        ${sw("o-rom", p.showRoman, "Show Roman transliteration")}
        <div class="field"><label>Transliteration style</label><div class="seg" id="o-style"><button data-v="simple" class="${p.roman === "simple" ? "on" : ""}">Simple (easy to read)</button><button data-v="iast" class="${p.roman === "iast" ? "on" : ""}">IAST (scholarly)</button></div></div>
        <div class="field"><label for="o-scale">Mantra text size</label><input id="o-scale" type="range" min=".85" max="1.5" step=".05" value="${p.scale}"></div></div>
      <div class="sheet-sec"><h3>Sound</h3>${sw("o-bell", p.bell, "Bell at each step")}${sw("o-drone", p.drone, "Soft tanpura drone during sadhana")}</div>
      ${sk ? `<div class="sheet-sec"><h3>Sankalpa</h3>
        <div class="grid2"><div class="field"><label for="o-paath">Recitations per day</label><input id="o-paath" type="number" min="1" max="21" value="${sk.paathPerDay}"></div>
        <div class="field"><label for="o-pmin">One recitation (min)</label><input id="o-pmin" type="number" min="8" max="60" value="${sk.paathMin}"></div></div>
        <div class="grid2"><div class="field"><label for="o-days">Total days</label><input id="o-days" type="number" min="1" max="120" value="${sk.days}"></div>
        <div class="field"><label for="o-ds">Day changes at (AM)</label><input id="o-ds" type="number" min="0" max="6" value="${sk.dayStart}"></div></div>
        <div class="field"><label for="o-name">Name</label><input id="o-name" value="${esc(sk.name)}"></div>
        <div class="grid2"><div class="field"><label for="o-gotra">Gotra</label><input id="o-gotra" value="${esc(sk.gotra)}"></div><div class="field"><label for="o-dob">Date of birth</label><input id="o-dob" value="${esc(sk.dob)}"></div></div>
        <div class="field"><label for="o-wish">Wish / intention</label><textarea id="o-wish" rows="2">${esc(sk.wish)}</textarea></div>
        <p class="hint">Your time per recitation is learned automatically from your real timings; this number is only the starting estimate.</p>
        ${sess ? "" : `<div class="restart"><p class="hint">Missed days, or want a fresh start?</p><button class="btn btn-ghost btn-sm" id="o-restart">Cancel and restart sankalpa</button></div>`}</div>` : ""}
      <div class="sheet-sec"><h3>Backup</h3><p class="hint">${syncMode === "cloud" ? "Your progress is synced to your account." : "Your progress is stored only on this device. Copy a backup to keep it safe."}</p>
        <div class="row"><button class="btn btn-ghost btn-sm" id="o-copy">Copy backup</button><button class="btn btn-ghost btn-sm" id="o-imp">Paste backup</button></div>
        <textarea class="backup" id="o-bk" hidden placeholder="Paste backup JSON here"></textarea></div>
      <div class="sheet-sec"><h3>Image credits</h3>${CREDITS.map((c) => `<p class="hint">${esc(c)}</p>`).join("")}</div>
      <button class="btn btn-gold btn-block" id="o-ok">Save</button></div>`;
    document.body.appendChild(o);
    const tg = (id, key, after) => { $("#" + id, o).onclick = (e) => { p[key] = !p[key]; e.currentTarget.classList.toggle("on", p[key]); e.currentTarget.setAttribute("aria-checked", p[key]); after?.(); }; };
    tg("o-rom", "showRoman"); tg("o-bell", "bell", () => p.bell && bell()); tg("o-drone", "drone", () => { if (sess) setDrone(p.drone); });
    o.querySelectorAll("#o-style button").forEach((b) => b.onclick = () => { p.roman = b.dataset.v; o.querySelectorAll("#o-style button").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#o-scale", o).oninput = (e) => { p.scale = +e.target.value; applyPrefs(); };
    $("#o-restart", o)?.addEventListener("click", () => openRestart(o));
    $("#o-copy", o).onclick = async () => { const t = JSON.stringify(state); try { await navigator.clipboard.writeText(t); toast("Backup copied"); } catch (e) { const ta = $("#o-bk", o); ta.hidden = false; ta.value = t; ta.select(); toast("Text selected. Copy it manually."); } };
    $("#o-imp", o).onclick = () => { const ta = $("#o-bk", o); if (ta.hidden) { ta.hidden = false; ta.value = ""; ta.focus(); return; } try { const d = JSON.parse(ta.value); if (!d.sadhanas) throw 0; state = Object.assign(fresh(), d); save(true); o.remove(); rerender(); toast("Backup restored"); } catch (e) { toast("That does not look like a valid backup"); } };
    $("#o-ok", o).onclick = () => {
      if (sk) {
        const v = (id) => $(id, o).value.trim();
        Object.assign(sk, { paathPerDay: Math.max(1, Math.min(21, Math.round(+v("#o-paath")) || sk.paathPerDay)), paathMin: Math.max(8, Math.min(60, +v("#o-pmin") || 22)), days: Math.max(1, Math.min(120, +v("#o-days") || sk.days)), dayStart: Math.max(0, Math.min(6, +v("#o-ds") || 0)), name: v("#o-name"), gotra: v("#o-gotra"), dob: v("#o-dob"), wish: v("#o-wish") });
        if (S().session) S().session.target = Math.max(sk.paathPerDay, S().session.paaths?.length || 0);
      }
      save(true); applyPrefs(); o.remove(); rerender(); toast("Saved");
    };
    o.addEventListener("click", (e) => { if (e.target === o) { applyPrefs(); o.remove(); } });
  }
  function applyPrefs() { document.documentElement.style.setProperty("--mantra-scale", state.prefs.scale || 1); }
  function rerender() { applyPrefs(); if (sess) renderSession(false); else setView(view); }

  // ---------- boot ----------
  document.querySelectorAll("#tabs button").forEach((b) => b.onclick = () => setView(b.dataset.v));
  $("#b-settings").onclick = openSettings;
  $("#h-darshan img").src = A.lalita; $("#h-darshan").onclick = openDarshan;
  if (EMBED) { const x = $("#b-exit"); x.hidden = false; x.onclick = () => window.parent.postMessage({ type: "lalita:exit" }, location.origin); }
  // a session left over from an earlier day becomes a partial log
  { const s = S(); if (s.session && s.session.key !== todayKey() && s.sankalp) { if (!s.logs[s.session.key]) s.logs[s.session.key] = { status: "partial", steps: s.session.st, paaths: s.session.paaths, total: s.session.el, start: s.session.started }; s.session = null; save(); } }
  applyPrefs(); renderSync(); setView(location.hash === "#vidhi" ? "vidhi" : location.hash === "#naam" ? "naam" : location.hash === "#yatra" ? "yatra" : "home");
  setInterval(() => { if (!sess && view === "home" && S().sankalp) renderHome(); }, 60000);
  initCloud();
})();

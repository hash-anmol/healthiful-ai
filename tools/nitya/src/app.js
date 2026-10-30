// Nitya sadhana: a nightly pranayama and mantra meditation practice kept as a vow of N days.
// State, setup, home, the timed session (breath pacer, chimes, sound) and settings.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- time (a "night" runs until 4 AM, so a late sitting counts for the evening it began) ----------
  const DAY_START = 4;
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => keyOf(new Date(Date.now() - DAY_START * 3600e3));
  const keyToUTC = (k) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const diffDays = (a, b) => Math.round((keyToUTC(b) - keyToUTC(a)) / 864e5);
  const addDays = (k, n) => { const d = new Date(keyToUTC(k) + n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const fmtClock = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };
  const fmtDate = (k) => new Date(keyToUTC(k)).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "UTC" });

  // ---------- the practice ----------
  const PHASES = {
    om: { name: "Tuning in", tag: "OM", kind: "free", max: 15,
      cue: "Exhale completely. Breathe in deeply through the nose, then chant a long OM on the out-breath. Three to five, unhurried.",
      say: "Tuning in. Exhale completely. Then breathe in deeply, and chant a long Om on the out breath." },
    belly: { name: "Belly breathing", tag: "Diaphragm", kind: "pace", max: 15, pattern: [["ex", 6], ["in", 4]],
      cue: "Let the belly rise as you breathe in and soften as you breathe out. The chest stays quiet.",
      say: "Deep belly breathing. Let the belly rise and fall. Begin by breathing out." },
    sama: { name: "Sama Vritti", tag: "Equal breath", kind: "pace", max: 20, pattern: [["ex", 4], ["in", 4]],
      cue: "Four counts in, four counts out, through the nose. No holding.",
      say: "Sama vritti. Four counts in, four counts out. No holding. Begin with the exhale." },
    nadi: { name: "Nadi Shodhan", tag: "Alternate nostril", kind: "nadi", max: 20,
      cue: "Vishnu mudra: fold the index and middle fingers. The thumb closes the right nostril, the ring finger the left.",
      say: "Nadi shodhan. Form Vishnu mudra. Close the right nostril with your thumb, and breathe out fully through the left." },
    med: { name: "Swadhisthana", tag: "Mantra meditation", kind: "sit", max: 90,
      cue: "Let the breath go. Rest your awareness just below the navel. Silently repeat your mantra there, in a warm yellow light.",
      say: "Let the breath flow on its own. Bring your awareness to Svadhishthana, just below the navel, and silently repeat your mantra there." }
  };
  const ORDER = ["om", "belly", "sama", "nadi", "med"];
  const PREP = 7; // seconds at the start of a paced phase to hear the instruction and settle

  // ---------- state ----------
  const LS = "nitya-sadhana-v1";
  const fresh = () => ({
    v: 1, updatedAt: 0,
    prefs: { min: { om: 3, belly: 3, sama: 7, nadi: 7, med: 20 }, chime: 10, drone: true, nature: true, tones: true, voice: true, showTimer: false, dim: true },
    vow: null, logs: {}, history: []
  });
  let state = fresh();
  const merge = (d) => { const f = fresh(); return { ...f, ...d, prefs: { ...f.prefs, ...(d.prefs || {}), min: { ...f.prefs.min, ...((d.prefs && d.prefs.min) || {}) } } }; };
  try { const raw = localStorage.getItem(LS); if (raw) state = merge(JSON.parse(raw)); } catch (e) {}

  const EMBED = window.parent !== window;
  let cloud = false, saveTimer = null;
  function save(now) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {}
    clearTimeout(saveTimer);
    const push = () => { if (EMBED && cloud) window.parent.postMessage({ type: "nitya:save", state: JSON.parse(JSON.stringify(state)) }, location.origin); };
    if (now) push(); else saveTimer = setTimeout(push, 1200);
  }
  if (EMBED) {
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== "nitya:state") return;
      const remote = e.data.state; cloud = true;
      if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) { state = merge(remote); try { localStorage.setItem(LS, JSON.stringify(state)); } catch (err) {} if (!sess) renderHome(); }
      else if ((state.updatedAt || 0) > ((remote && remote.updatedAt) || 0)) save(true);
    });
    window.parent.postMessage({ type: "nitya:ready" }, location.origin);
  }

  const done = (k) => state.logs[k]?.status === "done";
  function status() {
    const v = state.vow; if (!v) return null;
    const today = todayKey(), notStarted = today < v.startKey;
    const dayNo = notStarted ? 0 : diffDays(v.startKey, today) + 1;
    const doneCount = Object.keys(state.logs).filter((k) => done(k) && k >= v.startKey && diffDays(v.startKey, k) < v.days).length;
    let streak = 0; for (let k = done(today) ? today : addDays(today, -1); k >= v.startKey && done(k); k = addDays(k, -1)) streak++;
    const missed = []; if (!notStarted) for (let k = v.startKey; k < today && diffDays(v.startKey, k) < v.days; k = addDays(k, 1)) if (!done(k)) missed.push(k);
    return { today, notStarted, dayNo, doneCount, streak, missed, tonight: done(today), complete: dayNo > v.days || doneCount >= v.days };
  }
  const activePhases = () => ORDER.filter((id) => state.prefs.min[id] > 0);
  const plannedMin = () => activePhases().reduce((a, id) => a + state.prefs.min[id], 0);

  // ---------- audio: tanpura, wind and river, breath tones, chimes, spoken cues ----------
  let AC = null, master = null, verb = null, droneBus = null, natureBus = null, droneTimer = null, nextPluck = 0, breathNode = null;
  function ac() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination);
      // a small generated hall, so chimes and the drone have air around them
      verb = AC.createConvolver(); const len = AC.sampleRate * 3, ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb.buffer = ir; const vg = AC.createGain(); vg.gain.value = .35; verb.connect(vg); vg.connect(master);
      droneBus = AC.createGain(); droneBus.gain.value = 0; droneBus.connect(master); droneBus.connect(verb);
      natureBus = AC.createGain(); natureBus.gain.value = 0; natureBus.connect(master);
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  const SA = 138.59; // C#3
  function pluck(f, t) {
    const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2, t + .025); g.gain.exponentialRampToValueAtTime(.0006, t + 5.2);
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.4; lp.frequency.setValueAtTime(3400, t); lp.frequency.exponentialRampToValueAtTime(850, t + 3.2);
    [1, .72, .55, .42, .3, .22, .12].forEach((a, i) => {
      const o = AC.createOscillator(), og = AC.createGain(); o.frequency.value = f * [1, 2, 3, 4, 5, 6, 8][i] * (1 + (Math.random() - .5) * .0016);
      og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 5.3);
    });
    lp.connect(g); g.connect(droneBus);
  }
  function setDrone(on) {
    if (!ac()) return;
    const t = AC.currentTime; droneBus.gain.cancelScheduledValues(t); droneBus.gain.setValueAtTime(droneBus.gain.value, t);
    droneBus.gain.linearRampToValueAtTime(on ? .11 : 0, t + (on ? 3 : 1.5));
    clearInterval(droneTimer); droneTimer = null;
    if (!on) return;
    nextPluck = Math.max(nextPluck, t + .1);
    // Pa (low), Sa, Sa, Sa (lower octave), then a breath of silence
    const cycle = [[SA * .75, 0], [SA, 1.3], [SA, 2.6], [SA / 2, 3.9]];
    droneTimer = setInterval(() => { while (nextPluck < AC.currentTime + 1.6) { cycle.forEach(([f, dt]) => pluck(f, nextPluck + dt)); nextPluck += 5.8; } }, 300);
  }
  function noiseBuffer(sec, brown) {
    const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w; }
    return b;
  }
  let natureBuilt = false;
  function setNature(on) {
    if (!ac()) return;
    if (on && !natureBuilt) {
      natureBuilt = true;
      const lfo = (f, depth, param) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); };
      // wind: brown noise, gusting slowly
      const w = AC.createBufferSource(); w.buffer = noiseBuffer(6, true); w.loop = true;
      const wl = AC.createBiquadFilter(); wl.type = "lowpass"; wl.frequency.value = 420; lfo(.05, 260, wl.frequency);
      const wg = AC.createGain(); wg.gain.value = .5; lfo(.07, .3, wg.gain); lfo(.023, .2, wg.gain);
      w.connect(wl); wl.connect(wg); wg.connect(natureBus); w.start();
      // the river far below: a soft band of white noise
      const r = AC.createBufferSource(); r.buffer = noiseBuffer(5, false); r.loop = true;
      const rb = AC.createBiquadFilter(); rb.type = "bandpass"; rb.frequency.value = 900; rb.Q.value = .7; lfo(.11, 120, rb.frequency);
      const rg = AC.createGain(); rg.gain.value = .045; r.connect(rb); rb.connect(rg); rg.connect(natureBus); r.start();
    }
    const t = AC.currentTime; natureBus.gain.cancelScheduledValues(t); natureBus.gain.setValueAtTime(natureBus.gain.value, t);
    natureBus.gain.linearRampToValueAtTime(on ? .5 : 0, t + (on ? 4 : 1.5));
  }
  // a soft tone that rises through the in-breath and falls through the out-breath; panned for the nostril
  function breathTone(dir, dur, side) {
    stopTone();
    if (!state.prefs.tones || !ac()) return;
    const t = AC.currentTime, o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
    const lo = SA * 1.5, hi = SA * 2;
    o.type = "sine"; o2.type = "triangle";
    o.frequency.setValueAtTime(dir === "in" ? lo : hi, t); o.frequency.linearRampToValueAtTime(dir === "in" ? hi : lo, t + dur);
    o2.frequency.setValueAtTime((dir === "in" ? lo : hi) / 2, t); o2.frequency.linearRampToValueAtTime((dir === "in" ? hi : lo) / 2, t + dur);
    lp.type = "lowpass"; lp.frequency.value = 900;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .6); g.gain.setValueAtTime(.05, t + Math.max(.7, dur - .7)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g);
    let out = g;
    if (side && AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = side === "L" ? -.75 : .75; g.connect(p); out = p; }
    out.connect(master); o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
    breathNode = { o, o2, g };
  }
  function stopTone() { if (!breathNode || !AC) return; const t = AC.currentTime; try { breathNode.g.gain.cancelScheduledValues(t); breathNode.g.gain.setTargetAtTime(0, t, .08); breathNode.o.stop(t + .4); breathNode.o2.stop(t + .4); } catch (e) {} breathNode = null; }
  // a sweet bell: inharmonic partials with long tails
  function chime(times = 1, base = 1046.5, gap = 2.6, vol = .16) {
    if (!ac()) return;
    for (let n = 0; n < times; n++) {
      const t = AC.currentTime + .05 + n * gap;
      [[1, 1, 6], [2.76, .45, 3.2], [5.4, .22, 1.6], [8.93, .08, .8]].forEach(([r, a, d]) => {
        const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = base * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(master); g.connect(verb); o.start(t); o.stop(t + d + .1);
      });
    }
  }
  let voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
    return vs.find((v) => /en-IN/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
  function say(text) {
    if (!state.prefs.voice || !window.speechSynthesis) return;
    try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = .86; u.pitch = .95; voice = voice || pickVoice(); if (voice) u.voice = voice; speechSynthesis.speak(u); } catch (e) {}
  }

  // ---------- wake lock and toast ----------
  let wakeLock = null;
  async function keepAwake(on) {
    try { if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener?.("release", () => (wakeLock = null)); } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sess) keepAwake(true); });
  let toastT; function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2600); }

  // =========================================================
  // SETUP: two short questions
  // =========================================================
  const setup = { step: 0, days: 40, custom: false, startOff: 0, med: 20 };
  function renderSetup(el) {
    const dots = `<div class="dots">${[0, 1].map((i) => `<i class="${i <= setup.step ? "on" : ""}"></i>`).join("")}</div>`;
    let body;
    if (setup.step === 0) {
      body = `<div class="eyebrow">Nightly practice</div><h2 class="q">How many nights is your vow?</h2>
        <div class="seg" id="f-days">${[21, 40, 108].map((n) => `<button data-n="${n}" class="${!setup.custom && setup.days === n ? "on" : ""}">${n} nights</button>`).join("")}<button data-n="custom" class="${setup.custom ? "on" : ""}">Other</button></div>
        ${setup.custom ? `<div class="field" style="max-width:180px"><label for="f-dc">Nights</label><input id="f-dc" type="number" min="1" max="365" value="${setup.days}" class="btn btn-ghost btn-sm" style="text-align:left"></div>` : ""}
        <p class="quiet">${setup.startOff ? "Begins tomorrow night." : "Begins tonight."} <button class="link" id="f-start">${setup.startOff ? "Begin tonight instead" : "Begin tomorrow instead"}</button></p>
        <button class="btn btn-primary" id="f-next">Continue</button>`;
    } else {
      const other = plannedMin() - state.prefs.min.med;
      body = `<div class="eyebrow">Meditation</div><h2 class="q">How long will you sit with the mantra?</h2>
        <div class="stepper"><button class="round" id="f-minus" aria-label="Shorter">–</button><b>${setup.med}</b><small>minutes</small><button class="round" id="f-plus" aria-label="Longer">+</button></div>
        <p class="line">With pranayama, about <b>${other + setup.med} minutes</b> each night.</p>
        <div class="row"><button class="btn btn-primary" id="f-go">Begin my vow</button><button class="link" id="f-back">Back</button></div>`;
    }
    el.innerHTML = `<div class="inner">${body}${dots}</div>`;
    el.querySelectorAll("#f-days button").forEach((b) => b.onclick = () => { if (b.dataset.n === "custom") setup.custom = true; else { setup.custom = false; setup.days = +b.dataset.n; } renderSetup(el); });
    $("#f-dc", el)?.addEventListener("input", (e) => (setup.days = Math.max(1, Math.min(365, Math.round(+e.target.value) || 1))));
    $("#f-start", el)?.addEventListener("click", () => { setup.startOff = setup.startOff ? 0 : 1; renderSetup(el); });
    $("#f-next", el)?.addEventListener("click", () => { setup.step = 1; renderSetup(el); });
    $("#f-back", el)?.addEventListener("click", () => { setup.step = 0; renderSetup(el); });
    $("#f-minus", el)?.addEventListener("click", () => { setup.med = Math.max(5, setup.med - 5); renderSetup(el); });
    $("#f-plus", el)?.addEventListener("click", () => { setup.med = Math.min(90, setup.med + 5); renderSetup(el); });
    $("#f-go", el)?.addEventListener("click", () => {
      state.prefs.min.med = setup.med;
      state.vow = { days: setup.days, startKey: addDays(todayKey(), setup.startOff), created: Date.now() };
      save(true); chime(1); toast(`Your ${setup.days}-night vow begins.`); renderHome();
    });
  }

  // =========================================================
  // HOME
  // =========================================================
  function renderHome() {
    const el = $("#home");
    window.Scene?.layout("side"); window.Scene?.view("home");
    const st = status();
    window.Scene?.setDawn(st?.tonight ? .92 : .2);
    if (!state.vow) { renderSetup(el); return; }
    const v = state.vow, mins = plannedMin();
    let line;
    if (st.complete) line = `Your ${v.days}-night vow is complete. Pranam.`;
    else if (st.notStarted) line = `Your vow begins on <b>${fmtDate(v.startKey)}</b>.`;
    else if (st.tonight) line = `Tonight is complete.${st.streak > 1 ? ` <b>${st.streak}</b> nights in a row.` : ""}`;
    else line = `Tonight's practice, about <b>${mins} minutes</b>.${st.streak ? ` ${st.streak} ${st.streak === 1 ? "night" : "nights"} in a row.` : ""}`;
    const lamps = Array.from({ length: v.days }, (_, i) => { const k = addDays(v.startKey, i); return `<i class="${done(k) ? "lit" : k < st.today ? "miss" : ""} ${k === st.today ? "today" : ""}" title="${fmtDate(k)}"></i>`; }).join("");
    const btn = st.complete ? `<button class="btn btn-primary" id="h-new">Take a new vow</button>`
      : st.tonight ? `<button class="btn btn-ghost" id="h-go">Sit again</button>`
      : `<button class="btn btn-primary" id="h-go">Begin</button>`;
    const list = activePhases().map((id) => `<div><span>${esc(PHASES[id].name)} <span style="color:var(--muted)">· ${esc(PHASES[id].tag)}</span></span><i>${state.prefs.min[id]} min</i></div>`).join("");
    el.innerHTML = `<div class="inner">
      <div class="eyebrow">Nitya pranayama · Swadhisthana</div>
      <div class="day"><b>${st.notStarted ? "Night 0" : `Night ${Math.min(st.dayNo, v.days)}`}</b><span>of ${v.days}</span></div>
      <p class="line">${line}</p>
      ${st.missed.length && !st.complete ? `<p class="quiet">${st.missed.length === 1 ? `You missed ${fmtDate(st.missed[0])}.` : `You missed ${st.missed.length} nights.`} Carry on tonight, or restart the vow in Settings.</p>` : ""}
      ${btn}
      <div class="lamps" aria-label="${st.doneCount} of ${v.days} nights complete">${lamps}</div>
      <details class="tonight"><summary>Tonight's practice</summary><div class="plist">${list}</div></details>
      ${!st.tonight && !st.notStarted && !st.complete ? `<button class="link" id="h-mark">Practised without the app? Mark tonight as done</button>` : ""}
    </div>`;
    $("#h-go", el)?.addEventListener("click", begin);
    $("#h-new", el)?.addEventListener("click", () => openRestart(true));
    $("#h-mark", el)?.addEventListener("click", () => confirmBox("Mark tonight as done?", "Use this when you sat without the app. It keeps your streak.", "Mark as done", () => { state.logs[todayKey()] = { status: "done", start: Date.now(), dur: 0, manual: true }; save(true); renderHome(); toast("Tonight marked as done."); }));
  }

  // =========================================================
  // SESSION
  // =========================================================
  let sess = null, tickT = null;
  // the timeline of one phase: breath segments for paced phases, chime times for the meditation
  function buildPhase(id) {
    const ph = PHASES[id], target = state.prefs.min[id] * 60;
    const p = { id, kind: ph.kind, segs: [], chimes: [], dur: target };
    if (ph.kind === "pace") {
      let t = PREP, i = 0; while (t < target) { const [dir, d] = ph.pattern[i % ph.pattern.length]; p.segs.push({ t, d, dir }); t += d; i++; }
      // finish on an exhale
      if (p.segs.length && p.segs[p.segs.length - 1].dir !== "ex") { p.segs.push({ t, d: ph.pattern[0][1], dir: "ex" }); t += ph.pattern[0][1]; }
      p.dur = t;
    } else if (ph.kind === "nadi") {
      // start: out through the left; then in left, out right, in right, out left; always end out through the left
      let t = PREP; p.segs.push({ t, d: 4, dir: "ex", side: "L" }); t += 4;
      const cyc = [["in", "L"], ["ex", "R"], ["in", "R"], ["ex", "L"]];
      while (t < target) for (const [dir, side] of cyc) { p.segs.push({ t, d: 4, dir, side }); t += 4; }
      p.dur = t;
    } else if (ph.kind === "sit" && state.prefs.chime) {
      for (let c = state.prefs.chime * 60; c < target - 20; c += state.prefs.chime * 60) p.chimes.push(c);
    }
    return p;
  }
  function begin() {
    ac(); // unlock audio inside the tap
    const plan = activePhases().map(buildPhase); let t0 = 0; plan.forEach((p) => { p.t0 = t0; t0 += p.dur; });
    sess = { plan, total: t0, acc: 0, runStart: performance.now(), paused: false, pi: -1, si: -1, ci: 0, startedAt: Date.now(), dimmed: false, lastTouch: 0 };
    setDrone(state.prefs.drone); setNature(state.prefs.nature); keepAwake(true);
    window.Scene?.layout("side"); window.Scene?.setDawn(.04, true);
    $("#app").hidden = true; const root = $("#session"); root.hidden = false;
    root.innerHTML = `<div class="s-top"><button class="icon-btn" id="s-x" aria-label="End"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="track">${plan.map((p) => `<span style="flex:${p.dur}"><i></i></span>`).join("")}</div><span class="clock" id="s-clock"></span></div>
      <div class="stage" id="s-stage"></div>`;
    $("#s-x").onclick = endBox;
    tick(); clearInterval(tickT); tickT = setInterval(tick, 100);
  }
  const elapsed = () => sess.acc + (sess.paused ? 0 : (performance.now() - sess.runStart) / 1000);

  function enterPhase(i) {
    const p = sess.plan[i], ph = PHASES[p.id];
    sess.pi = i; sess.si = -1; sess.ci = 0;
    window.Scene?.view(p.kind === "sit" ? "meditate" : "session");
    const stage = $("#s-stage"); const paced = p.kind === "pace" || p.kind === "nadi";
    stage.innerHTML = `<h2 class="ph-name"><small>${esc(ph.tag)}</small>${esc(ph.name)}</h2>
      ${paced ? `<div class="pacer-wrap"><span class="nost" id="n-L" ${p.kind === "nadi" ? "" : "hidden"}>L</span>
        <div class="pacer"><div class="ring" id="p-ring"></div><div class="core"><b id="p-word">Settle</b><span id="p-count">&nbsp;</span></div></div>
        <span class="nost" id="n-R" ${p.kind === "nadi" ? "" : "hidden"}>R</span></div>`
        : p.kind === "sit" ? `<div class="orb" aria-hidden="true"></div>` : ""}
      <p class="cue" id="s-cue">${esc(ph.cue)}</p>
      <div class="s-foot"><button class="btn btn-ghost btn-sm" id="s-pause">Pause</button>${i < sess.plan.length - 1 ? `<button class="link" id="s-skip">Next</button>` : ""}</div>`;
    $("#s-pause").onclick = togglePause;
    $("#s-skip")?.addEventListener("click", () => skipTo(i + 1));
    if (i > 0) chime(1, 784, 0, .12);
    say(ph.say);
    if (p.kind !== "sit") window.Scene?.breath(0);
    if (p.kind === "sit") { window.Scene?.breath(.5); sess.lastTouch = performance.now(); }
  }
  function applySeg(s, remaining) {
    const ring = $("#p-ring"); if (!ring) return;
    ring.style.transition = `transform ${remaining}s cubic-bezier(.42,0,.58,1)`;
    ring.style.transform = s.dir === "in" ? "scale(1)" : "scale(.5)";
    $("#p-word").textContent = s.dir === "in" ? "Breathe in" : "Breathe out";
    if (s.side) {
      $("#n-L").classList.toggle("on", s.side === "L"); $("#n-R").classList.toggle("on", s.side === "R");
      $("#s-cue").textContent = `${s.dir === "in" ? "In" : "Out"} through the ${s.side === "L" ? "left" : "right"} nostril.${s.side === "L" ? " Thumb closes the right." : " Ring finger closes the left."}`;
    }
    window.Scene?.breath(s.dir === "in" ? 1 : 0);
    breathTone(s.dir, remaining, s.side);
  }
  function tick() {
    if (!sess) return;
    const e = elapsed();
    if (e >= sess.total) return finish();
    let i = sess.plan.length - 1; while (i > 0 && e < sess.plan[i].t0) i--;
    if (i !== sess.pi) enterPhase(i);
    const p = sess.plan[i], pe = e - p.t0;
    if (p.segs.length && pe >= PREP && !sess.paused) {
      let si = sess.si < 0 ? 0 : sess.si; while (si < p.segs.length - 1 && pe >= p.segs[si + 1].t) si++;
      const s = p.segs[si];
      if (si !== sess.si) { sess.si = si; applySeg(s, s.t + s.d - pe); }
      const cnt = $("#p-count"); if (cnt) cnt.textContent = String(Math.min(s.d, Math.floor(pe - s.t) + 1));
    }
    if (p.kind === "sit") {
      if (sess.ci < p.chimes.length && pe >= p.chimes[sess.ci]) { sess.ci++; chime(1); }
      // dim the screen while sitting; a tap brings it back for a few seconds
      if (state.prefs.dim && !sess.dimmed && !sess.paused && performance.now() - sess.lastTouch > 12000) { sess.dimmed = true; $("#dim").hidden = false; }
    }
    // track, clock and the slow sunrise
    sess.plan.forEach((q, k) => { const f = k < i ? 1 : k > i ? 0 : Math.min(1, (e - q.t0) / q.dur); const bar = $("#session .track span:nth-child(" + (k + 1) + ") i"); if (bar) bar.style.width = (f * 100).toFixed(1) + "%"; });
    const clock = $("#s-clock"); if (clock) clock.textContent = p.kind === "sit" && !state.prefs.showTimer ? "" : fmtClock(sess.total - e);
    window.Scene?.setDawn(.04 + .96 * (e / sess.total));
  }
  function togglePause() {
    if (!sess) return;
    if (sess.paused) { sess.paused = false; sess.runStart = performance.now(); sess.si = -1; $("#s-pause").textContent = "Pause"; setDrone(state.prefs.drone); }
    else {
      sess.acc = elapsed(); sess.paused = true; stopTone(); window.speechSynthesis?.cancel();
      const ring = $("#p-ring"); if (ring) { ring.style.transform = getComputedStyle(ring).transform; ring.style.transition = "none"; }
      $("#s-pause").textContent = "Resume"; if ($("#p-word")) $("#p-word").textContent = "Paused";
    }
  }
  function skipTo(i) { if (!sess || !sess.plan[i]) return; sess.acc = sess.plan[i].t0; sess.runStart = performance.now(); sess.paused = false; stopTone(); tick(); }
  function stopSession() {
    clearInterval(tickT); tickT = null; stopTone(); window.speechSynthesis?.cancel(); setDrone(false); setNature(false); keepAwake(false);
    $("#session").hidden = true; $("#session").innerHTML = ""; $("#dim").hidden = true; $("#app").hidden = false;
  }
  function record(full) {
    const k = todayKey(), e = Math.round(elapsed());
    const phases = {}; sess.plan.forEach((p) => { phases[p.id] = Math.round(Math.max(0, Math.min(p.dur, e - p.t0))); });
    if (done(k)) { (state.logs[k].extra = state.logs[k].extra || []).push({ start: sess.startedAt, dur: e }); }
    else state.logs[k] = { status: "done", start: sess.startedAt, dur: e, phases, partial: !full };
    save(true);
  }
  function finish() {
    clearInterval(tickT); tickT = null; stopTone(); $("#dim").hidden = true;
    window.Scene?.setDawn(1); window.Scene?.breath(.6);
    chime(3);
    $("#s-stage").innerHTML = `<h2 class="ph-name"><small>Complete</small>Sit for a moment</h2>
      <p class="cue">Let the mantra settle. Offer the practice at your guru's feet.</p>
      <div class="s-foot"><button class="btn btn-primary" id="s-done">Complete tonight</button></div>`;
    $("#s-clock").textContent = "";
    $("#s-done").onclick = () => { record(true); const n = status()?.streak || 0; stopSession(); renderHome(); toast(n > 1 ? `${n} nights in a row.` : "Tonight is complete."); };
    $("#s-x").onclick = () => $("#s-done").click();
  }
  function endBox() {
    if (!sess) return;
    const e = elapsed(), far = e >= sess.total * .75;
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>End tonight's practice?</h2>
      <p>${far ? "You are most of the way through. You can count tonight." : "Tonight will not be counted."}</p>
      <div class="col">${far ? `<button class="btn btn-primary btn-sm" id="e-count">End and count tonight</button>` : ""}<button class="btn btn-ghost btn-sm" id="e-end">End</button><button class="link" id="e-keep">Keep going</button></div></div>`;
    document.body.appendChild(o);
    $("#e-keep", o).onclick = () => o.remove();
    $("#e-end", o).onclick = () => { o.remove(); stopSession(); renderHome(); };
    $("#e-count", o)?.addEventListener("click", () => { o.remove(); record(false); stopSession(); renderHome(); toast("Tonight is counted."); });
  }
  // a tap while dimmed brings the screen back; it dims again after a while
  $("#dim").addEventListener("click", () => { if (!sess) return; sess.dimmed = false; sess.lastTouch = performance.now(); $("#dim").hidden = true; });
  document.addEventListener("pointerdown", () => { if (sess) sess.lastTouch = performance.now(); }, true);

  // =========================================================
  // SETTINGS
  // =========================================================
  function confirmBox(title, body, yes, onYes) {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(body)}</p><div class="row"><button class="btn btn-primary btn-sm" id="c-y">${esc(yes)}</button><button class="link" id="c-n">Cancel</button></div></div>`;
    document.body.appendChild(o);
    $("#c-n", o).onclick = () => o.remove(); $("#c-y", o).onclick = () => { o.remove(); onYes(); };
  }
  function archive() { const st = status(); if (state.vow && st?.doneCount) state.history.push({ startKey: state.vow.startKey, endKey: todayKey(), days: state.vow.days, done: st.doneCount }); }
  function openRestart(fromComplete, settings) {
    const st = status(), v = state.vow;
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>${fromComplete ? "A new vow" : "Restart your vow?"}</h2>
      <p>${!fromComplete && st?.doneCount ? `You have completed ${st.doneCount} of ${v.days} nights. ` : ""}${fromComplete ? "" : "Your streak goes back to zero. "}The earlier vow is kept in your history.</p>
      <div class="col"><button class="btn btn-primary btn-sm" id="r-same">Begin again from night 1 (${v.days} nights)</button><button class="btn btn-ghost btn-sm" id="r-new">Choose a different length</button><button class="link" id="r-n">${fromComplete ? "Not now" : "Keep going"}</button></div></div>`;
    document.body.appendChild(o);
    const close = () => { o.remove(); settings?.remove(); };
    $("#r-n", o).onclick = () => o.remove();
    $("#r-same", o).onclick = () => { close(); archive(); delete state.logs[todayKey()]; state.vow = { ...v, startKey: todayKey(), created: Date.now() }; save(true); renderHome(); toast("Night 1 begins tonight."); };
    $("#r-new", o).onclick = () => { close(); archive(); delete state.logs[todayKey()]; Object.assign(setup, { step: 0, days: v.days, custom: ![21, 40, 108].includes(v.days), startOff: 0, med: state.prefs.min.med }); state.vow = null; save(true); renderHome(); };
  }
  function openSettings() {
    const p = state.prefs;
    const o = document.createElement("div"); o.className = "overlay";
    const sw = (id, on, label, sub) => `<div class="toggle"><span class="lbl">${label}${sub ? `<br><small class="hint">${sub}</small>` : ""}</span><button class="sw ${on ? "on" : ""}" id="${id}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}"></button></div>`;
    const mins = () => ORDER.map((id) => `<div class="prow"><span class="lbl">${esc(PHASES[id].name)}<small>${esc(PHASES[id].tag)}</small></span><span class="mini"><button data-id="${id}" data-d="-1" aria-label="Less">–</button><b>${p.min[id] ? p.min[id] + " min" : "Off"}</b><button data-id="${id}" data-d="1" aria-label="More">+</button></span></div>`).join("");
    o.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>Settings</h2>
      <div class="sec"><h3>Tonight's practice</h3><div id="o-mins" class="col" style="align-items:stretch">${mins()}</div><p class="hint" id="o-total">About ${plannedMin()} minutes in all.</p></div>
      <div class="sec"><h3>During meditation</h3>
        <div class="field"><label>Soft chime every</label><div class="seg" id="o-chime">${[0, 5, 10, 15].map((n) => `<button data-n="${n}" class="${p.chime === n ? "on" : ""}">${n ? n + " min" : "Off"}</button>`).join("")}</div></div>
        <p class="hint">A sweet chime always marks the end.</p>
        ${sw("o-timer", p.showTimer, "Show the timer")}${sw("o-dim", p.dim, "Dim the screen", "Tap to bring it back")}</div>
      <div class="sec"><h3>Sound</h3>${sw("o-drone", p.drone, "Tanpura")}${sw("o-nature", p.nature, "Wind and river")}${sw("o-tones", p.tones, "Breath tones", "Rise on the in-breath, fall on the out-breath; left or right ear in Nadi Shodhan")}${sw("o-voice", p.voice, "Spoken guidance", "Each phase is announced, so you can keep your eyes closed")}</div>
      ${state.vow ? `<div class="sec"><h3>Your vow</h3><p class="hint">${state.vow.days} nights, from ${fmtDate(state.vow.startKey)}.</p><button class="btn btn-ghost btn-sm" id="o-restart">Restart or change the vow</button></div>` : ""}
      <div class="sec"><h3>Image credit</h3><p class="hint">Sri Yantra: artwork by Daniel Conrad under the direction of Harish Johari (1974), public domain, via Wikimedia Commons.</p></div>
      <button class="btn btn-primary" id="o-ok">Done</button></div>`;
    document.body.appendChild(o);
    const bindMins = () => o.querySelectorAll("#o-mins button").forEach((b) => b.onclick = () => {
      const id = b.dataset.id, step = id === "med" ? 5 : 1, lo = id === "med" ? 5 : 0;
      p.min[id] = Math.max(lo, Math.min(PHASES[id].max, p.min[id] + step * +b.dataset.d));
      $("#o-mins", o).innerHTML = mins(); $("#o-total", o).textContent = `About ${plannedMin()} minutes in all.`; bindMins();
    });
    bindMins();
    o.querySelectorAll("#o-chime button").forEach((b) => b.onclick = () => { p.chime = +b.dataset.n; o.querySelectorAll("#o-chime button").forEach((x) => x.classList.toggle("on", x === b)); if (p.chime) chime(1); });
    const tg = (id, key, after) => { $("#" + id, o).onclick = (e) => { p[key] = !p[key]; e.currentTarget.classList.toggle("on", p[key]); e.currentTarget.setAttribute("aria-checked", p[key]); after?.(); }; };
    tg("o-timer", "showTimer"); tg("o-dim", "dim"); tg("o-drone", "drone"); tg("o-nature", "nature"); tg("o-tones", "tones"); tg("o-voice", "voice", () => p.voice && say("Spoken guidance is on."));
    $("#o-restart", o)?.addEventListener("click", () => openRestart(false, o));
    $("#o-ok", o).onclick = () => { save(true); o.remove(); if (!sess) renderHome(); };
  }

  // ---------- boot ----------
  $("#b-settings").onclick = openSettings;
  if (EMBED) { $("#b-exit").hidden = false; $("#b-exit").onclick = () => window.parent.postMessage({ type: "nitya:exit" }, location.origin); }
  renderHome();
  setInterval(() => { if (!sess && state.vow) renderHome(); }, 60000);
})();

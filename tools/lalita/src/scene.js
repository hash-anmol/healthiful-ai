// Kutiya: a mud-and-thatch hut with a wooden ghar-mandir, built from primitives and canvas textures.
// Exposes window.Hut = { goto, set, fx, ringBell, setDays, lightNewDay, layout }
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("scene");
  const dpr = window.devicePixelRatio || 1;
  let renderer;
  try {
    // retina screens already hide jagged edges; multisampling there costs a lot for little gain
    renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, powerPreference: "high-performance" });
  } catch (e) { window.Hut = null; return; }
  renderer.setPixelRatio(Math.min(dpr, 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0607);
  scene.fog = new THREE.FogExp2(0x0b0607, 0.07);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 60);

  // ---------- canvas texture helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  function cvs(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function noise(g, w, h, n, cols, rmin, rmax, a) {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = a * Math.random(); g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(rmin, rmax), rnd(rmin, rmax) * rnd(.4, 1), rnd(0, 3), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
  const mudTex = cvs(512, 512, (g, w, h) => {
    g.fillStyle = "#9a6a45"; g.fillRect(0, 0, w, h);
    noise(g, w, h, 900, ["#b07a4f", "#86593a", "#a36f48", "#c08a5c", "#7a4f33"], 4, 30, .35);
    g.strokeStyle = "rgba(60,35,20,.25)"; g.lineWidth = 1;
    for (let i = 0; i < 60; i++) { g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rnd(-20, 20), w * .6, y + rnd(-20, 20), w, y + rnd(-10, 10)); g.stroke(); }
  });
  mudTex.wrapS = mudTex.wrapT = THREE.RepeatWrapping; mudTex.repeat.set(3, 1.5);
  // geru band with white mandana dots for the lower wall
  const geruTex = cvs(1024, 128, (g, w, h) => {
    g.fillStyle = "#8a3220"; g.fillRect(0, 0, w, h);
    noise(g, w, h, 300, ["#9b3b26", "#73281a", "#a2442b"], 3, 16, .4);
    g.fillStyle = "#efe2c8"; g.fillRect(0, 6, w, 4);
    for (let x = 16; x < w; x += 32) {
      g.beginPath(); g.arc(x, 34, 4, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - 12, 62); g.lineTo(x, 46); g.lineTo(x + 12, 62); g.closePath(); g.globalAlpha = .9; g.fill(); g.globalAlpha = 1;
    }
  });
  geruTex.wrapS = THREE.RepeatWrapping; geruTex.repeat.set(3, 1);
  const floorTex = cvs(512, 512, (g, w, h) => {
    g.fillStyle = "#4e3a28"; g.fillRect(0, 0, w, h);
    noise(g, w, h, 600, ["#5c4630", "#43311f", "#5a4a2e", "#3b2b1b"], 6, 40, .4);
    g.strokeStyle = "rgba(30,20,10,.35)"; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(20, 70), rnd(0, 3), rnd(3, 6)); g.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 4);
  const thatchTex = cvs(512, 512, (g, w, h) => {
    g.fillStyle = "#5a4322"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.strokeStyle = ["#8a6a35", "#6e5229", "#a07d43", "#4a3619"][i % 4]; g.globalAlpha = rnd(.3, .9); g.lineWidth = rnd(1, 2.5);
      const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-6, 6), y + rnd(30, 80)); g.stroke();
    }
    g.globalAlpha = 1;
  });
  thatchTex.wrapS = thatchTex.wrapT = THREE.RepeatWrapping; thatchTex.repeat.set(4, 2);
  const woodTex = cvs(256, 512, (g, w, h) => {
    g.fillStyle = "#5b3519"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${rnd(30, 60)},${rnd(15, 30)},8,${rnd(.2, .6)})`; g.lineWidth = rnd(1, 3); const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd(-10, 10), h * .3, x + rnd(-10, 10), h * .7, x + rnd(-6, 6), h); g.stroke(); }
  });
  const doorTex = cvs(256, 480, (g, w, h) => {
    g.fillStyle = "#6a3a17"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(40,18,6,${rnd(.2, .5)})`; g.lineWidth = rnd(1, 2); const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rnd(-8, 8), h); g.stroke(); }
    g.strokeStyle = "#d9a94e"; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36);
    g.lineWidth = 3; g.strokeRect(36, 36, w - 72, h - 72);
    g.fillStyle = "#d9a94e"; g.save(); g.translate(w / 2, h / 2);
    for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, -30, 10, 26, 0, 0, 7); g.fill(); }
    g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fillStyle = "#b8321f"; g.fill(); g.restore();
  });
  const clothTex = cvs(256, 256, (g, w, h) => {
    g.fillStyle = "#a3201a"; g.fillRect(0, 0, w, h);
    noise(g, w, h, 200, ["#b72a22", "#8a1813"], 4, 18, .3);
    g.fillStyle = "#e3b04b"; g.fillRect(0, h - 26, w, 6); g.fillRect(0, h - 14, w, 3);
    for (let x = 6; x < w; x += 16) { g.beginPath(); g.arc(x, h - 34, 3, 0, 7); g.fill(); }
  });
  // Sri Yantra and Lalita portrait are real images (see window.SADHANA_ASSETS), not drawn here.
  const ASSETS = window.SADHANA_ASSETS || {};
  const loadTex = (src) => { const t = new THREE.TextureLoader().load(src); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; };
  const yantraTex = loadTex(ASSETS.yantra);
  const lalitaTex = loadTex(ASSETS.lalita);
  const ganeshTex = cvs(512, 512, (g, W) => {
    const c = W / 2; const grad = g.createRadialGradient(c, c, 20, c, c, c); grad.addColorStop(0, "#e2551f"); grad.addColorStop(1, "#8c2511");
    g.fillStyle = grad; g.beginPath(); g.arc(c, c, c - 6, 0, 7); g.fill();
    g.strokeStyle = "#f2c25f"; g.lineWidth = 12; g.beginPath(); g.arc(c, c, c - 14, 0, 7); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(c, c, c - 36, 0, 7); g.stroke();
    g.fillStyle = "#ffe7a6"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "220px 'Tiro Devanagari Sanskrit', 'Kohinoor Devanagari', serif"; g.fillText("गं", c, c - 10);
    g.font = "44px 'Tiro Devanagari Sanskrit', 'Kohinoor Devanagari', serif"; g.fillText("श्री गणेशाय नमः", c, c + 150);
  });
  const radial = (stops) => cvs(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const flameTex = cvs(128, 256, (g) => {
    const gr = g.createRadialGradient(64, 170, 4, 64, 150, 110);
    gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(.25, "rgba(255,220,120,.95)"); gr.addColorStop(.55, "rgba(255,130,30,.6)"); gr.addColorStop(1, "rgba(255,80,0,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(64, 10); g.bezierCurveTo(118, 120, 104, 236, 64, 240); g.bezierCurveTo(24, 236, 10, 120, 64, 10); g.fill();
  });
  const glowTex = radial([[0, "rgba(255,200,110,.9)"], [.3, "rgba(255,150,60,.35)"], [1, "rgba(255,120,40,0)"]]);
  const softTex = radial([[0, "rgba(255,255,255,1)"], [.4, "rgba(255,255,255,.5)"], [1, "rgba(255,255,255,0)"]]);
  const smokeTex = radial([[0, "rgba(220,215,210,.55)"], [.5, "rgba(200,195,190,.2)"], [1, "rgba(200,195,190,0)"]]);
  const petalTex = cvs(64, 96, (g) => { g.fillStyle = "#fff"; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(62, 30, 58, 80, 32, 92); g.bezierCurveTo(6, 80, 2, 30, 32, 4); g.fill(); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(31, 10, 2, 76); });
  const skyTex = cvs(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0d1a33"); gr.addColorStop(1, "#2a3a5c"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; for (let i = 0; i < 70; i++) { g.globalAlpha = Math.random(); g.fillRect(Math.random() * w, Math.random() * h * .8, 1.5, 1.5); }
    g.globalAlpha = 1; const m = g.createRadialGradient(180, 60, 2, 180, 60, 40); m.addColorStop(0, "#fffbe8"); m.addColorStop(.3, "rgba(255,250,220,.6)"); m.addColorStop(1, "rgba(255,250,220,0)"); g.fillStyle = m; g.fillRect(0, 0, w, h);
  });
  const rangoliTex = cvs(512, 512, (g, W) => {
    const c = W / 2; g.clearRect(0, 0, W, W);
    const ring = (n, r, rr, col) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, rr * .45, rr, 0, 0, 7); g.fill(); g.restore(); } };
    g.fillStyle = "rgba(240,230,210,.85)"; g.beginPath(); g.arc(c, c, 236, 0, 7); g.fill();
    g.fillStyle = "#b5271c"; g.beginPath(); g.arc(c, c, 226, 0, 7); g.fill();
    ring(24, 190, 30, "#f0a92e"); ring(16, 130, 34, "#f5e9cf"); ring(12, 80, 26, "#2f7a3b");
    g.fillStyle = "#f0a92e"; g.beginPath(); g.arc(c, c, 44, 0, 7); g.fill();
    g.fillStyle = "#f5e9cf"; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * 214, c + Math.sin(a) * 214, 4, 0, 7); g.fill(); }
  });

  // ---------- materials ----------
  const M = {
    mud: new THREE.MeshStandardMaterial({ map: mudTex, roughness: 1 }),
    geru: new THREE.MeshStandardMaterial({ map: geruTex, roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1 }),
    thatch: new THREE.MeshStandardMaterial({ map: thatchTex, roughness: 1, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: .8 }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0x7a5a2c, roughness: .7 }),
    cloth: new THREE.MeshStandardMaterial({ map: clothTex, roughness: .95 }),
    door: new THREE.MeshStandardMaterial({ map: doorTex, roughness: .7 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: .85, roughness: .32, emissive: 0x000000 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb8643a, metalness: .85, roughness: .35 }),
    clay: new THREE.MeshStandardMaterial({ color: 0x9a4a24, roughness: .9 }),
    chandan: new THREE.MeshStandardMaterial({ color: 0xe9cf9a, roughness: .9, emissive: 0x000000 }),
    asan: new THREE.MeshStandardMaterial({ color: 0x9e1b17, roughness: 1 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x4a0c0a, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: .6, side: THREE.DoubleSide }),
    sweet: new THREE.MeshStandardMaterial({ color: 0xf2dfb4, roughness: .7, emissive: 0x000000 })
  };
  const add = (geo, mat, x, y, z, parent = scene, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) { m.castShadow = true; m.receiveShadow = true; } parent.add(m); return m; };

  // ---------- hut ----------
  const floor = add(new THREE.PlaneGeometry(9, 9), M.floor, 0, 0, -1, scene); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallH = 2.6;
  const back = add(new THREE.PlaneGeometry(7, wallH), M.mud, 0, wallH / 2, -3); back.castShadow = false;
  const backG = add(new THREE.PlaneGeometry(7, .38), M.geru, 0, .19, -2.99); backG.castShadow = false;
  const left = add(new THREE.PlaneGeometry(6, wallH), M.mud, -3.2, wallH / 2, -0.2); left.rotation.y = Math.PI / 2; left.castShadow = false;
  const leftG = add(new THREE.PlaneGeometry(6, .38), M.geru, -3.19, .19, -0.2); leftG.rotation.y = Math.PI / 2;
  const right = add(new THREE.PlaneGeometry(6, wallH), M.mud, 3.2, wallH / 2, -0.2); right.rotation.y = -Math.PI / 2; right.castShadow = false;
  const rightG = add(new THREE.PlaneGeometry(6, .38), M.geru, 3.19, .19, -0.2); rightG.rotation.y = -Math.PI / 2;
  // sloped thatch roof, ridge along x
  const roofA = add(new THREE.PlaneGeometry(7.2, 3.6), M.thatch, 0, 3.15, -1.7); roofA.rotation.x = Math.PI / 2 + .55; roofA.castShadow = false;
  const roofB = add(new THREE.PlaneGeometry(7.2, 3.6), M.thatch, 0, 3.15, 1.4); roofB.rotation.x = Math.PI / 2 - .55; roofB.castShadow = false;
  for (const z of [-2.6, -1.4, -0.2]) { const b = add(new THREE.CylinderGeometry(.05, .05, 7, 8), M.bamboo, 0, z === -0.2 ? 3.55 : 2.6 + (z + 2.6) * .55, z); b.rotation.z = Math.PI / 2; }
  for (const x of [-2.4, -0.8, 0.8, 2.4]) { const r = add(new THREE.CylinderGeometry(.035, .035, 3.4, 6), M.bamboo, x, 3.05, -1.4); r.rotation.x = -1.02; }
  // window with moonlit sky on the left wall
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .8), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(-3.18, 1.55, -1.3); sky.rotation.y = Math.PI / 2; scene.add(sky);
  for (let i = -2; i <= 2; i++) add(new THREE.CylinderGeometry(.018, .018, .82, 6), M.bamboo, -3.15, 1.55, -1.3 + i * .22);
  const winFrame = (w, h, x, y, z) => { add(new THREE.BoxGeometry(.08, .08, w + .1), M.wood, x, y + h / 2, z); add(new THREE.BoxGeometry(.08, .08, w + .1), M.wood, x, y - h / 2, z); };
  winFrame(1.1, .8, -3.15, 1.55, -1.3);
  // a wall niche shelf on the right wall with a clay pot
  add(new THREE.BoxGeometry(.3, .05, .9), M.wood, 3.05, 1.1, -1.6);
  add(new THREE.SphereGeometry(.14, 16, 12), M.clay, 3.02, 1.27, -1.8);
  add(new THREE.CylinderGeometry(.06, .09, .1, 12), M.clay, 3.02, 1.43, -1.8);

  // ---------- altar: chowki + red cloth ----------
  const chowkiZ = -2.3;
  add(new THREE.BoxGeometry(2.0, .08, .8), M.wood, 0, .46, chowkiZ);
  for (const [x, z] of [[-.92, -.35], [.92, -.35], [-.92, .35], [.92, .35]]) add(new THREE.BoxGeometry(.08, .42, .08), M.wood, x, .21, chowkiZ + z);
  const cloth = add(new THREE.BoxGeometry(2.04, .012, .84), M.cloth, 0, .506, chowkiZ);
  const drape = add(new THREE.PlaneGeometry(2.04, .3), M.cloth, 0, .36, chowkiZ + .421); drape.castShadow = false;

  // ---------- ghar-mandir ----------
  const mandir = new THREE.Group(); scene.add(mandir);
  const mz = -2.45, mw = .9, mh = .95, md = .45, my0 = .52;
  add(new THREE.BoxGeometry(mw + .1, .06, md + .1), M.wood, 0, my0 + .03, mz, mandir);
  add(new THREE.BoxGeometry(mw, mh, .03), M.inner, 0, my0 + .06 + mh / 2, mz - md / 2, mandir);
  add(new THREE.BoxGeometry(.04, mh, md), M.wood, -mw / 2, my0 + .06 + mh / 2, mz, mandir);
  add(new THREE.BoxGeometry(.04, mh, md), M.wood, mw / 2, my0 + .06 + mh / 2, mz, mandir);
  add(new THREE.BoxGeometry(mw + .12, .07, md + .12), M.wood, 0, my0 + .06 + mh + .035, mz, mandir);
  const shik = add(new THREE.ConeGeometry(.5, .5, 4), M.wood, 0, my0 + mh + .36, mz, mandir); shik.rotation.y = Math.PI / 4; shik.scale.z = .7;
  add(new THREE.SphereGeometry(.05, 16, 12), M.brass, 0, my0 + mh + .64, mz, mandir);
  add(new THREE.ConeGeometry(.025, .09, 12), M.brass, 0, my0 + mh + .72, mz, mandir);
  // Sri Yantra inside
  const yantra = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), new THREE.MeshBasicMaterial({ map: yantraTex, color: 0xb0a090 }));
  yantra.position.set(0, my0 + .06 + mh / 2 + .03, mz - md / 2 + .02); mandir.add(yantra);
  { const yb = .62 / 2 + .012; [[0, yb, .64, .02], [0, -yb, .64, .02], [yb, 0, .02, .64], [-yb, 0, .02, .64]].forEach(([x, y, w, h]) => add(new THREE.BoxGeometry(w, h, .02), M.brass, x, yantra.position.y + y, yantra.position.z + .004, mandir)); }
  const yGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .25 }));
  yGlow.scale.set(1.3, 1.3, 1); yGlow.position.copy(yantra.position).add(new THREE.Vector3(0, 0, .05)); mandir.add(yGlow);
  const yLight = new THREE.PointLight(0xff5a30, .4, 2.2, 2); yLight.position.set(0, 1.0, mz + .05); scene.add(yLight);
  // doors (hinged)
  const doors = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * mw / 2, my0 + .06 + mh / 2, mz + md / 2 + .015); mandir.add(pivot);
    const d = add(new THREE.BoxGeometry(mw / 2 - .01, mh - .04, .025), M.door, -side * (mw / 4), 0, 0, pivot);
    add(new THREE.SphereGeometry(.018, 10, 8), M.brass, -side * (mw / 2 - .07), 0, .02, pivot);
    pivot.userData = { side, open: 1, target: 1 }; doors.push(pivot);
  }
  // garland (marigold toran)
  const garlandGeo = new THREE.SphereGeometry(.028, 8, 6);
  const gPts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = -.5 + t, y = 1.56 - Math.sin(t * Math.PI) * .1; gPts.push([x, y, mz + md / 2 + .07]); }
  for (const s of [-1, 1]) for (let i = 0; i < 10; i++) gPts.push([s * .5, 1.53 - i * .045, mz + md / 2 + .07]);
  const garland = new THREE.InstancedMesh(garlandGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), gPts.length);
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
  gPts.forEach((p, i) => { tmpM.makeTranslation(...p); garland.setMatrixAt(i, tmpM); garland.setColorAt(i, tmpC.set(i % 3 === 0 ? 0xffb21a : i % 3 === 1 ? 0xff8a10 : 0xffcf3a)); });
  garland.castShadow = true; scene.add(garland);

  // Framed portrait of Mother Lalita on the back wall, with a marigold garland
  {
    const pw = .62, ph = .62 * (1260 / 960), px = -1.42, py = 1.52, pz = -2.965;
    const portrait = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: lalitaTex, roughness: .7, emissive: 0xffffff, emissiveMap: lalitaTex, emissiveIntensity: .28 }));
    portrait.position.set(px, py, pz); scene.add(portrait);
    const fr = .05;
    add(new THREE.BoxGeometry(pw + fr * 2, fr, .05), M.brass, px, py + ph / 2 + fr / 2, pz + .01);
    add(new THREE.BoxGeometry(pw + fr * 2, fr, .05), M.brass, px, py - ph / 2 - fr / 2, pz + .01);
    add(new THREE.BoxGeometry(fr, ph, .05), M.brass, px - pw / 2 - fr / 2, py, pz + .01);
    add(new THREE.BoxGeometry(fr, ph, .05), M.brass, px + pw / 2 + fr / 2, py, pz + .01);
    const gp = []; for (let i = 0; i <= 26; i++) { const t = i / 26; gp.push([px - pw / 2 - .02 + t * (pw + .04), py + ph / 2 + .07 - Math.sin(t * Math.PI) * .09, pz + .05]); }
    const gl = new THREE.InstancedMesh(garlandGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), gp.length);
    gp.forEach((q, i) => { tmpM.makeTranslation(...q); gl.setMatrixAt(i, tmpM); gl.setColorAt(i, tmpC.set(i % 3 === 0 ? 0xffb21a : i % 3 === 1 ? 0xff8a10 : 0xffcf3a)); });
    scene.add(gl);
    const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .18 }));
    pg.scale.set(1.4, 1.7, 1); pg.position.set(px, py, pz + .08); scene.add(pg);
  }

  // Ganesh plaque on the left of the chowki
  const ganesh = new THREE.Mesh(new THREE.CircleGeometry(.15, 48), new THREE.MeshStandardMaterial({ map: ganeshTex, roughness: .6, emissive: 0xffffff, emissiveMap: ganeshTex, emissiveIntensity: .08 }));
  ganesh.position.set(-.76, .7, chowkiZ - .15); ganesh.rotation.y = .25; scene.add(ganesh);
  add(new THREE.BoxGeometry(.06, .2, .06), M.wood, -.76, .6, chowkiZ - .19);
  const gGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  gGlow.scale.set(.7, .7, 1); gGlow.position.set(-.76, .7, chowkiZ - .17); scene.add(gGlow);

  // ---------- puja items ----------
  const TOP = .512, FZ = chowkiZ + .22;
  // main diya (lathe)
  const diyaProfile = [[0, 0], [.05, 0], [.075, .015], [.085, .035], [.07, .04], [.02, .02], [0, .02]].map(([x, y]) => new THREE.Vector2(x, y));
  const diyaGeo = new THREE.LatheGeometry(diyaProfile, 28);
  const standGeo = new THREE.LatheGeometry([[0, 0], [.07, 0], [.07, .01], [.02, .03], [.018, .11], [.04, .13], [.045, .14], [0, .14]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const diyaPos = new THREE.Vector3(0, TOP, FZ);
  add(standGeo, M.brass, diyaPos.x, diyaPos.y, diyaPos.z);
  add(diyaGeo, M.brass, diyaPos.x, diyaPos.y + .14, diyaPos.z);
  const flamePos = new THREE.Vector3(diyaPos.x + .05, diyaPos.y + .2, diyaPos.z);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flame.position.copy(flamePos); flame.scale.set(.045, .09, 1); scene.add(flame);
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .6 }));
  flameGlow.position.copy(flamePos); flameGlow.scale.set(.5, .5, 1); scene.add(flameGlow);
  const lampLight = new THREE.PointLight(0xffa04a, 2.2, 7, 1.6); lampLight.position.copy(flamePos).add(new THREE.Vector3(0, .05, .05));
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(512, 512); lampLight.shadow.bias = -0.004; lampLight.shadow.radius = 4; scene.add(lampLight);
  // panchpatra + achmani
  const ppPos = new THREE.Vector3(-.6, TOP, FZ);
  add(new THREE.LatheGeometry([[0, 0], [.05, 0], [.055, .02], [.045, .09], [.05, .1], [0, .1]].map(([x, y]) => new THREE.Vector2(x, y)), 24), M.copper, ppPos.x, ppPos.y, ppPos.z);
  const water = add(new THREE.CircleGeometry(.044, 24), new THREE.MeshStandardMaterial({ color: 0x8fb5c8, metalness: .2, roughness: .05, transparent: true, opacity: .85 }), ppPos.x, ppPos.y + .092, ppPos.z); water.rotation.x = -Math.PI / 2;
  const spoon = add(new THREE.CylinderGeometry(.006, .006, .16, 6), M.copper, ppPos.x + .03, ppPos.y + .13, ppPos.z); spoon.rotation.z = -.4;
  // flower plate
  const plate = (x, r = .12) => add(new THREE.CylinderGeometry(r, r * .9, .015, 32), M.brass, x, TOP + .008, FZ + .02);
  plate(-.3);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.026, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), 22);
  for (let i = 0; i < 22; i++) { const a = i * 2.4, r = Math.sqrt(i / 22) * .085; tmpM.makeTranslation(-.3 + Math.cos(a) * r, TOP + .035 + (i % 3) * .008, FZ + .02 + Math.sin(a) * r); flowers.setMatrixAt(i, tmpM); flowers.setColorAt(i, tmpC.set(i % 4 === 0 ? 0xc0141a : i % 2 ? 0xff9a12 : 0xffc21e)); }
  flowers.castShadow = true; scene.add(flowers);
  // chandan bowl
  add(new THREE.LatheGeometry([[0, 0], [.04, 0], [.05, .03], [.045, .035], [0, .02]].map(([x, y]) => new THREE.Vector2(x, y)), 20), M.brass, .3, TOP, FZ);
  const chandan = add(new THREE.CircleGeometry(.042, 20), M.chandan, .3, TOP + .028, FZ); chandan.rotation.x = -Math.PI / 2;
  // naivedya plate with sweets + taamboool leaf
  plate(.6, .13);
  const sweets = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; sweets.push(add(new THREE.SphereGeometry(.024, 12, 10), M.sweet, .6 + Math.cos(a) * .055, TOP + .035, FZ + .02 + Math.sin(a) * .055)); }
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(.06, .02, .07, .09, 0, .14); leafShape.bezierCurveTo(-.07, .09, -.06, .02, 0, 0);
  const leaf = add(new THREE.ShapeGeometry(leafShape, 12), M.leaf, .72, TOP + .02, FZ + .11); leaf.rotation.x = -Math.PI / 2; leaf.rotation.z = 2.2;
  // incense stand + stick
  const incPos = new THREE.Vector3(.86, TOP, FZ - .1);
  add(new THREE.CylinderGeometry(.03, .04, .04, 16), M.brass, incPos.x, incPos.y + .02, incPos.z);
  const stick = add(new THREE.CylinderGeometry(.003, .003, .3, 5), new THREE.MeshStandardMaterial({ color: 0x3a1e10 }), incPos.x + .03, incPos.y + .17, incPos.z); stick.rotation.z = -.18;
  const incTip = new THREE.Vector3(incPos.x + .057, incPos.y + .315, incPos.z);
  const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xff5010, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  ember.position.copy(incTip); ember.scale.set(.02, .02, 1); scene.add(ember);
  // hanging bell
  const bell = new THREE.Group(); bell.position.set(.78, 2.55, -2.05); scene.add(bell);
  add(new THREE.CylinderGeometry(.004, .004, .55, 4), M.brass, 0, -.275, 0, bell);
  add(new THREE.LatheGeometry([[0, 0], [.03, 0], [.05, -.04], [.065, -.12], [.08, -.15], [0, -.15]].map(([x, y]) => new THREE.Vector2(x, y)), 24), M.brass, 0, -.55, 0, bell);
  // asan
  const asan = add(new THREE.BoxGeometry(.95, .025, .7), M.asan, 0, .013, .35); asan.castShadow = false;
  const asanEdge = add(new THREE.BoxGeometry(.97, .02, .72), new THREE.MeshStandardMaterial({ color: 0xd8a43c, roughness: .8 }), 0, .008, .35); asanEdge.castShadow = false;
  // rangoli
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(.5, 64), new THREE.MeshStandardMaterial({ map: rangoliTex, transparent: true, roughness: 1 }));
  rangoli.rotation.x = -Math.PI / 2; rangoli.position.set(0, .004, -.95); rangoli.receiveShadow = true; scene.add(rangoli);

  // ---------- day diyas (one per sankalp day) ----------
  const smallDiyaGeo = new THREE.LatheGeometry(diyaProfile, 16);
  let dayMesh = null, dayFlames = null, dayInfo = { total: 0, lit: 0 };
  const dayCenter = new THREE.Vector3(0, 0, -.95);
  function dayPositions(n) {
    const out = []; const outer = Math.ceil(n * .58), inner = n - outer;
    const ring = (k, r) => { for (let i = 0; i < k; i++) { const a = Math.PI * 1.08 + (i + .5) / k * Math.PI * 2; out.push(new THREE.Vector3(dayCenter.x + Math.cos(a) * r, 0, dayCenter.z + Math.sin(a) * r * .9)); } };
    ring(outer, .86); ring(inner, .66); return out;
  }
  let dayPos = [];
  function setDays(total, lit) {
    total = Math.max(0, Math.min(total | 0, 120)); lit = Math.min(lit | 0, total);
    if (dayMesh) { scene.remove(dayMesh); dayMesh.geometry = null; }
    if (dayFlames) scene.remove(dayFlames);
    dayInfo = { total, lit }; dayPos = dayPositions(total);
    if (!total) { renderer.shadowMap.needsUpdate = true; return; }
    dayMesh = new THREE.InstancedMesh(smallDiyaGeo, M.clay, total);
    dayPos.forEach((p, i) => { tmpM.compose(p, new THREE.Quaternion(), new THREE.Vector3(.75, .75, .75)); dayMesh.setMatrixAt(i, tmpM); });
    scene.add(dayMesh);
    const pos = new Float32Array(Math.max(lit, 1) * 3);
    for (let i = 0; i < lit; i++) { pos[i * 3] = dayPos[i].x + .03; pos[i * 3 + 1] = .055; pos[i * 3 + 2] = dayPos[i].z; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, lit);
    dayFlames = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: .14, color: 0xffb050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dayFlames); renderer.shadowMap.needsUpdate = true;
  }

  // ---------- particles ----------
  // dust motes in the lamp light
  const moteN = 140, moteArr = new Float32Array(moteN * 3), moteV = [];
  for (let i = 0; i < moteN; i++) { moteArr[i * 3] = rnd(-1.6, 1.6); moteArr[i * 3 + 1] = rnd(.2, 2.4); moteArr[i * 3 + 2] = rnd(-2.6, .6); moteV.push(rnd(0, 6)); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute("position", new THREE.BufferAttribute(moteArr, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: softTex, size: .018, color: 0xffd7a0, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(motes);
  // petals (instanced)
  const PN = 180;
  const petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(.035, .05), new THREE.MeshStandardMaterial({ map: petalTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .9 }), PN);
  const pState = [];
  for (let i = 0; i < PN; i++) { pState.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, rest: false }); petals.setColorAt(i, tmpC.set(i % 5 === 0 ? 0xb3121a : i % 2 ? 0xff8f10 : 0xffbf1f)); tmpM.makeScale(0, 0, 0); petals.setMatrixAt(i, tmpM); }
  scene.add(petals);
  let pCursor = 0;
  function spawnPetals(n, spread = 1) {
    for (let k = 0; k < n; k++) {
      const s = pState[pCursor]; pCursor = (pCursor + 1) % PN;
      s.on = true; s.rest = false; s.life = 0;
      s.p.set(rnd(-.55, .55) * spread, rnd(1.7, 2.3), chowkiZ + rnd(-.1, .5));
      s.v.set(rnd(-.05, .05), rnd(-.35, -.2), rnd(-.02, .06));
      s.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); s.w.set(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3));
    }
  }
  // water drops
  const WN = 90, wArr = new Float32Array(WN * 3), wState = [];
  for (let i = 0; i < WN; i++) wState.push({ on: false, v: new THREE.Vector3(), life: 0 });
  const wGeo = new THREE.BufferGeometry(); wGeo.setAttribute("position", new THREE.BufferAttribute(wArr, 3));
  const drops = new THREE.Points(wGeo, new THREE.PointsMaterial({ map: softTex, size: .03, color: 0xbfe3ff, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(drops);
  function spawnWater() {
    for (let i = 0; i < WN; i++) {
      const s = wState[i]; s.on = true; s.life = rnd(0, .4) * -1;
      wArr[i * 3] = rnd(-.6, .6); wArr[i * 3 + 1] = rnd(1.4, 1.9); wArr[i * 3 + 2] = rnd(-1.4, .2);
      s.v.set(rnd(-.4, .4), rnd(.2, .9), rnd(-.4, .2));
    }
  }
  // incense smoke sprites
  const smoke = [];
  for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); sp.userData = { t: i / 26 * 6, drift: rnd(0, 6) }; scene.add(sp); smoke.push(sp); }

  // ---------- state + camera ----------
  const S = { lamp: 1, lampT: 1, smoke: 1, smokeT: 1, yantra: .25, yantraT: .25, ganesh: 0, ganeshT: 0, pulse: { chandan: 0, sweets: 0, flowers: 0 }, bellSwing: 0, burst: 0 };
  const VIEWS = {
    home:   [[-.35, 1.5, 1.95], [-.55, .9, -2.2]],
    dawn:   [[.7, 1.6, .9], [-1.6, 1.35, -2.0]],
    doors:  [[0, 1.12, -.35], [0, .98, -2.45]],
    aasan:  [[0, 1.8, 1.1], [0, .15, -.4]],
    water:  [[-.32, 1.0, -.95], [-.6, .58, -2.1]],
    lamp:   [[.18, .98, -1.0], [0, .66, -2.1]],
    ganesh: [[-.42, 1.0, -1.05], [-.76, .7, -2.45]],
    altar:  [[0, 1.3, .25], [0, .9, -2.3]],
    earth:  [[0, 1.55, .7], [0, .05, -1.0]],
    yantra: [[0, 1.05, -.75], [0, 1.0, -2.5]],
    offer:  [[0, 1.12, -.45], [0, .62, -2.15]],
    paath:  [[0, 1.3, .45], [0, .98, -2.35]],
    "offer-all": [[0, 1.5, 1.3], [0, .9, -2.2]]
  };
  const cam = { pos: new THREE.Vector3(...VIEWS.home[0]), tgt: new THREE.Vector3(...VIEWS.home[1]), P: new THREE.Vector3(...VIEWS.home[0]), T: new THREE.Vector3(...VIEWS.home[1]), key: "home" };
  camera.position.copy(cam.pos); camera.lookAt(cam.tgt);
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { ptr.x = (e.clientX / innerWidth - .5) * 2; ptr.y = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0xffd2b0, .12));
  scene.add(new THREE.HemisphereLight(0x4a3a5a, 0x1a0e08, .3));
  const moon = new THREE.DirectionalLight(0x8fa8ff, .35); moon.position.set(-5, 3, -1); scene.add(moon);
  const fill = new THREE.PointLight(0xff8a50, .35, 6, 2); fill.position.set(0, 1.6, .8); scene.add(fill);

  // ---------- layout (shift the view so the altar sits beside the panel) ----------
  // rest mode: pages other than the altar stop rendering once the camera has settled
  let wantRest = false, restFrames = -1, looping = true;
  let layoutMode = "side";
  function layout(mode) {
    layoutMode = mode || layoutMode;
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const wide = w >= 900 && w > h;
    if (layoutMode === "full") camera.clearViewOffset();
    else if (wide) camera.setViewOffset(w, h, w * .2, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * (w < 560 ? .3 : .26), w, h);
    camera.fov = wide ? 50 : (w < 560 ? 70 : 62);
    camera.updateProjectionMatrix();
    if (wantRest) wake();
  }
  addEventListener("resize", () => layout());
  layout("side");

  // ---------- adaptive quality: cap the frame rate, and step resolution / shadows down when frames run long ----------
  const TIERS = [
    { pr: 1.5, shadow: true, gap: 28, ms: 33.3 },
    { pr: 1.25, shadow: true, gap: 28, ms: 33.3 },
    { pr: 1, shadow: false, gap: 28, ms: 33.3 },
    { pr: .85, shadow: false, gap: 42, ms: 50 },
    { pr: .7, shadow: false, gap: 58, ms: 66.7 }
  ];
  let tier = 0, lastAt = 0, warmUntil = 0, win = [], stable = 0, holdMs = 45000, holdUntil = 0, wasMoving = false;
  try { tier = Math.max(0, Math.min(TIERS.length - 1, Math.round(+localStorage.getItem("lalita-q")) || 0)); } catch (e) {}
  if (tier > 0) holdUntil = performance.now() + 60000;
  function applyTier() {
    const T = TIERS[tier];
    renderer.setPixelRatio(Math.min(dpr, T.pr));
    lampLight.castShadow = T.shadow; renderer.shadowMap.needsUpdate = true;
    warmUntil = performance.now() + 1500; win.length = 0; stable = 0;
    try { localStorage.setItem("lalita-q", String(tier)); } catch (e) {}
  }
  // iv is the time since the previous rendered frame (0 right after a wake-up, which is not a real measurement).
  // The median of 20 frames ignores one-off hitches such as a shader compile.
  function adapt(iv, now) {
    if (!iv || now < warmUntil) { win.length = 0; return; }
    win.push(Math.min(iv, 1000)); if (win.length < 20) return;
    win.sort((a, b) => a - b); const avg = win[10]; win.length = 0;
    const ms = TIERS[tier].ms;
    if (avg > ms * 1.35 && tier < TIERS.length - 1) { tier++; holdUntil = performance.now() + holdMs; holdMs = Math.min(holdMs * 2, 600000); applyTier(); }
    else if (avg < ms * 1.1) { stable += 20; if (stable >= 240 && tier > 0 && performance.now() > holdUntil) { tier--; applyTier(); } }
    else stable = 0;
  }
  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

  // ---------- loop ----------
  const clock = new THREE.Clock(); let t = 0, running = true, frame = 0;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; lastAt = 0; if (running) kick(); });
  function kick() { if (looping) return; looping = true; lastAt = 0; clock.getDelta(); requestAnimationFrame(loop); }
  function wake() { restFrames = wantRest ? 120 : -1; kick(); }
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function loop() {
    if (!running || restFrames === 0) { looping = false; return; }
    requestAnimationFrame(loop);
    // frame cap: never render faster than ~30 fps, however fast the display refreshes (iPad Pro is 120 Hz)
    const nowMs = performance.now();
    if (nowMs - lastAt < TIERS[tier].gap) return;
    const iv = lastAt ? nowMs - lastAt : 0; lastAt = nowMs;
    if (restFrames > 0) restFrames--;
    const dt = Math.min(clock.getDelta(), .05); t += dt; frame++;
    // camera
    const breathe = reduce ? 0 : 1;
    ptr.sx = damp(ptr.sx, ptr.x, 2, dt); ptr.sy = damp(ptr.sy, ptr.y, 2, dt);
    cam.P.lerp(cam.pos, 1 - Math.exp(-1.6 * dt)); cam.T.lerp(cam.tgt, 1 - Math.exp(-1.9 * dt));
    camera.position.set(cam.P.x + Math.sin(t * .23) * .04 * breathe + ptr.sx * .08 * breathe, cam.P.y + Math.sin(t * .31) * .025 * breathe - ptr.sy * .04 * breathe, cam.P.z);
    if (cam.key === "paath" && !reduce) camera.position.x += Math.sin(t * .08) * .25;
    camera.lookAt(cam.T);
    // lamp
    S.lamp = damp(S.lamp, S.lampT, 3, dt);
    const fl = 1 + (Math.sin(t * 13) * .04 + Math.sin(t * 7.3) * .05 + Math.sin(t * 23.1) * .03) * (reduce ? .3 : 1);
    lampLight.intensity = (.05 + 2.3 * S.lamp) * fl;
    flame.material.opacity = S.lamp; flameGlow.material.opacity = .6 * S.lamp * fl;
    flame.scale.set(.045 * fl, .09 * (2 - fl) * S.lamp + .001, 1);
    flame.position.x = flamePos.x + Math.sin(t * 5) * .002;
    fill.intensity = .15 + .25 * S.lamp;
    // yantra + ganesh glow
    S.yantra = damp(S.yantra, S.yantraT, 1.5, dt);
    yGlow.material.opacity = S.yantra * (1 + Math.sin(t * 1.3) * .1); yLight.intensity = S.yantra * 1.4;
    yantra.material.color.setScalar(.55 + S.yantra * .6);
    S.ganesh = damp(S.ganesh, S.ganeshT, 1.5, dt); gGlow.material.opacity = S.ganesh * .7; ganesh.material.emissiveIntensity = .08 + S.ganesh * .3;
    // pulses
    for (const k in S.pulse) S.pulse[k] = Math.max(0, S.pulse[k] - dt * .35);
    M.chandan.emissive.setRGB(.5 * S.pulse.chandan, .35 * S.pulse.chandan, .15 * S.pulse.chandan);
    M.sweet.emissive.setRGB(.5 * S.pulse.sweets, .35 * S.pulse.sweets, .1 * S.pulse.sweets);
    M.brass.emissive.setRGB(.25 * S.burst, .15 * S.burst, .02 * S.burst); S.burst = Math.max(0, S.burst - dt * .4);
    // doors
    let moved = false;
    doors.forEach((p) => { const u = p.userData; const o = damp(u.open, u.target, 2.2, dt); if (Math.abs(o - u.open) > 1e-4) moved = true; u.open = o; p.rotation.y = u.side * 1.9 * o; });
    // shadows only change when the doors or bell move (the rest of the altar is static), so skip the six-face lamp shadow pass otherwise
    if ((moved && frame % 3 === 0) || (!moved && wasMoving) || (S.bellSwing > .03 && frame % 6 === 0)) renderer.shadowMap.needsUpdate = true;
    wasMoving = moved;
    // bell
    S.bellSwing = damp(S.bellSwing, 0, .9, dt); bell.rotation.z = Math.sin(t * 6) * S.bellSwing * .25; bell.rotation.x = Math.cos(t * 4.2) * S.bellSwing * .1;
    // motes
    const ma = moteGeo.attributes.position.array;
    for (let i = 0; i < moteN; i++) { ma[i * 3 + 1] += Math.sin(t * .3 + moteV[i]) * .0006 + .0002; ma[i * 3] += Math.cos(t * .2 + moteV[i]) * .0004; if (ma[i * 3 + 1] > 2.5) ma[i * 3 + 1] = .2; }
    moteGeo.attributes.position.needsUpdate = true; motes.material.opacity = .25 + .35 * S.lamp;
    // petals
    let anyP = false;
    for (let i = 0; i < PN; i++) {
      const s = pState[i]; if (!s.on) continue; anyP = true; s.life += dt;
      if (!s.rest) {
        s.p.addScaledVector(s.v, dt); s.p.x += Math.sin(t * 2 + i) * .002; s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
        const onTable = Math.abs(s.p.x) < 1 && s.p.z < chowkiZ + .42 && s.p.z > chowkiZ - .42;
        const floorY = onTable ? TOP + .01 : .006;
        if (s.p.y <= floorY) { s.p.y = floorY; s.rest = true; s.r.x = -Math.PI / 2; s.r.y = 0; }
      }
      const fade = s.life > 40 ? Math.max(0, 1 - (s.life - 40) / 5) : 1; if (fade <= 0) s.on = false;
      tmpM.compose(s.p, tmpQ.setFromEuler(s.r), tmpV.set(fade, fade, fade)); petals.setMatrixAt(i, tmpM);
    }
    if (anyP) petals.instanceMatrix.needsUpdate = true;
    // water
    let anyW = false;
    for (let i = 0; i < WN; i++) {
      const s = wState[i]; if (!s.on) continue; anyW = true; s.life += dt; if (s.life < 0) continue;
      s.v.y -= 3.2 * dt; wArr[i * 3] += s.v.x * dt; wArr[i * 3 + 1] += s.v.y * dt; wArr[i * 3 + 2] += s.v.z * dt;
      if (wArr[i * 3 + 1] < 0 || s.life > 2) { s.on = false; wArr[i * 3 + 1] = -10; }
    }
    if (anyW) wGeo.attributes.position.needsUpdate = true;
    // smoke
    S.smoke = damp(S.smoke, S.smokeT, 1, dt);
    smoke.forEach((sp, i) => {
      const u = sp.userData; u.t += dt * .55; if (u.t > 6) u.t -= 6; const k = u.t / 6;
      sp.position.set(incTip.x + Math.sin(u.t * 1.3 + u.drift) * .06 * k * 3, incTip.y + k * 1.4, incTip.z + Math.cos(u.t + u.drift) * .03 * k * 3);
      const sz = .05 + k * .35; sp.scale.set(sz, sz, 1); sp.material.opacity = S.smoke * .32 * Math.sin(k * Math.PI) * (1 - k * .4);
    });
    ember.material.opacity = S.smoke * (.7 + Math.sin(t * 3) * .3);
    // day flames flicker
    if (dayFlames) dayFlames.material.size = .13 + Math.sin(t * 9) * .01;
    renderer.render(scene, camera);
    adapt(iv, nowMs);
  }
  applyTier();
  loop();

  function setDoors(open) { doors.forEach((d) => (d.userData.target = open ? 1 : 0)); }
  window.Hut = {
    layout,
    goto(key) { const v = VIEWS[key] || VIEWS.home; cam.pos.set(...v[0]); cam.tgt.set(...v[1]); cam.key = key; },
    set(o) {
      if ("doors" in o) setDoors(o.doors);
      if ("lamp" in o) S.lampT = o.lamp ? 1 : 0;
      if ("smoke" in o) S.smokeT = o.smoke ? 1 : 0;
      if ("yantra" in o) S.yantraT = o.yantra;
      if ("ganesh" in o) S.ganeshT = o.ganesh;
      if (o.instant) { S.lamp = S.lampT; S.smoke = S.smokeT; doors.forEach((d) => (d.userData.open = d.userData.target)); cam.P.copy(cam.pos); cam.T.copy(cam.tgt); }
    },
    fx(name) {
      if (name === "petals") spawnPetals(40);
      else if (name === "shower") { spawnPetals(90, 1.6); S.burst = 1; }
      else if (name === "water") spawnWater();
      else if (name === "chandan") S.pulse.chandan = 1;
      else if (name === "bhog") S.pulse.sweets = 1;
      else if (name === "smoke") S.smokeT = 1;
      else if (name === "lamp") { S.lampT = 1; S.burst = .6; }
      else if (name === "all") { spawnPetals(50); S.pulse.chandan = 1; S.pulse.sweets = 1; S.burst = 1; }
    },
    ringBell() { S.bellSwing = 1; },
    setDays,
    lightNewDay(total, lit) { setDays(total, lit); S.burst = 1; spawnPetals(30); },
    rest(on) { wantRest = !!on; wake(); }
  };
  for (const k of ["goto", "set", "fx", "ringBell", "setDays", "lightNewDay"]) {
    const fn = window.Hut[k]; window.Hut[k] = (...a) => { wake(); return fn(...a); };
  }
})();

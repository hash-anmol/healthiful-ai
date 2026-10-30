// Himalaya at Brahma muhurta: a rock ledge high above a river valley, a small stone altar with a diya,
// the Sri Chakra on a wooden board and the guru's picture. Dawn advances with the practice.
// Exposes window.Scene = { setDawn, breath, view, rest, layout }
(function () {
  const canvas = document.getElementById("scene");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = window.devicePixelRatio || 1;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, powerPreference: "high-performance" });
  } catch (e) { window.Scene = null; return; }
  renderer.setPixelRatio(Math.min(dpr, 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  // no tone mapping, so fog (built-in) and the sky (custom shader) meet at the same colour on the horizon
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 4000);
  scene.fog = new THREE.FogExp2(0x1d1b3a, 0.0009);

  // ---------- noise ----------
  function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
  function ridged(x, y, o = 5) { let s = 0, a = .55, f = 1, w = 1; for (let i = 0; i < o; i++) { let n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); n *= n * w; w = Math.min(1, n * 1.6); s += n * a; f *= 2.1; a *= .5; } return s; }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // ---------- geography ----------
  const EYE = 56.3; // seated eye height on the ledge
  const SUN_AZ = 0.42; // radians to the right of straight ahead; the peaks dip there so the sun can rise
  const riverZ = (x) => -265 + 30 * Math.sin(x * 0.008) + 12 * Math.sin(x * 0.023 + 1.3);
  const notch = (x, z, depth, width) => { const a = Math.atan2(x, -z); return 1 - depth * Math.exp(-((a - SUN_AZ) ** 2) / (2 * width * width)); };
  // the riverbed is carved below the valley floor so the water never shows through the ground
  function valleyH(x, z) { const d = z - riverZ(x), c = smooth(8, 30, Math.abs(d)); return slopeH(x, z, d) * c - 1.2 * (1 - c); }
  function slopeH(x, z, d) {
    if (d > 0) { // our side: rises to the spur we sit on
      const spur = 18 * Math.exp(-(x * x) / (2 * 40 * 40)) * smooth(-40, -12, z);
      return 22 * Math.pow(smooth(8, 150, d), 1.5) * (.8 + .4 * fbm(x * .01, z * .01, 4)) + spur + 2 * fbm(x * .05, z * .05, 3);
    }
    const t = smooth(8, 300, -d);
    const range = .62 + .55 * fbm(x * .0022 + 7, 3.1, 3);
    const peaks = 185 * Math.pow(t, 1.35) * range * (.5 + .62 * ridged(x * .0042, z * .0042));
    return peaks * notch(x, z, .6, .1) + 6 * t * fbm(x * .03, z * .03, 3) + 1.5 * fbm(x * .06, z * .06, 2);
  }
  function backH(x, z) {
    const r = ridged(x * .0016 + 3, z * .0016 - 2, 6);
    const crest = 1 - Math.pow(Math.abs((z + 880) / 260), 2);
    return Math.max(0, (150 + 330 * r) * Math.max(0, crest)) * notch(x, z, .74, .085);
  }

  function terrain(w, d, segX, segZ, cx, cz, hf, palette) {
    const g = new THREE.PlaneGeometry(w, d, segX, segZ); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, hf(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const nrm = g.attributes.normal, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
      palette(c, y, ny, fbm(x * .02, z * .02, 3));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  }
  const C = { snow: lin("#e9eef6"), rock: lin("#5d5752"), rockD: lin("#3e3a38"), forest: lin("#24331f"), meadow: lin("#3f4a2c"), floor: lin("#4a5034") };
  const tmpC = new THREE.Color();
  function paint(snowLine) {
    return (c, y, ny, n) => {
      const steep = 1 - ny;
      if (y > snowLine + (n - .5) * 40 && steep < .55) c.copy(C.snow).lerp(C.rock, steep * .5);
      else if (y > snowLine * .55 || steep > .45) c.copy(C.rockD).lerp(C.rock, n);
      else if (y < 8) c.copy(C.floor).lerp(C.meadow, n);
      else c.copy(C.forest).lerp(C.meadow, n * .6);
    };
  }
  scene.add(terrain(1500, 700, 190, 120, 0, -360, valleyH, paint(135)));
  scene.add(terrain(3400, 600, 240, 36, 0, -900, backH, paint(250)));

  // ---------- river ----------
  const riverMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSky: { value: new THREE.Color("#3a3560") }, uDeep: { value: new THREE.Color("#0d1420") }, uSun: { value: new THREE.Color("#000000") }, uFog: { value: new THREE.Color("#1d1b3a") }, uFogD: { value: .0009 } },
    vertexShader: "varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `uniform float uTime; uniform vec3 uSky, uDeep, uSun, uFog; uniform float uFogD; varying vec2 vUv; varying float vDepth;
      void main(){
        float edge = 1. - abs(vUv.y - .5) * 2.;
        float flow = sin(vUv.x * 900. - uTime * 2.2 + sin(vUv.y * 7. + vUv.x * 160.) * 2.) * .5 + .5;
        float glint = smoothstep(.82, 1., flow) * smoothstep(.1, .6, edge);
        vec3 col = mix(uDeep, uSky, .55 + .25 * edge) + vec3(.04, .05, .08) + uSun * glint * .35 + vec3(.1, .12, .18) * glint;
        float f = 1. - exp(-pow(vDepth * uFogD, 2.));
        gl_FragColor = vec4(mix(col, uFog, f), smoothstep(0., .25, edge));
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  {
    const N = 420, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const x = -750 + 1500 * i / N, z = riverZ(x), w = 12 + 4 * Math.sin(x * .017);
      const dz = (riverZ(x + 1) - riverZ(x - 1)) / 2, len = Math.hypot(1, dz), nx = -dz / len, nz = 1 / len;
      const y = .15;
      pos.push(x + nx * w, y, z + nz * w, x - nx * w, y, z - nz * w); uv.push(i / N, 0, i / N, 1);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    scene.add(new THREE.Mesh(g, riverMat));
  }

  // ---------- sky ----------
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 0, -1) }, uSunI: { value: 0 } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 uZenith, uHorizon, uGlow, uSunDir; uniform float uSunI; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-.03, .62, h), .55));
        float s = max(dot(d, uSunDir), 0.);
        float side = dot(normalize(vec2(d.x, d.z) + 1e-5), normalize(vec2(uSunDir.x, uSunDir.z) + 1e-5)) * .5 + .5;
        col += uGlow * (pow(s, 5.) * .5 + pow(s, 80.) * .9) * uSunI;
        col += uGlow * pow(1. - clamp(abs(h) * 3.2, 0., 1.), 3.) * side * side * .55 * uSunI;
        gl_FragColor = vec4(col, 1.);
      }`,
    side: THREE.BackSide, depthWrite: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 40, 20), skyMat); sky.renderOrder = -1; scene.add(sky);

  // stars that fade as the light comes
  const starMat = new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false });
  {
    const n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = Math.asin(Math.random() * .92 + .06); p[i * 3] = Math.cos(e) * Math.sin(a) * 2500; p[i * 3 + 1] = Math.sin(e) * 2500; p[i * 3 + 2] = -Math.cos(e) * Math.cos(a) * 2500; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, starMat));
  }

  // ---------- soft textures ----------
  function cvs(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  const glowTex = cvs(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const mistTex = cvs(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) { const x = rnd(.15, .85) * w, y = rnd(.35, .65) * h, r = rnd(20, 54); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  });
  const flameTex = cvs(64, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h * .66, 2, w / 2, h * .58, h * .46);
    r.addColorStop(0, "rgba(255,255,236,1)"); r.addColorStop(.3, "rgba(255,206,110,.95)"); r.addColorStop(.62, "rgba(255,120,30,.5)"); r.addColorStop(1, "rgba(255,80,0,0)");
    g.fillStyle = r; g.beginPath(); g.moveTo(w / 2, 4); g.bezierCurveTo(w * .95, h * .5, w * .85, h * .95, w / 2, h - 4); g.bezierCurveTo(w * .15, h * .95, w * .05, h * .5, w / 2, 4); g.fill();
  });

  // sun: a soft glow and a core; mountains hide it until it clears the gap in the peaks
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunGlow.scale.set(700, 700, 1); sunCore.scale.set(85, 85, 1); scene.add(sunGlow, sunCore);

  // valley mist and a few high clouds
  const mists = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x9aa0c0, transparent: true, depthWrite: false, opacity: .3 }));
    const x = rnd(-600, 600); m.position.set(x, rnd(28, 52), riverZ(x) - rnd(40, 120)); m.scale.set(rnd(160, 260), rnd(30, 52), 1);
    m.userData.v = rnd(1.2, 3.2); mists.push(m); scene.add(m);
  }
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x8a7aa0, transparent: true, depthWrite: false, opacity: .5, fog: false }));
    m.position.set(rnd(-1600, 1600), rnd(380, 620), rnd(-1700, -1400)); m.scale.set(rnd(500, 900), rnd(60, 110), 1); m.userData.v = rnd(.5, 1.4);
    clouds.push(m); scene.add(m);
  }

  // ---------- the ledge: a weathered, rounded outcrop that falls away just past the altar ----------
  const SEAT = 55; // where the altar stone rests
  function boulder(radius, detail, sx, sy, sz, seed, rough) {
    const g = new THREE.IcosahedronGeometry(radius, detail), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = fbm(x * .45 + seed, z * .45 + y * .3, 5), k = 1 + (n - .5) * rough;
      x *= sx * k; y *= sy * k; z *= sz * k;
      p.setXYZ(i, x, y, z);
      // stone with darker cracks and patches of lichen
      const v = fbm(x * 1.3 + seed, z * 1.3 + y, 4);
      c.copy(lin("#5b544d")).lerp(lin("#8d8274"), v);
      if (fbm(x * .7 + 2 + seed, z * .7, 3) > .6) c.lerp(lin("#6c7444"), .45);
      if (v < .32) c.lerp(lin("#2e2a27"), .5);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.computeVertexNormals(); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  }
  const crag = boulder(4.6, 5, 1.6, .55, .92, 3, .5); crag.position.set(0, SEAT - 2.35, 2.2); scene.add(crag);
  [[-6.2, .9, .75, 7], [6.8, .6, .8, 11], [-2.7, -1.3, .4, 17], [3, -1.7, .5, 23], [9, 3.5, 1.3, 29]].forEach(([x, z, r, seed]) => {
    const b = boulder(r, 3, 1.3, .7, 1, seed, 1.1); b.position.set(x, SEAT - r * .45, z); b.rotation.y = seed; scene.add(b);
  });
  // ---------- altar ----------
  const ASSETS = window.SADHANA_ASSETS || {};
  const loadTex = (src) => { const t = new THREE.TextureLoader().load(src); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a3f22, roughness: .7 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3d2414, roughness: .75 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: .95 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: .35, metalness: .8 });
  const AZ = .15; // altar centre z, near the front of the seat
  const put = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .5, .8), stone); slab.position.set(0, SEAT - .09, AZ); scene.add(slab);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .5), new THREE.MeshStandardMaterial({ color: 0xa8321f, roughness: .9 })); cloth.rotation.x = -Math.PI / 2; cloth.position.set(0, SEAT + .162, AZ + .05); scene.add(cloth);

  // the Sri Chakra on a traditional wooden board, standing at the back of the altar
  const yantraTex = ASSETS.yantra ? loadTex(ASSETS.yantra) : null;
  const board = new THREE.Group(); board.position.set(0, SEAT + .16, AZ - .26); board.rotation.x = -.14; scene.add(board);
  put(board, new THREE.BoxGeometry(.7, .78, .05), wood, 0, .39, 0);
  put(board, new THREE.BoxGeometry(.78, .06, .09), woodDark, 0, .79, 0);
  put(board, new THREE.BoxGeometry(.78, .05, .12), woodDark, 0, .025, .02);
  const yantraMat = new THREE.MeshStandardMaterial({ map: yantraTex, color: yantraTex ? 0xffffff : 0xd8b070, roughness: .7, emissive: 0xffffff, emissiveMap: yantraTex, emissiveIntensity: .12 });
  const yantra = new THREE.Mesh(new THREE.PlaneGeometry(.56, .56), yantraMat); yantra.position.set(0, .42, .027); board.add(yantra);
  [[0, .72, .56, .025], [0, .12, .56, .025], [-.29, .42, .025, .62], [.29, .42, .025, .62]].forEach(([x, y, w, h]) => put(board, new THREE.BoxGeometry(w, h, .02), brass, x, y, .03));

  // the guru's picture, standing at the left of the altar
  if (ASSETS.guru) {
    const gt = loadTex(ASSETS.guru), pw = .36, ph = pw * (543 / 600);
    const frame = new THREE.Group(); frame.position.set(-.6, SEAT + .16, AZ - .12); frame.rotation.set(-.1, .42, 0); scene.add(frame);
    put(frame, new THREE.BoxGeometry(pw + .06, ph + .06, .03), woodDark, 0, ph / 2 + .05, 0);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: gt, roughness: .7, emissive: 0xffffff, emissiveMap: gt, emissiveIntensity: .1 }));
    pic.position.set(0, ph / 2 + .05, .017); frame.add(pic);
    // small marigold garland along the top edge
    const mg = new THREE.InstancedMesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffa21a, roughness: .8 }), 15), m = new THREE.Matrix4();
    for (let i = 0; i < 15; i++) { const t = i / 14; m.makeTranslation(-pw / 2 + t * pw, ph + .085 - Math.sin(t * Math.PI) * .05, .03); mg.setMatrixAt(i, m); }
    frame.add(mg);
  }

  // the diya
  const diyaGeo = new THREE.LatheGeometry([[0, 0], [.05, 0], [.075, .02], [.085, .045], [.07, .05], [.055, .03], [0, .03]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const diya = new THREE.Mesh(diyaGeo, new THREE.MeshStandardMaterial({ color: 0x9c4a26, roughness: .85 })); diya.position.set(0, SEAT + .162, AZ + .14); scene.add(diya);
  const flamePos = new THREE.Vector3(.04, SEAT + .27, AZ + .14);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.copy(flamePos); flame.scale.set(.05, .1, 1); scene.add(flame);
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 }));
  flameGlow.position.copy(flamePos); flameGlow.scale.set(.6, .6, 1); scene.add(flameGlow);
  const lamp = new THREE.PointLight(0xffa04a, 1.6, 5, 1.8); lamp.position.copy(flamePos).add(new THREE.Vector3(0, .05, .1)); scene.add(lamp);
  // a few marigold heads on the cloth
  {
    const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9a14, roughness: .8 }), 9), m = new THREE.Matrix4();
    [[-.36, .1], [-.3, .2], [-.22, .14], [.26, .16], [.33, .08], [.38, .2], [-.12, .25], [.14, .26], [.0, .3]].forEach(([x, z], i) => { m.makeScale(1, .7, 1).setPosition(x, SEAT + .18, AZ + z); fm.setMatrixAt(i, m); });
    scene.add(fm);
  }

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight(0x26305a, 0x0c0a10, .55); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xff6a30, 0); scene.add(sunL);
  const moon = new THREE.DirectionalLight(0xaebcff, .6); moon.position.set(-60, 55, -60); scene.add(moon);

  // dawn palette: p = 0 (deep night blue) to 1 (sun above the gap in the peaks)
  const STOPS = [
    { p: 0, zen: "#0a1330", hor: "#2e2b58", glow: "#6a3c66", hs: "#3a4880", sunc: "#ff4a20", hi: .95, si: 0, gi: .3, mist: "#4f4f7c", cloud: "#34325a", star: 1 },
    { p: .35, zen: "#16275a", hor: "#644a7c", glow: "#d0706a", hs: "#56689c", sunc: "#ff5a2a", hi: 1.05, si: .12, gi: .6, mist: "#6a5f88", cloud: "#8a5a7a", star: .45 },
    { p: .68, zen: "#284a88", hor: "#e0946e", glow: "#ffae6c", hs: "#8a9cc8", sunc: "#ff9450", hi: 1.05, si: .75, gi: .95, mist: "#c8a6a0", cloud: "#f0a080", star: 0 },
    { p: 1, zen: "#4a78b8", hor: "#f5c690", glow: "#ffd698", hs: "#b4c4e0", sunc: "#ffc888", hi: 1.25, si: 1.45, gi: 1.1, mist: "#e6cbb4", cloud: "#ffd0a8", star: 0 }
  ];
  const ca = new THREE.Color(), cb = new THREE.Color();
  function mixHex(k, p, out) {
    let i = 0; while (i < STOPS.length - 2 && p > STOPS[i + 1].p) i++;
    const a = STOPS[i], b = STOPS[i + 1], t = Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p)));
    if (typeof a[k] === "number") return a[k] + (b[k] - a[k]) * t;
    return out.copy(ca.set(a[k])).lerp(cb.set(b[k]), t);
  }
  const sunDir = new THREE.Vector3();
  const work = { zen: new THREE.Color(), hor: new THREE.Color(), glow: new THREE.Color(), hs: new THREE.Color(), sunc: new THREE.Color(), mist: new THREE.Color(), cloud: new THREE.Color() };
  function applyDawn(p) {
    const el = (-4.5 + 13 * p) * Math.PI / 180;
    sunDir.set(Math.sin(SUN_AZ) * Math.cos(el), Math.sin(el), -Math.cos(SUN_AZ) * Math.cos(el));
    for (const k in work) mixHex(k, p, work[k]);
    skyMat.uniforms.uZenith.value.copy(work.zen); skyMat.uniforms.uHorizon.value.copy(work.hor); skyMat.uniforms.uGlow.value.copy(work.glow);
    skyMat.uniforms.uSunDir.value.copy(sunDir); skyMat.uniforms.uSunI.value = mixHex("gi", p);
    scene.fog.color.copy(work.hor).convertSRGBToLinear();
    riverMat.uniforms.uSky.value.copy(work.hor).lerp(work.zen, .35); riverMat.uniforms.uFog.value.copy(work.hor); riverMat.uniforms.uSun.value.copy(work.glow).multiplyScalar(mixHex("si", p));
    hemi.color.copy(work.hs).convertSRGBToLinear(); hemi.intensity = mixHex("hi", p);
    moon.intensity = .6 * (1 - smooth(.3, .8, p));
    sunL.color.copy(work.sunc).convertSRGBToLinear(); sunL.intensity = mixHex("si", p); sunL.position.copy(sunDir).multiplyScalar(100);
    sunGlow.material.color.copy(work.glow); sunGlow.material.opacity = Math.min(1, .25 + p);
    sunCore.material.opacity = smooth(.25, .6, p);
    starMat.opacity = mixHex("star", p);
    mists.forEach((m) => { m.material.color.copy(work.mist); m.material.opacity = .16 + .12 * p; });
    clouds.forEach((m) => m.material.color.copy(work.cloud));
  }

  // ---------- camera ----------
  const VIEWS = {
    home: [[0, EYE + .1, 2.9], [0, EYE - 1.2, -10]],
    session: [[0, EYE + .05, 2.7], [0, EYE - 1.05, -10]],
    meditate: [[0, EYE, 2.2], [0, EYE - .75, -6]]
  };
  const cam = { pos: new THREE.Vector3(...VIEWS.home[0]), tgt: new THREE.Vector3(...VIEWS.home[1]) };
  const P = cam.pos.clone(), T = cam.tgt.clone();
  let layoutMode = "side", viewKey = "home", portrait = false, sizeW = 0, sizeH = 0;
  // portrait screens are narrow: sit a little further back so the peaks fit above the altar
  function placeCam() { const v = VIEWS[viewKey] || VIEWS.home; cam.pos.set(v[0][0], v[0][1] + (portrait ? .15 : 0), v[0][2] + (portrait ? 1.8 : 0)); cam.tgt.set(v[1][0], v[1][1] + (portrait ? 1.6 : 0), v[1][2]); }
  // rest mode: when nothing on screen needs the scene, stop rendering once it has settled
  let wantRest = false, restFrames = -1, looping = true;
  function layout(mode) {
    layoutMode = mode || layoutMode;
    const w = innerWidth, h = innerHeight; sizeW = w; sizeH = h;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const wide = w >= 900 && w > h;
    if (portrait !== h > w) { portrait = h > w; placeCam(); }
    if (layoutMode === "full") camera.clearViewOffset();
    else if (wide) camera.setViewOffset(w, h, w * .2, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * (w < 560 ? .26 : .22), w, h);
    camera.fov = wide ? 50 : (w < 560 ? 70 : 60);
    camera.updateProjectionMatrix();
    if (wantRest) wake();
  }
  addEventListener("resize", () => layout());
  layout("side");

  // ---------- adaptive quality: ~30 fps cap; resolution and frame rate step down when frames run long ----------
  const TIERS = [{ pr: 1.5, gap: 28, ms: 33.3 }, { pr: 1.25, gap: 28, ms: 33.3 }, { pr: 1, gap: 28, ms: 33.3 }, { pr: .85, gap: 42, ms: 50 }, { pr: .7, gap: 58, ms: 66.7 }];
  let tier = 0, lastAt = 0, warmUntil = 0, win = [], stable = 0, holdMs = 45000, holdUntil = 0;
  try { tier = Math.max(0, Math.min(TIERS.length - 1, Math.round(+localStorage.getItem("nitya-q")) || 0)); } catch (e) {}
  if (tier > 0) holdUntil = performance.now() + 60000;
  function applyTier() {
    renderer.setPixelRatio(Math.min(dpr, TIERS[tier].pr));
    warmUntil = performance.now() + 1500; win.length = 0; stable = 0;
    try { localStorage.setItem("nitya-q", String(tier)); } catch (e) {}
  }
  // iv is the time since the previous rendered frame (0 right after a wake-up); the median ignores one-off hitches
  function adapt(iv, now) {
    if (!iv || now < warmUntil) { win.length = 0; return; }
    win.push(Math.min(iv, 1000)); if (win.length < 20) return;
    win.sort((a, b) => a - b); const med = win[10]; win.length = 0;
    const ms = TIERS[tier].ms;
    if (med > ms * 1.35 && tier < TIERS.length - 1) { tier++; holdUntil = now + holdMs; holdMs = Math.min(holdMs * 2, 600000); applyTier(); }
    else if (med < ms * 1.1) { stable += 20; if (stable >= 240 && tier > 0 && now > holdUntil) { tier--; applyTier(); } }
    else stable = 0;
  }

  // ---------- loop ----------
  const clock = new THREE.Clock(); let t = 0, running = true;
  let dawn = .06, dawnT = .06, breathV = 0, breathT = 0;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; lastAt = 0; if (running) kick(); });
  function kick() { if (looping) return; looping = true; lastAt = 0; clock.getDelta(); requestAnimationFrame(loop); }
  function wake() { restFrames = wantRest ? 90 : -1; kick(); }
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  let ptrX = 0, ptrY = 0, sx = 0, sy = 0;
  addEventListener("pointermove", (e) => { ptrX = e.clientX / innerWidth - .5; ptrY = e.clientY / innerHeight - .5; });
  function loop() {
    if (!running || restFrames === 0) { looping = false; return; }
    requestAnimationFrame(loop);
    const now = performance.now();
    if (now - lastAt < TIERS[tier].gap) return;
    const iv = lastAt ? now - lastAt : 0; lastAt = now;
    if (innerWidth !== sizeW || innerHeight !== sizeH) layout(); // in case a resize event was missed
    if (restFrames > 0) restFrames--;
    const dt = Math.min(clock.getDelta(), .06); t += dt;
    // dawn eases toward its target so the light never jumps
    if (Math.abs(dawn - dawnT) > 1e-4) { dawn = damp(dawn, dawnT, .8, dt); applyDawn(dawn); }
    // camera: drift to the chosen view, with a slow breathing sway
    const m = reduce ? 0 : 1;
    sx = damp(sx, ptrX, 1.5, dt); sy = damp(sy, ptrY, 1.5, dt);
    P.lerp(cam.pos, 1 - Math.exp(-1.2 * dt)); T.lerp(cam.tgt, 1 - Math.exp(-1.4 * dt));
    camera.position.set(P.x + (Math.sin(t * .19) * .02 + sx * .05) * m, P.y + (Math.sin(t * .27) * .012 - sy * .03) * m, P.z);
    camera.lookAt(T);
    // breeze
    const wind = .6 + .4 * Math.sin(t * .23) * Math.sin(t * .071 + 1);
    mists.forEach((s) => { s.position.x += s.userData.v * dt * (.6 + wind * .4); if (s.position.x > 650) s.position.x = -650; });
    clouds.forEach((s) => { s.position.x += s.userData.v * dt; if (s.position.x > 1700) s.position.x = -1700; });
    riverMat.uniforms.uTime.value = t;
    // diya: flicker, a little lean in the breeze, and a slow swell with the breath
    breathV = damp(breathV, breathT, 2.2, dt);
    const fl = 1 + (Math.sin(t * 13) * .05 + Math.sin(t * 7.3) * .05 + Math.sin(t * 21.7) * .03) * (reduce ? .3 : 1);
    flame.scale.set(.05 * fl, .1 * (2 - fl), 1); flame.position.x = flamePos.x + Math.sin(t * 2.1) * .004 * wind;
    flameGlow.material.opacity = (.45 + .2 * breathV) * fl; flameGlow.scale.setScalar(.55 + .15 * breathV);
    lamp.intensity = (1.4 + .5 * breathV) * fl;
    yantraMat.emissiveIntensity = .12 + .18 * breathV;
    sunCore.position.copy(camera.position).addScaledVector(sunDir, 2200); sunGlow.position.copy(sunCore.position);
    renderer.render(scene, camera);
    adapt(iv, now);
  }
  applyDawn(dawn); applyTier();
  loop();

  window.Scene = {
    layout,
    // p: 0 night ... 1 sun risen; instant skips the easing
    setDawn(p, instant) { dawnT = Math.min(1, Math.max(0, p)); if (instant) { dawn = dawnT; applyDawn(dawn); } wake(); },
    // v: 0 (empty) ... 1 (full breath): the diya and the Sri Chakra swell gently with it
    breath(v) { breathT = v; },
    view(key) { viewKey = key; placeCam(); wake(); },
    rest(on) { wantRest = !!on; wake(); }
  };
})();

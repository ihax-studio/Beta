/* 30日 3D — オリジナルのカートレース（three.js） */
import * as THREE from './three.module.min.js';

const H = window.HapticUltra;
export const hap = {
  tap() { try { H && H.fire(); } catch {} },
  ok() { try { H && H.burstN(2, 80); } catch {} },
  ng() { try { H && H.burstN(3, 80); } catch {} },
  end() { try { H && H.pattern([0, 110, 220, 520, 630]); } catch {} },
  bind(el, fn, burst) { if (H) H.bind(el, { onTap: ev => { fn(ev); try { ev.target.blur(); } catch {} }, burst }); else el.addEventListener('click', fn); return el; },
};

/* ───── コース（オリジナル） ───── */
export const COURSES = {
  park: {
    name: 'グリーンパーク', sub: 'なだらかな丘', sky: 0x8fd0ff, fog: 0xd6efff, ground: 0x6cbf57, road: '#4a4d55', deco: 'tree', night: false,
    pts: [[0, 0, 0], [110, 2, -10], [190, 8, -80], [185, 14, -180], [110, 10, -240], [10, 4, -225], [-70, 2, -260], [-150, 6, -200], [-175, 4, -100], [-130, 0, -20], [-60, 0, 30]],
  },
  city: {
    name: 'ネオンシティ', sub: '夜の街・直角コーナー', sky: 0x0b1030, fog: 0x141a40, ground: 0x23263a, road: '#2b2e38', deco: 'tower', night: true,
    pts: [[0, 0, 0], [140, 0, 0], [170, 0, -30], [170, 4, -150], [140, 6, -180], [40, 6, -180], [10, 4, -150], [10, 2, -110], [-40, 0, -90], [-120, 0, -90], [-150, 0, -60], [-150, 0, -20], [-120, 0, 10]],
  },
  coast: {
    name: 'サンセット海岸', sub: '長いストレートと大カーブ', sky: 0xffb27a, fog: 0xffd2a8, ground: 0xe9d39a, road: '#55565c', deco: 'palm', night: false,
    pts: [[0, 0, 0], [220, 0, 10], [300, 3, -60], [290, 10, -170], [200, 14, -210], [80, 10, -180], [20, 6, -230], [-90, 3, -260], [-190, 0, -180], [-200, 0, -70], [-120, 0, 0]],
  },
};

const W = 15;                 // 道幅
const N = 900;                // サンプル数
const COLORS = [0xff4d4d, 0x2f80ff, 0x22c55e, 0xffb020, 0xa855f7, 0x14b8a6];

function roadTexture(base) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
  g.fillStyle = '#f5f5f5'; g.fillRect(4, 0, 5, 256); g.fillRect(119, 0, 5, 256);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(61, 0, 6, 120);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function stripeTexture(a, b) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 8, 32); g.fillStyle = b; g.fillRect(0, 32, 8, 32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function arrowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#ff9f0a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff6d6';
  for (const y of [8, 34]) { g.beginPath(); g.moveTo(32, y); g.lineTo(56, y + 22); g.lineTo(44, y + 22); g.lineTo(32, y + 11); g.lineTo(20, y + 22); g.lineTo(8, y + 22); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

class Track {
  constructor(def) {
    const curve = new THREE.CatmullRomCurve3(def.pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
    this.L = curve.getLength();
    this.P = curve.getSpacedPoints(N).slice(0, N);
    this.T = []; this.R = []; this.K = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const a = this.P[(i - 1 + N) % N], b = this.P[(i + 1) % N];
      const t = b.clone().sub(a).normalize();
      this.T.push(t); this.R.push(new THREE.Vector3().crossVectors(t, up).normalize());
    }
    const ds = this.L / N;
    for (let i = 0; i < N; i++) {
      const t0 = this.T[i], t1 = this.T[(i + 1) % N];
      this.K.push(t1.clone().sub(t0).dot(this.R[i]) / ds);   // 右カーブで正
    }
    // 曲率をなめらかに
    const k2 = this.K.map((_, i) => { let s = 0; for (let j = -6; j <= 6; j++) s += this.K[(i + j + N) % N]; return s / 13; });
    this.K = k2;
  }
  idx(s) { s = ((s % this.L) + this.L) % this.L; const f = s / this.L * N; const i = Math.floor(f) % N; return [i, f - Math.floor(f)]; }
  at(s, x = 0, out = new THREE.Vector3()) {
    const [i, f] = this.idx(s), j = (i + 1) % N;
    out.copy(this.P[i]).lerp(this.P[j], f);
    const r = this.R[i].clone().lerp(this.R[j], f).normalize();
    return out.addScaledVector(r, x);
  }
  tan(s) { const [i, f] = this.idx(s); return this.T[i].clone().lerp(this.T[(i + 1) % N], f).normalize(); }
  curv(s) { const [i] = this.idx(s); return this.K[i]; }
}

function ribbon(track, x0, x1, y, vScale, mat) {
  const pos = [], uv = [], ind = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, p = track.P[k], r = track.R[k];
    pos.push(p.x + r.x * x0, p.y + y, p.z + r.z * x0, p.x + r.x * x1, p.y + y, p.z + r.z * x1);
    const v = i * (track.L / N) / vScale;
    uv.push(0, v, 1, v);
    if (i < N) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
function skirt(track, x, mat) {
  const pos = [], ind = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N, p = track.P[k], r = track.R[k];
    pos.push(p.x + r.x * x, p.y, p.z + r.z * x, p.x + r.x * x * 1.6, -2, p.z + r.z * x * 1.6);
    if (i < N) { const a = i * 2; ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/* オリジナルのカート＋ドライバー（丸いヘルメットの「マル」たち） */
function makeKart(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x22252b });
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f4f6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, .42, 2.6), paint); body.position.y = .55; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.3, .3, .9), paint); nose.position.set(0, .5, -1.6); g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, .45), dark); wing.position.set(0, 1.05, 1.25); g.add(wing);
  for (const sx of [-.8, .8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, .45, .2), dark); p.position.set(sx, .85, 1.25); g.add(p); }
  const wg = new THREE.CylinderGeometry(.38, .38, .34, 14); wg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-.95, -1.0], [.95, -1.0], [-.95, 1.0], [.95, 1.0]]) { const w = new THREE.Mesh(wg, dark); w.position.set(x, .38, z); g.add(w); }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .55, 10), white); torso.position.set(0, 1.0, .25); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.36, 16, 12), paint); head.position.set(0, 1.5, .2); g.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10, 0, Math.PI * 2, Math.PI * .38, Math.PI * .28), new THREE.MeshLambertMaterial({ color: 0x111827 }));
  visor.position.set(0, 1.5, .12); visor.rotation.x = -.2; g.add(visor);
  return g;
}

function makeDeco(scene, track, def, rnd) {
  const items = [];
  const near = (x, z, m) => { for (let i = 0; i < N; i += 5) { const p = track.P[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < m * m) return true; } return false; };
  const box = new THREE.Box3(); track.P.forEach(p => box.expandByPoint(p)); box.expandByScalar(90);
  let tries = 0;
  while (items.length < 260 && tries++ < 6000) {
    const x = box.min.x + rnd() * (box.max.x - box.min.x), z = box.min.z + rnd() * (box.max.z - box.min.z);
    if (near(x, z, W / 2 + 7)) continue;
    items.push([x, z, .7 + rnd() * .9]);
  }
  const dummy = new THREE.Object3D();
  const place = (geo, mat, f) => {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach(([x, z, s], i) => { f(dummy, x, z, s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    scene.add(m);
  };
  if (def.deco === 'tree') {
    place(new THREE.ConeGeometry(2.4, 6, 8), new THREE.MeshLambertMaterial({ color: 0x2f8f46 }), (d, x, z, s) => { d.position.set(x, 4 * s, z); d.scale.setScalar(s); });
    place(new THREE.CylinderGeometry(.4, .5, 2, 6), new THREE.MeshLambertMaterial({ color: 0x8b5a2b }), (d, x, z, s) => { d.position.set(x, s, z); d.scale.setScalar(s); });
  } else if (def.deco === 'tower') {
    const colors = [0x3b3f6b, 0x2a2e55, 0x4a3f7a];
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), items.length);
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, .12, 1.02), new THREE.MeshBasicMaterial({ color: 0xffffff }), items.length * 3);
    let wi = 0;
    items.forEach(([x, z, s], i) => {
      const h = 10 + rnd() * 45, w = 6 + rnd() * 8;
      dummy.position.set(x, h / 2 - 1, z); dummy.scale.set(w, h, w); dummy.rotation.y = 0; dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new THREE.Color(colors[i % 3]));
      for (let k = 0; k < 3; k++) { dummy.position.set(x, 4 + rnd() * (h - 6), z); dummy.scale.set(w, 1, w); dummy.updateMatrix(); win.setMatrixAt(wi, dummy.matrix); win.setColorAt(wi++, new THREE.Color([0xff4fd8, 0x38e1ff, 0xffe066][k])); }
    });
    scene.add(m, win);
  } else {
    place(new THREE.CylinderGeometry(.25, .4, 7, 6), new THREE.MeshLambertMaterial({ color: 0x9a6b3f }), (d, x, z, s) => { d.position.set(x, 3.5 * s, z); d.scale.setScalar(s); d.rotation.z = (rnd() - .5) * .3; });
    place(new THREE.SphereGeometry(2.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3fa35b }), (d, x, z, s) => { d.position.set(x, 7 * s, z); d.scale.set(s, s * .5, s); d.rotation.set(0, 0, 0); });
  }
}

function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* ───── レース ───── */
export class Race {
  constructor(canvas, courseId, opts = {}) {
    this.def = COURSES[courseId] || COURSES.park;
    this.opts = opts;
    this.laps = opts.laps || 3;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(this.def.sky);
    scene.fog = new THREE.Fog(this.def.fog, 60, this.def.night ? 260 : 420);
    scene.add(new THREE.HemisphereLight(0xffffff, this.def.night ? 0x202040 : 0x5a7a40, this.def.night ? .9 : 1.15));
    const sun = new THREE.DirectionalLight(this.def.night ? 0x9aa8ff : 0xffffff, this.def.night ? .5 : 1.1); sun.position.set(80, 140, 40); scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(68, 1, .1, 1200);

    const tr = this.track = new Track(this.def);
    const rnd = rng(courseId.length * 977 + 13);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ color: this.def.ground }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2; scene.add(ground);
    const roadTex = roadTexture(this.def.road);
    scene.add(ribbon(tr, -W / 2, W / 2, .05, 14, new THREE.MeshLambertMaterial({ map: roadTex })));
    const curb = stripeTexture('#e8483b', '#f4f4f6');
    scene.add(ribbon(tr, -W / 2 - 1.6, -W / 2, .04, 3, new THREE.MeshLambertMaterial({ map: curb })));
    scene.add(ribbon(tr, W / 2, W / 2 + 1.6, .04, 3, new THREE.MeshLambertMaterial({ map: curb })));
    const shoulder = new THREE.MeshLambertMaterial({ color: new THREE.Color(this.def.ground).multiplyScalar(.85) });
    scene.add(ribbon(tr, -W / 2 - 5, -W / 2 - 1.6, .02, 10, shoulder), ribbon(tr, W / 2 + 1.6, W / 2 + 5, .02, 10, shoulder));
    const wall = new THREE.MeshLambertMaterial({ color: new THREE.Color(this.def.ground).multiplyScalar(.75), side: THREE.DoubleSide });
    scene.add(skirt(tr, -W / 2 - 5, wall), skirt(tr, W / 2 + 5, wall));
    // スタートライン
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), new THREE.MeshBasicMaterial({ map: stripeTexture('#111', '#fff') }));
    sl.material.map.repeat.set(1, 6); sl.material.map.rotation = Math.PI / 2;
    sl.position.copy(tr.at(0)).add(new THREE.Vector3(0, .08, 0)); sl.lookAt(sl.position.clone().add(new THREE.Vector3(0, 1, 0)));
    sl.rotation.z = Math.atan2(tr.T[0].x, tr.T[0].z); scene.add(sl);
    makeDeco(scene, tr, this.def, rnd);

    // コイン・加速パネル
    this.coins = [];
    const coinGeo = new THREE.CylinderGeometry(.55, .55, .14, 16); coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6b4b00 });
    const ncoin = Math.floor(tr.L / 90);
    for (let k = 0; k < ncoin; k++) {
      const s0 = 60 + k * 90, lane = [-4, 0, 4][k % 3];
      for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(coinGeo, coinMat); scene.add(m); this.coins.push({ s: s0 + j * 4, x: lane, m, t: 0 }); }
    }
    this.pads = [];
    const padMat = new THREE.MeshBasicMaterial({ map: arrowTexture() });
    const npad = Math.max(2, Math.floor(tr.L / 330));
    for (let k = 0; k < npad; k++) {
      const s = 160 + k * (tr.L / npad), x = [-3.5, 3.5, 0][k % 3];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4), padMat);
      const p = tr.at(s, x); m.position.copy(p).add(new THREE.Vector3(0, .09, 0));
      const t = tr.tan(s); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-t.x, -t.z)); scene.add(m);
      this.pads.push({ s, x });
    }

    // カート
    this.karts = [];
    const n = opts.rivals ?? 3;
    for (let i = 0; i <= n; i++) {
      const k = { s: -6 - Math.floor(i / 2) * 6, x: (i % 2 ? 3 : -3), v: 0, vx: 0, lap: 0, prog: 0, boost: 0, coins: 0, drift: 0, slow: 0, spin: 0, done: false, time: 0, player: i === 0, m: makeKart(COLORS[i]) };
      k.skill = i === 0 ? 1 : (opts.study ? .86 : .93) + (i - 1) * .025 + rnd() * .02;
      k.lane = k.x; k.laneT = 0;
      scene.add(k.m); this.karts.push(k);
    }
    this.me = this.karts[0];
    this.input = { steer: 0, drift: false };
    this.state = 'ready'; this.t = 0; this.count = 3;
    this.gates = [];
    this.cam = { p: new THREE.Vector3(), l: new THREE.Vector3() };
    this.v3 = new THREE.Vector3();
    this.resize(); this.placeAll(); this.snapCam();
    this._raf = 0; this._last = 0;
    this.resizeH = () => this.resize(); window.addEventListener('resize', this.resizeH);
  }

  /* 勉強用ゲート：周ごとに count 本。三車線（左・中・右） */
  addGates(perLap) {
    const tr = this.track;
    const colors = [0x2f80ff, 0x22c55e, 0xff9f0a];
    for (let lap = 0; lap < this.laps; lap++) for (let k = 0; k < perLap; k++) {
      const s = (k + .5) / perLap * tr.L + lap * tr.L;
      const g = new THREE.Group();
      const post = new THREE.MeshLambertMaterial({ color: 0xf4f4f6 });
      for (let j = 0; j < 4; j++) { const x = -W / 2 + j * W / 3; const pl = new THREE.Mesh(new THREE.BoxGeometry(.4, 5, .4), post); pl.position.set(x, 2.5, 0); g.add(pl); }
      for (let j = 0; j < 3; j++) {
        const pan = new THREE.Mesh(new THREE.BoxGeometry(W / 3 - .5, 1.3, .25), new THREE.MeshBasicMaterial({ color: colors[j], transparent: true, opacity: .9 }));
        pan.position.set(-W / 3 + j * W / 3, 4.4, 0); g.add(pan);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(W / 3 - .6, 6), new THREE.MeshBasicMaterial({ color: colors[j], transparent: true, opacity: .28 }));
        floor.rotation.x = -Math.PI / 2; floor.position.set(-W / 3 + j * W / 3, .1, 0); g.add(floor);
      }
      const p = tr.at(s); g.position.copy(p); const t = tr.tan(s); g.rotation.y = Math.atan2(-t.x, -t.z);
      this.scene.add(g);
      this.gates.push({ s, g, asked: false, passed: false });
    }
    return this.gates;
  }

  resize() {
    const c = this.renderer.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    this.camera.fov = w < h ? 78 : 64; this.camera.updateProjectionMatrix();
  }
  placeKart(k) {
    const tr = this.track, p = tr.at(k.s, k.x, this.v3);
    k.m.position.set(p.x, p.y + .05, p.z);
    const t = tr.tan(k.s), yaw = Math.atan2(-t.x, -t.z) - Math.atan2(k.vx, Math.max(6, k.v)) * .9 + (k.drift > 0 ? -Math.sign(this.input.steer) * .25 * (k.player ? 1 : 0) : 0);
    k.m.rotation.set(0, yaw + k.spin * Math.PI * 2, 0);
    const dy = tr.at(k.s + 2).y - tr.at(k.s - 2).y; k.m.rotation.x = Math.atan2(dy, 4) * .9;
  }
  placeAll() { this.karts.forEach(k => this.placeKart(k)); }
  snapCam() { this.updateCam(1); }
  updateCam(a) {
    const tr = this.track, k = this.me;
    const back = tr.at(k.s - 7.5, k.x * .8), ahead = tr.at(k.s + 9, k.x * .6);
    back.y += 3.4; ahead.y += 1.1;
    this.cam.p.lerp(back, a); this.cam.l.lerp(ahead, a);
    this.camera.position.copy(this.cam.p); this.camera.lookAt(this.cam.l);
    const f = (this.renderer.domElement.clientWidth < this.renderer.domElement.clientHeight ? 78 : 64) + Math.min(14, k.v * .25) + (k.boost > 0 ? 6 : 0);
    if (Math.abs(this.camera.fov - f) > .1) { this.camera.fov += (f - this.camera.fov) * .1; this.camera.updateProjectionMatrix(); }
  }

  start() { this.state = 'count'; this.count = 3; this.cd = 0; this.opts.onCount && this.opts.onCount(3); hap.tap(); this.loop(); }
  loop() {
    cancelAnimationFrame(this._raf);
    const step = ts => {
      const dt = Math.min(1 / 30, this._last ? (ts - this._last) / 1000 : 0); this._last = ts;
      if (!this.paused) this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }
  stop() { cancelAnimationFrame(this._raf); window.removeEventListener('resize', this.resizeH); this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch {} }

  update(dt) {
    const o = this.opts;
    if (this.state === 'count') {
      this.cd += dt;
      if (this.cd >= 1) { this.cd = 0; this.count--; if (this.count > 0) { o.onCount && o.onCount(this.count); hap.tap(); } else { this.state = 'run'; o.onCount && o.onCount(0); hap.ok(); } }
      this.coins.forEach(c => this.spinCoin(c, dt)); this.updateCam(.2); return;
    }
    if (this.state === 'run' || this.state === 'done') this.t += dt;
    const tr = this.track, L = tr.L;
    for (const k of this.karts) {
      if (k.done) { k.v *= .97; if (k.player) { k.s += k.v * dt; k.prog = k.lap * L + k.s; continue; } }
      let steer, drift;
      if (k.player && !k.done) { steer = this.input.steer; drift = this.input.drift; }
      else {
        // AI：先のカーブを見て車線を選ぶ
        k.laneT -= dt;
        if (k.laneT <= 0) { k.lane = [-4.5, -1.5, 1.5, 4.5][Math.floor(Math.random() * 4)]; k.laneT = 2 + Math.random() * 3; }
        const kc = tr.curv(k.s + 25);
        const want = k.lane + Math.max(-4, Math.min(4, kc * 260));
        steer = Math.max(-1, Math.min(1, (want - k.x) * .35 - k.vx * .08)); drift = false;
      }
      const base = 33 * k.skill;
      let vmax = base * (1 + Math.min(10, k.coins) * .01);
      if (k.boost > 0) { vmax *= 1.38; k.boost -= dt; }
      if (Math.abs(k.x) > W / 2 + .4) vmax *= .5;
      if (k.slow > 0) { vmax *= .55; k.slow -= dt; }
      if (k.spin > 0) { k.spin = Math.max(0, k.spin - dt * 1.4); vmax *= .4; }
      if (!k.player && this.state === 'run') {
        const gap = (this.me.prog - k.prog);
        vmax *= gap > 60 ? 1.08 : gap < -90 ? .93 : 1;
      }
      if (this.state !== 'run' && !k.done) vmax = 0;
      const acc = k.v < vmax ? 16 : -24;
      k.v = Math.max(0, k.v + acc * dt); if (k.v > vmax && acc < 0) k.v = Math.max(vmax, k.v);
      // 横方向
      const grip = drift && Math.abs(steer) > .25 && k.v > 14;
      const target = steer * (grip ? 15.5 : 12.5) * Math.min(1, k.v / 18);
      k.vx += (target - k.vx) * Math.min(1, dt * (grip ? 4 : 7));
      k.x += k.vx * dt;
      k.x -= tr.curv(k.s) * k.v * k.v * .32 * dt;
      if (grip) { k.drift += dt; }
      else if (k.drift > 0) {
        if (k.drift > .6) { k.boost = Math.max(k.boost, k.drift > 1.6 ? 1.2 : .65); if (k.player) { hap.ok(); o.onBoost && o.onBoost(k.drift > 1.6 ? 2 : 1); } }
        k.drift = 0;
      }
      const lim = W / 2 + 4.2;
      if (Math.abs(k.x) > lim) { k.x = Math.sign(k.x) * lim; k.vx *= -.3; k.v *= .9; if (k.player) { hap.tap(); o.onBump && o.onBump(); } }
      // 進む
      const s0 = k.s;
      k.s += k.v * dt;
      if (k.s >= L) { k.s -= L; k.lap++; if (k.player) this.onLap(); else if (k.lap >= this.laps) { k.done = true; k.time = k.time || this.t; } }
      if (s0 < 0 && k.s >= 0) { /* スタート直後 */ }
      k.prog = k.lap * L + k.s;
    }
    // 接触
    for (let i = 0; i < this.karts.length; i++) for (let j = i + 1; j < this.karts.length; j++) {
      const a = this.karts[i], b = this.karts[j];
      let ds = a.prog - b.prog; if (Math.abs(ds) > 3) continue;
      const dx = a.x - b.x;
      if (Math.abs(dx) < 1.8) { const push = (1.8 - Math.abs(dx)) * .5 * (dx >= 0 ? 1 : -1); a.x += push; b.x -= push; a.vx += push * 2; b.vx -= push * 2; if (a.player || b.player) hap.tap(); }
    }
    // コイン・パネル
    const me = this.me;
    for (const c of this.coins) {
      this.spinCoin(c, dt);
      if (c.t > 0) continue;
      for (const k of this.karts) {
        const d = ((k.s - c.s) % L + L) % L;
        if ((d < 1.4 || d > L - 1.4) && Math.abs(k.x - c.x) < 1.5) { c.t = 6; c.m.visible = false; k.coins = Math.min(10, k.coins + 1); if (k.player) { hap.tap(); o.onCoin && o.onCoin(k.coins); } break; }
      }
    }
    for (const p of this.pads) for (const k of this.karts) {
      const d = ((k.s - p.s) % L + L) % L;
      if ((d < 2 || d > L - 2) && Math.abs(k.x - p.x) < 1.8 && k.boost < .3) { k.boost = .9; if (k.player) { hap.ok(); o.onBoost && o.onBoost(1); } }
    }
    // ゲート（勉強）
    for (const g of this.gates) {
      const ahead = g.s - me.prog;
      const gi = this.gates.indexOf(g);
      if (!g.asked && ahead < 260 && ahead > 0 && (gi === 0 || this.gates[gi - 1].passed)) { g.asked = true; o.onGateNear && o.onGateNear(this.gates.indexOf(g)); }
      if (!g.passed && ahead <= 0) {
        g.passed = true; g.g.visible = false;
        const lane = me.x < -W / 6 ? 0 : me.x > W / 6 ? 2 : 1;
        o.onGatePass && o.onGatePass(this.gates.indexOf(g), lane);
      }
    }
    // 順位
    const order = [...this.karts].sort((a, b) => (b.done && a.done) ? a.time - b.time : b.done ? 1 : a.done ? -1 : b.prog - a.prog);
    me.place = order.indexOf(me) + 1;
    this.karts.forEach(k => this.placeKart(k));
    this.updateCam(Math.min(1, dt * 7));
    o.onTick && o.onTick(this);
  }
  spinCoin(c, dt) {
    if (c.t > 0) { c.t -= dt; if (c.t <= 0) c.m.visible = true; }
    const p = this.track.at(c.s, c.x, this.v3); c.m.position.set(p.x, p.y + 1.1, p.z); c.m.rotation.y += dt * 3;
  }
  onLap() {
    const me = this.me, o = this.opts;
    if (me.done) return;
    if (me.lap >= this.laps) { me.done = true; me.time = this.t; this.state = 'done'; hap.end(); o.onFinish && o.onFinish(me); }
    else { hap.ok(); o.onLap && o.onLap(me.lap + 1); }
  }
  boost(t) { this.me.boost = Math.max(this.me.boost, t); }
  penalty() { this.me.slow = 1.6; this.me.spin = 1; }
  minimap(cv, extra) {
    const g = cv.getContext('2d'), tr = this.track;
    if (!this._mm) {
      let a = 1e9, b = -1e9, c = 1e9, d = -1e9; tr.P.forEach(p => { a = Math.min(a, p.x); b = Math.max(b, p.x); c = Math.min(c, p.z); d = Math.max(d, p.z); });
      const sc = (cv.width - 16) / Math.max(b - a, d - c); this._mm = { a, c, sc, ox: (cv.width - (b - a) * sc) / 2, oy: (cv.height - (d - c) * sc) / 2 };
    }
    const m = this._mm, X = p => m.ox + (p.x - m.a) * m.sc, Y = p => m.oy + (p.z - m.c) * m.sc;
    g.clearRect(0, 0, cv.width, cv.height);
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineJoin = 'round'; g.beginPath();
    tr.P.forEach((p, i) => i % 6 ? 0 : (i ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath(); g.stroke();
    for (const gt of this.gates) if (!gt.passed) { const p = tr.at(gt.s); g.fillStyle = '#ffd23f'; g.fillRect(X(p) - 2, Y(p) - 2, 4, 4); }
    [...this.karts].reverse().forEach((k, i) => { const p = tr.at(k.s, k.x); g.fillStyle = '#' + COLORS[this.karts.length - 1 - i].toString(16).padStart(6, '0'); g.beginPath(); g.arc(X(p), Y(p), k.player ? 5 : 3.5, 0, 7); g.fill(); if (k.player) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } });
  }
}

/* ───── タッチ操作：左側ドラッグでハンドル、右のボタンでドリフト ───── */
export function bindControls(getRace, pad, driftBtn, knob) {
  let id = null, x0 = 0;
  const R = () => getRace() || { input: {} };
  const set = v => { const r = R(); r.input.steer = Math.max(-1, Math.min(1, v)); if (knob) knob.style.transform = `translateX(${r.input.steer * 46}px)`; };
  pad.addEventListener('pointerdown', e => { id = e.pointerId; x0 = e.clientX; try { pad.setPointerCapture(id); } catch {} set(0); pad.classList.add('on'); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) set((e.clientX - x0) / 70); });
  const up = e => { if (e.pointerId === id) { id = null; set(0); pad.classList.remove('on'); } };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  const dOn = () => { R().input.drift = true; driftBtn.classList.add('on'); };
  const dOff = () => { if (R().input.drift) hap.tap(); R().input.drift = false; driftBtn.classList.remove('on'); };
  driftBtn.addEventListener('pointerdown', dOn); driftBtn.addEventListener('pointerup', dOff); driftBtn.addEventListener('pointercancel', dOff); driftBtn.addEventListener('pointerleave', dOff);
  hap.bind(driftBtn, () => {});        // 指を離した瞬間に触覚（iOS 26.5+ でも確実）
  const keys = new Set();
  const kb = () => set((keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0));
  const map = e => ({ ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', Space: 'd', ShiftLeft: 'd', ShiftRight: 'd' }[e.code]);
  addEventListener('keydown', e => { const k = map(e); if (!k) return; e.preventDefault(); if (k === 'd') dOn(); else { keys.add(k); kb(); } });
  addEventListener('keyup', e => { const k = map(e); if (!k) return; if (k === 'd') dOff(); else { keys.delete(k); kb(); } });
}

export const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor(t * 100) % 100).padStart(2, '0')}`;

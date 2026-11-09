// Healthzilla — stylized interactive 3D character (real face photo on a stylized body; NOT a body scan).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export const ANIMS = { idle: 'Idle', chest: 'Chest press', pulldown: 'Lat pulldown', legpress: 'Leg press', row: 'Cable row', squat: 'Squat' };
const SKIN = 0xc0846a, SHIRT = 0x2a2e35, PANTS = 0x17191d, HAIR = 0x1a1411, SHOE = 0xd9d9d9, METAL = 0x8a9099, PAD = 0x26282c, OR = 0xff7a1a;
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...o });
const M = { skin: mat(SKIN, { roughness: 0.6 }), shirt: mat(SHIRT), pants: mat(PANTS), hair: mat(HAIR, { roughness: 0.95 }), shoe: mat(SHOE), metal: mat(METAL, { metalness: 0.6, roughness: 0.35 }), pad: mat(PAD), or: mat(OR, { roughness: 0.5 }), stack: mat(0x3a3d44, { metalness: 0.4 }) };
const cap = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
const G = () => new THREE.Group();
let faceTex = null;
function loadFace() { if (!faceTex) { faceTex = new THREE.TextureLoader().load(new URL('../char/face.webp', import.meta.url).href); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4; } return faceTex; }

function buildHead() {
  const head = G(), R = 0.105, sc = new THREE.Vector3(0.9, 1.13, 1.0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), M.skin); skull.scale.copy(sc); head.add(skull);
  // face patch: front part of the head, texture projected straight-on so the photo reads naturally from the front
  const fg = new THREE.SphereGeometry(R * 1.012, 48, 40, Math.PI / 2 - 1.05, 2.1, 0.55, 1.95);
  const p = fg.attributes.position, uv = fg.attributes.uv; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < p.count; i++) { x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getY(i) - y0) / (y1 - y0));
  const face = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: loadFace(), transparent: true, roughness: 0.7, depthWrite: false }));
  face.scale.copy(sc); face.renderOrder = 2; head.add(face);
  // short dark hair: top cap + back/sides
  const top = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 32, 16, 0, Math.PI * 2, 0, 0.62), M.hair); top.scale.copy(sc); top.rotation.x = -0.12; head.add(top);
  const back = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 32, 20, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0.2, 1.55), M.hair); back.scale.copy(sc); head.add(back);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), M.skin); ear.scale.set(0.5, 1.2, 0.9); ear.position.set(s * R * 0.9, -0.005, -0.01); head.add(ear); }
  return head;
}

function buildBody() {
  const J = {}; const root = G(); J.root = root;
  const hips = G(); hips.position.y = 0.92; root.add(hips); J.hips = hips;
  const pelvis = cap(0.15, 0.06, M.pants); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(0.75, 1, 0.75); pelvis.position.y = 0.02; hips.add(pelvis);
  const spine = G(); hips.add(spine); J.spine = spine;
  const chest = G(); spine.add(chest); J.chest = chest;
  const prof = [[0, -0.02], [0.14, -0.01], [0.158, 0.06], [0.166, 0.15], [0.17, 0.25], [0.19, 0.35], [0.205, 0.43], [0.19, 0.49], [0.13, 0.535], [0.05, 0.55], [0, 0.552]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), M.shirt); torso.scale.set(1, 1, 0.66); chest.add(torso);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.01), M.or); stripe.position.set(0, 0.36, 0.128); chest.add(stripe);
  const neck = G(); neck.position.y = 0.52; chest.add(neck); J.neck = neck;
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 14), M.skin); nk.position.y = 0.04; neck.add(nk);
  const head = buildHead(); head.scale.setScalar(1.08); head.position.set(0, 0.175, 0.01); neck.add(head); J.head = head;
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    const sh = G(); sh.rotation.order = 'YXZ'; sh.position.set(s * 0.215, 0.46, 0); chest.add(sh); J['sh' + k] = sh;
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), M.shirt); sh.add(delt);
    const ua = cap(0.05, 0.2, M.skin); ua.position.y = -0.15; sh.add(ua);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.13, 16), M.shirt); sleeve.position.y = -0.06; sh.add(sleeve);
    const el = G(); el.position.y = -0.3; sh.add(el); J['el' + k] = el;
    const fa = cap(0.042, 0.2, M.skin); fa.position.y = -0.13; el.add(fa);
    const hand = G(); hand.position.y = -0.28; el.add(hand); J['hand' + k] = hand;
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), M.skin); hm.scale.set(0.8, 1.1, 0.6); hand.add(hm);
    const hp = G(); hp.position.set(s * 0.095, -0.03, 0); hips.add(hp); J['hip' + k] = hp;
    const th = cap(0.075, 0.3, M.pants); th.position.y = -0.22; hp.add(th);
    const kn = G(); kn.position.y = -0.44; hp.add(kn); J['kn' + k] = kn;
    const shn = cap(0.058, 0.3, M.pants); shn.position.y = -0.2; kn.add(shn);
    const an = G(); an.position.y = -0.42; kn.add(an); J['an' + k] = an;
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), M.shoe); ft.position.set(0, -0.035, 0.06); an.add(ft);
  }
  return J;
}

// cylinder between two world points
function rod(m, a, b) { if (m.parent) { a = m.parent.worldToLocal(a.clone()); b = m.parent.worldToLocal(b.clone()); } const d = new THREE.Vector3().subVectors(b, a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(L, 1e-3), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); }
const ROD = (r, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), m);
const box = (w, h, d, m, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; return b; };

function buildProps() {
  const P = {};
  // chest press: seat + upright back + side frame, two handles on levers
  { const g = G(); g.add(box(0.42, 0.08, 0.42, M.pad, 0, 0.45, 0.02), box(0.42, 0.62, 0.08, M.pad, 0, 0.86, -0.2), box(0.06, 0.45, 0.06, M.metal, 0, 0.22, 0));
    for (const s of [-1, 1]) g.add(box(0.06, 1.6, 0.06, M.metal, s * 0.42, 0.8, -0.28));
    g.add(box(0.9, 0.06, 0.06, M.metal, 0, 1.6, -0.28), box(0.28, 0.5, 0.14, M.stack, 0, 0.5, -0.45));
    const lv = [ROD(0.018, M.metal), ROD(0.018, M.metal)], hd = [ROD(0.024, M.or), ROD(0.024, M.or)]; lv.forEach(x => g.add(x)); hd.forEach(x => g.add(x));
    P.chest = { g, hips: new THREE.Vector3(0, 0.54, 0.02), upd(J) { [J.handL, J.handR].forEach((h, i) => { const w = h.getWorldPosition(new THREE.Vector3()), s = i ? -1 : 1; rod(lv[i], g.localToWorld(new THREE.Vector3(s * 0.42, 1.25, -0.28)), w); hd[i].position.copy(g.worldToLocal(w.clone())); hd[i].scale.set(1, 0.14, 1); hd[i].quaternion.identity(); }); } }; }
  // lat pulldown: seat, knee pad, tall frame, top pulley, bar on cable
  { const g = G(); g.add(box(0.42, 0.08, 0.4, M.pad, 0, 0.45, 0), box(0.06, 0.45, 0.06, M.metal, 0, 0.22, 0), box(0.4, 0.08, 0.12, M.pad, 0, 0.7, 0.24));
    g.add(box(0.08, 2.4, 0.08, M.metal, 0, 1.2, -0.45), box(0.08, 0.08, 0.6, M.metal, 0, 2.38, -0.17), box(0.3, 0.6, 0.14, M.stack, 0, 0.45, -0.55));
    const pul = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20), M.metal); pul.position.set(0, 2.33, 0.1); pul.rotation.y = Math.PI / 2; g.add(pul);
    const bar = ROD(0.015, M.metal), cab = ROD(0.005, M.metal), gr = [ROD(0.02, M.or), ROD(0.02, M.or)]; g.add(bar, cab, ...gr);
    P.pulldown = { g, hips: new THREE.Vector3(0, 0.54, 0), upd(J) { const a = J.handL.getWorldPosition(new THREE.Vector3()), b = J.handR.getWorldPosition(new THREE.Vector3()), dir = new THREE.Vector3().subVectors(a, b).normalize();
      rod(bar, b.clone().addScaledVector(dir, -0.18), a.clone().addScaledVector(dir, 0.18)); rod(cab, a.clone().add(b).multiplyScalar(0.5), g.localToWorld(new THREE.Vector3(0, 2.3, 0.1))); rod(gr[0], a.clone().addScaledVector(dir, -0.06), a.clone().addScaledVector(dir, 0.08)); rod(gr[1], b.clone().addScaledVector(dir, -0.08), b.clone().addScaledVector(dir, 0.06)); } }; }
  // 45° leg press: reclined back, sled platform on 45° guide rails
  { const g = G(), lean = -0.85; const bk = box(0.45, 0.7, 0.08, M.pad, 0, 0, 0); bk.position.set(0, 0.55 + 0.35 * Math.cos(lean), -0.14 + 0.35 * Math.sin(lean)); bk.rotation.x = lean; g.add(bk, box(0.45, 0.08, 0.36, M.pad, 0, 0.47, 0.02));
    g.add(box(0.1, 0.42, 0.1, M.metal, 0, 0.21, 0), box(0.9, 0.06, 1.7, M.metal, 0, 0.03, 0.75));
    const plate = box(0.52, 0.46, 0.04, M.metal, 0, 0, 0, -Math.PI / 4); g.add(plate);
    const rails = [ROD(0.022, M.or), ROD(0.022, M.or)]; g.add(...rails);
    for (const s of [-1, 1]) g.add(box(0.04, 0.04, 0.18, M.or, s * 0.28, 0.6, 0.12));
    P.legpress = { g, upd(J) { const a = J.anL.getWorldPosition(new THREE.Vector3()), b = J.anR.getWorldPosition(new THREE.Vector3()), m = a.add(b).multiplyScalar(0.5), off = new THREE.Vector3(0, 0.7071, 0.7071);
      g.worldToLocal(m); plate.position.copy(m).addScaledVector(off, 0.1); plate.position.z += 0.04; plate.position.y -= 0.04;
      rails.forEach((r, i) => { const x = i ? -0.3 : 0.3; const top = new THREE.Vector3(x, plate.position.y + 0.25, plate.position.z + 0.25); rod(r, g.localToWorld(new THREE.Vector3(x, 0.45, top.z - top.y + 0.45)), g.localToWorld(top)); }); } }; }
  // seated cable row: low bench, foot plate, low pulley in front
  { const g = G(); g.add(box(0.36, 0.08, 1.0, M.pad, 0, 0.36, 0.1), box(0.08, 0.32, 0.08, M.metal, 0, 0.16, 0.1));
    g.add(box(0.12, 0.9, 0.12, M.metal, 0, 0.45, 1.35), box(0.3, 0.7, 0.14, M.stack, 0, 0.35, 1.5));
    const fp = box(0.5, 0.3, 0.05, M.metal, 0, 0.22, 0.98); g.add(fp);
    const pul = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20), M.metal); pul.position.set(0, 0.55, 1.28); pul.rotation.y = Math.PI / 2; g.add(pul);
    const hd = ROD(0.022, M.or), cab = ROD(0.005, M.metal); g.add(hd, cab);
    P.row = { g, hips: new THREE.Vector3(0, 0.46, 0), upd(J) { const a = J.handL.getWorldPosition(new THREE.Vector3()), b = J.handR.getWorldPosition(new THREE.Vector3()), m = a.clone().add(b).multiplyScalar(0.5);
      rod(hd, b, a); rod(cab, m, g.localToWorld(new THREE.Vector3(0, 0.55, 1.28))); const f = g.worldToLocal(J.anL.getWorldPosition(new THREE.Vector3())); fp.position.z = f.z + 0.14; } }; }
  // squat: barbell on back + simple rack
  { const g = G(); for (const s of [-1, 1]) g.add(box(0.06, 1.9, 0.06, M.metal, s * 0.75, 0.95, -0.25), box(0.06, 0.06, 0.25, M.metal, s * 0.75, 1.45, -0.13));
    const bar = ROD(0.016, M.metal), pl = [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), M.stack), new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), M.stack)]; g.add(bar, ...pl);
    P.squat = { g, hips: null, upd(J) { const n = g.worldToLocal(J.neck.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, -0.02, -0.08)); rod(bar, g.localToWorld(n.clone().add(new THREE.Vector3(-0.95, 0, 0))), g.localToWorld(n.clone().add(new THREE.Vector3(0.95, 0, 0))));
      pl.forEach((p, i) => { p.position.copy(n).add(new THREE.Vector3(i ? -0.82 : 0.82, 0, 0)); p.rotation.z = Math.PI / 2; }); } }; }
  return P;
}

const L = (a, b, t) => a + (b - a) * t;
function zero(J) { for (const k in J) if (J[k].rotation && k !== 'root') J[k].rotation.set(0, 0, 0); J.hips.position.set(0, 0.92, 0); J.chest.scale.set(1, 1, 1); }
// each pose sets joint angles for phase p (0 = start, 1 = end of the rep)
const POSE = {
  idle(J, p, t) { const br = Math.sin(t * 1.6); J.chest.scale.set(1 + br * 0.012, 1 + br * 0.008, 1 + br * 0.02); J.spine.rotation.z = Math.sin(t * 0.5) * 0.02;
    J.head.rotation.y = Math.sin(t * 0.37) * 0.35; J.head.rotation.x = Math.sin(t * 0.23) * 0.05;
    for (const [k, s] of [['L', 1], ['R', -1]]) { J['sh' + k].rotation.set(Math.sin(t * 0.8 + s) * 0.04, 0, s * 0.1); J['el' + k].rotation.x = -0.15; J['hip' + k].rotation.z = s * 0.05; J['an' + k].rotation.z = -s * 0.05; } },
  seat(J, hp) { J.hips.position.copy(hp); for (const k of ['L', 'R']) { J['hip' + k].rotation.x = -1.5; J['kn' + k].rotation.x = 1.45; J['an' + k].rotation.x = 0.05; } J.hipL.rotation.z = 0.12; J.hipR.rotation.z = -0.12; },
  chest(J, p) { POSE.seat(J, new THREE.Vector3(0, 0.54, 0.02)); J.spine.rotation.x = -0.05;
    for (const [k, s] of [['L', 1], ['R', -1]]) { J['sh' + k].rotation.set(-1.42, s * L(1.3, 0.1, p), 0); J['el' + k].rotation.z = -s * L(1.35, 0.06, p); } },
  pulldown(J, p) { POSE.seat(J, new THREE.Vector3(0, 0.54, 0)); J.spine.rotation.x = L(0, -0.22, p); J.head.rotation.x = L(-0.15, 0, p);
    for (const [k, s] of [['L', 1], ['R', -1]]) { J['sh' + k].rotation.set(L(-0.2, 0.15, p), 0, s * L(2.75, 1.05, p)); J['el' + k].rotation.z = s * L(0.1, 1.9, p); } },
  legpress(J, p) { J.hips.position.set(0, 0.56, 0); J.spine.rotation.x = -0.85; J.head.rotation.x = 0.45;
    for (const [k, s] of [['L', 1], ['R', -1]]) { const th = L(-2.8, -2.45, p), kn = L(1.75, 0.12, p); J['hip' + k].rotation.set(th, 0, s * 0.14); J['kn' + k].rotation.x = kn; J['an' + k].rotation.x = -2.36 - th - kn + 0.0;
      J['sh' + k].rotation.set(-0.35, 0, s * 0.3); J['el' + k].rotation.x = -0.6; } },
  row(J, p) { J.hips.position.set(0, 0.46, 0); J.spine.rotation.x = L(0.38, -0.12, p);
    for (const [k, s] of [['L', 1], ['R', -1]]) { const th = -1.38, kn = L(0.55, 0.42, p); J['hip' + k].rotation.set(th, 0, s * 0.1); J['kn' + k].rotation.x = kn; J['an' + k].rotation.x = -Math.PI / 2 - th - kn;
      J['sh' + k].rotation.set(L(-1.55, 0.45, p) - J.spine.rotation.x, 0, s * L(0.12, 0.22, p)); J['el' + k].rotation.x = L(-0.05, -1.75, p); } },
  squat(J, p) { const d = p; J.hips.position.set(0, L(0.92, 0.6, d), L(0, -0.16, d)); J.spine.rotation.x = L(0.05, 0.55, d); J.head.rotation.x = -L(0.05, 0.45, d);
    for (const [k, s] of [['L', 1], ['R', -1]]) { const th = L(-0.05, -1.45, d), kn = L(0.08, 1.75, d); J['hip' + k].rotation.set(th, 0, s * 0.18); J['kn' + k].rotation.x = kn; J['an' + k].rotation.x = -th - kn;
      J['sh' + k].rotation.set(-0.35, 0, s * 1.15); J['el' + k].rotation.set(0, 0, 0); J['el' + k].rotation.x = -1.9; } },
};
const CAM = { idle: [0, 1.15, 0, 3.6], chest: [0, 0.95, 0.1, 3.5], pulldown: [0, 1.2, 0, 4.4], legpress: [0, 0.9, 0.45, 4.2], row: [0, 0.75, 0.5, 3.9], squat: [0, 1.0, 0, 4.2] };
const YAWC = { idle: -0.35, chest: -0.45, pulldown: -0.35, legpress: -1.15, row: -0.8, squat: -0.5 };
const PERIOD = { idle: 4, chest: 3.2, pulldown: 3.4, legpress: 3.6, row: 3.2, squat: 3.6 };

export function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export function mount(el, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xfff1e6, 0x20242b, 1.25)); const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(OR, 0.9); rim.position.set(-2.5, 2, -2.5); scene.add(rim);
  const turn = G(); scene.add(turn);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 1 })); floor.rotation.x = -Math.PI / 2; turn.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.26, 1.3, 64), new THREE.MeshBasicMaterial({ color: OR })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; turn.add(ring);
  const J = buildBody(); turn.add(J.root); const P = buildProps(); Object.values(P).forEach(x => { x.g.visible = false; turn.add(x.g); });
  let anim = ANIMS[opts.anim] ? opts.anim : 'idle', yaw = opts.yaw ?? -0.6, pitch = 0.12, drag = null, lastUser = -1e9, alive = true, t0 = performance.now();
  const set = a => { anim = ANIMS[a] ? a : 'idle'; t0 = performance.now(); Object.entries(P).forEach(([k, x]) => x.g.visible = k === anim); };
  set(anim);
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; dom.setPointerCapture(e.pointerId); dom.style.cursor = 'grabbing'; });
  dom.addEventListener('pointermove', e => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.012; pitch = Math.max(-0.15, Math.min(0.7, drag.pitch + (e.clientY - drag.y) * 0.006)); lastUser = performance.now(); });
  const up = () => { drag = null; dom.style.cursor = 'grab'; lastUser = performance.now(); }; dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
  const resize = () => { const w = el.clientWidth || 300, h = el.clientHeight || 300; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let visible = true; const io = new IntersectionObserver(es => visible = es[0].isIntersecting); io.observe(el);
  let autoYaw = yaw;
  function frame(now) {
    if (!alive) return; if (!el.isConnected) return dispose(); requestAnimationFrame(frame); if (!visible || document.hidden) return;
    const t = (now - t0) / 1000, T = PERIOD[anim], ph = (t % T) / T, p = ph < 0.45 ? 0.5 - 0.5 * Math.cos(Math.PI * ph / 0.45) : ph < 0.55 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (ph - 0.55) / 0.45);
    zero(J); POSE[anim](J, p, t); if (anim !== 'idle') { J.chest.scale.y = 1 + Math.sin(t * 2) * 0.006; }
    if (!drag && now - lastUser > 2500) { autoYaw += 0.004; yaw += (Math.sin(autoYaw) * 0.6 + YAWC[anim] - yaw) * 0.02; } else autoYaw = Math.asin(Math.max(-1, Math.min(1, (yaw - YAWC[anim]) / 0.6)));
    turn.rotation.y = yaw; turn.updateMatrixWorld(true); P[anim]?.upd(J);
    const [cx, cy, cz, dist] = CAM[anim], d = dist * (opts.compact ? 1.08 : 1) * Math.max(1, Math.pow(0.85 / cam.aspect, 0.8));
    cam.position.set(cx, cy + Math.sin(pitch) * d, cz + Math.cos(pitch) * d); cam.lookAt(cx, cy, cz * 0.5); renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
  function dispose() { if (!alive) return; alive = false; ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.forceContextLoss?.(); dom.remove(); }
  return { set, dispose, get anim() { return anim; } };
}

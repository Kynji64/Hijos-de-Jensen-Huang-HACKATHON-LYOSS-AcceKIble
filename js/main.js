/* =====================================================================
   CAMPUS SIN BARRERAS · UTFSM Casa Central — escena 3D + interfaz
   Hackathon LYOSS USM 2026 · Fase 1 (navegación exterior en tótem)
   ---------------------------------------------------------------------
   1. Utilidades y escena base (el mundo se gira para alinear la trama)
   2. Terreno en ladera (Av. España → Av. Los Placeres) con áreas verdes
   3. Calles con asfalto, veredas y nombres · senderos · escaleras
   4. Arquitectura por estilo (neogótico, Talleres, M·R·T, moderno…)
   5. Vegetación, mobiliario, tótems y ruta animada pegada al suelo
   6. Interfaz táctil (panel, tarjetas, Tour 360°, voz, inactividad)
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CAMPUS as C } from './data/campus-data.js';
import { makeTerrain, geo } from './terrain.js';
import { buildGraph, computeRoute, buildSteps } from './pathfinding/dijkstra.js';

const S = C.SCALE;
const IDLE_RESET_MS = 120000;
const TER = makeTerrain(C);
const G = buildGraph(C, TER);
const LV = [
  { name: 'Nivel Av. España', sub: 'Ladera y jardines' },
  { name: 'Terraza media',    sub: 'Casco histórico' },
  { name: 'Nivel Los Placeres', sub: 'Quezada Acharán' },
];

/* =====================================================================
   1. UTILIDADES Y ESCENA BASE
   ===================================================================== */
// Imagen (px) → mundo: se gira -ROT para que las calles queden paralelas al eje X
const RC = Math.cos(C.ROT * Math.PI / 180), RS = Math.sin(C.ROT * Math.PI / 180);
const toWorld = (px, py) => { const dx = px - C.ORIGIN.px, dy = py - C.ORIGIN.py; return new THREE.Vector2((RC * dx + RS * dy) * S, (-RS * dx + RC * dy) * S); };
const toImage = (x, z) => { const X = x / S, Z = z / S; return [C.ORIGIN.px + RC * X - RS * Z, C.ORIGIN.py + RS * X + RC * Z]; };
const H = (px, py) => TER.heightAt(px, py);
const wp = (px, py, lift = 0) => { const v = toWorld(px, py); return new THREE.Vector3(v.x, H(px, py) + lift, v.y); };
const nodePos = id => { const n = G.nodes[id]; const v = toWorld(n.px, n.py); return new THREE.Vector3(v.x, n.y, v.y); };

const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'labels';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe7f1);
scene.fog = new THREE.Fog(0xdfe7f1, 480, 1100);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 3000);
const HOME = { target: new THREE.Vector3(-6, 5, 2), position: new THREE.Vector3(-80, 205, 240) };
camera.position.copy(HOME.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 25, maxDistance: 520, maxPolarAngle: 1.3, screenSpacePanning: false, autoRotateSpeed: 0.6 });

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa9bb, 1.45));
const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
sun.position.set(-120, 220, 130);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 160, bottom: -160, near: 10, far: 600 });
sun.shadow.bias = -0.0006;
scene.add(sun);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...extra });
function box(w, h, d, material, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}
function addLabel(obj3d, html, cls, onClick) {
  const div = document.createElement('div');
  div.className = cls; div.innerHTML = html;
  if (onClick) div.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  const lbl = new CSS2DObject(div);
  obj3d.add(lbl);
  return lbl;
}
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* =====================================================================
   2. TERRENO EN LADERA CON ÁREAS VERDES (colores por vértice)
   ===================================================================== */
const greenPolys = C.GREENS.map(g => ({ ...g, poly: g.poly || geo.rectPoly(g.rect[0], g.rect[1], g.rect[2], g.rect[3], C.ROT) }));
const plazaPolys = C.PLAZAS.map(p => geo.rectPoly(p.rect[0], p.rect[1], p.rect[2], p.rect[3], C.ROT));
{
  const W = 620, D = 440, SX = 380, SZ = 270;
  const g = new THREE.PlaneGeometry(W, D, SX, SZ);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, colors = new Float32Array(pos.count * 3), col = new THREE.Color();
  const cSea = new THREE.Color(0x74a9d4), cCoast = new THREE.Color(0xcbc3ad), cCity = new THREE.Color(0xd3d9df), cCampus = new THREE.Color(0xebe5d6),
        cGrass = new THREE.Color(0x86b96b), cGarden = new THREE.Color(0x95c87a), cPark = new THREE.Color(0x8fbf72), cPlaza = new THREE.Color(0xe6dcc6), cSlope = new THREE.Color(0x7fae66);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 15, z = pos.getZ(i) + 10;
    pos.setX(i, x); pos.setZ(i, z);
    const [px, py] = toImage(x, z);
    const h = H(px, py);
    pos.setY(i, h);
    const s = TER.sAt(px, py), noise = (rnd() - 0.5) * 0.06;
    if (s < 0) col.copy(TER.isSea(px, py) ? cSea : cCoast);
    else {
      const inCampus = geo.inPoly(px, py, C.OUTLINE);
      const gz = greenPolys.find(gp => geo.inPoly(px, py, gp.poly));
      const slope = Math.abs(H(px + 6, py) - H(px - 6, py)) + Math.abs(H(px, py + 6) - H(px, py - 6));
      if (plazaPolys.some(pp => geo.inPoly(px, py, pp))) col.copy(cPlaza);
      else if (gz) col.copy(gz.kind === 'garden' ? cGarden : cPark).offsetHSL(0, 0, noise);
      else if (slope > 0.9) col.copy(inCampus ? cSlope : cGrass).offsetHSL(0, 0, noise);
      else col.copy(inCampus ? cCampus : cCity).offsetHSL(0, 0, noise * 0.3);
    }
    colors.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  terrain.receiveShadow = true;
  scene.add(terrain);
}

/* =====================================================================
   3. CALLES (asfalto + veredas + señalética) · SENDEROS · ESCALERAS
   ===================================================================== */
/** Densifica una polilínea en px cada `step` px */
function densify(pts, step = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** Cinta que sigue el terreno a lo largo de una polilínea (px). offset = desplazamiento lateral (unid.) */
function drapedStrip(pts, width, lift, material, offset = 0) {
  const d = densify(pts), verts = [], idx = [];
  const P = d.map(([x, y]) => toWorld(x, y));
  for (let i = 0; i < d.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(d.length - 1, i + 1)];
    let tx = b.x - a.x, tz = b.y - a.y; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const nx = -tz, nz = tx;
    for (const s of [-1, 1]) {
      const ox = P[i].x + nx * (offset + s * width / 2), oz = P[i].y + nz * (offset + s * width / 2);
      const [ix, iy] = toImage(ox, oz);
      verts.push(ox, H(ix, iy) + lift, oz);
    }
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true;
  return m;
}
const streetGroup = new THREE.Group(); scene.add(streetGroup);
// Jerarquía vial: calles públicas exteriores (asfalto oscuro, soleras, eje segmentado) vs.
// calles internas del recinto (pavimento claro, bordes blancos continuos, solera baja)
const asphalt = mat(0x474d55, { roughness: 0.92 }), curb = mat(0xd9d3c6), lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e6 });
const innerPave = mat(0xc2bcae, { roughness: 0.95 }), innerEdge = new THREE.MeshBasicMaterial({ color: 0xfbf9f3 }), innerCurb = mat(0xa39b8b);
const cobble = mat(0xe3d5b8, { roughness: 0.95 });
for (const [k, st] of Object.entries(C.STREETS)) {
  if (st.ext) {
    streetGroup.add(drapedStrip(st.pts, st.width, 0.14, asphalt));
    for (const s of [-1, 1]) streetGroup.add(drapedStrip(st.pts, 1.1, 0.26, curb, s * (st.width / 2 + 0.55)));
    const d = densify(st.pts, 4), dash = new THREE.PlaneGeometry(0.22, 1.5);
    for (let i = 0; i < d.length - 1; i += 2) {
      const a = wp(...d[i], 0.2), b = wp(...d[i + 1], 0.2);
      const m = new THREE.Mesh(dash, lineMat); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); m.rotateX(-Math.PI / 2); streetGroup.add(m);
    }
  } else {
    streetGroup.add(drapedStrip(st.pts, st.width, 0.17, innerPave));
    for (const s of [-1, 1]) {
      streetGroup.add(drapedStrip(st.pts, 0.16, 0.22, innerEdge, s * (st.width / 2 - 0.35)));
      streetGroup.add(drapedStrip(st.pts, 0.32, 0.27, innerCurb, s * (st.width / 2 + 0.16)));
    }
  }
}
// Nombres de calles pintados sobre el pavimento (en su tramo recto más largo)
function groundText(text, A, B, width, color = 'rgba(255,255,255,.92)') {
  const tex = canvasTex(1024, 96, (g, w, h) => {
    g.font = '800 54px system-ui, sans-serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.toUpperCase(), w / 2, h / 2 + 2);
  }, false);
  const len = Math.hypot(B.x - A.x, B.z - A.z);
  let h = Math.min(width * 0.62, 2.6), w = h * 1024 / 96;
  if (w > len * 0.92) { const k = len * 0.92 / w; w *= k; h *= k; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  let a = A, b = B; if (b.x < a.x) [a, b] = [b, a];          // que se lea de izquierda a derecha
  m.position.copy(a).lerp(b, 0.5); m.position.y += 0.3;
  m.rotation.order = 'YZX';                                    // R = rumbo · pendiente · acostado
  m.rotation.set(-Math.PI / 2, -Math.atan2(b.z - a.z, b.x - a.x), Math.atan2(b.y - a.y, len));
  m.renderOrder = 3; streetGroup.add(m);
}
{ // un rótulo por nombre de calle, en su tramo recto más largo
  const best = new Map();
  for (const st of Object.values(C.STREETS)) for (let i = 0; i < st.pts.length - 1; i++) {
    const L = Math.hypot(st.pts[i + 1][0] - st.pts[i][0], st.pts[i + 1][1] - st.pts[i][1]);
    if (!best.has(st.name) || L > best.get(st.name).L) best.set(st.name, { L, st, i });
  }
  for (const [name, { st, i }] of best)
    groundText(name, wp(...st.pts[i], 0.2), wp(...st.pts[i + 1], 0.2), st.width, st.ext ? 'rgba(255,255,255,.92)' : 'rgba(52,60,74,.88)');
}

// Senderos (adoquín) y escaleras, dibujados directamente desde la red de rutas
const pathGroup = new THREE.Group(); scene.add(pathGroup);
const stepA = mat(0xefe7d7), stepB = mat(0xddd2bd), balMat = mat(0xd8c7a5), railMat = mat(0xe8eef6);
const handrail = mat(0x55606c, { roughness: 0.5, metalness: 0.4 }), cheek = mat(0xc9bda4);
function ribbon(a, b, width, material, thick = 0.12) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, thick, a.distanceTo(b) + 0.05), material);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.receiveShadow = true;
  return m;
}
const jointGeo = new THREE.CylinderGeometry(1, 1, 0.12, 14);
for (const e of G.edges) {
  if (e.kind !== 'path') continue;
  const A = nodePos(e.a), B = nodePos(e.b), width = e.width || 1.9;
  if (e.type === 's') {
    const lo = A.y < B.y ? A : B, hi = A.y < B.y ? B : A;
    const dir = new THREE.Vector3(hi.x - lo.x, 0, hi.z - lo.z), L = dir.length(); dir.normalize();
    const n = Math.max(4, Math.round((hi.y - lo.y) / 0.32)), ang = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < n; i++) {
      const top = lo.y + (hi.y - lo.y) * (i + 1) / n, t = (i + 0.5) / n, hgt = top - lo.y + 1.2;
      const s = box(width, hgt, L / n + 0.03, i % 2 ? stepA : stepB, false);
      s.position.set(lo.x + dir.x * L * t, top - hgt / 2 + 0.1, lo.z + dir.z * L * t); s.rotation.y = ang; pathGroup.add(s);
    }
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    if (width > 4) {      // balaustradas de piedra en la escalinata monumental
      for (const s of [1, -1]) { const o = side.clone().multiplyScalar(s * (width / 2 + 0.35)); pathGroup.add(ribbon(lo.clone().add(o).setY(lo.y + 0.9), hi.clone().add(o).setY(hi.y + 0.9), 0.55, balMat, 1.2)); }
    } else {              // muros laterales bajos + pasamanos metálico en ambos costados
      for (const s of [1, -1]) {
        const o = side.clone().multiplyScalar(s * (width / 2 + 0.12));
        pathGroup.add(ribbon(lo.clone().add(o).setY(lo.y + 0.3), hi.clone().add(o).setY(hi.y + 0.3), 0.22, cheek, 0.6));
        pathGroup.add(ribbon(lo.clone().add(o).setY(lo.y + 1.05), hi.clone().add(o).setY(hi.y + 1.05), 0.09, handrail, 0.09));
        for (const t of [0.05, 0.5, 0.95]) { const p = lo.clone().lerp(hi, t).add(o); const post = box(0.08, 0.8, 0.08, handrail, false); post.position.set(p.x, p.y + 0.65, p.z); pathGroup.add(post); }
      }
    }
  } else {
    A.y += 0.1; B.y += 0.1;
    pathGroup.add(ribbon(A, B, width, cobble));
    for (const P of [A, B]) { const j = new THREE.Mesh(jointGeo, cobble); j.scale.set(width / 2, 1, width / 2); j.position.copy(P); pathGroup.add(j); }
    if (e.type === 'r') {   // rampa: barandas a ambos lados
      const dir = B.clone().sub(A), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(width / 2 + 0.15);
      for (const s of [1, -1]) pathGroup.add(ribbon(A.clone().addScaledVector(side, s).setY(A.y + 0.9), B.clone().addScaledVector(side, s).setY(B.y + 0.9), 0.12, railMat, 0.12));
    }
  }
}

// Descanso semicircular de la escalinata de Acceso Av. España
{
  const p = wp(791, 130), disc = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.5, 40), mat(0xe8dfcc));
  disc.position.set(p.x, p.y + 0.05, p.z); disc.receiveShadow = true; pathGroup.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.18, 6, 40, Math.PI), balMat);
  ring.rotation.set(-Math.PI / 2, 0, -0.38); ring.position.set(p.x, p.y + 0.6, p.z); pathGroup.add(ring);
}
// Marcadores de escalera: uno por tramo (grupo conectado de aristas con hasStairs). Ocultos por defecto:
// la vista de accesibilidad los muestra con window.campus.setStairMarkers(true).
const stairMarkers = [];
{
  const stairEdges = G.edges.filter(e => e.hasStairs), seen = new Set();
  for (const e0 of stairEdges) {
    if (seen.has(e0)) continue;
    const group = [e0], nodes = new Set([e0.a, e0.b]); seen.add(e0);
    for (let grew = true; grew;) { grew = false; for (const e of stairEdges) if (!seen.has(e) && e.name === e0.name && (nodes.has(e.a) || nodes.has(e.b))) { seen.add(e); group.push(e); nodes.add(e.a); nodes.add(e.b); grew = true; } }
    const pts = [...nodes].map(nodePos), c = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(pts.length);
    const anchor = new THREE.Object3D(); anchor.position.set(c.x, Math.max(...pts.map(q => q.y)) + 2.2, c.z); scene.add(anchor);
    const lbl = addLabel(anchor, '🪜', 'stairlbl'); lbl.element.title = e0.name || 'Escalera';
    stairMarkers.push(lbl);
  }
}
function setStairMarkers(on) { document.body.classList.toggle('stairs-on', !!on); }

/* =====================================================================
   4. ARQUITECTURA POR ESTILO (coordenadas locales del edificio, en px)
   ===================================================================== */
const TEX = {
  gothic: canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#eadcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6c6a6'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 5, w, 5);
    g.fillStyle = '#c9b48e'; g.beginPath(); g.moveTo(17, 112); g.lineTo(17, 52); g.quadraticCurveTo(17, 26, 32, 18); g.quadraticCurveTo(47, 26, 47, 52); g.lineTo(47, 112); g.fill();
    g.fillStyle = '#34424f'; g.beginPath(); g.moveTo(21, 108); g.lineTo(21, 54); g.quadraticCurveTo(21, 32, 32, 25); g.quadraticCurveTo(43, 32, 43, 54); g.lineTo(43, 108); g.fill();
    g.strokeStyle = '#c9b48e'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 26); g.lineTo(32, 108); g.moveTo(21, 70); g.lineTo(43, 70); g.stroke();
  }),
  brick: canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#b8694d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#e7d9c4'; g.fillRect(12, 22, 40, 92); g.fillStyle = '#3d4b58'; g.fillRect(15, 25, 34, 86);
    g.fillStyle = '#e7d9c4'; for (let x = 15; x < 49; x += 11) g.fillRect(x + 10, 25, 1.5, 86); for (let y = 25; y < 111; y += 14) g.fillRect(15, y + 13, 34, 1.5);
  }),
  bands: canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#d9d3c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#2d4054'; g.fillRect(0, 26, w, 30);
    g.fillStyle = '#8aa1b6'; g.fillRect(0, 26, w, 3); g.fillStyle = '#cfc8bc'; for (let x = 0; x < w; x += 16) g.fillRect(x, 26, 2, 30);
  }),
  curtain: canvasTex(64, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b9cde0'); gr.addColorStop(1, '#8fa9c2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 3, h); g.fillRect(31, 0, 2, h);
  }),
  pavers: canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#e9e0cc'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,100,70,.25)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }),
  pool: canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3fa7d8'); gr.addColorStop(1, '#2d8cc0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(8, i * h / 6); g.lineTo(w - 8, i * h / 6); g.stroke(); }
    g.fillStyle = 'rgba(10,40,80,.5)'; for (let i = 0; i < 6; i++) g.fillRect(12, i * h / 6 + h / 12 - 1.5, w - 24, 3);
  }, false),
};
function facadeMats(tex, color, w, d, h, tileW = 4, tileH = 4.2, roofColor = 0xbfb8ad) {
  const side = len => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(len / tileW)), Math.max(1, h / tileH)); return mat(color, { map: t }); };
  const sx = side(d), sz = side(w), top = mat(roofColor);
  return [sx, sx, top, top, sz, sz];
}
function gableRoof(w, d, axis, rise, color, overhang = 1.1) {
  const across = (axis === 'x' ? d : w) * overhang, length = (axis === 'x' ? w : d) * 1.04;
  const shape = new THREE.Shape([new THREE.Vector2(-across / 2, 0), new THREE.Vector2(across / 2, 0), new THREE.Vector2(0, rise)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat(color, { roughness: 0.8 })); m.castShadow = m.receiveShadow = true;
  return m;
}
const TEJA = 0x8a3a24;
/** Rectángulo local (px) → centro y tamaño en unidades */
const LR = (x0, z0, x1, z1) => ({ cx: (x0 + x1) / 2 * S, cz: (z0 + z1) / 2 * S, w: Math.abs(x1 - x0) * S, d: Math.abs(z1 - z0) * S });

/** Volumen con fachada texturizada desde `bottom` hasta `top` */
function body(g, r, bottom, top, tex, color, tileW, tileH, roof) {
  const hgt = top - bottom, b = box(r.w, hgt, r.d, facadeMats(tex, color, r.w, r.d, hgt, tileW, tileH, roof));
  b.position.set(r.cx, bottom + hgt / 2, r.cz); g.add(b); return b;
}
function gothicWing(g, x0, z0, x1, z1, ctx, h, axis, opts = {}) {
  const r = LR(x0, z0, x1, z1), top = ctx.base + h;
  body(g, r, ctx.bottom, top, opts.tex || TEX.gothic, opts.color || 0xffffff, 4, 4.2);
  const cornice = box(r.w + 0.4, 0.5, r.d + 0.4, mat(0xd8c7a5)); cornice.position.set(r.cx, top + 0.25, r.cz); g.add(cornice);
  const roof = gableRoof(r.w, r.d, axis, Math.min(r.w, r.d) * (opts.rise || 0.5), opts.roof || TEJA); roof.position.set(r.cx, top + 0.5, r.cz); g.add(roof);
  return { r, top };
}
function pinnacle(g, x, z, y, s = 1) {
  const p = new THREE.Mesh(new THREE.ConeGeometry(0.45 * s, 2.6 * s, 4), mat(0xd8c7a5)); p.rotation.y = Math.PI / 4;
  p.position.set(x, y + 1.3 * s, z); p.castShadow = true; g.add(p);
}
function lawn(g, r, y, color = 0x8cc272) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), mat(color)); m.rotation.x = -Math.PI / 2; m.position.set(r.cx, y + 0.08, r.cz); m.receiveShadow = true; g.add(m); return m;
}

const BUILDERS = {
  /* Edificio A · alas neogóticas simétricas, Aula Magna y Torre del Reloj hacia Agustín Edwards */
  'gothic-a'(g, p, ctx) {
    const W = p.w / 2, D = p.d / 2;
    const front = gothicWing(g, -W, -D, W, -D + 20, ctx, p.h, 'x');
    gothicWing(g, -W, -D + 20, -W + 22, D, ctx, p.h - 0.8, 'z');
    gothicWing(g, W - 22, -D + 20, W, D, ctx, p.h - 0.8, 'z');
    gothicWing(g, -14, -D + 20, 14, D, ctx, p.h + 1.2, 'z', { rise: 0.6 });
    lawn(g, LR(-W + 22, -D + 20, -14, D), ctx.base); lawn(g, LR(14, -D + 20, W - 22, D), ctx.base);
    for (const x of [-W, W]) for (const z of [-D, -D + 20]) pinnacle(g, x * S, z * S, front.top + 0.5);
    const tw = 22 * S, tz = (-D - 4) * S, th = ctx.base + p.h + 11;
    body(g, { cx: 0, cz: tz, w: tw, d: tw }, ctx.bottom, th, TEX.gothic, 0xffffff, 2.8, 4.6);
    const belfry = box(tw + 0.7, 0.9, tw + 0.7, mat(0xd8c7a5)); belfry.position.set(0, th + 0.45, tz); g.add(belfry);
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xfdfaf0 }), handMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
      const face = new THREE.Mesh(new THREE.CircleGeometry(tw * 0.32, 32), clockMat);
      face.position.set(nx * (tw / 2 + 0.04), th - 2.4, tz + nz * (tw / 2 + 0.04)); face.rotation.y = a; g.add(face);
      const h1 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, tw * 0.25), handMat); h1.position.copy(face.position).add(new THREE.Vector3(nx * 0.02, tw * 0.09, nz * 0.02)); h1.rotation.y = a; g.add(h1);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.62, 7.5, 4), mat(0x4d4a52, { roughness: 0.6 })); spire.rotation.y = Math.PI / 4;
    spire.position.set(0, th + 0.9 + 3.75, tz); spire.castShadow = true; g.add(spire);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) pinnacle(g, dx * tw / 2, tz + dz * tw / 2, th + 0.9, 0.8);
    return ctx.base + p.h + 6;
  },
  /* Edificio B · claustro con la Piscina Universitaria en su patio interior */
  'gothic-court'(g, p, ctx) {
    const W = p.w / 2, D = p.d / 2, t = Math.round(p.d * 0.24);
    gothicWing(g, -W, -D, W, -D + t, ctx, p.h, 'x');
    gothicWing(g, -W, D - t, W, D, ctx, p.h, 'x');
    gothicWing(g, -W, -D + t, -W + t, D - t, ctx, p.h, 'z');
    gothicWing(g, W - t, -D + t, W, D - t, ctx, p.h, 'z');
    const inner = LR(-W + t, -D + t, W - t, D - t);
    lawn(g, inner, ctx.base, 0x9fd083);
    if (p.pool) {
      const P = p.pool, deck = LR(P.dx - P.w / 2 - 9, P.dz - P.d / 2 - 8, P.dx + P.w / 2 + 9, P.dz + P.d / 2 + 8);
      const dk = box(deck.w, 0.3, deck.d, mat(0xe9e6df)); dk.position.set(deck.cx, ctx.base + 0.2, deck.cz); g.add(dk);
      const wr = LR(P.dx - P.w / 2, P.dz - P.d / 2, P.dx + P.w / 2, P.dz + P.d / 2);
      const coping = box(wr.w + 0.5, 0.42, wr.d + 0.5, mat(0xf6f4ef)); coping.position.set(wr.cx, ctx.base + 0.24, wr.cz); g.add(coping);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(wr.w, wr.d), new THREE.MeshStandardMaterial({ map: TEX.pool, roughness: 0.15, metalness: 0.1 }));
      water.rotation.x = -Math.PI / 2; water.position.set(wr.cx, ctx.base + 0.47, wr.cz); g.add(water);
      for (const s of [-1, 1]) { const bench = box(2.4, 0.35, 0.6, mat(0x9c7b56)); bench.position.set(wr.cx + s * (wr.w / 2 + 2.2), ctx.base + 0.5, wr.cz + wr.d / 2 + 0.6); g.add(bench); }
    }
    return ctx.base + p.h + 4;
  },
  /* Edificio C · Talleres: nave en diente de sierra + pabellones de ladrillo en los extremos */
  talleres(g, p, ctx) {
    const W = p.w / 2, D = p.d / 2, pv = 40;
    gothicWing(g, -W, -D, -W + pv, D, ctx, p.h + 1.5, 'z', { tex: TEX.brick, rise: 0.42 });
    gothicWing(g, W - pv, -D, W, D, ctx, p.h + 1.5, 'z', { tex: TEX.brick, rise: 0.42 });
    const r = LR(-W + pv, -D + 6, W - pv, D - 6), top = ctx.base + p.h;
    body(g, r, ctx.bottom, top, TEX.brick, 0xffffff, 4, 4.2);
    const teeth = Math.round(r.w / 4.2), tw = r.w / teeth, rise = 2.6;
    const shape = new THREE.Shape(); shape.moveTo(-r.w / 2, 0);
    for (let i = 0; i < teeth; i++) { const x = -r.w / 2 + i * tw; shape.lineTo(x, rise); shape.lineTo(x + tw, 0); }
    shape.lineTo(-r.w / 2, 0);
    const sg = new THREE.ExtrudeGeometry(shape, { depth: r.d, bevelEnabled: false }); sg.translate(0, 0, -r.d / 2);
    const roof = new THREE.Mesh(sg, mat(0x9aa1a8, { roughness: 0.55, metalness: 0.2 })); roof.position.set(r.cx, top, r.cz); roof.castShadow = true; g.add(roof);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x3b7fa8, emissiveIntensity: 0.35, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < teeth; i++) { const pane = new THREE.Mesh(new THREE.PlaneGeometry(r.d * 0.96, rise * 0.88), glass); pane.rotation.y = Math.PI / 2; pane.position.set(r.cx - r.w / 2 + i * tw + 0.05, top + rise * 0.46, r.cz); g.add(pane); }
    return top + rise + 3;
  },
  'gothic-pav'(g, p, ctx) { const o = gothicWing(g, -p.w / 2, -p.d / 2, p.w / 2, p.d / 2, ctx, p.h, p.w >= p.d ? 'x' : 'z', { rise: 0.55 }); return o.top + 4; },
  chalet(g, p, ctx) {
    const r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2), top = ctx.base + p.h;
    body(g, r, ctx.bottom, top, TEX.gothic, 0xfff4e0, 3.2, 3.2);
    const hip = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2 * 1.12, 1, 4), mat(TEJA)); hip.rotation.y = Math.PI / 4;
    hip.scale.set(r.w, 3.4, r.d); hip.position.set(0, top + 1.7, 0); hip.castShadow = true; g.add(hip);
    const chim = box(0.7, 2.4, 0.7, mat(0x9b5a43)); chim.position.set(r.w * 0.25, top + 2.2, -r.d * 0.15); g.add(chim);
    return top + 5;
  },
  mrt(g, p, ctx) {   // M · R · T: mismo lenguaje (bandas horizontales + cubierta técnica)
    const r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2), top = ctx.base + p.h;
    body(g, r, ctx.bottom, top, TEX.bands, 0xffffff, 4, 3.0, 0x8d949b);
    const slab = box(r.w + 0.6, 0.45, r.d + 0.6, mat(0xcfc8bc)); slab.position.set(0, top + 0.22, 0); g.add(slab);
    const core = box(Math.min(r.w, r.d) * 0.35, 2, Math.min(r.w, r.d) * 0.35, mat(0xbdb6aa)); core.position.set(-r.w * 0.2, top + 1.2, 0); g.add(core);
    for (const k of [0.1, 0.3]) { const hv = box(1.3, 0.9, 1, mat(0x9ba3ab)); hv.position.set(r.w * k, top + 0.9, r.d * 0.15); g.add(hv); }
    return top + 3.5;
  },
  modern(g, p, ctx) {
    const r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2), top = ctx.base + p.h;
    body(g, r, ctx.bottom, top, TEX.curtain, 0xffffff, 3, 3.0, 0xe9ecef);
    const par = box(r.w + 0.25, 0.6, r.d + 0.25, mat(0xf4f6f8)); par.position.set(0, top + 0.3, 0); g.add(par);
    return top + 3;
  },
  'modern-l'(g, p, ctx) {   // Edificio P: planta continua en "L"
    const W = p.w / 2, D = p.d / 2, top = ctx.base + p.h;
    for (const r of [LR(-W, -D, W, -D + 52), LR(W - 56, -D + 52, W, D)]) {
      body(g, r, ctx.bottom, top, TEX.curtain, 0xffffff, 3, 3.0, 0xe9ecef);
      const par = box(r.w + 0.25, 0.6, r.d + 0.25, mat(0xf4f6f8)); par.position.set(r.cx, top + 0.3, r.cz); g.add(par);
    }
    return top + 3;
  },
  kiosk(g, p, ctx) {        // Sansanito
    const r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2), top = ctx.base + p.h;
    const b = box(r.w, top - ctx.bottom, r.d, mat(0xf7f7f5)); b.position.set(0, (top + ctx.bottom) / 2, 0); g.add(b);
    const band = box(r.w + 0.1, 0.6, r.d + 0.1, mat(0xd62839)); band.position.set(0, top - 0.5, 0); g.add(band);
    const sign = new THREE.Group();
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xd62839 });
    sign.add(box(0.5, 1.8, 0.3, crossMat, false), box(1.8, 0.5, 0.3, crossMat, false));
    sign.position.set(0, top + 1.4, 0); g.add(sign);
    return top + 3;
  },
  parts(g, p, ctx) {         // bloque compuesto (P1-P2): rectángulos locales [x0,z0,x1,z1,h]
    let top = ctx.base;
    for (const [x0, z0, x1, z1, h] of p.parts) {
      const r = LR(x0, z0, x1, z1), t = ctx.base + h; top = Math.max(top, t);
      body(g, r, ctx.bottom, t, TEX.curtain, 0xffffff, 3, 3.0, 0xe9ecef);
      const par = box(r.w + 0.25, 0.6, r.d + 0.25, mat(0xf4f6f8)); par.position.set(r.cx, t + 0.3, r.cz); g.add(par);
    }
    return top + 3;
  },
  pool(g, p, ctx) {          // Piscina Universitaria (patio interior del B)
    const y = ctx.base, deck = LR(-p.w / 2 - 9, -p.d / 2 - 8, p.w / 2 + 9, p.d / 2 + 8);
    const dk = box(deck.w, 0.3, deck.d, mat(0xe9e6df)); dk.position.set(0, y + 0.22, 0); g.add(dk);
    const wr = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2);
    const coping = box(wr.w + 0.5, 0.42, wr.d + 0.5, mat(0xf6f4ef)); coping.position.set(0, y + 0.26, 0); g.add(coping);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(wr.w, wr.d), new THREE.MeshStandardMaterial({ map: TEX.pool, roughness: 0.15, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, y + 0.49, 0); g.add(water);
    for (const s of [-1, 1]) { const st = box(1.1, 0.7, 0.9, mat(0xffffff)); st.position.set(s * (wr.w / 2 - 0.6), y + 0.6, -wr.d / 2 - 0.4); g.add(st); }
    for (const s of [-1, 1]) { const bench = box(2.4, 0.35, 0.6, mat(0x9c7b56)); bench.position.set(s * (wr.w / 2 + 2.2), y + 0.55, wr.d / 2 + 0.6); g.add(bench); }
    return y + 3;
  },
  plaza(g, p, ctx) {         // Patio Central: pavimento con jardineras simétricas
    const y = ctx.base, r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2);
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), new THREE.MeshStandardMaterial({ map: TEX.pavers, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 }));
    pave.material.map.repeat.set(r.w / 3, r.d / 3); pave.rotation.x = -Math.PI / 2; pave.position.y = y + 0.13; pave.receiveShadow = true; g.add(pave);
    const planterMat = mat(0xb9a98d), plantMat = mat(0x5f9e52, { flatShading: true }), benchMat = mat(0x8a6a48);
    for (const sx of [-1, 1]) for (const z of [-55, -5, 45]) {
      const pl = box(1.9, 0.7, 1.9, planterMat); pl.position.set(sx * (p.w / 2 - 14) * S, y + 0.45, z * S); g.add(pl);
      const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), plantMat); sh.position.set(sx * (p.w / 2 - 14) * S, y + 1.3, z * S); sh.castShadow = true; g.add(sh);
      const b = box(0.6, 0.45, 2.2, benchMat); b.position.set(sx * (p.w / 2 - 26) * S, y + 0.4, (z + 22) * S); g.add(b);
    }
    return y + 3;
  },
  garden(g, p, ctx) {        // Patio de los Cañones: jardines geométricos con setos bajos
    const at = (dx, dz) => { const [ix, iy] = geo.local(p.px, p.py, dx, dz, p.rot); return H(ix, iy); };
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(p.w * S, p.d * S), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.rotation.x = -Math.PI / 2; hit.position.y = ctx.base + 0.3; g.add(hit);
    const bed = mat(0x86c26c), hedge = mat(0x3f7d3a, { flatShading: true });
    // cuatro parterres en rombo (sector oriente, junto a F2)
    for (const [dx, dz] of [[37, -27], [113, -27], [37, 27], [113, 27]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(13 * S, 13 * S, 0.25, 4), bed); m.position.set(dx * S, at(dx, dz) + 0.2, dz * S); g.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(13 * S, 0.22, 4, 4), hedge); rim.rotation.x = Math.PI / 2; rim.position.set(dx * S, at(dx, dz) + 0.38, dz * S); g.add(rim);
    }
    // parterre ovalado (sector poniente, alrededor del cañón)
    for (const [dx, dz] of [[-125, -30], [-55, -30], [-125, 30], [-55, 30]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.25, 20), bed); m.scale.set(16 * S, 1, 10 * S); m.position.set(dx * S, at(dx, dz) + 0.2, dz * S); g.add(m);
    }
    // seto perimetral bajo
    for (const [x0, z0, x1, z1] of [[-p.w / 2, -p.d / 2, p.w / 2, -p.d / 2 + 2], [-p.w / 2, p.d / 2 - 2, p.w / 2, p.d / 2]]) {
      const r = LR(x0, z0, x1, z1), m = box(r.w, 0.55, Math.max(0.3, r.d), hedge); m.position.set(r.cx, at(0, (z0 + z1) / 2) + 0.3, r.cz); g.add(m);
    }
    return ctx.base + 3;
  },
  tennis(g, p, ctx) { return court(g, p, ctx, 'tennis'); },
  field(g, p, ctx) { return court(g, p, ctx, 'field'); },
  multi(g, p, ctx) { return court(g, p, ctx, 'multi'); },
};

function court(g, p, ctx, kind) {
  const r = LR(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2), y = ctx.base;
  const pad = box(r.w + 1, Math.max(0.4, y - ctx.bottom + 0.3), r.d + 1, mat(kind === 'field' ? 0x6f9f5c : kind === 'tennis' ? 0x5f8f6a : 0x9aa7b3), false);
  pad.position.set(0, (y + ctx.bottom) / 2 + 0.05, 0); g.add(pad);
  const tex = canvasTex(kind === 'tennis' ? 420 : 256, kind === 'field' ? 400 : kind === 'tennis' ? 250 : 420, (c, w, h) => {
    if (kind === 'tennis') {
      c.fillStyle = '#3f8f5e'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f6fa8'; c.fillRect(40, 30, w - 80, h - 60);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(40, 30, w - 80, h - 60); c.strokeRect(40, 52, w - 80, h - 104);
      c.beginPath(); c.moveTo(w / 2, 24); c.lineTo(w / 2, h - 24); c.stroke();
      c.beginPath(); c.moveTo(w / 2 - 80, h / 2); c.lineTo(w / 2 + 80, h / 2); c.moveTo(w / 2 - 80, 52); c.lineTo(w / 2 - 80, h - 52); c.moveTo(w / 2 + 80, 52); c.lineTo(w / 2 + 80, h - 52); c.stroke();
    } else if (kind === 'field') {
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#3f9b4f' : '#48a959'; c.fillRect(0, i * h / 12, w, h / 12); }
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(14, 14, w - 28, h - 28);
      c.beginPath(); c.moveTo(14, h / 2); c.lineTo(w - 14, h / 2); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 30, 0, Math.PI * 2); c.stroke();
      c.strokeRect(68, 14, 120, 56); c.strokeRect(68, h - 70, 120, 56); c.strokeRect(100, 14, 56, 20); c.strokeRect(100, h - 34, 56, 20);
    } else {   // dos canchas multiuso
      for (const [y0, y1] of [[10, h / 2 - 5], [h / 2 + 5, h - 10]]) {
        c.fillStyle = '#2f6fb3'; c.fillRect(6, y0, w - 12, y1 - y0); c.fillStyle = '#e07b39'; c.fillRect(20, y0 + 12, w - 40, y1 - y0 - 24);
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(20, y0 + 12, w - 40, y1 - y0 - 24);
        const my = (y0 + y1) / 2; c.beginPath(); c.moveTo(20, my); c.lineTo(w - 20, my); c.stroke(); c.beginPath(); c.arc(w / 2, my, 18, 0, Math.PI * 2); c.stroke();
      }
    }
  }, false);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  surf.rotation.x = -Math.PI / 2; surf.position.set(0, y + 0.4, 0); surf.receiveShadow = true; g.add(surf);
  const fence = new THREE.MeshStandardMaterial({ color: 0x2c3e50, transparent: true, opacity: 0.4 });
  for (const [fw, fd, fx, fz] of [[r.w, 0.12, 0, -r.d / 2], [r.w, 0.12, 0, r.d / 2], [0.12, r.d, -r.w / 2, 0], [0.12, r.d, r.w / 2, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, 1.6, fd), fence); f.position.set(fx, y + 1.2, fz); g.add(f);
  }
  const white = mat(0xffffff);
  if (kind === 'field') for (const s of [-1, 1]) {
    const z = s * (r.d / 2 - 1.1);
    for (const dx of [-1.9, 1.9]) { const post = box(0.22, 2, 0.22, white); post.position.set(dx, y + 1.4, z); g.add(post); }
    const bar = box(4, 0.22, 0.22, white); bar.position.set(0, y + 2.4, z); g.add(bar);
  }
  return y + 4;
}

/* ---------- Construcción de lugares y volúmenes de contexto ---------- */
const pickables = [];
const placeObjs = {};
function buildVolume(p, pickId) {
  const c = toWorld(p.px, p.py);
  // altura del terreno en el centro y en las esquinas (los edificios en talud se "entierran")
  const corners = geo.rectPoly(p.px, p.py, p.w, p.d, p.rot).map(([x, y]) => H(x, y));
  const base = H(p.px, p.py), bottom = Math.min(base, ...corners) - 1.5;
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.y);
  g.rotation.y = -(p.rot - C.ROT) * Math.PI / 180;
  const top = BUILDERS[p.style](g, p, { base, bottom });
  scene.add(g);
  if (pickId) g.traverse(o => { if (o.isMesh) { o.userData.placeId = pickId; pickables.push(o); } });
  return { g, top, base, c };
}
for (const p of C.PLACES) {
  const { g, top, base, c } = buildVolume(p, p.id);
  const cat = C.CATS[p.cat];
  const anchor = new THREE.Object3D(); anchor.position.set(c.x, top + 1.2, c.y); scene.add(anchor);
  const label = addLabel(anchor, `<span class="b" style="background:${cat.css}">${p.icon || p.id}</span><span class="n">${p.short || p.name}${p.sub ? `<em>${p.sub}</em>` : ''}</span>`,
    'lbl', () => selectPlace(p.id, true));
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  placeObjs[p.id] = { place: p, group: g, label, top, level: TER.levelAt(p.px, p.py), center: new THREE.Vector3(c.x, base, c.y), meshes };
}
for (const d of C.DECOR) buildVolume(d, null);

/* =====================================================================
   5. VEGETACIÓN, MOBILIARIO, TÓTEMS Y RUTA
   ===================================================================== */
// Cañón histórico en el Patio de los Cañones + bancas y jardineras en los patios
{
  const pc = wp(381, 369), cannon = new THREE.Group();
  const iron = mat(0x2f3439, { roughness: 0.5, metalness: 0.6 }), wood = mat(0x6b4a2f);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 3, 16), iron); barrel.rotation.z = Math.PI / 2 - 0.15; barrel.position.y = 1.1;
  const carriage = box(2, 0.5, 0.9, wood); carriage.position.y = 0.55;
  for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 18), wood); wh.rotation.x = Math.PI / 2; wh.position.set(-0.4, 0.55, s * 0.55); cannon.add(wh); }
  const plinth = box(3.2, 0.4, 2, mat(0xd8cdb6)); plinth.position.y = 0.2;
  cannon.add(plinth, carriage, barrel); cannon.position.copy(pc); cannon.rotation.y = 0.6; scene.add(cannon);
  const benchMat = mat(0x8a6a48), planterMat = mat(0xb9a98d), plantMat = mat(0x5f9e52, { flatShading: true });
  const bench = (px, py, rot = 0) => { const b = box(2.2, 0.45, 0.6, benchMat); b.position.copy(wp(px, py, 0.35)); b.rotation.y = rot; scene.add(b); };
  const planter = (px, py) => { const p = box(1.8, 0.7, 1.8, planterMat); p.position.copy(wp(px, py, 0.35)); scene.add(p); const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), plantMat); s.position.copy(wp(px, py, 1.2)); scene.add(s); };
  for (const [x, y] of [[355,360],[405,380],[510,300],[555,318]]) bench(x, y, -0.38);
}
// Árboles: arboledas densas en parques/jardines, alineados en calles, evitando edificios y senderos
{
  const MAX = 900;
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(0xffffff, { flatShading: true }), MAX);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.26, 1, 6), mat(0x7f6146), MAX);
  crown.castShadow = trunk.castShadow = true;
  const blocks = [...C.PLACES.filter(p => p.style !== 'garden'), ...C.DECOR].map(p => geo.rectPoly(p.px, p.py, p.w + 14, p.d + 14, p.rot));
  const roadLines = Object.values(C.STREETS).map(s => ({ pts: s.pts, r: s.width / S / 2 + 10 }));
  const free = (x, y) => {
    if (TER.sAt(x, y) < 0) return false;
    if (blocks.some(b => geo.inPoly(x, y, b)) || plazaPolys.some(pp => geo.inPoly(x, y, pp))) return false;
    if (roadLines.some(l => geo.polyDist(l.pts, x, y) < l.r)) return false;
    for (const e of G.edges) { const A = G.nodes[e.a], B = G.nodes[e.b]; if (e.kind === 'path' && geo.segDist(x, y, A.px, A.py, B.px, B.py).d < Math.max(9, (e.width || 1.9) / S / 2 + 7)) return false; }
    return true;
  };
  let n = 0; const d = new THREE.Object3D();
  const plant = (x, y, s) => {
    const base = H(x, y), v = toWorld(x, y);
    d.position.set(v.x, base + 1, v.y); d.scale.set(1, 2, 1); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(n, d.matrix);
    d.position.set(v.x, base + 2 + s * 0.75, v.y); d.scale.set(s, s * 0.9, s); d.rotation.y = rnd() * 3; d.updateMatrix(); crown.setMatrixAt(n, d.matrix);
    crown.setColorAt(n, new THREE.Color().setHSL(0.27 + rnd() * 0.06, 0.38 + rnd() * 0.15, 0.36 + rnd() * 0.1));
    n++;
  };
  for (const gz of greenPolys) {
    const xs = gz.poly.map(p => p[0]), ys = gz.poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const density = gz.kind === 'garden' ? 0.0011 : 0.0016, tries = Math.round((x1 - x0) * (y1 - y0) * density);
    for (let k = 0; k < tries && n < MAX; k++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (geo.inPoly(x, y, gz.poly) && free(x, y)) plant(x, y, 1.1 + rnd() * 1.1); }
  }
  // arbolado de veredas
  for (const k of ['AE', 'QA', 'CVB', 'PLA', 'SL']) {
    const st = C.STREETS[k], pts = densify(st.pts, 34), off = st.width / S / 2 + 9;
    for (let i = 1; i < pts.length - 1 && n < MAX; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (const s of [-1, 1]) { const x = pts[i][0] + nx * off * s, y = pts[i][1] + ny * off * s; if (free(x, y) && TER.sAt(x, y) >= 0) plant(x, y, 0.9 + rnd() * 0.5); }
    }
  }
  // manzanas vecinas (volúmenes neutros alineados a la trama, sobre el cerro)
  // contexto urbano: barrio de casas bajas (1–3 pisos, grises suaves) repartido por todo el cerro.
  // Grilla alineada a la trama, manzanas separadas por pasajes; libres las calles y el perímetro del campus.
  const MAXH = 5000, CELL = 5.4;
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { flatShading: true }), MAXH);
  const roofGeo = (() => {
    const sh = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
  })();
  const roofs = new THREE.InstancedMesh(roofGeo, mat(0xffffff, { flatShading: true }), MAXH);
  const footprints = [...C.PLACES, ...C.DECOR].map(p => geo.rectPoly(p.px, p.py, p.w + 40, p.d + 40, p.rot));
  const ring = [...C.OUTLINE, C.OUTLINE[0]];
  let hn = 0, rn = 0;
  for (let i = 0, x = -292; x < 320; x += CELL, i++) for (let j = 0, z = -205; z < 226; z += CELL, j++) {
    if (hn >= MAXH) break;
    if (i % 6 === 5 || j % 4 === 3) continue;                 // pasajes entre manzanas
    if (rnd() < 0.12) continue;                               // sitios eriazos y patios
    const cx = x + (rnd() - 0.5) * 0.8, cz = z + (rnd() - 0.5) * 0.8;
    const [px, py] = toImage(cx, cz);
    if (TER.sAt(px, py) < 0) continue;                                         // borde costero / mar
    if (geo.inPoly(px, py, C.OUTLINE) || geo.polyDist(ring, px, py) < 18) continue;   // dentro o pegado a la reja
    if (footprints.some(f => geo.inPoly(px, py, f))) continue;                 // P, Matta…
    if (roadLines.some(l => geo.polyDist(l.pts, px, py) < l.r + 8)) continue;  // calles y veredas libres
    const w = CELL * (0.6 + rnd() * 0.28), dd = CELL * (0.6 + rnd() * 0.28);
    const floors = rnd() < 0.5 ? 1 : rnd() < 0.7 ? 2 : 3, hgt = floors * 1.35;
    const hs = [[-w / 2, -dd / 2], [w / 2, -dd / 2], [w / 2, dd / 2], [-w / 2, dd / 2]].map(([ox, oz]) => H(...toImage(cx + ox, cz + oz)));
    const bottom = Math.min(...hs) - 0.4, top = Math.max(...hs) + hgt;           // en pendiente la casa se escalona
    d.position.set(cx, (bottom + top) / 2, cz); d.rotation.set(0, 0, 0); d.scale.set(w, top - bottom, dd); d.updateMatrix();
    walls.setMatrixAt(hn, d.matrix);
    walls.setColorAt(hn++, new THREE.Color().setHSL(0.58, 0.02 + rnd() * 0.04, 0.72 + rnd() * 0.12));
    if (floors < 3) {                                          // techo a dos aguas (los bloques de 3 pisos van planos)
      const along = w >= dd;
      d.position.set(cx, top, cz); d.rotation.set(0, along ? Math.PI / 2 : 0, 0);
      d.scale.set((along ? dd : w) * 1.08, Math.min(w, dd) * 0.32, (along ? w : dd) * 1.04); d.updateMatrix();
      roofs.setMatrixAt(rn, d.matrix);
      roofs.setColorAt(rn++, new THREE.Color().setHSL(0.6, 0.03 + rnd() * 0.03, 0.46 + rnd() * 0.12));
    }
  }
  walls.count = hn; roofs.count = rn;
  walls.castShadow = walls.receiveShadow = roofs.castShadow = roofs.receiveShadow = true;
  const houses = new THREE.Group(); houses.add(walls, roofs);
  crown.count = trunk.count = n; scene.add(crown, trunk, houses);
}
// Rótulos urbanos
const streetLbl = (txt, px, py, cls = 'street') => { const o = new THREE.Object3D(); o.position.copy(wp(px, py, 2)); scene.add(o); addLabel(o, txt, cls); };
streetLbl('Océano Pacífico', 120, 60, 'street sea'); streetLbl('Línea férrea', 260, 40);

// Tótems
const totemObjs = {};
for (const t of C.TOTEMS) {
  const g = new THREE.Group(); g.position.copy(nodePos(t.id));
  const pillar = box(1.3, 4.8, 0.7, mat(0x0b2545)); pillar.position.y = 2.4;
  const scr = new THREE.MeshBasicMaterial({ color: 0xffc72c });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.1), scr); s1.position.set(0, 3.2, 0.36);
  const s2 = s1.clone(); s2.position.z = -0.36; s2.rotation.y = Math.PI;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.5, 40), new THREE.MeshBasicMaterial({ color: 0xd62839, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3;
  g.add(pillar, s1, s2, ring); scene.add(g);
  pillar.userData.totemId = t.id; pickables.push(pillar);
  const anchor = new THREE.Object3D(); anchor.position.y = 7.5; g.add(anchor);
  totemObjs[t.id] = { g, ring, label: addLabel(anchor, '', 'tlbl', () => setOrigin(t.id)) };
}

// Ruta animada: sigue nodo a nodo la red (calles y senderos) a 0,9 u sobre el suelo
const routeGroup = new THREE.Group(); scene.add(routeGroup);
let routeAnim = null;
function stripeTexture() {
  return canvasTex(128, 8, (g, w, h) => {
    g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.55, 'rgba(255,255,255,1)'); grd.addColorStop(0.7, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}
function clearRouteMesh() {
  routeGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
  routeGroup.clear(); routeAnim = null;
}
function drawRoute(route) {
  clearRouteMesh();
  const color = 0xffc72c;
  const pts = route.nodes.map(id => nodePos(id).add(new THREE.Vector3(0, 0.9, 0)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength(), segs = Math.max(120, Math.floor(length * 3));
  const tex = stripeTexture(); tex.repeat.set(length / 6, 1);
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.5, 10), new THREE.MeshBasicMaterial({ color, map: tex }));
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 1.2, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false }));
  glow.renderOrder = 10;
  const walker = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  walker.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })));
  routeGroup.add(core, glow, walker);
  const end = pts[pts.length - 1], pin = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.4, 24), mat(0xd62839, { emissive: 0x5a0a12 })); cone.rotation.x = Math.PI; cone.position.y = 1.7;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 14), mat(0xd62839, { emissive: 0x5a0a12 })); ball.position.y = 3.8;
  pin.add(cone, ball); pin.position.copy(end).add(new THREE.Vector3(0, 0.4, 0)); routeGroup.add(pin);
  const startRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xd62839, side: THREE.DoubleSide }));
  startRing.rotation.x = -Math.PI / 2; startRing.position.copy(pts[0]).setY(pts[0].y - 0.7); routeGroup.add(startRing);
  routeAnim = { tex, curve, walker, length, t: 0, pin, pinY: pin.position.y };
  return pts;
}

/* =====================================================================
   6. ESTADO + INTERFAZ
   ===================================================================== */
const state = { origin: 'T1', selected: null, route: null, stepsOpen: false };
const $ = id => document.getElementById(id);

const tween = { active: false };
function flyTo(target, position, dur = 1.1) {
  Object.assign(tween, { active: true, t: 0, dur, fromT: controls.target.clone(), toT: target.clone(), fromP: camera.position.clone(), toP: position.clone() });
}
function flyToPoint(target, dist) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.45) { dir.y = 0.6; dir.normalize(); }
  flyTo(target, target.clone().add(dir.multiplyScalar(dist)));
}
function fitPoints(pts) {
  const b = new THREE.Box3().setFromPoints(pts), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const dist = THREE.MathUtils.clamp(Math.max(s.x, s.z) * (innerWidth < 860 ? 2.0 : 1.35) + 55, 90, 420);
  flyTo(c, c.clone().add(new THREE.Vector3(-0.28, 0.78, 0.56).normalize().multiplyScalar(dist)));
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove('show'), 2400); }
const totemById = id => C.TOTEMS.find(x => x.id === id);

/* ---------- Origen ---------- */
function setOrigin(id, silent) {
  state.origin = id;
  const t = totemById(id);
  $('hereTxt').textContent = `Estás en: Tótem ${t.n} · ${t.name}`;
  document.querySelectorAll('.totem-btn').forEach(b => b.classList.toggle('active', b.dataset.t === id));
  for (const [tid, o] of Object.entries(totemObjs)) {
    const here = tid === id, tt = totemById(tid);
    o.label.element.className = 'tlbl' + (here ? ' here' : '');
    o.label.element.textContent = here ? `📍 ESTÁS AQUÍ · T${tt.n}` : `T${tt.n} · ${tt.short}`;
    o.ring.material.opacity = here ? 0.8 : 0;
  }
  if (state.route) routeTo(state.route.placeId);
  else if (!silent) { flyToPoint(nodePos(id), 120); toast(`Origen: Tótem ${t.n} · ${t.name}`); }
}
$('totemBtns').innerHTML = C.TOTEMS.map(t => {
  const lv = LV[G.nodes[t.id].level];
  return `<button class="totem-btn" data-t="${t.id}"><b>${t.n}</b><span>${t.name}</span><small>${lv.name} · ${lv.sub}</small></button>`;
}).join('');
document.querySelectorAll('.totem-btn').forEach(b => b.addEventListener('click', () => setOrigin(b.dataset.t)));

/* ---------- Letras, buscador y lista ---------- */
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
$('letters').innerHTML = C.PLACES.map(p => `<button data-id="${p.id}" style="--c:${C.CATS[p.cat].css}" aria-label="${p.name}" title="${p.name}">${p.icon || p.id}</button>`).join('');
$('letters').querySelectorAll('button').forEach(b => b.addEventListener('click', () => goTo(b.dataset.id)));

/** Resultados solo mientras la persona escribe: sin listado por categorías. */
function searchPlaces(raw) {
  const q = norm(raw.trim());
  if (!q) return [];
  const extra = p => ({ field: 'futbol pasto', multi: 'basquetbol voleibol baby' })[p.style] || '';
  const score = p => {
    const id = norm(p.id), name = norm(p.name), text = norm(`${p.name} ${p.sub || ''} ${p.code || ''} ${extra(p)} ${(p.tour || []).join(' ')}`);
    if (id === q || name === q || name === `edificio ${q}`) return 0;      // "c", "edificio c"
    if (id.startsWith(q) || name.split(' ').some(w => w.startsWith(q))) return 1;
    if (q.length >= 2 && text.includes(q)) return 2;                      // "piscina", "talleres", "8007"
    return -1;
  };
  return C.PLACES.map(p => [score(p), p]).filter(([s]) => s >= 0).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}
function renderList() {
  const raw = $('search').value, results = searchPlaces(raw);
  if (!raw.trim()) { $('destList').innerHTML = ''; return; }
  $('destList').innerHTML = results.length ? results.map(p => {
    const lv = LV[placeObjs[p.id].level];
    return `<button class="dest${state.selected === p.id ? ' sel' : ''}" data-id="${p.id}">
      <span class="bdg" style="background:${C.CATS[p.cat].css}">${p.icon || p.id}</span>
      <span class="t"><b>${p.name}</b><small>${p.sub ? p.sub + ' · ' : ''}${lv.name}${p.code ? ' · Sector ' + p.code : ''}</small></span>
      <span class="go">➜</span></button>`;
  }).join('') : `<div class="empty">No encontramos “${raw}”. Prueba con la letra del edificio (A, B, C…).</div>`;
  $('destList').querySelectorAll('.dest').forEach(b => b.addEventListener('click', () => goTo(b.dataset.id)));
}
function goTo(id) { selectPlace(id, false); routeTo(id); }
$('search').addEventListener('input', renderList);
$('search').addEventListener('keydown', e => {           // Enter → ruta al primer resultado
  if (e.key !== 'Enter') return;
  const first = searchPlaces($('search').value)[0];
  if (first) { goTo(first.id); $('search').blur(); }
});
$('clearSearch').addEventListener('click', () => { $('search').value = ''; renderList(); });

/* ---------- Selección y tarjeta ---------- */
function setHighlight(id, on) {
  const o = placeObjs[id]; if (!o) return;
  o.label.element.classList.toggle('sel', on);
  for (const m of o.meshes) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.emissive && mm.emissive.set(on ? 0x2e2600 : 0x000000));
}
function selectPlace(id, fly = true) {
  if (state.selected && state.selected !== id) setHighlight(state.selected, false);
  state.selected = id; setHighlight(id, true);
  const o = placeObjs[id], p = o.place, cat = C.CATS[p.cat], lv = LV[o.level];
  $('icBadge').textContent = p.icon || p.id; $('icBadge').style.background = cat.css;
  $('icCat').textContent = cat.label + (p.sub ? ' · ' + p.sub : '');
  $('icName').textContent = p.name;
  $('icDesc').textContent = p.desc;
  const chips = [lv.name, lv.sub];
  if (p.code) chips.push(`Sector ${p.code} en plano`);
  chips.push(`${p.entries.length} acceso${p.entries.length > 1 ? 's' : ''}`);
  if (p.tour?.length) chips.push(`🌐 ${p.tour.length} escena${p.tour.length > 1 ? 's' : ''} 360°`);
  $('icChips').innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join('');
  $('infoCard').classList.remove('hidden');
  document.querySelectorAll('.letters button').forEach(b => b.classList.toggle('sel', b.dataset.id === id));
  renderList();
  if (fly) flyToPoint(o.center.clone().setY(o.top * 0.5), 100);
}
function closeCard() {
  if (state.selected) setHighlight(state.selected, false);
  state.selected = null;
  $('infoCard').classList.add('hidden');
  document.querySelectorAll('.letters button').forEach(b => b.classList.remove('sel'));
  renderList();
}
$('icClose').addEventListener('click', closeCard);
$('icGo').addEventListener('click', () => state.selected && routeTo(state.selected));
$('icFocus').addEventListener('click', () => { const o = placeObjs[state.selected]; if (o) flyToPoint(o.center.clone().setY(o.top * 0.5), 70); });
$('icTour').addEventListener('click', () => openTour(state.selected));

/* ---------- Ruta ---------- */
function routeTo(placeId) {
  const place = placeObjs[placeId].place;
  const route = computeRoute(G, place, state.origin, false);
  if (!route) { toast('No se encontró una ruta disponible'); return; }
  const prev = state.route?.placeId;
  if (prev && prev !== placeId) placeObjs[prev].label.element.classList.remove('dest');
  placeObjs[placeId].label.element.classList.add('dest');
  state.route = route;
  fitPoints(drawRoute(route));

  const t = totemById(state.origin);
  $('rcFrom').textContent = `Desde Tótem ${t.n} · ${t.name}`;
  $('rcTo').textContent = place.name + (place.sub ? ' · ' + place.sub : '');
  $('rcDist').textContent = Math.round(route.meters);
  $('rcTime').textContent = route.minutes;
  $('rcStairs').textContent = route.stairs;
  $('rcStairsLbl').textContent = route.stairs === 1 ? 'escalera' : 'escaleras';

  const note = $('rcNote'), extNote = route.external ? ' Incluye un tramo por calle exterior (fuera de las rejas).' : '';
  if (route.stairs > 0) {
    note.className = 'rc-note warn';
    note.textContent = `⚠️ Incluye ${route.stairs} escalera${route.stairs > 1 ? 's' : ''}.` + extNote;
  } else {
    note.className = 'rc-note ok'; note.textContent = '✅ Esta ruta no tiene escaleras.' + extNote;
  }
  route.steps = buildSteps(G, C, route);
  $('rcList').innerHTML = route.steps.map(s => `<li class="${s.cls || ''}"><i>${s.icon}</i><span>${s.text}</span></li>`).join('');
  $('routeCard').classList.remove('hidden');
  $('infoCard').classList.add('hidden');
  if (innerWidth < 860) document.body.classList.add('collapsed');
}
function clearRoute() {
  if (state.route) placeObjs[state.route.placeId].label.element.classList.remove('dest');
  state.route = null; clearRouteMesh();
  $('routeCard').classList.add('hidden');
  window.speechSynthesis?.cancel();
}
$('rcClose').addEventListener('click', clearRoute);
$('rcSteps').addEventListener('click', () => {
  state.stepsOpen = !state.stepsOpen;
  $('rcList').classList.toggle('hidden', !state.stepsOpen);
  $('rcSteps').classList.toggle('on', state.stepsOpen);
});
$('rcTour').addEventListener('click', () => state.route && openTour(state.route.placeId));
$('rcSpeak').addEventListener('click', () => {
  if (!('speechSynthesis' in window) || !state.route) return toast('Voz no disponible en este dispositivo');
  speechSynthesis.cancel();
  const r = state.route, p = placeObjs[r.placeId].place;
  const u = new SpeechSynthesisUtterance(`Ruta hacia ${p.name}. ${Math.round(r.meters)} metros, unos ${r.minutes} minutos. ` + r.steps.map(s => s.text).join(' '));
  u.lang = 'es-CL'; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find(v => v.lang?.startsWith('es')); if (v) u.voice = v;
  speechSynthesis.speak(u);
});

/* ---------- Tour 360° USM ---------- */
function openTour(placeId) {
  const p = placeId ? placeObjs[placeId]?.place : null;
  $('tourTitle').textContent = p ? `${p.name}${p.sub ? ' · ' + p.sub : ''}` : 'Casa Central Valparaíso';
  const scenes = p?.tour?.length ? p.tour : [];
  $('tourScenes').innerHTML = (scenes.length
    ? `<b>Escenas de este lugar en el tour:</b> ` + scenes.map(s => `<span class="chip">${s}</span>`).join('')
    : `<b>Este lugar aún no tiene escena propia.</b> Explora:`) +
    ` <span class="muted">· Generales:</span> ` + C.TOUR.general.map(s => `<span class="chip ghosted">${s}</span>`).join('');
  $('tourOpen').href = C.TOUR.page;
  const frame = $('tourFrame');
  if (!frame.src) { $('tourLoading').classList.remove('hidden'); frame.src = C.TOUR.viewer; }
  $('tourModal').classList.remove('hidden');
}
$('tourFrame').addEventListener('load', () => $('tourLoading').classList.add('hidden'));
$('tourClose').addEventListener('click', () => $('tourModal').classList.add('hidden'));
$('tourModal').addEventListener('click', e => { if (e.target.id === 'tourModal') $('tourModal').classList.add('hidden'); });

/* ---------- Controles de mapa ---------- */
$('zoomIn').addEventListener('click', () => flyToPoint(controls.target.clone(), Math.max(controls.minDistance, camera.position.distanceTo(controls.target) * 0.7)));
$('zoomOut').addEventListener('click', () => flyToPoint(controls.target.clone(), Math.min(controls.maxDistance, camera.position.distanceTo(controls.target) * 1.4)));
$('resetView').addEventListener('click', () => flyTo(HOME.target, HOME.position));
$('topView').addEventListener('click', () => { const t = controls.target.clone(); flyTo(t, t.clone().add(new THREE.Vector3(0, 300, 0.1))); });
$('autoRot').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; $('autoRot').classList.toggle('on', controls.autoRotate); });
$('bigText').addEventListener('click', () => { document.documentElement.classList.toggle('big'); $('bigText').classList.toggle('on'); });
$('panelToggle').addEventListener('click', () => { document.body.classList.toggle('collapsed'); updateToggleIcon(); });
function updateToggleIcon() {
  const c = document.body.classList.contains('collapsed'), narrow = innerWidth < 860;
  $('panelToggle').textContent = narrow ? (c ? '▲ Menú' : '▼') : (c ? '▶' : '◀');
}

/* ---------- Tap en el mapa (sin arrastre) ---------- */
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; controls.autoRotate = false; $('autoRot').classList.remove('on'); });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t;
  downAt = null;
  if (moved > 8 || dt > 600) return;
  pointer.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  if (!hit) return closeCard();
  if (hit.object.userData.totemId) return setOrigin(hit.object.userData.totemId);
  if (hit.object.userData.placeId) selectPlace(hit.object.userData.placeId, true);
});

/* ---------- Inactividad (modo tótem) ---------- */
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    clearRoute(); closeCard(); $('tourModal').classList.add('hidden'); $('search').value = ''; renderList();
    flyTo(HOME.target, HOME.position, 1.6);
    controls.autoRotate = true; $('autoRot').classList.add('on');
  }, IDLE_RESET_MS);
}
['pointerdown', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, resetIdle, { passive: true }));
addEventListener('contextmenu', e => e.preventDefault());

const tick = () => { $('clock').textContent = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); };
tick(); setInterval(tick, 15000);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); labelRenderer.setSize(innerWidth, innerHeight);
  updateToggleIcon();
});

/* ---------- Bucle de animación ---------- */
const clock = new THREE.Clock();
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  if (tween.active) {
    tween.t += dt / tween.dur;
    const k = ease(Math.min(1, tween.t));
    controls.target.lerpVectors(tween.fromT, tween.toT, k);
    camera.position.lerpVectors(tween.fromP, tween.toP, k);
    if (tween.t >= 1) tween.active = false;
  }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -170, 170);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -170, 170);
  controls.update();
  if (routeAnim) {
    routeAnim.tex.offset.x -= dt * 1.6;
    routeAnim.t = (routeAnim.t + dt * 22 / routeAnim.length) % 1;
    routeAnim.walker.position.copy(routeAnim.curve.getPointAt(routeAnim.t));
    routeAnim.pin.position.y = routeAnim.pinY + Math.sin(time * 3) * 0.8;
    routeAnim.pin.rotation.y += dt * 1.5;
  }
  const o = totemObjs[state.origin];
  if (o) { const k = time * 0.8 % 1, s = 1 + k * 1.6; o.ring.scale.set(s, s, s); o.ring.material.opacity = 0.85 * (1 - k); }
  document.body.classList.toggle('far', camera.position.distanceTo(controls.target) > 300);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

/* ---------- Arranque (parámetros de URL para QR / tótem físico) ---------- */
const qs = new URLSearchParams(location.search);
renderList();
updateToggleIcon();
setOrigin(C.TOTEMS.some(t => t.id === qs.get('totem')) ? qs.get('totem') : 'T1', true);
if (qs.get('dest') && placeObjs[qs.get('dest')]) { selectPlace(qs.get('dest'), false); routeTo(qs.get('dest')); }
resetIdle();
animate();
// depuración: window.campus.view(target, position) dibuja un cuadro aunque la pestaña esté en segundo plano
window.campus = { G, C, TER, placeObjs, routeTo, setOrigin, openTour, setStairMarkers, stairMarkers,
  view(t, p) { if (t) controls.target.set(...t); if (p) camera.position.set(...p); tween.active = false; controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.8); } };

/* =====================================================================
   CAMPUS SIN BARRERAS · UTFSM Casa Central — escena 3D + interfaz
   Hackathon LYOSS USM 2026 · Fase 1 (navegación exterior en tótem)
   ---------------------------------------------------------------------
   1. Utilidades y escena base
   2. Topografía (terrazas), entorno urbano y calles
   3. Arquitectura por estilo (neogótico, Talleres, M·R·T, moderno…)
   4. Red peatonal (calles con nombre, escaleras, rampas) y vegetación
   5. Tótems y ruta animada
   6. Interfaz táctil (panel, tarjetas, Tour 360°, voz, inactividad)
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CAMPUS as C } from './data/campus-data.js';
import { buildGraph, computeRoute, buildSteps } from './pathfinding/dijkstra.js';

const S = C.SCALE;
const IDLE_RESET_MS = 120000;
const G = buildGraph(C);
const levelOfPy = G.levelOfPy;
const LV = C.LEVELS;

/* =====================================================================
   1. UTILIDADES Y ESCENA BASE
   ===================================================================== */
const toWorld = (px, py) => new THREE.Vector2((px - C.ORIGIN.px) * S, (py - C.ORIGIN.py) * S);
const wp = (px, py, y = 0) => { const v = toWorld(px, py); return new THREE.Vector3(v.x, y, v.y); };
const nodePos = id => { const n = G.nodes[id]; return new THREE.Vector3(n.x, n.y, n.z); };
/** Rectángulo en px → centro y tamaño en unidades 3D */
const rect = (x0, y0, x1, y1) => { const a = toWorld(x0, y0), b = toWorld(x1, y1); return { cx: (a.x + b.x) / 2, cz: (a.y + b.y) / 2, w: Math.abs(b.x - a.x), d: Math.abs(b.y - a.y) }; };

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
scene.fog = new THREE.Fog(0xdfe7f1, 520, 1150);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 3000);
const HOME = { target: new THREE.Vector3(5, 4, 8), position: new THREE.Vector3(-75, 200, 230) };
camera.position.copy(HOME.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 30, maxDistance: 560, maxPolarAngle: 1.32, screenSpacePanning: false, autoRotateSpeed: 0.6 });

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa9bb, 1.45));
const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
sun.position.set(-130, 230, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 10, far: 600 });
sun.shadow.bias = -0.0005;
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
function flatRect(px0, py0, px1, py1, color, y, extra) {
  const r = rect(px0, py0, px1, py1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), extra?.map ? new THREE.MeshStandardMaterial({ roughness: 0.95, ...extra }) : mat(color, extra));
  m.rotation.x = -Math.PI / 2; m.position.set(r.cx, y, r.cz); m.receiveShadow = true;
  scene.add(m); return m;
}

/* =====================================================================
   2. TOPOGRAFÍA, ENTORNO URBANO Y CALLES EXTERIORES
   ===================================================================== */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mat(0xd3dbe4));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
scene.add(ground);

flatRect(-500, 446, 1200, 470, 0x99a4b0, 0.02);   // Av. España
flatRect(-500, 474, 1200, 492, 0x8f877a, 0.02);   // línea férrea
for (const py of [479, 487]) flatRect(-500, py, 1200, py + 1.2, 0x4a4540, 0.04);
flatRect(-500, 500, 1200, 1600, 0x77acd6, 0.0);   // borde costero
flatRect(-60, 112, 660, 124, 0xb3bcc6, 0.03);     // Av. Placeres
flatRect(316, -200, 328, 112, 0xb3bcc6, 0.03);    // Calle San Luis
const streetLbl = (txt, px, py, cls = 'street') => { const o = new THREE.Object3D(); o.position.copy(wp(px, py, 1)); scene.add(o); addLabel(o, txt, cls); };
streetLbl('Av. España', 330, 458); streetLbl('Línea férrea', 640, 483); streetLbl('Océano Pacífico', 330, 540, 'street sea');
streetLbl('Av. Placeres', 520, 118); streetLbl('Calle San Luis', 322, 20);

// Manzanas vecinas: volúmenes neutros para dar escala
{
  const LOTS = [[20,0,200,104],[240,0,312,104],[384,0,470,104],[480,0,640,108],[472,150,520,232],[530,140,650,255],
    [560,258,660,300],[60,128,135,174],[30,180,122,232],[20,236,138,282],[40,286,172,330],[40,336,182,370],[60,374,292,402]];
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xc6cfd9), 900);
  let i = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = new THREE.Object3D();
  for (const [x0, y0, x1, y1] of LOTS) for (let px = x0 + 2; px < x1 - 4; px += 13) for (let py = y0 + 2; py < y1 - 4; py += 13) {
    if (rnd() < 0.18 || i >= 900) continue;
    const w = Math.min(11, x1 - px - 2), dd = Math.min(11, y1 - py - 2), h = 1.5 + rnd() * 5, c = toWorld(px + w / 2, py + dd / 2);
    d.position.set(c.x, h / 2, c.y); d.scale.set(w * S, h, dd * S); d.updateMatrix(); inst.setMatrixAt(i++, d.matrix);
  }
  inst.count = i; inst.castShadow = inst.receiveShadow = true; scene.add(inst);
}

// Terrazas: el polígono del recinto recortado por franjas y extruido a la altura de cada nivel
function clipBand(poly, ymin, ymax) {
  const atY = (a, b, y) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y];
  const clip = (pts, keep, y) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = keep(a), ib = keep(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(atY(a, b, y));
    }
    return out;
  };
  return clip(clip(poly, p => p[1] >= ymin, ymin), p => p[1] <= ymax, ymax);
}
{
  const wallMat = mat(0xb3aa9a);   // muros de contención de piedra
  [[C.BAND.midMax, 9999, 0], [C.BAND.highMax, C.BAND.midMax, 1], [-9999, C.BAND.highMax, 2]].forEach(([y0, y1, lv]) => {
    const pts = clipBand(C.OUTLINE, y0, y1);
    const shape = new THREE.Shape(pts.map(([px, py]) => { const v = toWorld(px, py); return new THREE.Vector2(v.x, -v.y); }));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: LV[lv].h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const slab = new THREE.Mesh(geo, [mat(LV[lv].top), wallMat]);
    slab.receiveShadow = slab.castShadow = true;
    scene.add(slab);
  });
}

/* =====================================================================
   3. ARQUITECTURA POR ESTILO
   ===================================================================== */
const TEX = {
  // Neogótico: muro de piedra clara con ventana ojival
  gothic: canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#eadcc0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6c6a6'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 5, w, 5);
    g.fillStyle = '#c9b48e'; g.beginPath(); g.moveTo(17, 112); g.lineTo(17, 52); g.quadraticCurveTo(17, 26, 32, 18); g.quadraticCurveTo(47, 26, 47, 52); g.lineTo(47, 112); g.fill();
    g.fillStyle = '#34424f'; g.beginPath(); g.moveTo(21, 108); g.lineTo(21, 54); g.quadraticCurveTo(21, 32, 32, 25); g.quadraticCurveTo(43, 32, 43, 54); g.lineTo(43, 108); g.fill();
    g.strokeStyle = '#c9b48e'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 26); g.lineTo(32, 108); g.moveTo(21, 70); g.lineTo(43, 70); g.stroke();
  }),
  // Talleres: ladrillo con ventanales industriales
  brick: canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#b8694d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
    for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#e7d9c4'; g.fillRect(12, 22, 40, 92);
    g.fillStyle = '#3d4b58'; g.fillRect(15, 25, 34, 86);
    g.fillStyle = '#e7d9c4'; for (let x = 15; x < 49; x += 11) g.fillRect(x + 10, 25, 1.5, 86); for (let y = 25; y < 111; y += 14) g.fillRect(15, y + 13, 34, 1.5);
  }),
  // Bloques M·R·T: bandas horizontales de hormigón + ventanal corrido
  bands: canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#d9d3c8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d4054'; g.fillRect(0, 26, w, 30);
    g.fillStyle = '#8aa1b6'; g.fillRect(0, 26, w, 3);
    g.fillStyle = '#cfc8bc'; for (let x = 0; x < w; x += 16) g.fillRect(x, 26, 2, 30);
  }),
  // Moderno: muro cortina claro
  curtain: canvasTex(64, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b9cde0'); gr.addColorStop(1, '#8fa9c2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 3, h); g.fillRect(31, 0, 2, h);
  }),
  hedge: canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#7fbf6a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3f7d3a'; g.lineWidth = 7;
    g.strokeRect(10, 10, w - 20, h - 20);
    for (const cx of [w * 0.25, w * 0.5, w * 0.75]) { g.beginPath(); g.arc(cx, h / 2, 22, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(10, h / 2); g.lineTo(w - 10, h / 2); g.stroke();
    g.fillStyle = '#e8d9b8'; g.fillRect(0, h / 2 - 3, w, 6);
  }, false),
};

/** 6 materiales para una caja con textura de fachada repetida según tamaño (+x,-x,+y,-y,+z,-z) */
function facadeMats(tex, color, w, d, h, tileW = 4, tileH = 4.2, roofColor = 0xbfb8ad) {
  const side = len => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(len / tileW)), Math.max(1, h / tileH)); return mat(color, { map: t }); };
  const sx = side(d), sz = side(w), top = mat(roofColor);
  return [sx, sx, top, top, sz, sz];
}
/** Techo a dos aguas: prisma con cumbrera según eje ('x' o 'z') */
function gableRoof(w, d, axis, rise, color, overhang = 1.1) {
  const across = (axis === 'x' ? d : w) * overhang, length = (axis === 'x' ? w : d) * 1.04;
  const shape = new THREE.Shape([new THREE.Vector2(-across / 2, 0), new THREE.Vector2(across / 2, 0), new THREE.Vector2(0, rise)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  if (axis === 'x') geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, { roughness: 0.8 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}
const TEJA = 0x8a3a24;      // teja terracota oscura

/** Ala neogótica: muro con ventanas ojivales + techo de teja */
function gothicWing(group, px0, py0, px1, py1, base, h, axis, opts = {}) {
  const r = rect(px0, py0, px1, py1), H = base + h;
  const body = box(r.w, H, r.d, facadeMats(opts.tex || TEX.gothic, opts.color || 0xffffff, r.w, r.d, h));
  body.position.set(r.cx, H / 2, r.cz);
  const cornice = box(r.w + 0.5, 0.6, r.d + 0.5, mat(0xd8c7a5)); cornice.position.set(r.cx, H + 0.3, r.cz);
  const roof = gableRoof(r.w, r.d, axis, Math.min(r.w, r.d) * (opts.rise || 0.5), opts.roof || TEJA);
  roof.position.set(r.cx, H + 0.6, r.cz);
  group.add(body, cornice, roof);
  return { r, H };
}
function pinnacle(group, x, z, y, s = 1) {
  const p = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 3.2 * s, 4), mat(0xd8c7a5)); p.rotation.y = Math.PI / 4;
  p.position.set(x, y + 1.6 * s, z); p.castShadow = true; group.add(p);
}

const BUILDERS = {
  /* Edificio A · Aula Magna con Torre del Reloj y alas simétricas */
  'gothic-a'(g, p, base) {
    const front = gothicWing(g, 368, 366, 452, 378, base, p.h, 'x');
    gothicWing(g, 368, 312, 380, 366, base, p.h - 1, 'z');
    gothicWing(g, 440, 312, 452, 366, base, p.h - 1, 'z');
    gothicWing(g, 402, 312, 418, 366, base, p.h + 1.5, 'z', { rise: 0.6 });          // cuerpo del Aula Magna
    for (const [x, z] of [[368, 378], [452, 378], [368, 366], [452, 366]]) { const v = toWorld(x, z); pinnacle(g, v.x, v.y, front.H + 0.6); }
    // Torre del Reloj
    const t = toWorld(410, 373), tw = 5.4, th = base + 27;
    const tower = box(tw, th, tw, facadeMats(TEX.gothic, 0xffffff, tw, tw, th - base, 2.7, 4.6)); tower.position.set(t.x, th / 2, t.y); g.add(tower);
    const belfry = box(tw + 0.8, 1, tw + 0.8, mat(0xd8c7a5)); belfry.position.set(t.x, th + 0.5, t.y); g.add(belfry);
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xfdfaf0 }), handMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
      const face = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), clockMat);
      face.position.set(t.x + nx * (tw / 2 + 0.05), th - 3, t.y + nz * (tw / 2 + 0.05)); face.rotation.y = a; g.add(face);
      const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.3), handMat); hand.position.copy(face.position).add(new THREE.Vector3(nx * 0.02, 0.45, nz * 0.02)); hand.rotation.y = a; g.add(hand);
      const hand2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.18), handMat); hand2.position.copy(face.position).add(new THREE.Vector3(nx * 0.02 + Math.cos(a) * 0.4, 0, nz * 0.02 - Math.sin(a) * 0.4)); hand2.rotation.y = a; g.add(hand2);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.62, 9, 4), mat(0x4d4a52, { roughness: 0.6 })); spire.rotation.y = Math.PI / 4;
    spire.position.set(t.x, th + 1 + 4.5, t.y); spire.castShadow = true; g.add(spire);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pinnacle(g, t.x + dx * tw / 2, t.y + dz * tw / 2, th + 1, 0.9);
    return base + p.h + 8;    // etiqueta sobre el cuerpo central, bajo la aguja
  },
  /* Edificio B · claustro con patio interior */
  'gothic-court'(g, p, base) {
    gothicWing(g, 346, 245, 438, 254, base, p.h, 'x');
    gothicWing(g, 346, 282, 438, 291, base, p.h, 'x');
    gothicWing(g, 346, 254, 355, 282, base, p.h, 'z');
    gothicWing(g, 429, 254, 438, 282, base, p.h, 'z');
    return base + p.h + 5;
  },
  /* Edificio C · Talleres: nave en diente de sierra + pabellones transversales */
  talleres(g, p, base) {
    gothicWing(g, 275, 156, 291, 208, base, p.h + 2, 'z', { tex: TEX.brick, rise: 0.45 });
    gothicWing(g, 409, 156, 425, 208, base, p.h + 2, 'z', { tex: TEX.brick, rise: 0.45 });
    const r = rect(291, 160, 409, 204), H = base + p.h;
    const nave = box(r.w, H, r.d, facadeMats(TEX.brick, 0xffffff, r.w, r.d, p.h)); nave.position.set(r.cx, H / 2, r.cz); g.add(nave);
    // perfil diente de sierra extruido a lo ancho de la nave
    const teeth = 12, tw = r.w / teeth, rise = 3.2;
    const shape = new THREE.Shape(); shape.moveTo(-r.w / 2, 0);
    for (let i = 0; i < teeth; i++) { const x = -r.w / 2 + i * tw; shape.lineTo(x, rise); shape.lineTo(x + tw, 0); }
    shape.lineTo(-r.w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: r.d, bevelEnabled: false }); geo.translate(0, 0, -r.d / 2);
    const roof = new THREE.Mesh(geo, mat(0x9aa1a8, { roughness: 0.55, metalness: 0.2 })); roof.position.set(r.cx, H, r.cz); roof.castShadow = true; g.add(roof);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x3b7fa8, emissiveIntensity: 0.35, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < teeth; i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(r.d * 0.96, rise * 0.9), glass);
      pane.rotation.y = Math.PI / 2; pane.position.set(r.cx - r.w / 2 + i * tw + 0.06, H + rise * 0.47, r.cz); g.add(pane);
    }
    return H + rise + 3;
  },
  /* Edificios E y F · pabellones de teja */
  'gothic-pav'(g, p, base) {
    gothicWing(g, p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2, base, p.h, 'x', { rise: 0.55 });
    return base + p.h + 4;
  },
  /* Edificio H · Casa Rector (casona con techo inclinado) */
  chalet(g, p, base) {
    const r = rect(p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2), H = base + p.h;
    const body = box(r.w, H, r.d, facadeMats(TEX.gothic, 0xfff4e0, r.w, r.d, p.h, 3.4, 3.4)); body.position.set(r.cx, H / 2, r.cz); g.add(body);
    const hip = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2 * 1.12, 1, 4), mat(TEJA)); hip.rotation.y = Math.PI / 4;
    hip.scale.set(r.w, 4.5, r.d); hip.position.set(r.cx, H + 2.25, r.cz); hip.castShadow = true; g.add(hip);
    const chim = box(0.9, 3, 0.9, mat(0x9b5a43)); chim.position.set(r.cx + r.w * 0.25, H + 2.6, r.cz - r.d * 0.15); g.add(chim);
    const porch = box(r.w * 0.4, 0.4, 2, mat(0xd8c7a5)); porch.position.set(r.cx, base + 3, r.cz + r.d / 2 + 1); g.add(porch);
    return H + 6;
  },
  /* Edificios M, R y T · mismo lenguaje: bandas horizontales y cubierta técnica */
  mrt(g, p, base) {
    const r = rect(p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2), H = base + p.h;
    const body = box(r.w, H, r.d, facadeMats(TEX.bands, 0xffffff, r.w, r.d, p.h, 4, 3.4, 0x8d949b)); body.position.set(r.cx, H / 2, r.cz); g.add(body);
    const slab = box(r.w + 0.8, 0.5, r.d + 0.8, mat(0xcfc8bc)); slab.position.set(r.cx, H + 0.25, r.cz); g.add(slab);
    const core = box(Math.min(r.w, r.d) * 0.35, 2.4, Math.min(r.w, r.d) * 0.35, mat(0xbdb6aa)); core.position.set(r.cx - r.w * 0.22, H + 1.4, r.cz); g.add(core);
    for (const k of [0.1, 0.3]) { const hv = box(1.6, 1, 1.2, mat(0x9ba3ab)); hv.position.set(r.cx + r.w * k, H + 1, r.cz + r.d * 0.15); g.add(hv); }
    return H + 4;
  },
  /* D, U, K, M2, P, P2 · moderno minimalista */
  modern(g, p, base) {
    const r = rect(p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2), H = base + p.h;
    const body = box(r.w, H, r.d, facadeMats(TEX.curtain, 0xffffff, r.w, r.d, p.h, 3.2, 3.4, 0xe9ecef)); body.position.set(r.cx, H / 2, r.cz); g.add(body);
    const par = box(r.w + 0.3, 0.8, r.d + 0.3, mat(0xf4f6f8)); par.position.set(r.cx, H + 0.4, r.cz); g.add(par);
    const plinth = box(r.w + 0.4, base + 1.2, r.d + 0.4, mat(0xd5d9de)); plinth.position.set(r.cx, (base + 1.2) / 2, r.cz); g.add(plinth);
    return H + 3;
  },
  /* Casa de la Federación */
  house(g, p, base) {
    const r = rect(p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2), H = base + p.h;
    const body = box(r.w, H, r.d, mat(0xfde7a8)); body.position.set(r.cx, H / 2, r.cz); g.add(body);
    const roof = gableRoof(r.w, r.d, 'x', 2.6, 0xd62839); roof.position.set(r.cx, H, r.cz); g.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), mat(0x7a2b1d)); door.position.set(r.cx, base + 1, r.cz + r.d / 2 + 0.02); g.add(door);
    return H + 4;
  },
  field(g, p, base) { return court(g, p, base, 'field'); },
  multi(g, p, base) { return court(g, p, base, 'multi'); },
};

function court(g, p, base, kind) {
  const r = rect(p.px - p.w / 2, p.py - p.d / 2, p.px + p.w / 2, p.py + p.d / 2);
  const tex = canvasTex(256, kind === 'field' ? 340 : 196, (c, w, h) => {
    if (kind === 'field') {
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#3f9b4f' : '#48a959'; c.fillRect(0, i * h / 10, w, h / 10); }
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(14, 14, w - 28, h - 28);
      c.beginPath(); c.moveTo(14, h / 2); c.lineTo(w - 14, h / 2); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 30, 0, Math.PI * 2); c.stroke();
      c.strokeRect(68, 14, 120, 48); c.strokeRect(68, h - 62, 120, 48); c.strokeRect(100, 14, 56, 18); c.strokeRect(100, h - 32, 56, 18);
    } else {
      c.fillStyle = '#2f6fb3'; c.fillRect(0, 0, w, h); c.fillStyle = '#e07b39'; c.fillRect(18, 18, w - 36, h - 36);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(18, 18, w - 36, h - 36);
      c.beginPath(); c.moveTo(w / 2, 18); c.lineTo(w / 2, h - 18); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 24, 0, Math.PI * 2); c.stroke();
      c.strokeRect(18, h / 2 - 30, 40, 60); c.strokeRect(w - 58, h / 2 - 30, 40, 60);
    }
  }, false);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  surf.rotation.x = -Math.PI / 2; surf.position.set(r.cx, base + 0.06, r.cz); surf.receiveShadow = true; g.add(surf);
  const fence = new THREE.MeshStandardMaterial({ color: 0x2c3e50, transparent: true, opacity: 0.45 });
  for (const [fw, fd, fx, fz] of [[r.w, 0.15, 0, -r.d / 2], [r.w, 0.15, 0, r.d / 2], [0.15, r.d, -r.w / 2, 0], [0.15, r.d, r.w / 2, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, 1.8, fd), fence); f.position.set(r.cx + fx, base + 0.9, r.cz + fz); g.add(f);
  }
  const white = mat(0xffffff);
  if (kind === 'field') {        // arcos
    for (const s of [-1, 1]) {
      const z = r.cz + s * (r.d / 2 - 1.2);
      for (const dx of [-2.4, 2.4]) { const post = box(0.25, 2.4, 0.25, white); post.position.set(r.cx + dx, base + 1.2, z); g.add(post); }
      const bar = box(5.05, 0.25, 0.25, white); bar.position.set(r.cx, base + 2.4, z); g.add(bar);
    }
  } else {                       // aros de básquetbol
    for (const s of [-1, 1]) { const post = box(0.3, 3.6, 0.3, white); post.position.set(r.cx + s * (r.w / 2 - 1), base + 1.8, r.cz); g.add(post); const bb = box(0.15, 1.2, 1.8, white); bb.position.set(r.cx + s * (r.w / 2 - 1.4), base + 3.4, r.cz); g.add(bb); }
  }
  return base + 4;
}

// Elementos de paisaje con nombre (patios, piscina, jardines)
const groundCanvasLabel = (text, color = '#5b4a33') => canvasTex(512, 96, (g, w, h) => {
  g.font = 'bold 44px system-ui, sans-serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2);
}, false);
function landscape() {
  const mid = LV[1].h;
  flatRect(346, 292, 452, 311, 0, mid + 0.05, { color: 0xeae3d3 });                          // patio entre A y B
  flatRect(380, 312, 402, 366, 0, mid + 0.05, { color: 0x86c06f });                          // Patio Poniente
  flatRect(418, 312, 440, 366, 0, mid + 0.05, { color: 0x86c06f });                          // Patio Oriente
  flatRect(355, 254, 429, 282, 0, mid + 0.05, { color: 0x9ccc84 });                          // patio interior B
  flatRect(476, 357, 534, 378, 0, mid + 0.05, { map: TEX.hedge });                           // jardines E–F
  flatRect(352, 380, 470, 398, 0, mid + 0.05, { color: 0xe6dfcf });                          // explanada del frontis
  // Piscina (costado norte de B)
  flatRect(366, 226, 418, 239, 0, mid + 0.06, { color: 0xe8edf0 });
  const water = flatRect(369, 228, 415, 237, 0, mid + 0.12, { color: 0x3fb2e6, roughness: 0.2, metalness: 0.1, emissive: 0x0b4f75, emissiveIntensity: 0.4 });
  water.userData.placeId = 'B';
  // Rótulos sobre el suelo
  for (const [txt, px, py] of [['PATIO PONIENTE', 391, 339], ['PATIO ORIENTE', 429, 339], ['PISCINA', 392, 232.5]]) {
    const v = toWorld(px, py), t = groundCanvasLabel(txt, txt === 'PISCINA' ? '#ffffff' : '#2f5d27');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(txt === 'PISCINA' ? 12 : 13, 2.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; if (txt !== 'PISCINA') m.rotation.z = Math.PI / 2;
    m.position.set(v.x, mid + 0.2, v.y); scene.add(m);
  }
}
landscape();

/* ---------- Construcción de todos los lugares ---------- */
const pickables = [];
const placeObjs = {};
for (const p of C.PLACES) {
  const lv = levelOfPy(p.py), base = LV[lv].h;
  const g = new THREE.Group();
  let top = BUILDERS[p.style](g, p, base);
  if (p.rot) {   // rotar alrededor del centro del edificio
    const c = toWorld(p.px, p.py), pivot = new THREE.Group(); pivot.position.set(c.x, 0, c.y);
    g.position.set(-c.x, 0, -c.y); pivot.add(g); pivot.rotation.y = THREE.MathUtils.degToRad(p.rot); scene.add(pivot);
  } else scene.add(g);
  g.traverse(o => { if (o.isMesh) { o.userData.placeId = p.id; pickables.push(o); } });
  const c = toWorld(p.px, p.py), cat = C.CATS[p.cat];
  const anchor = new THREE.Object3D(); anchor.position.set(c.x, top + 1.5, c.y); scene.add(anchor);
  const label = addLabel(anchor, `<span class="b" style="background:${cat.css}">${p.icon || p.id}</span><span class="n">${p.short || p.name}${p.sub ? `<em>${p.sub}</em>` : ''}</span>`,
    'lbl', () => selectPlace(p.id, true));
  placeObjs[p.id] = { place: p, group: g, label, top, level: lv, center: new THREE.Vector3(c.x, base, c.y), meshes: [] };
  g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.emissive) placeObjs[p.id].meshes.push(o); else if (o.isMesh && Array.isArray(o.material)) placeObjs[p.id].meshes.push(o); });
}
// La piscina pertenece al Edificio B
scene.traverse(o => { if (o.userData.placeId === 'B' && o.isMesh && !pickables.includes(o)) pickables.push(o); });

/* =====================================================================
   4. RED PEATONAL, CALLES CON NOMBRE Y VEGETACIÓN
   ===================================================================== */
const netGroup = new THREE.Group(); scene.add(netGroup);
const pathMat = mat(0xf6f2e8), streetMat = mat(0xc9ced6), stepA = mat(0xf08a24), stepB = mat(0xf7b267);
const railMat = mat(0xe8eef6), balMat = mat(0xd8c7a5);
function ribbon(a, b, width, material, thick = 0.14) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, thick, a.distanceTo(b)), material);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.receiveShadow = true;
  return m;
}
const jointGeo = new THREE.CylinderGeometry(1, 1, 0.14, 18);
for (const e of G.edges) {
  const A = nodePos(e.a), B = nodePos(e.b); A.y += 0.07; B.y += 0.07;
  const width = e.width || (e.street ? 4.4 : 2.4);
  if (e.type === 'p' || e.type === 'r') {
    netGroup.add(ribbon(A, B, width, e.street ? streetMat : pathMat));
    for (const P of [A, B]) { const j = new THREE.Mesh(jointGeo, e.street ? streetMat : pathMat); j.scale.set(width / 2, 1, width / 2); j.position.copy(P); netGroup.add(j); }
  } else {
    // Escalera / escalinata con peldaños reales y barandas
    const lo = A.y < B.y ? A : B, hi = A.y < B.y ? B : A;
    const dir = new THREE.Vector3(hi.x - lo.x, 0, hi.z - lo.z), L = dir.length(); dir.normalize();
    const n = Math.max(10, Math.round((hi.y - lo.y) / 0.34)), ang = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < n; i++) {
      const h = lo.y + (hi.y - lo.y) * (i + 1) / n, t = (i + 0.5) / n;
      const s = box(width, h, L / n + 0.02, i % 2 ? stepA : stepB, false);
      s.position.set(lo.x + dir.x * L * t, h / 2, lo.z + dir.z * L * t); s.rotation.y = ang; netGroup.add(s);
    }
    if (e.width) {   // balaustradas de piedra en la escalinata monumental
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2 + 0.4);
      for (const s of [1, -1]) netGroup.add(ribbon(lo.clone().addScaledVector(side, s).setY(lo.y + 0.9), hi.clone().addScaledVector(side, s).setY(hi.y + 0.9), 0.6, balMat, 1.2));
    }
  }
}

// Nombres de calles pintados sobre el pavimento (en el tramo plano más largo de cada calle)
function groundText(text, A, B, y) {
  const tex = canvasTex(1024, 96, (g, w, h) => {
    g.font = '800 52px system-ui, sans-serif'; g.fillStyle = '#3e4a5c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text.toUpperCase(), w / 2, h / 2 + 2);
  }, false);
  const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
  let w = 3.0 * 1024 / 96, h = 3.0;
  if (w > len * 0.95) { const k = len * 0.95 / w; w *= k; h *= k; }
  let ang = Math.atan2(dz, dx); if (Math.cos(ang) < -0.01) ang += Math.PI;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.order = 'YXZ'; m.rotation.y = -ang; m.rotation.x = -Math.PI / 2;
  m.position.set((A.x + B.x) / 2, y + 0.2, (A.z + B.z) / 2); m.renderOrder = 2;
  scene.add(m);
}
for (const [key, name] of Object.entries(C.STREETS)) {
  const edges = G.edges.filter(e => e.street === key && e.type === 'p');
  if (!edges.length) continue;
  // tramos rectos consecutivos se fusionan para dar espacio al rótulo
  let best = null;
  for (const e of edges) { const L = e.len; if (!best || L > best.len) best = e; }
  const A = nodePos(best.a), B = nodePos(best.b);
  groundText(name, A, B, Math.max(A.y, B.y));
}

// Vegetación (árboles instanciados en zonas libres)
{
  const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
  const blocks = C.PLACES.map(p => [p.px - p.w / 2 - 4, p.py - p.d / 2 - 4, p.px + p.w / 2 + 4, p.py + p.d / 2 + 4]).concat([[366, 226, 418, 239], [346, 290, 454, 312], [350, 378, 472, 400], [476, 356, 534, 379], [355, 254, 429, 282]]);
  const free = (x, y) => {
    if (!inPoly(x, y, C.OUTLINE)) return false;
    if (Math.abs(y - C.BAND.highMax) < 5 || Math.abs(y - C.BAND.midMax) < 5) return false;
    for (const [x0, y0, x1, y1] of blocks) if (x > x0 && x < x1 && y > y0 && y < y1) return false;
    for (const e of G.edges) { const A = G.nodes[e.a], B = G.nodes[e.b]; if (segDist(x, y, A.px, A.py, B.px, B.py) < (e.street || e.width ? 8 : 6)) return false; }
    return true;
  };
  const MAX = 190;
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(0x6fae6a, { flatShading: true }), MAX);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 1, 6), mat(0x8a6a4a), MAX);
  crown.castShadow = trunk.castShadow = true;
  let n = 0, seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = new THREE.Object3D();
  // árboles fijos en los patios del Edificio A y jardines de la Casa Rector
  const fixed = [[386, 322], [396, 356], [424, 322], [434, 356], [280, 322], [308, 322], [282, 350]];
  const plant = (x, y, s) => {
    const base = LV[levelOfPy(y)].h, v = toWorld(x, y);
    d.position.set(v.x, base + 1.2, v.y); d.scale.set(1, 2.4, 1); d.rotation.set(0, 0, 0); d.updateMatrix(); trunk.setMatrixAt(n, d.matrix);
    d.position.set(v.x, base + 2.4 + s * 0.8, v.y); d.scale.setScalar(s); d.rotation.y = rnd() * 3; d.updateMatrix(); crown.setMatrixAt(n, d.matrix);
    n++;
  };
  fixed.forEach(([x, y]) => plant(x, y, 1.8));
  for (let k = 0; k < 7000 && n < MAX; k++) { const x = 130 + rnd() * 480, y = 45 + rnd() * 390; if (free(x, y)) plant(x, y, 1.3 + rnd() * 1.4); }
  crown.count = trunk.count = n; scene.add(crown, trunk);
}

/* =====================================================================
   5. TÓTEMS Y RUTA ANIMADA
   ===================================================================== */
const totemObjs = {};
for (const t of C.TOTEMS) {
  const g = new THREE.Group(); g.position.copy(nodePos(t.id));
  const pillar = box(1.6, 6, 0.9, mat(0x0b2545)); pillar.position.y = 3;
  const scr = new THREE.MeshBasicMaterial({ color: 0xffc72c });
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), scr); s1.position.set(0, 4, 0.46);
  const s2 = s1.clone(); s2.position.z = -0.46; s2.rotation.y = Math.PI;
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 40), new THREE.MeshBasicMaterial({ color: 0xd62839, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
  g.add(pillar, s1, s2, ring); scene.add(g);
  pillar.userData.totemId = t.id; pickables.push(pillar);
  const anchor = new THREE.Object3D(); anchor.position.y = 9; g.add(anchor);
  totemObjs[t.id] = { g, ring, label: addLabel(anchor, '', 'tlbl', () => setOrigin(t.id)) };
}

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
function smoothPolyline(pts, r = 2.4) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    out.push(p.clone().add(a.clone().sub(p).setLength(Math.min(r, p.distanceTo(a) * 0.45))), p.clone().add(b.clone().sub(p).setLength(Math.min(r, p.distanceTo(b) * 0.45))));
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function clearRouteMesh() {
  routeGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
  routeGroup.clear(); routeAnim = null;
}
function drawRoute(route) {
  clearRouteMesh();
  const color = 0xffc72c;
  const pts = route.nodes.map(id => nodePos(id).add(new THREE.Vector3(0, 1.0, 0)));
  const curve = new THREE.CatmullRomCurve3(smoothPolyline(pts), false, 'centripetal');
  const length = curve.getLength(), segs = Math.max(80, Math.floor(length * 2.5));
  const tex = stripeTexture(); tex.repeat.set(length / 7, 1);
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.65, 10), new THREE.MeshBasicMaterial({ color, map: tex }));
  // halo que se ve incluso detrás de los muros: la ruta nunca queda oculta
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 1.5, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, depthTest: false }));
  glow.renderOrder = 10;
  const walker = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  walker.add(new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })));
  routeGroup.add(core, glow, walker);
  // marcador de destino (en el acceso real) + marcador sobre el edificio
  const end = pts[pts.length - 1];
  const pin = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 24), mat(0xd62839, { emissive: 0x5a0a12 })); cone.rotation.x = Math.PI; cone.position.y = 2.1;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 14), mat(0xd62839, { emissive: 0x5a0a12 })); ball.position.y = 4.6;
  pin.add(cone, ball); pin.position.copy(end).add(new THREE.Vector3(0, 0.5, 0)); routeGroup.add(pin);
  const startRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 32), new THREE.MeshBasicMaterial({ color: 0xd62839, side: THREE.DoubleSide }));
  startRing.rotation.x = -Math.PI / 2; startRing.position.copy(pts[0]).setY(pts[0].y - 0.75); routeGroup.add(startRing);
  routeAnim = { tex, curve, walker, length, t: 0, pin, pinY: pin.position.y };
  return pts;
}

/* =====================================================================
   6. ESTADO + INTERFAZ
   ===================================================================== */
const state = { origin: 'T1', selected: null, route: null, stepsOpen: false, cat: 'all' };
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

/* ---------- Categorías, letras, buscador y lista ---------- */
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CAT_FILTERS = [['all', 'Todos'], ['historico', 'Históricos'], ['moderno', 'Modernos'], ['deportivo', 'Deportes'], ['federacion', 'Federación']];
$('cats').innerHTML = CAT_FILTERS.map(([k, l]) => `<button data-c="${k}" class="${k === 'all' ? 'on' : ''}">${l}</button>`).join('');
$('cats').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  state.cat = b.dataset.c;
  $('cats').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  renderList();
}));
$('letters').innerHTML = C.PLACES.filter(p => !p.icon).map(p => `<button data-id="${p.id}" style="--c:${C.CATS[p.cat].css}" aria-label="${p.name}">${p.id}</button>`).join('');
$('letters').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selectPlace(b.dataset.id, false); routeTo(b.dataset.id); }));

function renderList() {
  const q = norm($('search').value.trim());
  const extra = p => ({ field: 'futbol pasto', multi: 'basquetbol voleibol baby', house: 'feutfsm estudiantes centro' })[p.style] || '';
  const match = p => (state.cat === 'all' || p.cat === state.cat) &&
    (!q || norm(`${p.name} ${p.sub || ''} ${p.short || ''} ${p.id} ${p.code || ''} ${C.CATS[p.cat].label} ${extra(p)} ${(p.tour || []).join(' ')}`).includes(q));
  const order = ['historico', 'moderno', 'deportivo', 'federacion'];
  const html = order.map(cat => {
    const list = C.PLACES.filter(p => p.cat === cat && match(p));
    if (!list.length) return '';
    return `<div class="subhead">${C.CATS[cat].group}</div>` + list.map(p => {
      const lv = LV[placeObjs[p.id].level];
      return `<button class="dest${state.selected === p.id ? ' sel' : ''}" data-id="${p.id}">
        <span class="bdg" style="background:${C.CATS[p.cat].css}">${p.icon || p.id}</span>
        <span class="t"><b>${p.name}</b><small>${p.sub ? p.sub + ' · ' : ''}${lv.name}${p.code ? ' · Sector ' + p.code : ''}</small></span>
        <span class="go">➜</span></button>`;
    }).join('');
  }).join('');
  $('destList').innerHTML = html || `<div class="empty">Sin resultados para “${$('search').value}”.</div>`;
  $('destList').querySelectorAll('.dest').forEach(b => b.addEventListener('click', () => { selectPlace(b.dataset.id, false); routeTo(b.dataset.id); }));
}
$('search').addEventListener('input', renderList);
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
  $('rcStairsLbl').textContent = 'escaleras';

  const note = $('rcNote');
  if (route.stairs > 0) {
    note.className = 'rc-note warn';
    note.textContent = `⚠️ Incluye ${route.stairs} tramo${route.stairs > 1 ? 's' : ''} de escalera.`;
  } else {
    note.className = 'rc-note ok'; note.textContent = '✅ Esta ruta no tiene escaleras.';
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
window.campus = { G, C, placeObjs, routeTo, setOrigin, openTour };   // depuración

/* =====================================================================
   ENRUTADOR PEATONAL · red densa sobre calles y senderos + Dijkstra
   ---------------------------------------------------------------------
   Sin dependencias de Three.js. La red se genera a partir de las
   polilíneas de calles (STREETS) y senderos (PATHS):
     · los extremos de cada sendero se sueldan a la calle/sendero más cercano
     · cada tramo se subdivide (≤ MAX_SEG px) para que la ruta siga el trazado
     · la altura de cada nodo sale del terreno; un sendero con pendiente
       > MAX_GRADE se considera escalera (las calles se consideran rampas)
   ===================================================================== */

const MAX_SEG = 24;            // px máximos entre nodos consecutivos
const MAX_GRADE = 0.14;        // sobre esta pendiente un sendero es escalera
const WALK_SPEED = 1.25;       // m/s peatón estándar
const WALK_SPEED_ACC = 0.85;   // m/s silla de ruedas / movilidad reducida
const STAIR_EXTRA_S = 8;       // s adicionales por tramo de escalera
const STAIR_PENALTY = 3;       // costo extra (unid.) por tramo de escalera
const EXT_FACTOR = 1.35;       // las calles exteriores cuestan más: se prefiere la red interna

const key = (x, y) => `${(+x).toFixed(1)},${(+y).toFixed(1)}`;

function nearestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return { t, x: ax + t * dx, y: ay + t * dy, d: Math.hypot(px - ax - t * dx, py - ay - t * dy) };
}

/** Construye la red. terrain = { heightAt(px,py), levelAt(px,py) } */
export function buildGraph(C, terrain) {
  const S = C.SCALE;
  const totemAt = Object.fromEntries(C.TOTEMS.map(t => [t.id, t.at]));
  const lines = [];
  for (const [k, st] of Object.entries(C.STREETS)) if (st.graph) lines.push({ kind: 'street', street: k, ext: !!st.ext, name: st.name, type: 'p', width: st.width, pts: st.pts.map(p => [...p]) });
  C.PATHS.forEach((p, i) => lines.push({ kind: 'path', id: i, name: p.name || null, type: p.type || 'p', width: p.width || null,
    named: p.pts.map(q => typeof q === 'string' ? q : null), pts: p.pts.map(q => typeof q === 'string' ? [...totemAt[q]] : [...q]) }));

  // 1) Soldar extremos de senderos a la red existente (los accesos de edificios quedan fijos)
  const entryKeys = new Set(C.PLACES.flatMap(p => p.entries.map(([x, y]) => key(x, y))));
  for (const L of lines) {
    if (L.kind !== 'path') continue;
    for (const end of [0, L.pts.length - 1]) {
      if (L.named[end]) continue;                       // tótems: punto fijo
      const [x, y] = L.pts[end];
      if (entryKeys.has(key(x, y))) continue;           // puerta de edificio: punto fijo
      let best = null;
      for (const M of lines) {
        if (M === L) continue;
        M.pts.forEach((v, vi) => {
          // un extremo suelto de otro sendero aún no soldado no sirve como ancla
          const looseEnd = M.kind === 'path' && !M.done && (vi === 0 || vi === M.pts.length - 1) && !M.named[vi];
          const d = Math.hypot(v[0] - x, v[1] - y);
          if (!looseEnd && d < 8 && (!best || d < best.d)) best = { d, vertex: v };
        });
      }
      if (!best) for (const M of lines) {
        if (M === L) continue;
        for (let i = 0; i < M.pts.length - 1; i++) {
          const q = nearestOnSegment(x, y, ...M.pts[i], ...M.pts[i + 1]);
          if (q.d < 36 && q.t > 0.02 && q.t < 0.98 && (!best || q.d < best.d)) best = { d: q.d, line: M, i, x: q.x, y: q.y };
        }
      }
      if (!best) continue;
      if (best.vertex) L.pts[end] = [...best.vertex];
      else { const p = [+best.x.toFixed(1), +best.y.toFixed(1)]; best.line.pts.splice(best.i + 1, 0, p); best.line.named?.splice(best.i + 1, 0, null); L.pts[end] = [...p]; }
    }
    L.done = true;
  }

  // 2) Nodos y tramos (subdivididos)
  const G = { nodes: {}, adj: {}, edges: [], lines };
  const addNode = (x, y, name) => {
    const id = name || key(x, y);
    if (!G.nodes[id]) {
      G.nodes[id] = { id, px: x, py: y, level: terrain.levelAt(x, y), x: (x - C.ORIGIN.px) * S, z: (y - C.ORIGIN.py) * S, y: terrain.heightAt(x, y) };
      G.adj[id] = [];
    }
    return id;
  };
  const seen = new Set();
  for (const L of lines) {
    let prevId = null;
    L.pts.forEach((p, i) => {
      const name = L.named?.[i] || null;
      const id = addNode(p[0], p[1], name);
      if (prevId) {
        const A = G.nodes[prevId], B = G.nodes[id];
        const n = Math.max(1, Math.ceil(Math.hypot(B.px - A.px, B.py - A.py) / MAX_SEG));
        let a = prevId;
        for (let k = 1; k <= n; k++) {
          const b = k === n ? id : addNode(A.px + (B.px - A.px) * k / n, A.py + (B.py - A.py) * k / n);
          const ek = a < b ? a + '|' + b : b + '|' + a;
          if (a !== b && !seen.has(ek)) {
            seen.add(ek);
            const NA = G.nodes[a], NB = G.nodes[b];
            const horiz = Math.hypot(NA.x - NB.x, NA.z - NB.z), dh = Math.abs(NA.y - NB.y);
            let type = L.type;
            if (L.kind === 'path' && type === 'p' && horiz > 2.5 && dh / horiz > MAX_GRADE) type = 's';   // bordillos cortos no cuentan
            const len = Math.hypot(horiz, dh);
            const e = { a, b, type, hasStairs: type === 's', kind: L.kind, ext: !!L.ext, street: L.street || null, name: L.name, width: L.width, len, m: len * C.M_PER_UNIT, dh };
            G.edges.push(e); G.adj[a].push({ to: b, e }); G.adj[b].push({ to: a, e });
          }
          a = b;
        }
      }
      prevId = id;
    });
  }

  // 3) Accesos de cada lugar → nodo más cercano de la red
  G.entries = {};
  for (const p of C.PLACES) {
    G.entries[p.id] = p.entries.map(([x, y]) => {
      let best = null;
      for (const n of Object.values(G.nodes)) { const d = Math.hypot(n.px - x, n.py - y); if (!best || d < best.d) best = { d, id: n.id }; }
      if (best.d > 14) console.warn(`[red] acceso de ${p.id} a ${best.d.toFixed(0)} px de la red`, x, y);
      return best.id;
    });
  }
  return G;
}

/** Dijkstra con cola de prioridad binaria.
    accessible = true → sin escaleras y solo por la red interna (salvo allowExt). */
export function dijkstra(G, src, accessible, allowExt = false) {
  const dist = {}, prev = {}, prevE = {}, done = new Set();
  for (const k in G.nodes) dist[k] = Infinity;
  dist[src] = 0;
  const heap = [[0, src]];
  const push = item => { heap.push(item); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, u] = pop();
    if (done.has(u)) continue;
    done.add(u);
    for (const { to, e } of G.adj[u]) {
      if (accessible && e.hasStairs) continue;                 // costo infinito: la ruta accesible no usa escaleras
      if (accessible && e.ext && !allowExt) continue;
      const alt = d + e.len * (e.ext ? EXT_FACTOR : 1) + (e.hasStairs ? STAIR_PENALTY : 0);
      if (alt < dist[to]) { dist[to] = alt; prev[to] = u; prevE[to] = e; push([alt, to]); }
    }
  }
  return { dist, prev, prevE };
}

/** Ruta desde un tótem hasta el acceso más conveniente del lugar. */
export function computeRoute(G, place, totemId, accessible) {
  const { dist, prev, prevE } = dijkstra(G, totemId, accessible, !!place.outside);
  let goal = null;
  for (const en of G.entries[place.id]) if (dist[en] < (goal ? dist[goal] : Infinity)) goal = en;
  if (!goal) return null;
  const nodes = [goal], edges = [];
  while (nodes[0] !== totemId) { edges.unshift(prevE[nodes[0]]); nodes.unshift(prev[nodes[0]]); }
  const meters = edges.reduce((s, e) => s + e.m, 0);
  // tramos de escalera contiguos = una sola escalera
  let stairs = 0, ramps = 0;
  edges.forEach((e, i) => { if (e.hasStairs && !edges[i - 1]?.hasStairs) stairs++; if (e.type === 'r' && edges[i - 1]?.type !== 'r') ramps++; });
  const seconds = meters / (accessible ? WALK_SPEED_ACC : WALK_SPEED) + stairs * STAIR_EXTRA_S;
  const external = edges.some(e => e.ext);
  return { nodes, edges, meters, stairs, ramps, external, accessible, placeId: place.id, totemId, minutes: Math.max(1, Math.round(seconds / 60)) };
}

/** Indicaciones paso a paso agrupando tramos por calle / sendero. */
/** Rumbo (grados, 0 = norte, horario) de un tramo entre dos nodos, en px de la imagen (norte arriba). */
const heading = (G, a, b) => { const A = G.nodes[a], B = G.nodes[b]; return (Math.atan2(B.px - A.px, -(B.py - A.py)) * 180 / Math.PI + 360) % 360; };
/** Dirección relativa a la trama del campus (las calles corren hacia el oriente ≈ 68°). */
function dirName(h, C) {
  const rel = ((h - (90 + C.ROT)) % 360 + 360) % 360;
  return ['el oriente', 'el suroriente', 'el sur (Av. Los Placeres)', 'el surponiente',
          'el poniente', 'el norponiente', 'el norte (Av. España)', 'el nororiente'][Math.round(rel / 45) % 8];
}
/** Giro entre el último tramo de un grupo y el primero del siguiente. */
function turnText(prev, next) {
  const d = ((next - prev + 540) % 360) - 180;
  if (Math.abs(d) < 30) return 'Sigue derecho';
  if (Math.abs(d) > 140) return 'Da media vuelta y avanza';
  return d > 0 ? 'Gira a la derecha y avanza' : 'Gira a la izquierda y avanza';
}

/** Indicaciones paso a paso: tramos agrupados por calle / sendero, con dirección y giros. */
export function buildSteps(G, C, route) {
  const steps = [];
  const totem = C.TOTEMS.find(t => t.id === route.totemId);
  const place = C.PLACES.find(p => p.id === route.placeId);
  steps.push({ icon: '📍', text: `Inicio: Tótem ${totem.n} · ${totem.name}.` });
  // agrupar en tramos consecutivos con el mismo "modo" y la misma vía
  const groups = [];
  route.edges.forEach((e, i) => {
    const a = route.nodes[i], b = route.nodes[i + 1];
    const mode = e.type === 's' ? 's' : e.type === 'r' ? 'r' : 'p';
    const via = e.street ? C.STREETS[e.street].name : e.name;
    const last = groups[groups.length - 1], rise = G.nodes[b].y - G.nodes[a].y;
    if (last && last.mode === mode && last.via === via && last.ext === !!e.ext) { last.m += e.m; last.to = b; last.rise += rise; last.endSeg = [a, b]; }
    else groups.push({ mode, via, ext: !!e.ext, street: !!e.street, m: e.m, from: a, to: b, rise, startSeg: [a, b], endSeg: [a, b] });
  });
  // fusionar tramos cortos (< 12 m) con el siguiente tramo a pie: evita giros y pasos triviales
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i], nx = groups[i + 1];
    if (g.mode === 'p' && g.m < 12 && nx?.mode === 'p') { nx.m += g.m; nx.from = g.from; nx.startSeg = g.startSeg; groups.splice(i, 1); i--; }
  }
  let prevHeading = null, moved = false;
  for (const g of groups) {
    const up = g.rise > 0, rise = Math.abs(g.rise) * C.M_PER_UNIT;
    const hStart = heading(G, ...g.startSeg), hAll = heading(G, g.from, g.to);
    if (g.mode === 's') {
      const n = Math.max(3, Math.round(rise / 0.17));
      const name = !g.via ? 'la escalera'
        : /escal|grada/i.test(g.via) ? g.via
        : `la escalera ${g.via.startsWith('el ') ? 'del ' + g.via.slice(3) : 'de ' + g.via}`;
      steps.push({ icon: '🪜', cls: 'warn', text: `${up ? 'Sube' : 'Baja'} por ${name} (≈${n} peldaños).` });
    } else if (g.mode === 'r') {
      steps.push({ icon: '♿', cls: 'ramp', text: `${up ? 'Sube' : 'Baja'} por ${g.via || 'la rampa'} (sin escalones).` });
    } else if (g.m >= 6) {
      const via = g.via && !/escal|grada|rampa/i.test(g.via) ? ` por ${g.via}${g.ext ? ' (calle exterior)' : ''}` : '';
      const slope = rise > 3 ? (up ? ', en subida' : ', en bajada') : '';
      const verb = !moved ? 'Avanza' : turnText(prevHeading, hStart);
      steps.push({ icon: '🚶', text: `${verb} ${Math.round(g.m)} m${via} hacia ${dirName(hAll, C)}${slope}.` });
    }
    if (steps.length > 1) moved = true;
    prevHeading = heading(G, ...g.endSeg);
  }
  steps.push({ icon: '🏁', text: `Llegaste a ${place.name}${place.sub ? ' · ' + place.sub : ''}.` });
  return steps;
}

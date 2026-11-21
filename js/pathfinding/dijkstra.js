/* =====================================================================
   ENRUTADOR PEATONAL · grafo + Dijkstra + indicaciones paso a paso
   ---------------------------------------------------------------------
   Sin dependencias (no usa Three.js): se puede reutilizar en otra
   interfaz (p. ej. Flutter vía WebView o un backend).
   ===================================================================== */

const WALK_SPEED = 1.25;       // m/s peatón estándar
const WALK_SPEED_ACC = 0.85;   // m/s silla de ruedas / movilidad reducida
const STAIR_EXTRA_S = 20;      // s adicionales por tramo de escalera
const STAIR_PENALTY = 6;       // costo extra (unid.) para no preferir escaleras por pocos metros

/** Construye el grafo a partir de los datos del campus. */
export function buildGraph(C) {
  const levelOfPy = py => (py < C.BAND.highMax ? 2 : py < C.BAND.midMax ? 1 : 0);
  const G = { nodes: {}, adj: {}, edges: [], levelOfPy };
  for (const [id, [px, py, label]] of Object.entries(C.NODES)) {
    const level = levelOfPy(py);
    G.nodes[id] = {
      id, px, py, label, level,
      x: (px - C.ORIGIN.px) * C.SCALE, y: C.LEVELS[level].h, z: (py - C.ORIGIN.py) * C.SCALE,
    };
    G.adj[id] = [];
  }
  for (const [a, b, type, street, width] of C.EDGES) {
    const A = G.nodes[a], B = G.nodes[b];
    if (!A || !B) { console.warn('[grafo] tramo con nodo inexistente:', a, b); continue; }
    if (type === 'p' && A.level !== B.level) console.warn(`[grafo] ${a}-${b} es plano pero cruza niveles`);
    if (type !== 'p' && A.level === B.level) console.warn(`[grafo] ${a}-${b} es '${type}' pero no cambia de nivel`);
    const len = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z);
    const e = { a, b, type, street: street || null, width: width || null, len, m: len * C.M_PER_UNIT };
    G.edges.push(e);
    G.adj[a].push({ to: b, e });
    G.adj[b].push({ to: a, e });
  }
  return G;
}

/** Dijkstra desde un nodo. accessible=true excluye todos los tramos con escalera. */
export function dijkstra(G, src, accessible) {
  const dist = {}, prev = {}, prevE = {}, Q = new Set(Object.keys(G.nodes));
  for (const k of Q) dist[k] = Infinity;
  dist[src] = 0;
  while (Q.size) {
    let u = null, best = Infinity;
    for (const k of Q) if (dist[k] < best) { best = dist[k]; u = k; }
    if (u === null) break;
    Q.delete(u);
    for (const { to, e } of G.adj[u]) {
      if (accessible && e.type === 's') continue;
      const alt = dist[u] + e.len + (e.type === 's' ? STAIR_PENALTY : 0);
      if (alt < dist[to]) { dist[to] = alt; prev[to] = u; prevE[to] = e; }
    }
  }
  return { dist, prev, prevE };
}

/** Ruta desde un tótem hasta el acceso más conveniente de un lugar. */
export function computeRoute(G, place, totemId, accessible) {
  const { dist, prev, prevE } = dijkstra(G, totemId, accessible);
  let goal = null;
  for (const en of place.entries) if (dist[en] < (goal ? dist[goal] : Infinity)) goal = en;
  if (!goal) return null;
  const nodes = [goal], edges = [];
  while (nodes[0] !== totemId) { edges.unshift(prevE[nodes[0]]); nodes.unshift(prev[nodes[0]]); }
  const meters = edges.reduce((s, e) => s + e.m, 0);
  const stairs = edges.filter(e => e.type === 's').length;
  const ramps = edges.filter(e => e.type === 'r').length;
  const seconds = meters / (accessible ? WALK_SPEED_ACC : WALK_SPEED) + stairs * STAIR_EXTRA_S;
  return { nodes, edges, meters, stairs, ramps, accessible, placeId: place.id, totemId,
           minutes: Math.max(1, Math.round(seconds / 60)) };
}

/** Indicaciones en lenguaje simple (también se leen en voz alta). */
export function buildSteps(G, C, route) {
  const steps = [];
  const totem = C.TOTEMS.find(t => t.id === route.totemId);
  const place = C.PLACES.find(p => p.id === route.placeId);
  const lvl = n => C.LEVELS[n].name.toLowerCase();
  steps.push({ icon: '📍', text: `Inicio: Tótem ${totem.n} · ${totem.name} (${lvl(G.nodes[route.totemId].level)}).` });

  let acc = 0, street = null;
  route.edges.forEach((e, i) => {
    const from = G.nodes[route.nodes[i]], to = G.nodes[route.nodes[i + 1]], next = route.edges[i + 1];
    if (e.type === 'p') {
      acc += e.m; street = street || e.street;
      const breakHere = !next || next.type !== 'p' || (next.street || null) !== (e.street || null) || to.label;
      if (breakHere) {
        let tail = '';
        if (next && next.type === 's') tail = ' hasta la escalera';
        else if (next && next.type === 'r') tail = next.street && next.street !== street ? ` hasta la rampa de ${C.STREETS[next.street]}` : ' hasta la rampa';
        else if (next && to.label) tail = ` hasta ${to.label}`;
        const via = street ? ` por ${C.STREETS[street]}` : '';
        if (acc >= 8) steps.push({ icon: '🚶', text: `Camina ${Math.round(acc)} m${via}${tail}.` });
        acc = 0; street = null;
      }
    } else {
      const up = to.level > from.level;
      if (e.type === 's') {
        const n = Math.round(Math.abs(to.y - from.y) * C.M_PER_UNIT / 0.17);
        const big = e.width ? ' monumental' : '';
        steps.push({ icon: '🪜', cls: 'warn', text: `${up ? 'Sube' : 'Baja'} la escalinata${big} (≈${n} peldaños) hasta el ${lvl(to.level)}.` });
      } else {
        const via = e.street ? `por ${C.STREETS[e.street]}` : 'por la rampa';
        steps.push({ icon: '♿', cls: 'ramp', text: `${up ? 'Sube' : 'Baja'} ${via} (pendiente continua, sin escalones) hasta el ${lvl(to.level)}.` });
      }
    }
  });
  steps.push({ icon: '🏁', text: `Llegaste a ${place.name}${place.sub ? ' · ' + place.sub : ''}.` });
  return steps;
}

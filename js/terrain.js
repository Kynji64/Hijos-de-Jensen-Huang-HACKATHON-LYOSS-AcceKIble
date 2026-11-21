/* =====================================================================
   TERRENO · ladera de Valparaíso entre Av. España (mar) y Av. Los Placeres
   ---------------------------------------------------------------------
   Sin dependencias: lo usan la escena y el enrutador (alturas de nodos).
   La altura depende de la posición relativa entre ambas avenidas:
     s = dEspaña / (dEspaña + dPlaceres)   → 0 junto al mar, 1 en Placeres
   y se escalona en 3 terrazas unidas por taludes suaves (parque en pendiente).
   ===================================================================== */

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Distancia a una polilínea y lado (signo del producto cruz) del segmento más cercano. */
function polyInfo(poly, x, y) {
  let best = Infinity, side = 1;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d < best) { best = d; side = Math.sign(dx * (y - ay) - dy * (x - ax)) || 1; }
  }
  return { d: best, side };
}

export function makeTerrain(C) {
  const T = C.TERRAIN;
  const [H0, H1, H2] = T.heights;
  // Plataformas (terrazas construidas): dentro del polígono la cota pasa a ser h, con un borde de EDGE px
  const EDGE = 7;
  const plats = (T.platforms || []).map(p => ({ ...p, poly: geo.rectPoly(p.rect[0], p.rect[1], p.rect[2], p.rect[3], p.rot ?? C.ROT) }));
  const edgeDist = (poly, x, y) => { let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; d = Math.min(d, geo.segDist(x, y, a[0], a[1], b[0], b[1]).d); } return d; };

  /** 0 = Av. España … 1 = Av. Los Placeres (negativo = lado del mar) */
  function sAt(x, y) {
    const e = polyInfo(T.espana, x, y), p = polyInfo(T.placeres, x, y);
    if (e.side < 0) return -e.d;            // al otro lado de Av. España (borde costero / mar)
    if (p.side > 0) return 1;               // al otro lado de Los Placeres (cerro)
    return e.d / (e.d + p.d);
  }
  function baseHeight(x, y) {
    const s = sAt(x, y);
    if (s < 0) return -s > T.coast ? -0.8 : H0 - smooth(T.coast - 12, T.coast, -s) * (H0 + 0.8);
    return H0
      + (H1 - H0) * smooth(T.low.c - T.low.w / 2, T.low.c + T.low.w / 2, s)
      + (H2 - H1) * smooth(T.high.c - T.high.w / 2, T.high.c + T.high.w / 2, s);
  }
  function heightAt(x, y) {
    let h = baseHeight(x, y);
    for (const p of plats) if (geo.inPoly(x, y, p.poly)) { const t = smooth(0, EDGE, edgeDist(p.poly, x, y)); h += (p.h - h) * t; }
    return h;
  }
  /** Terraza: 0 baja (Av. España) · 1 media · 2 alta (Los Placeres) */
  function levelAt(x, y) { const s = sAt(x, y); return s < T.low.c ? 0 : s < T.high.c ? 1 : 2; }
  const isSea = (x, y) => { const s = sAt(x, y); return s < 0 && -s > T.coast; };
  return { sAt, heightAt, levelAt, isSea };
}

/** Utilidades geométricas compartidas (coordenadas en px del mapa). */
export const geo = {
  /** Punto en coordenadas de imagen a partir del centro, desplazamientos locales y rotación (grados). */
  local(cx, cy, dx, dz, rot) {
    const a = rot * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);   // eje x local (a lo largo de la calle)
    return [cx + ux * dx - uy * dz, cy + uy * dx + ux * dz];             // eje z local: perpendicular, hacia Los Placeres
  },
  rectPoly(cx, cy, w, d, rot) {
    return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([dx, dz]) => geo.local(cx, cy, dx, dz, rot));
  },
  inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  },
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
    return { d: Math.hypot(px - ax - t * dx, py - ay - t * dy), t, x: ax + t * dx, y: ay + t * dy };
  },
  polyDist(poly, x, y) { return polyInfo(poly, x, y).d; },
};

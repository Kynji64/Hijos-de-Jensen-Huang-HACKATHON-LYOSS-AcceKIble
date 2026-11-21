# Campus sin barreras · UTFSM Casa Central

Prototipo (Fase 1) para la Hackathon LYOSS USM 2026: mapa 3D interactivo del campus Casa Central (Valparaíso) con rutas exteriores desde 3 tótems.

## Estructura del proyecto

```text
├── index.html                    # Estructura HTML, importmap de Three.js e interfaz de usuario
├── css/
│   └── styles.css                 # Estilos de la interfaz, tarjetas, etiquetas 3D y vista móvil
├── js/
│   ├── main.js                   # Escena 3D (Three.js), controles, ruta animada y lógica de UI
│   ├── terrain.js                # Ladera Av. España → Los Placeres: alturas, terrazas y utilidades geométricas
│   ├── data/
│   │   └── campus-data.js        # Coordenadas, terrazas, edificios, canchas, tótems y grafo peatonal
│   └── pathfinding/
│       └── dijkstra.js           # Construcción del grafo, algoritmo Dijkstra (estándar/accesible) y pasos
├── LICENSE                       # Licencia GNU GPL v3
└── README.md
```

## Ejecutar localmente

Al utilizar módulos ES (`<script type="module">`), el proyecto debe servirse mediante un servidor HTTP local desde la raíz del repositorio:

```bash
python3 -m http.server 8765
```

Luego abre en el navegador: http://localhost:8765

## Parámetros de URL (para QR / tótem físico)

- `?totem=T1|T2|T3` — fija el tótem de origen (`T1`: Av. España, `T2`: San Luis, `T3`: Sector M–R)
- `?dest=C` — abre directamente la ruta hacia un destino (`A`, `B`, `C`, `D`, `E`, `F`, `F2`, `H`, `I`, `J`, `K`, `L`, `M`, `M2`, `MAT`, `N`, `P`, `Q`, `R`, `T`, `U`, `SAN`, `PIS`, `PC`, `PCA`, `CM`, `C11`, `TEN`)

## Editar datos del campus

Toda la información geográfica y topológica se encuentra en `js/data/campus-data.js`, en píxeles del mapa OpenStreetMap del campus (captura 2000 × 1022 px, norte arriba, ≈ 0,28 m/px). Letras de edificios, calles internas y espacios según el plano físico oficial del campus (dibujado con el sur arriba):

- `OUTLINE` — polígono del perímetro del recinto
- `LEVELS` y `BAND` — terrazas de elevación (nivel bajo, medio y alto)
- `PLACES` — edificios, canchas y puntos de interés con sus nodos de acceso (`entries`)
- `TOTEMS` — puntos físicos de origen
- `STREETS` y `PATHS` — calles (`ext: true` = calle pública exterior, `ext: false` = calle interna del recinto) y senderos como polilíneas; la red de rutas se genera sola (nodos cada ~7 m, extremos soldados, altura desde el terreno). Un sendero con pendiente > 14 % se trata como escalera; `type: 's'` / `'r'` fuerza escalera o rampa
- `GREENS` y `PLAZAS` — áreas verdes (ladera, Patio de los Cañones, Ceibos, entorno CED) y plazas (Patio Central)
- `TERRAIN` — polilíneas de Av. España y Av. Los Placeres y posición de los taludes

## Novedades v2 (mapa interactivo)

- **Arquitectura por estilo:** casco histórico neogótico con techos de teja (A con Torre del Reloj y Aula Magna, B con patio y Piscina, C Talleres con techo en diente de sierra, pabellones E/F, Casa Rector H); M, R y T comparten el mismo lenguaje moderno de bandas; D, U, K, M2, P y P2 son minimalistas con muro cortina.
- **Calles reales en el grafo y pintadas en el suelo:** Talleres, Quezada Acharán, Carlos Van Buren, Carlos Edwards y Agustín Edwards.
- **Tour 360° USM:** botón en la tarjeta de cada lugar y de la ruta. Embebe el visor oficial (`/recorridos/campus-casacentral/`, ya que la página pública bloquea iframes) y ofrece abrirlo en una pestaña nueva.
- `js/map.js`, `css/map.css` y `data/buildings.geojson` son un prototipo aparte con MapLibre y no los carga `index.html`.

## Escaleras y grafo (para la ruta accesible)

- Las escaleras reales del plano oficial están en `PATHS` (`type: 's'`) y en los bordes de las terrazas de `TERRAIN.platforms` (casco histórico, Patio de los Ceibos, Edificio R): un sendero que cruza un desnivel con pendiente > 14 % se marca solo como escalera.
- Cada arista del grafo trae `hasStairs: true | false` (las calles internas y las rampas `type: 'r'` son `false`). `computeRoute(G, lugar, tótem, true)` ya bloquea las aristas con `hasStairs` y las calles exteriores (salvo destinos fuera del recinto).
- `window.campus.setStairMarkers(true)` muestra un ícono 🪜 sobre cada escalera (pensado para la vista de accesibilidad).

## Licencia

Distribuido bajo la licencia **GNU General Public License v3.0**. Consulta el archivo `LICENSE` para más detalles.

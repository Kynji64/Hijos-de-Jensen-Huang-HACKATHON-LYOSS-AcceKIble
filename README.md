# Campus sin barreras · UTFSM Casa Central

Prototipo (Fase 1) para la Hackathon LYOSS USM 2026: mapa 3D interactivo del campus Casa Central (Valparaíso) con rutas exteriores desde 3 tótems y modo **Ruta accesible** (sin escaleras).

## Estructura del proyecto

```text
├── index.html                    # Estructura HTML, importmap de Three.js e interfaz de usuario
├── css/
│   └── styles.css                 # Estilos de la interfaz, tarjetas, etiquetas 3D y vista móvil
├── js/
│   ├── main.js                   # Escena 3D (Three.js), controles, ruta animada y lógica de UI
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
- `?dest=C` — abre directamente la ruta hacia un destino (`A`, `B`, `C`, `D`, `E`, `F`, `H`, `K`, `M`, `M2`, `P`, `P2`, `R`, `T`, `U`, `CM`, `C11`, `FED`)

## Editar datos del campus

Toda la información geográfica y topológica se encuentra en `js/data/campus-data.js`, expresada en coordenadas de píxel referenciales del plano del campus:

- `OUTLINE` — polígono del perímetro del recinto
- `LEVELS` y `BAND` — terrazas de elevación (nivel bajo, medio y alto)
- `PLACES` — edificios, canchas y puntos de interés con sus nodos de acceso (`entries`)
- `TOTEMS` — puntos físicos de origen
- `NODES` y `EDGES` — grafo peatonal (`p`: camino plano, `s`: escalera, `r`: rampa)

## Novedades v2 (mapa interactivo)

- **Arquitectura por estilo:** casco histórico neogótico con techos de teja (A con Torre del Reloj y Aula Magna, B con patio y Piscina, C Talleres con techo en diente de sierra, pabellones E/F, Casa Rector H); M, R y T comparten el mismo lenguaje moderno de bandas; D, U, K, M2, P y P2 son minimalistas con muro cortina.
- **Calles reales en el grafo y pintadas en el suelo:** Talleres, Quezada Acharán, Carlos Van Buren, Carlos Edwards y Agustín Edwards.
- **Ruta accesible:** evita la escalinata monumental de Av. España y las escaleras de Quezada Acharán y del sector M; sube por Van Buren, Carlos Edwards y Agustín Edwards.
- **Tour 360° USM:** botón en la tarjeta de cada lugar y de la ruta. Embebe el visor oficial (`/recorridos/campus-casacentral/`, ya que la página pública bloquea iframes) y ofrece abrirlo en una pestaña nueva.
- `js/map.js`, `css/map.css` y `data/buildings.geojson` son un prototipo aparte con MapLibre y no los carga `index.html`.

## Licencia

Distribuido bajo la licencia **GNU General Public License v3.0**. Consulta el archivo `LICENSE` para más detalles.

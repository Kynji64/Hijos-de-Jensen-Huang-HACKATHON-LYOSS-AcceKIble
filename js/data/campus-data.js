/* =====================================================================
   DATOS DEL CAMPUS · UTFSM Casa Central (Valparaíso)
   ---------------------------------------------------------------------
   Módulo ES: exporta CAMPUS (lo importan js/main.js, js/terrain.js y el
   enrutador).

   Referencias:
     · Plano físico oficial del campus (letras de edificios, calles internas,
       Patio Central, Patio de los Cañones, Piscina, accesos).
     · Mapa OpenStreetMap (captura 2000 × 1022 px, norte arriba) para la
       geometría. TODAS las coordenadas están en píxeles de esa imagen
       (≈ 0,28 m por píxel). El plano oficial está dibujado con el sur hacia
       arriba (Av. Los Placeres arriba): es el mismo campus girado 180°.

   La trama urbana está girada ≈ -22°. La escena gira el mundo +22° para que
   calles y edificios queden alineados con los ejes.
   ===================================================================== */

const ROT = -22;   // orientación dominante de la trama (grados, sentido de la imagen)

/* ---------- Terreno ----------
   Ladera entre Av. España (mar, cota baja) y Av. Los Placeres (cota alta).
   s = 0 en España … 1 en Placeres. low/high = centro y ancho de los taludes. */
const TERRAIN = {
  heights: [1.0, 5.0, 9.0],          // unidades 3D (≈ 2,15 m c/u)
  low:  { c: 0.17, w: 0.08 },        // ladera verde: Acceso Av. España (abajo) → Agustín Edwards / Edificio A
  high: { c: 0.66, w: 0.04 },        // talud entre la terraza media y Quezada Acharán
  coast: 95,                         // px de borde costero (vía férrea) antes del mar
  // Plataformas: dentro del rectángulo el terreno toma la altura h (borde de ~7 px = muro / escalera).
  // [cx, cy, w, d] en px de la imagen, alineados a la trama. Generan los desniveles de las escaleras reales.
  platforms: [
    { name: 'Terraza del casco: Patio Central', rect: [852,419,115,165], h: 6.4 },
    { name: 'Terraza del casco: Gimnasio 1',    rect: [942,382,150,165], h: 6.4 },
    { name: 'Terraza del casco: Edificio U',    rect: [1051,313,104,211], h: 6.4 },
    { name: 'Terraza del casco: Edificio B',    rect: [1013,552,346,212], h: 6.4 },
    { name: 'Terraza del casco: Edificio D',    rect: [693,479,235,143], h: 6.4 },
    { name: 'Patio de los Ceibos (elevado)',    rect: [534,307,165,105], h: 5.8 },
    { name: 'Edificio R (nivel Av. Los Placeres)', rect: [1745,618,98,98], h: 9.9 },
  ],
  espana:   [[-40,520],[30,380],[110,265],[220,160],[350,75],[480,15],[650,-40],[900,-85],[1180,-110],[1500,-190],[2000,-370],[2600,-600]],
  placeres: [[500,1260],[700,1150],[968,1012],[1200,920],[1500,800],[1800,682],[1960,620],[2300,490],[2700,330]],
};

/* ---------- Polígono del recinto (rejas / porterías) ---------- */
const OUTLINE = [
  [150,470],[200,330],[250,240],[380,150],[480,50],[560,5],[700,-35],[900,-62],[1100,-88],[1250,-100],
  [1500,-160],[1540,60],[1560,170],[1700,150],[1790,140],[1830,250],[1870,380],[1960,600],
  [1800,665],[1500,785],[1200,905],[985,990],[930,940],[860,880],[790,820],[730,740],[680,680],
  [620,630],[480,592],[330,545],[230,510]
];

/* ---------- Categorías ---------- */
const CATS = {
  historico: { label: 'Edificio histórico', css: '#a8462c' },
  moderno:   { label: 'Edificio moderno',   css: '#4f6584' },
  deportivo: { label: 'Espacio deportivo',  css: '#1f9d55' },
  espacio:   { label: 'Espacio abierto',    css: '#b8892b' },
  servicios: { label: 'Servicios',          css: '#d62839' },
};

/* ---------- Tour 360° oficial ---------- */
const TOUR = {
  page:   'https://tour360.usm.cl/casa-central-valparaiso/',
  viewer: 'https://tour360.usm.cl/recorridos/campus-casacentral/',
  general: ['Acceso Campus', 'Patio Central', 'Patio del Cañón', 'Jardín de La Fuente', 'Calle Quezada Acharán', 'Calle Edwards', 'Calle Talleres'],
};

/* ---------- Calles ----------
   ext: true  = calle pública exterior (asfalto oscuro, fuera de las rejas)
   ext: false = calle interna del recinto (pavimento claro, demarcada)
   graph: forma parte de la red de rutas. Los vértices compartidos son cruces
   (los cruces interna/externa corresponden a las porterías).               */
const STREETS = {
  // Exteriores
  ESP: { name: 'Av. España',            ext: true,  width: 8,   graph: false, pts: TERRAIN.espana.slice(0, 10) },
  PLA: { name: 'Av. Los Placeres',      ext: true,  width: 6.5, graph: true,  pts: [[700,1150],[968,1012],[1200,920],[1440,824],[1500,800],[1800,682],[1850,663],[1960,620],[2150,545]] },
  SL:  { name: 'Subida San Luis',       ext: true,  width: 4.2, graph: true,  pts: [[-60,600],[60,530],[180,520],[240,540],[300,560],[420,610],[560,632],[650,645],[700,700],[745,778],[790,845],[860,905],[920,960],[968,1012],[1000,1080],[1060,1200]] },
  VAL: { name: 'Pasaje Valdés',         ext: true,  width: 3.2, graph: false, pts: [[1960,620],[1885,410],[1840,260],[1800,90]] },
  GB:  { name: 'General Bari',          ext: true,  width: 3.4, graph: false, pts: [[1555,120],[1700,95],[1800,80],[2000,15]] },
  MAT: { name: 'Av. Matta',             ext: true,  width: 4.2, graph: true,  pts: [[1850,663],[1890,760],[1940,880],[1990,1000],[2040,1120]] },
  SG:  { name: 'San Guillermo',         ext: true,  width: 3.4, graph: false, pts: [[1440,824],[1480,930],[1530,1050],[1570,1160]] },
  // Internas
  AE:  { name: 'Calle Agustín Edwards', ext: false, width: 3.6, graph: true,  pts: [[240,540],[235,495],[215,420],[212,330],[240,262],[300,220],[420,175],[560,122],[640,135],[700,195],[780,190],[900,150],[1040,108],[1082,140]] },
  CE:  { name: 'Calle Carlos Edwards',  ext: false, width: 3.4, graph: true,  pts: [[1082,140],[1120,240],[1175,360],[1240,425],[1300,480],[1340,500],[1460,478],[1600,445],[1720,412]] },
  QA:  { name: 'Calle Quezada Acharán', ext: false, width: 3.8, graph: true,  pts: [[745,778],[845,765],[905,742],[1050,680],[1200,620],[1350,555],[1450,520],[1580,465],[1720,412],[1790,385]] },
  TAL: { name: 'Calle Talleres',        ext: false, width: 2.8, graph: true,  pts: [[989,955],[1526,738]] },
  CVB: { name: 'Calle Carlos Van Buren', ext: false, width: 3.4, graph: true, pts: [[235,495],[330,525],[480,578],[640,580],[745,560],[790,535],[810,520]] },
  CVS: { name: 'Calle Carlos Van Buren', ext: false, width: 3.2, graph: true, pts: [[745,560],[745,615],[765,690],[805,740],[845,765]] },
};

/* ---------- Senderos peatonales internos (polilíneas) ----------
   type: p = sendero (si la pendiente supera ~14 % se trata como escalera)
         s = escalera explícita · r = rampa accesible explícita
   Los extremos se "sueldan" a la calle o sendero más cercano; las puertas
   de los edificios (entries) quedan fijas.                                 */
const PATHS = [
  // Acceso Av. España: portería I y escalinata monumental doble (tramo central + dos tramos simétricos)
  { pts: ['T1', [885,46]] },
  { name: 'la escalinata de Acceso Av. España', type: 's', width: 5, pts: [[806,168], [791,130]] },
  { name: 'la escalinata de Acceso Av. España', type: 's', width: 3.6, pts: [[791,130], [742,117]] },
  { name: 'la escalinata de Acceso Av. España', type: 's', width: 3.6, pts: [[791,130], [816,87]] },
  { name: 'el Acceso Av. España', pts: [[816,87], 'T1'] },
  { pts: [[742,117], [760,70]] },
  { name: 'la plaza del Edificio A', pts: [[842,182], [828,210]] },
  { name: 'el sendero bajo de la ladera', pts: ['T1', [760,70], [640,100], [560,122]] },
  { name: 'los jardines de Av. España', pts: [[560,122],[520,82],[585,52],[540,12]] },
  // Patio Central (entre A, B y D)
  { name: 'el Patio Central', pts: [[867,320],[847,420]] },                 // escalera A ↔ Patio Central
  { name: 'el Patio Central', pts: [[847,420],[970,468]] },
  { name: 'el Patio Central', pts: [[847,420],[800,436]] },
  { name: 'la escalera del Patio Central (Carlos Van Buren)', pts: [[847,420],[810,520]] },
  { name: 'el pasillo norte del Edificio B', pts: [[970,468],[1038,434]] },
  { name: 'la escalera de A hacia D', pts: [[728,312],[800,436]] },
  { name: 'el pasillo de A hacia F2', pts: [[728,312],[676,354]] },
  { name: 'la escalera entre E y D', pts: [[676,354],[666,420]] },
  { name: 'la escalera entre E y D', pts: [[589,431],[666,420]] },
  // Patio de los Cañones (jardines geométricos entre E, F2 y F)
  { name: 'el Patio de los Cañones', pts: [[292,348],[381,369],[470,390]] },
  { name: 'el Patio de los Cañones', pts: [[438,289],[381,369],[331,446]] },
  { name: 'el Patio de los Cañones', pts: [[438,289],[464,335],[534,307],[604,279]] },
  { name: 'el Patio de los Cañones', pts: [[514,258],[534,307],[561,359]] },
  { pts: [[459,276],[438,289]] },
  { pts: [[459,276],[514,258]] },
  { pts: [[470,390],[474,436],[589,431]] },
  { pts: [[331,446],[330,524]] },
  { name: 'la escalera poniente del Patio de los Cañones', pts: [[292,348],[214,346]] },
  { pts: [[430,204],[432,172]] },
  { name: 'la escalera del Edificio T', type: 's', width: 2.6, pts: [[165,410],[213,402]] },
  { pts: [[170,372],[212,352]] },
  { name: 'la escalera de F2 al Patio de los Cañones', type: 's', width: 2.4, pts: [[575,255],[587,224]] },
  { pts: [[452,530],[452,566]] },                                          // Cancha de Tenis
  // Casa Rector (H) en la ladera bajo la cancha
  { name: 'el sendero de la Casa Rector', type: 'r', pts: [[1214,86],[1150,112],[1082,140]] },
  // A ↔ U ↔ B (pasaje de la Biblioteca y del Gimnasio 3)
  { name: 'la escalera entre A y U', pts: [[970,241],[1001,308]] },
  { name: 'el pasaje de la Biblioteca', pts: [[1001,308],[1010,360],[1038,434]] },
  { name: 'la escalera de la Biblioteca (Carlos Edwards)', pts: [[1089,272],[1134,272]] },
  { name: 'el pasaje del Gimnasio 3', pts: [[970,241],[990,215],[1060,190],[1097,174]] },
  { name: 'la escalera oriente del Edificio B', type: 's', width: 2.8, pts: [[1173,500],[1262,445]] },
  { name: 'la rampa de acceso al casco', type: 'r', pts: [[1185,372],[1110,420],[1038,434]] },
  { name: 'las escaleras hacia la Cancha de Fútbol', type: 's', width: 3, pts: [[1213,606],[1195,530],[1173,500]] },
  { name: 'las escaleras hacia la Cancha de Fútbol', type: 's', width: 3.2, pts: [[1300,480],[1350,555]] },
  { pts: [[1049,661],[1050,681]] },
  { pts: [[848,631],[757,640]] },
  // Cancha CED, Edificio L, Gimnasio 2 y Edificio M
  { pts: [[1252,340],[1185,345]] },
  { name: 'el entorno de la Cancha CED', pts: [[1150,290],[1235,248],[1283,252]] },
  { name: 'la escalera del corredor de la cancha', type: 's', width: 2.6, pts: [[1460,478],[1470,425]] },
  { pts: [[1673,310],[1662,380]] },
  { name: 'la rampa del Edificio M', type: 'r', pts: [[1728,300],[1700,330],[1662,380],[1656,428]] },
  { pts: [[1806,368],[1792,384]] },
  { name: 'la escalera del Edificio M', type: 's', width: 2.6, pts: [[1765,398],[1745,352],[1728,300]] },
  // Edificio C (Talleres) y cadena J · Q · K · N junto a Subida San Luis
  { pts: [[1183,662],[1181,628]] },
  { pts: [[940,864],[915,875]] },
  { pts: [[1254,840],[1258,852]] },
  { name: 'el pasaje interior de San Luis', pts: [[868,768],[897,845],[928,905],[972,945],[989,955]] },
  { pts: [[962,962],[972,947]] },
  { pts: [[895,880],[915,880]] },
  { pts: [[821,794],[821,768]] },
  { pts: [[868,820],[885,818]] },
  { pts: [[799,845],[791,845]] },
  { pts: [[714,539],[714,566]] },
  { name: 'la portería de Subida San Luis', pts: ['T2', [989,955]] },
  { pts: ['T2', [944,992]] },
  { name: 'el pasaje oriente de Talleres', pts: [[1515,503],[1548,600],[1545,700],[1526,738]] },
  // Tótem 3: Sansanito, R, Cancha Multiuso, Quezada Acharán
  { pts: ['T3', [1690,428]] },
  { pts: ['T3', [1655,571]] },
  { name: 'la escalera del Edificio R', type: 's', width: 2.6, pts: ['T3', [1729,577]] },
  { name: 'la rampa del Edificio R', type: 'r', pts: ['T3', [1702,560], [1702,624]] },
  { pts: ['T3', [1747,526]] },
  // Fuera del recinto: P1-P2 y Edificio Matta (cruzando Av. Los Placeres)
  { name: 'el cruce de Av. Los Placeres', pts: [[1322,908],[1318,874]] },
  { pts: [[1898,849],[1925,849]] },
];

/* ---------- Tótems ---------- */
const TOTEMS = [
  { id:'T1', n:1, name:'Acceso Av. España',  short:'Av. España',  at:[862,40] },
  { id:'T2', n:2, name:'Subida San Luis',    short:'San Luis',    at:[976,972] },
  { id:'T3', n:3, name:'Sector M – R',       short:'Sector M–R',  at:[1690,500] },
];

/* ---------- Lugares ----------
   px,py = centro · w = largo (a lo largo de la calle) · d = fondo · h = altura
   rot = orientación (por defecto la de la trama) · entries = accesos (px)
   outside = fuera del recinto (la ruta puede usar calles exteriores)        */
const PLACES = [
  { id:'A', name:'Edificio A', sub:'Aula Magna · Torre del Reloj · Gimnasio 1', cat:'historico', style:'gothic-a',
    px:845, py:265, w:230, d:100, h:7, entries:[[828,210],[867,320],[728,312],[970,241]],
    tour:['Frontis Aula Magna','Aula Magna','Edificio A'],
    desc:'Edificio emblemático del casco histórico neogótico, con la Torre del Reloj y el Aula Magna. Su fachada da a la plaza de Calle Agustín Edwards, sobre la escalinata que baja al Acceso Av. España; al sur está el Patio Central.' },
  { id:'B', name:'Edificio B', sub:'Dep. Electrónica · Piscina', cat:'historico', style:'gothic-court',
    px:1010, py:565, w:330, d:190, h:6, entries:[[970,468],[1038,434],[1049,661],[848,631],[1173,500]],
    tour:['Edificio B','Edificio B - Química','Patio Interior'],
    desc:'Claustro histórico entre Calle Quezada Acharán y el Patio Central. En su patio interior está la Piscina Universitaria.' },
  { id:'PIS', name:'Piscina Universitaria', icon:'🏊', cat:'deportivo', style:'pool',
    px:1000, py:550, w:100, d:44, entries:[[970,468],[1038,434]],
    tour:['Piscina'],
    desc:'Piscina en el patio interior del Edificio B, rodeada de jardines. Se entra por el Edificio B desde el Patio Central.' },
  { id:'C', name:'Edificio C', sub:'Dep. Obras Civiles · Talleres', cat:'historico', style:'talleres',
    px:1219, py:751, w:580, d:175, h:6, entries:[[1183,662],[940,864],[1254,840]],
    tour:['Edificio C','Edificio C - LEMCO','Calle Talleres'],
    desc:'Nave histórica de los Talleres con techumbre en diente de sierra, entre Calle Quezada Acharán y Calle Talleres (junto a Av. Los Placeres).' },
  { id:'D', name:'Edificio D', sub:'Casino · Arquitectura', cat:'moderno', style:'modern',
    px:690, py:480, w:220, d:110, h:6, entries:[[800,436],[666,420],[714,539]],
    desc:'Comedor y Casino universitario, y dependencias de Arquitectura. Junto al Patio Central y Calle Carlos Van Buren, unido al Edificio E.' },
  { id:'E', name:'Edificio E', sub:'Dep. Física', cat:'historico', style:'gothic-pav',
    px:575, py:395, w:200, d:60, h:5, entries:[[561,359],[589,431],[676,354],[474,436]],
    tour:['Edificio E'],
    desc:'Pabellón histórico del antiguo Internado. Forma, con F2 y F, la herradura que rodea el Patio de los Cañones.' },
  { id:'F', name:'Edificio F', sub:'Dep. Matemáticas', cat:'historico', style:'gothic-pav',
    px:445, py:240, w:320, d:60, h:5, entries:[[459,276],[430,204],[587,224]],
    tour:['Edificio F','Edificio F - Informática'],
    desc:'Pabellón histórico del antiguo Pensionado, a lo largo de Calle Agustín Edwards. Cierra por el lado del mar el Patio de los Cañones.' },
  { id:'F2', name:'Edificio F2', sub:'Dep. Comercial', cat:'historico', style:'gothic-pav',
    px:624, py:271, w:30, d:133, h:5, entries:[[604,279]],
    tour:['Edificio F2'],
    desc:'Ala que une el Edificio F con el Edificio E, junto al Edificio A, y cierra el Patio de los Cañones.' },
  { id:'H', name:'Edificio H', sub:'Ex-Casa Rector · Museo', cat:'historico', style:'chalet',
    px:1200, py:50, w:100, d:60, h:4, entries:[[1214,86]],
    tour:['Museo Institucional'],
    desc:'Casona histórica de la Casa Rector, en la ladera bajo la Cancha de Fútbol. En este sector OpenStreetMap ubica el Museo Institucional UTFSM.' },
  { id:'I', name:'Edificio I', sub:'Portería Acceso Av. España', cat:'servicios', style:'modern',
    px:905, py:28, w:40, d:30, h:3, entries:[[885,46]],
    tour:['Acceso Campus'],
    desc:'Portería del Acceso Av. España, al pie de la escalinata que sube a la plaza del Edificio A. Junto al Tótem 1.' },
  { id:'J', name:'Edificio J', cat:'moderno', style:'modern',
    px:952, py:972, w:16, d:24, h:4, entries:[[962,962]],
    desc:'Edificio angosto en la esquina de Subida San Luis con Av. Los Placeres, al inicio de Calle Talleres, junto a la portería y al Tótem 2.' },
  { id:'K', name:'Edificio K', sub:'CIAC', cat:'moderno', style:'modern',
    px:835, py:830, w:60, d:60, h:6, entries:[[821,794],[868,820],[799,845]],
    desc:'CIAC · Centro Integrado de Aprendizaje en Ciencias Básicas. En el borde de Subida San Luis, junto al Edificio Q y a Calle Quezada Acharán.' },
  { id:'L', name:'Edificio L', sub:'Graderias · Préstamo de Canchas', cat:'moderno', style:'modern',
    px:1275, py:330, w:30, d:140, h:4, entries:[[1252,340]],
    desc:'Pabellón alargado en el borde de la Cancha de Fútbol, frente a Calle Carlos Edwards.' },
  { id:'M', name:'Edificio M', cat:'moderno', style:'mrt',
    px:1772, py:283, w:75, d:165, h:8, entries:[[1728,300],[1806,368]],
    desc:'Bloque moderno junto a Pasaje Valdés (mismo lenguaje que R y T). Acceso accesible por la rampa desde Calle Carlos Edwards.' },
  { id:'M2', name:'Edificio M2', sub:'Gimnasio 2 y 3', cat:'moderno', style:'modern',
    px:1655, py:265, w:90, d:80, h:5, entries:[[1673,310]],
    desc:'Gimnasio 2, entre la Cancha de Fútbol y el Edificio M.' },
  { id:'MAT', name:'Edificio Matta', sub:'Ingeniería en Diseño', cat:'moderno', style:'modern', outside:true,
    px:1866, py:861, w:50, d:130, h:6, entries:[[1898,849]],
    tour:['Edificio Matta - IDP','Acceso Edificio Matta - IDP'],
    desc:'Edificio de Ingeniería en Diseño, fuera del recinto: cruzando Av. Los Placeres, por Av. Matta.' },
  { id:'N', name:'Edificio N', cat:'moderno', style:'modern', rot:23,
    px:728, py:598, w:18, d:18, h:3, entries:[[742,597]],
    desc:'Pequeño edificio en el empalme de Calle Carlos Van Buren con Subida San Luis.' },
  { id:'P', name:'Edificio P', sub:'P1 · P2', cat:'moderno', style:'parts', outside:true,
    px:1355, py:990, w:140, d:200, h:7, entries:[[1322,908]],
    parts:[[-45,-82,45,-12,7],[45,-82,72,-45,5],[-35,-12,32,60,8],[-62,88,32,106,3]],
    desc:'Bloque P (P1 y P2 conectados, planta escalonada) al otro lado de Av. Los Placeres, entre San Guillermo y San Luis.' },
  { id:'Q', name:'Edificio Q', cat:'moderno', style:'modern',
    px:882, py:888, w:18, d:22, h:3, entries:[[895,880]],
    desc:'Pequeño edificio junto a Subida San Luis, entre el Edificio J y el Edificio K - CIAC.' },
  { id:'R', name:'Edificio R', sub:'Dirección de Relaciones Estudiantiles', cat:'moderno', style:'mrt',
    px:1745, py:618, w:70, d:70, h:7, entries:[[1729,577],[1702,624]],
    desc:'Bloque moderno junto a Av. Los Placeres (mismo lenguaje que M y T), al lado de la Cancha Multiuso y el Sansanito.' },
  { id:'SAN', name:'Sansanito', icon:'✚', cat:'servicios', style:'kiosk',
    px:1668, py:605, w:60, d:55, h:3, entries:[[1655,571]],
    desc:'Sansanito: punto de atención entre el Edificio R, la Cancha Multiuso y Av. Los Placeres, a pasos del Tótem 3.' },
  { id:'T', name:'Edificio T', sub:'Dep. Humanístico', cat:'moderno', style:'mrt', rot:-55,
    px:135, py:390, w:70, d:45, h:5, entries:[[165,410],[170,372]],
    desc:'Bloque moderno del extremo poniente, junto a Calle Agustín Edwards y la bajada a Av. España (mismo lenguaje que M y R).' },
  { id:'U', name:'Edificio U', sub:'Biblioteca', cat:'moderno', style:'modern',
    px:1045, py:290, w:75, d:140, h:6, entries:[[1001,308],[1089,272]],
    tour:['Biblioteca'],
    desc:'Biblioteca, entre el Edificio A y Calle Carlos Edwards.' },
  { id:'CM', name:'Cancha Multiuso', icon:'🏀', sub:'5x5 · 7x7', cat:'deportivo', style:'multi',
    px:1812, py:500, w:120, d:200, entries:[[1747,526]],
    tour:['Cancha Deportiva'],
    desc:'Canchas multiuso junto al Edificio R y el Sansanito, entre Calle Quezada Acharán y Av. Los Placeres.' },
  { id:'C11', name:'Cancha de Fútbol', sub:'CED USM · 11x11', icon:'⚽', cat:'deportivo', style:'field',
    px:1409, py:241, w:234, d:373, entries:[[1470,425],[1283,252]],
    tour:['Cancha de Fútbol','Tribuna'],
    desc:'Cancha de fútbol 11x11 (CED USM), rodeada de áreas verdes, entre Calle Carlos Edwards, el Edificio L y el Gimnasio 2.' },
  { id:'TEN', name:'Cancha de Tenis', icon:'🎾', cat:'deportivo', style:'tennis', rot:30,
    px:420, py:482, w:105, d:62, entries:[[452,530]],
    desc:'Cancha de tenis entre los edificios D / E y Subida San Luis, sobre Calle Carlos Van Buren.' },
  { id:'PC', name:'Patio Central', icon:'▦', cat:'espacio', style:'plaza',
    px:847, py:420, w:105, d:165, entries:[[847,420]],
    tour:['Patio Central'],
    desc:'Plaza abierta entre los edificios A, B y D, con jardineras simétricas. Une los principales flujos peatonales del casco histórico.' },
  { id:'PCA', name:'Patio de los Cañones', icon:'🌳', cat:'espacio', style:'garden',
    px:465, py:335, w:330, d:110, entries:[[381,369],[534,307]],
    tour:['Patio del Cañón'],
    desc:'Jardines geométricos con senderos simétricos, enmarcados por los edificios E, F2 y F. En su centro está el cañón histórico.' },
];
PLACES.forEach(p => { p.rot ??= ROT; p.interior = null; /* Fase 2: { floors: [{ n, name, rooms: [] }] } */ });

/* ---------- Volúmenes de contexto dentro del campus (sin etiqueta) ---------- */
const DECOR = [
  { name:'Gimnasio 1', style:'gothic-pav', px:940, py:376, w:80, d:140, h:6, rot:ROT },
  { name:'Gimnasio 3', style:'modern', px:1000, py:160, w:50, d:50, h:4, rot:ROT },
  { name:'Sansamed', style:'modern', px:1628, py:690, w:40, d:40, h:3, rot:ROT },
];

/* ---------- Áreas verdes y plazas (polígonos o rectángulos girados) ---------- */
const GREENS = [
  { name:'Ladera de Av. España', kind:'park', poly:[[160,470],[205,330],[250,240],[380,160],[560,95],[700,60],[900,10],[1250,-15],[1500,-10],[1520,40],[1230,90],[1082,125],[1040,95],[900,138],[780,178],[700,182],[640,122],[560,108],[420,162],[300,205],[228,262],[198,330],[200,420],[215,480]] },
  { name:'Patio de los Cañones', kind:'garden', rect:[465,335,330,110] },
  { name:'Entorno CED', kind:'park', rect:[1395,250,330,430] },
  { name:'Franja verde Carlos Edwards', kind:'park', poly:[[1100,130],[1230,95],[1250,250],[1330,470],[1290,470],[1180,330]] },
  { name:'Jardín Edificio T', kind:'park', poly:[[160,330],[205,330],[200,430],[150,470],[110,420]] },
  { name:'Jardín Cancha de Tenis', kind:'park', poly:[[230,500],[330,520],[480,560],[500,470],[340,440],[300,420],[240,420]] },
];
const PLAZAS = [
  { name:'Patio Central', rect:[847,420,105,165] },
  { name:'Plaza Edificio A', rect:[836,196,110,26] },
  { name:'Acceso Av. España', rect:[870,60,90,42] },
  { name:'Descanso escalinata', rect:[791,130,44,32] },
];

export const CAMPUS = { ROT, TERRAIN, OUTLINE, CATS, TOUR, STREETS, PATHS, TOTEMS, PLACES, DECOR, GREENS, PLAZAS,
  SCALE: 0.13, M_PER_UNIT: 2.15, ORIGIN: { px: 1000, py: 480 } };
export default CAMPUS;

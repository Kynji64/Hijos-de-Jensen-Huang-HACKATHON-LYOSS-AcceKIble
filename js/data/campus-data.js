/* =====================================================================
   DATOS DEL CAMPUS · UTFSM Casa Central (Valparaíso)
   ---------------------------------------------------------------------
   Módulo ES: exporta CAMPUS (lo importan js/main.js y el enrutador).

   Todas las coordenadas están en PÍXELES del plano general del recinto
   (imagen ≈ 611 × 457 px, Av. España abajo). Así se corrigen mirando
   la imagen. La escena convierte con: x = (px-370)*0.5 · z = (py-250)*0.5
   ===================================================================== */

  /* ---------- Terrazas (topografía) ----------
     Franjas horizontales del plano: alta (py < 220), media, baja (py > 400). */
  const LEVELS = [
    { name: 'Nivel bajo',  sub: 'Av. España',                       h: 0.6, top: 0xdfe5d9 },
    { name: 'Nivel medio', sub: 'Casco histórico · canchas',        h: 5.0, top: 0xe7ecdf },
    { name: 'Nivel alto',  sub: 'Av. Placeres · Calle Talleres',    h: 9.4, top: 0xeef1e7 },
  ];
  const BAND = { highMax: 220, midMax: 400 };

  /* ---------- Polígono del recinto (línea roja del plano) ---------- */
  const OUTLINE = [
    [205,62],[236,58],[240,112],[262,132],[300,133],[337,128],[340,58],[358,45],[376,58],[380,118],
    [402,132],[440,140],[458,150],[464,200],[470,232],[466,262],[492,276],[540,290],[576,320],[600,355],
    [608,390],[590,406],[520,414],[432,434],[332,410],[318,398],[305,362],[200,362],[190,330],[185,292],
    [160,266],[150,240],[140,216],[130,204],[150,180],[170,160],[185,140],[205,120]
  ];

  /* ---------- Categorías ---------- */
  const CATS = {
    historico:  { label: 'Edificio histórico', group: 'Históricos',  css: '#a8462c' },
    moderno:    { label: 'Edificio moderno',   group: 'Modernos',    css: '#4f6584' },
    deportivo:  { label: 'Espacio deportivo',  group: 'Deportes',    css: '#1f9d55' },
    federacion: { label: 'Federación / Servicios', group: 'Federación / Servicios', css: '#d62839' },
  };

  /* ---------- Tour 360° oficial ----------
     La página pública bloquea iframes (X-Frame-Options: sameorigin), por eso
     el modal embebe el visor directo y ofrece abrir la página oficial aparte.
     Las escenas son nombres reales del recorrido (menú del visor).            */
  const TOUR = {
    page:   'https://tour360.usm.cl/casa-central-valparaiso/',
    viewer: 'https://tour360.usm.cl/recorridos/campus-casacentral/',
    general: ['Acceso Campus', 'Biblioteca', 'Museo Institucional', 'Patio del Cañón',
              'Jardín de La Fuente', 'Calle Quezada Acharán', 'Calle Edwards', 'Calle Talleres'],
  };

  /* ---------- Calles internas (nombres reales del plano ilustrado) ---------- */
  const STREETS = {
    TAL: 'Calle Talleres',
    QA:  'Calle Quezada Acharán',
    CVB: 'Calle Carlos Van Buren',
    CE:  'Calle Carlos Edwards',
    AE:  'Calle Agustín Edwards',
  };

  /* ---------- Lugares ----------
     style  → generador arquitectónico en la escena:
       'gothic-a'   Edificio A: alas neogóticas + Torre del Reloj
       'gothic-court' B: claustro con patio + piscina al norte
       'talleres'   C: nave industrial con techo diente de sierra
       'gothic-pav' E/F: pabellones de teja a dos aguas
       'chalet'     H: casona con techo inclinado
       'mrt'        M/R/T: bloque moderno de bandas horizontales (mismo estilo)
       'modern'     D/U/K/M2/P/P2: volumen minimalista con muro cortina
       'field' / 'multi' / 'house'
     px,py = centro · w,d = ancho/fondo (px) · h = altura sobre la terraza
     entries = nodos del grafo que funcionan como acceso
     interior = reservado para la Fase 2 (pisos y salas)                    */
  const PLACES = [
    { id:'A', name:'Edificio A', sub:'Aula Magna · Torre del Reloj', cat:'historico', style:'gothic-a',
      px:410, py:345, w:84, d:66, h:12, entries:['m_af','m_ppo','m_por'],
      tour:['Frontis Aula Magna','Aula Magna','Edificio A'],
      desc:'Edificio emblemático del casco histórico neogótico. Su fachada mira hacia Av. España; en el centro se eleva la Torre del Reloj y detrás el cuerpo del Aula Magna, entre el Patio Poniente y el Patio Oriente. Desde Av. España se llega por la escalinata monumental o, sin escaleras, por Calle Agustín Edwards.' },
    { id:'B', name:'Edificio B', sub:'Patio interior · Piscina', cat:'historico', style:'gothic-court',
      px:392, py:268, w:92, d:46, h:11, entries:['m_pab','m_bw','m_vb35','m_pool'],
      tour:['Edificio B','Edificio B - Química','Patio Central','Piscina','Patio Interior'],
      desc:'Claustro histórico con patio interior abierto. En su costado norte está la Piscina, junto a Calle Quezada Acharán. Accesos por el patio que lo separa del Edificio A, por Carlos Edwards y por Carlos Van Buren.' },
    { id:'C', name:'Edificio C', sub:'Talleres', cat:'historico', style:'talleres',
      px:350, py:182, w:150, d:48, h:9, entries:['h_cs','h_cn'],
      tour:['Edificio C','Edificio C - LEMCO','Calle Talleres'],
      desc:'Nave industrial histórica de los Talleres, con techumbre en diente de sierra y claraboyas. Está en la terraza alta, entre Calle Talleres (norte) y Calle Quezada Acharán (sur).' },
    { id:'D', name:'Edificio D', cat:'moderno', style:'modern', px:490, py:305, w:36, d:36, h:14, entries:['m_vb3'],
      tour:['Edificio D'],
      desc:'Edificio moderno del sector oriente, al otro lado de Calle Carlos Van Buren frente al Edificio B.' },
    { id:'E', name:'Edificio E', sub:'Ex Internado', cat:'historico', style:'gothic-pav', px:500, py:350, w:50, d:10, h:8, entries:['m_gar'],
      tour:['Edificio E'],
      desc:'Pabellón histórico del antiguo Internado, con techo de teja a dos aguas. Se abre hacia los jardines geométricos que comparte con el Edificio F.' },
    { id:'F', name:'Edificio F', sub:'Ex Pensionado', cat:'historico', style:'gothic-pav', px:505, py:385, w:50, d:10, h:8, entries:['m_gar'],
      tour:['Edificio F','Edificio F - Informática'],
      desc:'Pabellón histórico del antiguo Pensionado, paralelo al Edificio E y separado de él por jardines geométricos. Acceso desde Calle Carlos Van Buren.' },
    { id:'H', name:'Edificio H', sub:'Casa Rector', cat:'historico', style:'chalet', px:295, py:335, w:22, d:16, h:6, entries:['m_ce1'],
      desc:'Casona histórica de la Casa Rector, rodeada de jardines, entre la Cancha 11x11 y la bajada hacia Av. España. Acceso por Calle Carlos Edwards.' },
    { id:'K', name:'Edificio K', cat:'moderno', style:'modern', px:250, py:165, w:20, d:26, h:9, entries:['h_k'],
      desc:'Edificio moderno de la terraza alta sobre Calle Talleres, entre el Edificio R y el Edificio C.' },
    { id:'M', name:'Edificio M', cat:'moderno', style:'mrt', px:178, py:248, w:20, d:40, h:14, entries:['m_m'],
      desc:'Bloque moderno del sector poniente (mismo lenguaje que R y T). Desde el Tótem 3 se baja por escalera; en modo accesible se rodea por Calle Carlos Edwards.' },
    { id:'M2', name:'Edificio M2', cat:'moderno', style:'modern', px:205, py:262, w:16, d:20, h:8, entries:['m_m2'],
      tour:['Edificio M2','Edificio M2 - Sala de Máquinas'],
      desc:'Edificio moderno contiguo al Edificio M, al poniente de la Cancha 11x11.' },
    { id:'P', name:'Edificio P', cat:'moderno', style:'modern', px:352, py:104, w:24, d:30, h:12, entries:['h_p'],
      desc:'Edificio moderno del extremo norte, junto a la Entrada San Luis (Tótem 2).' },
    { id:'P2', name:'Edificio P2', cat:'moderno', style:'modern', px:357, py:70, w:20, d:20, h:9, entries:['h_p2'],
      desc:'Edificio moderno contiguo al Edificio P, en el extremo norte del recinto.' },
    { id:'R', name:'Edificio R', cat:'moderno', style:'mrt', px:205, py:158, w:30, d:24, h:12, entries:['h_rs'],
      desc:'Bloque moderno del sector alto poniente (mismo lenguaje que M y T), junto al Tótem 3 y la Cancha Multiuso.' },
    { id:'T', name:'Edificio T', cat:'moderno', style:'mrt', px:572, py:372, w:34, d:14, h:10, rot:-38, entries:['m_t'],
      desc:'Bloque moderno del extremo oriente (mismo lenguaje que M y R), al final de los jardines de E y F.' },
    { id:'U', name:'Edificio U', cat:'moderno', style:'modern', px:344, py:328, w:22, d:56, h:12, entries:['m_ue','m_ce1'],
      desc:'Edificio moderno alargado entre Calle Carlos Edwards y el ala poniente del Edificio A.' },
    { id:'CM', name:'Cancha Multiuso', icon:'🏀', code:'8013', cat:'deportivo', style:'multi', px:222, py:198, w:30, d:22, entries:['h_mc'],
      tour:['Cancha Deportiva'],
      desc:'Cancha multiuso del sector poniente (sector 8013 del plano), entre los edificios M y R, a pasos del Tótem 3.' },
    { id:'C11', name:'Cancha de Fútbol 11x11', icon:'⚽', code:'8007', cat:'deportivo', style:'field', px:258, py:268, w:56, d:76, entries:['m_ce3','m_fs'],
      tour:['Cancha de Fútbol','Tribuna'],
      desc:'Cancha de fútbol 11x11 de pasto (sector 8007 del plano), al oriente de los edificios M y M2 y sobre la Casa Rector (H).' },
    { id:'FED', name:'Casa de la Federación', short:'FEUTFSM', icon:'★', cat:'federacion', style:'house', px:162, py:205, w:14, d:12, h:4.5, entries:['h_fed'],
      desc:'Casa de la Federación de Estudiantes (FEUTFSM): edificación pequeña inmediatamente al norte del Edificio M, junto al Tótem 3.' },
  ];
  PLACES.forEach(p => { p.interior = null; /* Fase 2: { floors: [{ n, name, rooms: [] }] } */ });

  /* ---------- Tótems ---------- */
  const TOTEMS = [
    { id:'T1', n:1, name:'Entrada Av. España', short:'Av. España' },
    { id:'T2', n:2, name:'Entrada San Luis',   short:'San Luis' },
    { id:'T3', n:3, name:'Entre Edificio M y R', short:'Sector M–R' },
  ];

  /* ---------- Nodos del grafo peatonal ----------
     [px, py, etiqueta opcional para las indicaciones]
     h_ = nivel alto · m_ = nivel medio · l_ = nivel bajo                 */
  const NODES = {
    T1:[410,424,'el Tótem 1'], T2:[322,136,'el Tótem 2'], T3:[188,196,'el Tótem 3'],
    // Nivel alto
    h_tal2:[322,146], h_t1:[268,146], h_k:[250,146], h_w1:[230,146],
    h_cn:[350,146,'el acceso norte del Edificio C'], h_tal4:[400,146], h_vb6:[446,148],
    h_p:[352,126], h_p2b:[372,122], h_p2:[372,72],
    h_mc:[230,180,'la Cancha Multiuso'], h_rs:[205,178], h_fed:[174,205], h_w2:[244,182], h_w3:[252,213],
    h_st3:[195,214], h_qa1:[268,213], h_ce4:[295,213], h_qa2:[330,213],
    h_cs:[350,213,'el acceso sur del Edificio C'], h_qa3:[400,213], h_vb5:[448,208],
    // Nivel medio
    m_m:[195,234,'el Edificio M'], m_mid:[193,277], m_m2:[205,280], m_fw:[215,312],
    m_fs:[258,320,'la Cancha 11x11'], m_ce3:[305,248], m_ce2:[310,296], m_ce1:[318,336], m_ae:[326,384],
    m_qs:[330,236], m_bw:[338,268], m_pool:[392,241,'la Piscina'], m_vb4:[452,240],
    m_uen:[358,296], m_pab:[400,301,'el patio entre los edificios A y B'], m_ue:[361,330],
    m_ppo:[390,340,'el Patio Poniente'], m_por:[430,340,'el Patio Oriente'],
    m_afw:[362,390], m_af:[410,390,'el frontis del Aula Magna'], m_vb1:[462,390],
    m_vb2:[462,365], m_vb3:[458,302], m_vb35:[455,268],
    m_gar:[505,367,'los jardines entre E y F'], m_gare:[548,367], m_t:[550,380],
    // Nivel bajo
    l_esc:[410,412], l_ae1:[372,414], l_vb0:[472,420],
  };

  /* ---------- Tramos ----------
     [nodoA, nodoB, tipo, calle?, ancho?]
     tipo: p = camino plano · s = escalera · r = rampa / pendiente continua */
  const EDGES = [
    // Calle Talleres (borde superior, detrás de C)
    ['h_w1','h_k','p','TAL'],['h_k','h_t1','p','TAL'],['h_t1','h_tal2','p','TAL'],['h_tal2','h_cn','p','TAL'],
    ['h_cn','h_tal4','p','TAL'],['h_tal4','h_vb6','p','TAL'],
    ['T2','h_tal2','p'],['h_tal2','h_p','p'],['h_p','h_cn','p'],['h_p','h_p2b','p'],['h_p2b','h_p2','p'],
    // Sector poniente alto (R, Cancha Multiuso, FEUTFSM, T3)
    ['h_w1','h_mc','p'],['h_mc','h_rs','p'],['h_rs','T3','p'],['T3','h_fed','p'],['T3','h_st3','p'],
    ['h_mc','h_w2','p'],['h_w2','h_w3','p'],['h_w3','h_st3','p'],['h_w3','h_qa1','p'],['h_t1','h_qa1','p'],
    // Calle Quezada Acharán (entre B y C)
    ['h_qa1','h_ce4','p','QA'],['h_ce4','h_qa2','p','QA'],['h_qa2','h_cs','p','QA'],['h_cs','h_qa3','p','QA'],['h_qa3','h_vb5','p','QA'],
    // Calle Carlos Van Buren (subida oriente hacia San Luis, pendiente continua)
    ['l_vb0','m_vb1','r','CVB'],['m_vb1','m_vb2','p','CVB'],['m_vb2','m_vb3','p','CVB'],['m_vb3','m_vb35','p','CVB'],
    ['m_vb35','m_vb4','p','CVB'],['m_vb4','h_vb5','r','CVB'],['h_vb5','h_vb6','p','CVB'],
    // Calle Carlos Edwards (curva entre la Cancha 11x11 y el patio A-B)
    ['h_ce4','m_ce3','r','CE'],['m_ce3','m_ce2','p','CE'],['m_ce2','m_ce1','p','CE'],['m_ce1','m_ae','p','CE'],
    // Calle Agustín Edwards (borde inferior y subida desde Av. España)
    ['T1','l_ae1','p','AE'],['l_ae1','m_ae','r','AE'],['T1','l_vb0','p','AE'],
    // Escaleras
    ['l_esc','m_af','s',null,6.5],          // escalinata monumental Av. España → Aula Magna
    ['h_qa2','m_qs','s'],                   // escala Quezada Acharán → Piscina / B
    ['h_st3','m_m','s'],                    // escala T3 → Edificio M
    ['T1','l_esc','p'],
    // Terraza media: casco histórico
    ['m_qs','m_pool','p'],['m_pool','m_vb4','p'],['m_qs','m_bw','p'],['m_qs','m_ce3','p'],['m_bw','m_ce3','p'],['m_bw','m_ce2','p'],
    ['m_ce2','m_uen','p'],['m_uen','m_pab','p'],['m_uen','m_ue','p'],['m_ue','m_afw','p'],
    ['m_pab','m_ppo','p'],['m_pab','m_por','p'],['m_pab','m_vb3','p'],
    ['m_ae','m_afw','p'],['m_afw','m_af','p'],['m_af','m_vb1','p'],
    ['m_vb2','m_gar','p'],['m_gar','m_gare','p'],['m_gare','m_t','p'],
    // Terraza media: sector poniente (M, M2, cancha)
    ['m_ce2','m_fs','p'],['m_fs','m_fw','p'],['m_fw','m_m2','p'],['m_m2','m_mid','p'],['m_mid','m_m','p'],
  ];

export const CAMPUS = { LEVELS, BAND, OUTLINE, CATS, TOUR, STREETS, PLACES, TOTEMS, NODES, EDGES,
  SCALE: 0.5, M_PER_UNIT: 1.2, ORIGIN: { px: 370, py: 250 } };
export default CAMPUS;

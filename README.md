# Campus sin barreras · UTFSM Casa Central

Prototipo (Fase 1) para la Hackathon LYOSS USM 2026: mapa 3D interactivo del campus con rutas exteriores desde 3 tótems y modo **Ruta accesible** (sin escaleras).

## Ejecutar
Abre `index.html` directamente en el navegador, o sírvelo localmente:

```bash
python3 -m http.server 8765
```

Luego entra a http://localhost:8765

## Parámetros de URL (para QR / tótem físico)
- `?totem=T1|T2|T3` — tótem de origen
- `?dest=C` — abre la ruta a un destino (id: A, B, C, D, E, F, H, K, M, M2, P, P2, R, T, U, CM, C11, FED)
- `?acc=1` — activa el modo Ruta accesible

## Editar datos
Todo está al inicio del `<script>` en `index.html`, en coordenadas de píxel del plano:
`OUTLINE` (recinto), `LEVELS`/`BAND` (terrazas), `PLACES` (edificios y canchas), `NODES` y `EDGES` (grafo peatonal; tipo `p` camino, `s` escalera, `r` rampa).

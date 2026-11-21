# totem_campus · App del tótem (Flutter web)

App del tótem del proyecto **Tótem USM · Campus sin barreras** (Hackathon LYOSS USM 2026, equipo Hijos de Jensen Huang).

- `lib/main.dart`: layout del tótem, selector **Mapa general / Movilidad reducida** y el `iframe` que carga el mapa 3D.
- `lib/panel_info.dart`: panel derecho con avisos, servicios, preguntas frecuentes y botón de ayuda.
- `web/mapa/` y `web/mapa_accesible/`: mapas 3D (HTML + JavaScript + Three.js). El accesible calcula siempre rutas sin escaleras.

## Ejecutar

```bash
flutter pub get
```
```bash
flutter run -d chrome
```

Requisitos, instalación completa, despliegue en Vercel y documentación del proyecto: ver el [README principal](../README.md).

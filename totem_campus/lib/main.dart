import 'dart:ui_web' as ui_web;

import 'package:material_ui/material_ui.dart';
import 'package:web/web.dart' as web;

import 'panel_info.dart';

// ─────────────────────────────────────────────────────────────
// Rutas de los dos mapas (dentro de la carpeta web/).
// Cuando sus compañeros entreguen los mapas, solo cambien estas dos líneas.
// ─────────────────────────────────────────────────────────────
const String rutaMapaGeneral = 'mapa/index.html';
const String rutaMapaAccesible = 'mapa_accesible/index.html';

void main() {
  runApp(const TotemApp());
}

class TotemApp extends StatelessWidget {
  const TotemApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tótem USM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F2A4A)),
      ),
      home: const PantallaPrincipal(),
    );
  }
}

class PantallaPrincipal extends StatefulWidget {
  const PantallaPrincipal({super.key});

  @override
  State<PantallaPrincipal> createState() => _PantallaPrincipalState();
}

class _PantallaPrincipalState extends State<PantallaPrincipal> {
  // Ancho del panel derecho (se cambia arrastrando la barrita del medio)
  double _anchoPanel = 380;
  static const double _anchoMin = 280;
  static const double _anchoMax = 600;

  // Modo del mapa: false = general, true = movilidad reducida
  bool _modoAccesible = false;

  void _cambiarModo(bool accesible) {
    if (accesible == _modoAccesible) return;
    setState(() => _modoAccesible = accesible);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F5F8),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Mapa 3D (ocupa todo el espacio que sobra) ──
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    // Borde verde cuando está en modo accesible
                    color: _modoAccesible
                        ? const Color(0xFF1E7A46)
                        : const Color(0xFFC7D1DD),
                    width: _modoAccesible ? 4 : 2,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: Mapa3D(accesible: _modoAccesible),
              ),
            ),

            // ── Barrita para cambiar el tamaño del panel ──
            MouseRegion(
              cursor: SystemMouseCursors.resizeColumn,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onHorizontalDragStart: (_) => Mapa3D.bloquearEventos(true),
                onHorizontalDragUpdate: (detalle) {
                  setState(() {
                    _anchoPanel =
                        (_anchoPanel - detalle.delta.dx).clamp(_anchoMin, _anchoMax);
                  });
                },
                onHorizontalDragEnd: (_) => Mapa3D.bloquearEventos(false),
                child: SizedBox(
                  width: 20,
                  child: Center(
                    child: Container(
                      width: 5,
                      height: 70,
                      decoration: BoxDecoration(
                        color: const Color(0xFF9AA8B8),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // ── Columna derecha: selector de modo + panel de info ──
            SizedBox(
              width: _anchoPanel,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SelectorModo(
                    accesible: _modoAccesible,
                    onCambio: _cambiarModo,
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: PanelInfo(modoAccesible: _modoAccesible),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dos botones grandes para elegir el tipo de mapa.
class SelectorModo extends StatelessWidget {
  final bool accesible;
  final ValueChanged<bool> onCambio;

  const SelectorModo({super.key, required this.accesible, required this.onCambio});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _BotonModo(
            texto: 'Mapa general',
            icono: Icons.map_outlined,
            activo: !accesible,
            colorActivo: const Color(0xFF0F2A4A),
            onTap: () => onCambio(false),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _BotonModo(
            texto: 'Movilidad reducida',
            icono: Icons.accessible,
            activo: accesible,
            colorActivo: const Color(0xFF1E7A46),
            onTap: () => onCambio(true),
          ),
        ),
      ],
    );
  }
}

class _BotonModo extends StatelessWidget {
  final String texto;
  final IconData icono;
  final bool activo;
  final Color colorActivo;
  final VoidCallback onTap;

  const _BotonModo({
    required this.texto,
    required this.icono,
    required this.activo,
    required this.colorActivo,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: activo ? colorActivo : Colors.white,
          foregroundColor: activo ? Colors.white : const Color(0xFF0F1E2E),
          side: BorderSide(
            color: activo ? colorActivo : const Color(0xFFC7D1DD),
            width: 2,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          padding: const EdgeInsets.symmetric(horizontal: 10),
        ),
        icon: Icon(icono, size: 26),
        label: Text(texto, textAlign: TextAlign.center),
        onPressed: onTap,
      ),
    );
  }
}

/// Muestra un mapa HTML de la carpeta web/ (solo funciona en web).
/// Cada modo usa su propio iframe: al cambiar, el anterior se destruye y libera memoria.
class Mapa3D extends StatelessWidget {
  final bool accesible;
  const Mapa3D({super.key, this.accesible = false});

  static bool _registrado = false;
  static web.HTMLIFrameElement? _iframeActual;

  static void _registrar() {
    if (_registrado) return;
    final mapas = {
      'mapa-general': rutaMapaGeneral,
      'mapa-accesible': rutaMapaAccesible,
    };
    mapas.forEach((tipo, ruta) {
      ui_web.platformViewRegistry.registerViewFactory(tipo, (int id) {
        final iframe = web.HTMLIFrameElement()
          ..src = ruta
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%';
        _iframeActual = iframe;
        return iframe;
      });
    });
    _registrado = true;
  }

  /// Mientras se arrastra la barrita o hay un diálogo abierto,
  /// el iframe no debe "robarse" el mouse.
  static void bloquearEventos(bool bloquear) {
    _iframeActual?.style.setProperty('pointer-events', bloquear ? 'none' : 'auto');
  }

  @override
  Widget build(BuildContext context) {
    _registrar();
    final tipo = accesible ? 'mapa-accesible' : 'mapa-general';
    // La key distinta obliga a Flutter a destruir el iframe viejo y crear uno nuevo
    return HtmlElementView(key: ValueKey(tipo), viewType: tipo);
  }
}
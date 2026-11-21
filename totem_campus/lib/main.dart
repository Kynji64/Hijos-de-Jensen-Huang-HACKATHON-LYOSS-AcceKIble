import 'dart:ui_web' as ui_web;

import 'package:material_ui/material_ui.dart';
import 'package:web/web.dart' as web;

import 'panel_info.dart';

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
                  border: Border.all(color: const Color(0xFFC7D1DD), width: 2),
                ),
                clipBehavior: Clip.antiAlias,
                child: const Mapa3D(),
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

            // ── Panel derecho con info complementaria ──
            SizedBox(
              width: _anchoPanel,
              child: const PanelInfo(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Muestra web/mapa/index.html dentro de la app (solo funciona en web).
class Mapa3D extends StatelessWidget {
  const Mapa3D({super.key});

  static bool _registrado = false;
  static web.HTMLIFrameElement? _iframe;

  /// Mientras se arrastra la barrita, el iframe no debe "robarse" el mouse.
  static void bloquearEventos(bool bloquear) {
    _iframe?.style.setProperty('pointer-events', bloquear ? 'none' : 'auto');
  }

  @override
  Widget build(BuildContext context) {
    if (!_registrado) {
      ui_web.platformViewRegistry.registerViewFactory('mapa-3d', (int id) {
        final iframe = web.HTMLIFrameElement()
          ..src = 'mapa/index.html'
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%';
        _iframe = iframe;
        return iframe;
      });
      _registrado = true;
    }
    return const HtmlElementView(viewType: 'mapa-3d');
  }
}
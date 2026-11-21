import 'dart:ui_web' as ui_web;

import 'package:material_ui/material_ui.dart';
import 'package:web/web.dart' as web;

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

class PantallaPrincipal extends StatelessWidget {
  const PantallaPrincipal({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F5F8),
      // Encabezado del tótem
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F2A4A),
        foregroundColor: Colors.white,
        toolbarHeight: 80,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'UTFSM · Campus Casa Central',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              'Tótem · Edificio A',
              style: TextStyle(fontSize: 14, color: Color(0xFFC9D6E6)),
            ),
          ],
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text(
              'Mapa USM',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            // Recuadro con el mapa 3D (web/mapa/index.html)
            // Cambia estos dos números para ajustar el tamaño del recuadro
            SizedBox(
              width: 1500, // ancho en píxeles
              height: 650, // alto en píxeles
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
            const SizedBox(height: 24),
            // Espacio libre para lo que viene después (buscador, categorías...)
            const Text(
              'Aquí irán el buscador y las categorías',
              style: TextStyle(fontSize: 16, color: Color(0xFF5B6B7D)),
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

  @override
  Widget build(BuildContext context) {
    if (!_registrado) {
      ui_web.platformViewRegistry.registerViewFactory('mapa-3d', (int id) {
        final iframe = web.HTMLIFrameElement()
          ..src = 'mapa/index.html'
          ..style.border = 'none'
          ..style.width = '100%'
          ..style.height = '100%';
        return iframe;
      });
      _registrado = true;
    }
    return const HtmlElementView(viewType: 'mapa-3d');
  }
}
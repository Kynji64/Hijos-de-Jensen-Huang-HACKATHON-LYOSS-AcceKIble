import 'package:material_ui/material_ui.dart';

// ─────────────────────────────────────────────────────────────
// Datos simulados (para la demo). Más adelante pueden venir de un JSON.
// ─────────────────────────────────────────────────────────────

class Aviso {
  final String titulo;
  final String detalle;
  final IconData icono;
  const Aviso(this.titulo, this.detalle, this.icono);
}

class Servicio {
  final String nombre;
  final double abre; // 8.5 = 08:30
  final double cierra; // 21.0 = 21:00
  const Servicio(this.nombre, this.abre, this.cierra);
}

class Pregunta {
  final String pregunta;
  final String respuesta;
  const Pregunta(this.pregunta, this.respuesta);
}

class Contacto {
  final String nombre;
  final String telefono;
  const Contacto(this.nombre, this.telefono);
}

const avisos = [
  Aviso('Ascensor Edificio C fuera de servicio',
      'En mantención hasta el 25/11. Usa el ascensor del Edificio B.',
      Icons.elevator_outlined),
  Aviso('Obras frente al Edificio D',
      'Paso cerrado por Av. España. Desvío señalizado por el patio central.',
      Icons.construction),
];

const servicios = [
  Servicio('Biblioteca', 8, 20),
  Servicio('Casino USM', 8, 14),
  Servicio('Kiosco Patio Central', 9.5, 19),
  Servicio('Sansanito', 8.5, 21),
  Servicio('Gimnasio USM', 9, 21),
];

const preguntas = [
  Pregunta('¿Dónde puedo imprimir?',
      'En la Biblioteca Central (piso 1) y en la sala de computadores del Edificio B.'),
  Pregunta('¿Dónde hay baños accesibles?',
      'En el piso 1 de los Edificios A, B y C, y en la Biblioteca. Búscalos en el mapa con la categoría "Baños".'),
  Pregunta('¿Cómo pido apoyo si tengo movilidad reducida?',
      'Acércate a la DAE o usa el botón "Necesito ayuda". También puedes activar la ruta accesible en el mapa.'),
  Pregunta('Es mi primer día, ¿qué hago?',
      'Revisa tu horario en el portal, ubica tus salas en el mapa y pasa por la DAE para la bienvenida.'),
];

const contactos = [
  Contacto('Guardia (24 h)', '+56 32 000 0000'),
  Contacto('Enfermería', '+56 32 000 0001'),
  Contacto('DAE', '+56 32 000 0002'),
];

// ─────────────────────────────────────────────────────────────
// Panel derecho con información complementaria al mapa
// ─────────────────────────────────────────────────────────────

class PanelInfo extends StatelessWidget {
  const PanelInfo({super.key});

  @override
  Widget build(BuildContext context) {
    final ahora = DateTime.now();
    final horaActual = ahora.hour + ahora.minute / 60;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFC7D1DD), width: 2),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Contenido con scroll
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Avisos ──
                _Titulo(icono: Icons.warning_amber_rounded, texto: 'Avisos (${avisos.length})'),
                for (final a in avisos) _TarjetaAviso(aviso: a),
                const SizedBox(height: 20),

                // ── Abierto ahora ──
                const _Titulo(icono: Icons.schedule, texto: 'Abierto ahora'),
                for (final s in servicios) _FilaServicio(servicio: s, hora: horaActual),
                const SizedBox(height: 20),

                // ── Preguntas frecuentes ──
                const _Titulo(icono: Icons.help_outline, texto: 'Preguntas frecuentes'),
                for (final p in preguntas)
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    childrenPadding: const EdgeInsets.only(bottom: 12),
                    title: Text(p.pregunta,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(p.respuesta,
                            style: const TextStyle(fontSize: 15, color: Color(0xFF3A4A5C))),
                      ),
                    ],
                  ),
                const SizedBox(height: 20),

                // ── Clima ──
                
              ],
            ),
          ),

          // ── Botón de ayuda fijo abajo ──
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 64,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFC62828),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                icon: const Icon(Icons.sos, size: 28),
                label: const Text('Necesito ayuda'),
                onPressed: () => _mostrarAyuda(context),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _mostrarAyuda(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Necesitas ayuda?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Se avisó a guardia: alguien vendrá al Tótem 1 (simulado).'),
            const SizedBox(height: 16),
            for (final c in contactos)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.phone),
                title: Text(c.nombre),
                subtitle: Text(c.telefono),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Piezas pequeñas del panel
// ─────────────────────────────────────────────────────────────

class _Titulo extends StatelessWidget {
  final IconData icono;
  final String texto;
  const _Titulo({required this.icono, required this.texto});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icono, size: 22, color: const Color(0xFF0F2A4A)),
          const SizedBox(width: 8),
          Text(texto, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _TarjetaAviso extends StatelessWidget {
  final Aviso aviso;
  const _TarjetaAviso({required this.aviso});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1DE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF2C48D)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(aviso.icono, color: const Color(0xFF7A3E00)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(aviso.titulo,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF7A3E00))),
                const SizedBox(height: 2),
                Text(aviso.detalle,
                    style: const TextStyle(fontSize: 14, color: Color(0xFF5C3300))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FilaServicio extends StatelessWidget {
  final Servicio servicio;
  final double hora;
  const _FilaServicio({required this.servicio, required this.hora});

  String _formato(double h) {
    final hh = h.floor().toString().padLeft(2, '0');
    final mm = ((h - h.floor()) * 60).round().toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    final abierto = hora >= servicio.abre && hora < servicio.cierra;
    final color = abierto ? const Color(0xFF1E7A46) : const Color(0xFFC62828);
    final estado = abierto
        ? 'Abierto · cierra ${_formato(servicio.cierra)}'
        : 'Cerrado · abre ${_formato(servicio.abre)}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(servicio.nombre, style: const TextStyle(fontSize: 16)),
          ),
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(estado,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}
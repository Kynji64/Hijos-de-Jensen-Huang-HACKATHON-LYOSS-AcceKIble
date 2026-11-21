import 'package:material_ui/material_ui.dart';
import 'main.dart' show Mapa3D;

// ────────────────────────────────
// datos hardcodeados para la demo.
// ────────────────────────────────

class Aviso {
  final String titulo;
  final String detalle;
  final IconData icono;
  const Aviso(this.titulo, this.detalle, this.icono);
}

const lunesAViernes = [1, 2, 3, 4, 5];
const lunesASabado = [1, 2, 3, 4, 5, 6];
const todosLosDias = [1, 2, 3, 4, 5, 6, 7];

class Servicio {
  final String nombre;
  final double abre; // 8.5 = 08:30
  final double cierra; // 21.0 = 21:00
  final List<int> dias;
  const Servicio(this.nombre, this.abre, this.cierra, {this.dias = lunesAViernes});
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
  Aviso('Baño del Edificio A fuera de servicio por Mantenimiento',
      'En mantención hasta el 25/11. Por favor prioriza otra opción. Gracias.',
      Icons.elevator_outlined),
  //Aviso('Obras frente al Edificio A',
  //    'Paso cerrado por Av. España. Desvío señalizado por el patio central.',
  //|    Icons.construction),
];

const servicios = [
  Servicio('Biblioteca', 8, 20),
  Servicio('Casino USM', 8, 14, dias: lunesASabado),
  Servicio('Kiosco Patio Central', 9.5, 19),
  Servicio('Sansanito', 8.5, 21),
  Servicio('Gimnasio USM', 9, 21),
];

const preguntas = [
  Pregunta('¿Dónde puedo imprimir?',
      'Dentro del Campus puedes ir a la sala C224 y encontraras donde imprimir y utiles de papeleria'),
  Pregunta('¿Cual es el horario de la Universidad?',
      'El horario de Lunes a Viernes de 7:30 hasta 22:00'),
  Pregunta('¿Cómo pido apoyo si tengo movilidad reducida?',
      'Puedes pedir directamente a los guardias o ver las rutas habilitadas para Movilidad Reducida de nuestro campus'),
  Pregunta('¿Como puedo pedir una Cancha Deportiva?',
      'Lo puedes hacer directamente en el xxxx, ubicado en la Cancha 11x11'),
];

const contactos = [
  Contacto('Central de Emergencia', '+56 32 265 4222'),
  Contacto('Supervisor de Seguridad (24 h)', '+569 7877 1654'),
  Contacto('Salud - Prevencionista de Riesgos', '+569 6229 5110'),
  Contacto('Sansanito 1', '+56 32 265 4639'),
  Contacto('Sansanito 2', '+569 7334 4188')
];

// ─────────────────────────────────────────────────────
// ventana al borde derecho con la info
// ─────────────────────────────────────────────────────

class PanelInfo extends StatelessWidget {
  final bool modoAccesible;
  const PanelInfo({super.key, this.modoAccesible = false});

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

                const _Titulo(icono: Icons.schedule, texto: 'Horarios de Servicios'),
                for (final s in servicios) _FilaServicio(servicio: s, ahora: ahora),
                const SizedBox(height: 20),

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

              
                
              ],
            ),
          ),

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
                //icon: const Icon(Icons.sos, size: 28),  //NO QUIERO ICONOS CHAVAL
                label: const Text('Necesito ayuda'),
                onPressed: () => _mostrarAyuda(context),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _mostrarAyuda(BuildContext context) async {
    Mapa3D.bloquearEventos(true);    // el mapa deja de recibir clics
    await showDialog(
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
    Mapa3D.bloquearEventos(false);
  }
}


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
  final DateTime ahora;
  const _FilaServicio({required this.servicio, required this.ahora});

  static const _nombresDias = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  String _formato(double h) {
    final hh = h.floor().toString().padLeft(2, '0');
    final mm = ((h - h.floor()) * 60).round().toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  String _proximaApertura(double hora) {
    final hoy = ahora.weekday;
    final horaAbre = _formato(servicio.abre);
    if (servicio.dias.contains(hoy) && hora < servicio.abre) {
      return 'abre hoy $horaAbre';
    }
    for (var d = 1; d <= 7; d++) {
      final dia = ((hoy - 1 + d) % 7) + 1;
      if (servicio.dias.contains(dia)) {
        return d == 1 ? 'abre mañana $horaAbre' : 'abre ${_nombresDias[dia]} $horaAbre';
      }
    }
    return 'sin horario';
  }

  @override
  Widget build(BuildContext context) {
    final hora = ahora.hour + ahora.minute / 60;
    final abierto = servicio.dias.contains(ahora.weekday) &&
        hora >= servicio.abre &&
        hora < servicio.cierra;
    final color = abierto ? const Color(0xFF1E7A46) : const Color(0xFFC62828);
    final estado = abierto
        ? 'Abierto · cierra ${_formato(servicio.cierra)}'
        : 'Cerrado · ${_proximaApertura(hora)}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(servicio.nombre, style: const TextStyle(fontSize: 16))),
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
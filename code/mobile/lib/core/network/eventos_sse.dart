import 'dart:async';
import 'dart:convert';

class EventoSse {
  final String? nome;
  final String? id;
  final String dado;

  const EventoSse({this.nome, this.id, required this.dado});
}

/// Decodifica `text/event-stream` conforme o WHATWG; comentários (heartbeat) são ignorados.
/// Transformer, e não `async*`: cancelar a assinatura precisa soltar a conexão na hora.
Stream<EventoSse> decodificarSse(Stream<List<int>> bytes) {
  String? nome;
  String? id;
  final dados = <String>[];

  return bytes
      .transform(utf8.decoder)
      .transform(const LineSplitter())
      .transform(
        StreamTransformer<String, EventoSse>.fromHandlers(
          handleData: (linha, saida) {
            if (linha.isEmpty) {
              if (dados.isNotEmpty) {
                saida.add(EventoSse(nome: nome, id: id, dado: dados.join('\n')));
              }
              nome = null;
              id = null;
              dados.clear();
              return;
            }
            if (linha.startsWith(':')) {
              return;
            }
            final separador = linha.indexOf(':');
            final campo = separador < 0 ? linha : linha.substring(0, separador);
            var valor = separador < 0 ? '' : linha.substring(separador + 1);
            if (valor.startsWith(' ')) {
              valor = valor.substring(1);
            }
            switch (campo) {
              case 'event':
                nome = valor;
              case 'id':
                id = valor;
              case 'data':
                dados.add(valor);
            }
          },
        ),
      );
}

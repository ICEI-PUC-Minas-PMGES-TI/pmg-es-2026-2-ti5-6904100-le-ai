import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/feed/curtidas_otimistas.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';

import 'apoio.dart';

/// Registra os pedidos e deixa o teste decidir quando (e como) cada um termina.
class _SocialFalso implements SocialService {
  final pedidos = <String>[];
  final chaves = <String>[];
  final _curtidas = <Completer<EstadoCurtida>>[];
  final _descurtidas = <Completer<void>>[];

  @override
  Future<EstadoCurtida> curtir(String id, {required String idempotencyKey}) {
    pedidos.add('curtir $id');
    chaves.add(idempotencyKey);
    final resposta = Completer<EstadoCurtida>();
    _curtidas.add(resposta);
    return resposta.future;
  }

  @override
  Future<void> descurtir(String id, {required String idempotencyKey}) {
    pedidos.add('descurtir $id');
    chaves.add(idempotencyKey);
    final resposta = Completer<void>();
    _descurtidas.add(resposta);
    return resposta.future;
  }

  void confirmarCurtida(int total) => _curtidas.removeAt(0).complete(EstadoCurtida(totalCurtidas: total));

  void confirmarDescurtida() => _descurtidas.removeAt(0).complete();

  void falharCurtida(ApiException erro) => _curtidas.removeAt(0).completeError(erro);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _erro = ApiException(
  kind: ApiFailureKind.invalidResponse,
  correlationId: 'c1',
  message: 'Muitas tentativas. Aguarde um instante.',
  status: 429,
);

class _Cenario {
  final social = _SocialFalso();
  late final CurtidasOtimistas curtidas;
  final erros = <ApiException>[];
  late List<Atividade> lista;

  _Cenario({int total = 4, bool curtida = false}) {
    lista = <Atividade>[Atividade.fromJson(atividadeJson(curtidas: total, curtida: curtida))];
    curtidas = CurtidasOtimistas(
      social,
      atual: (id) {
        for (final item in lista) {
          if (item.id == id) {
            return item;
          }
        }
        return null;
      },
      substituir: (novo) => lista = <Atividade>[
        for (final item in lista) item.id == novo.id ? novo : item,
      ],
      aoFalhar: erros.add,
    );
  }

  Atividade get item => lista.single;

  void tocar() => curtidas.alternar(item);
}

Future<void> _esvaziar() => Future<void>.delayed(Duration.zero);

void main() {
  test('o item muda antes de o servidor responder', () async {
    final c = _Cenario();

    c.tocar();

    expect(c.item.curtidaPeloSolicitante, isTrue);
    expect(c.item.totalCurtidas, 5);
    expect(c.social.pedidos, <String>['curtir a1']);
  });

  test('descurtir muda na hora e não passa de zero', () async {
    final c = _Cenario(total: 0, curtida: true);

    c.tocar();

    expect(c.item.curtidaPeloSolicitante, isFalse);
    expect(c.item.totalCurtidas, 0);
    expect(c.social.pedidos, <String>['descurtir a1']);
  });

  test('o total do servidor corrige o contador ao confirmar', () async {
    final c = _Cenario();

    c.tocar();
    c.social.confirmarCurtida(9);
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isTrue);
    expect(c.item.totalCurtidas, 9);
    expect(c.erros, isEmpty);
  });

  test('a falha volta ao último estado confirmado e avisa', () async {
    final c = _Cenario();

    c.tocar();
    c.social.falharCurtida(_erro);
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isFalse);
    expect(c.item.totalCurtidas, 4);
    expect(c.erros, <ApiException>[_erro]);
  });

  test('dois toques rápidos terminam descurtidos, com duas requisições em sequência', () async {
    final c = _Cenario();

    c.tocar();
    c.tocar();
    expect(c.item.curtidaPeloSolicitante, isFalse);
    expect(c.item.totalCurtidas, 4);
    expect(c.social.pedidos, <String>['curtir a1']);

    c.social.confirmarCurtida(5);
    await _esvaziar();
    expect(c.social.pedidos, <String>['curtir a1', 'descurtir a1']);

    c.social.confirmarDescurtida();
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isFalse);
    expect(c.item.totalCurtidas, 4);
    expect(c.social.pedidos, hasLength(2));
    expect(c.social.chaves.toSet(), hasLength(2));
    expect(c.erros, isEmpty);
  });

  test('três toques rápidos terminam curtidos, com uma requisição só', () async {
    final c = _Cenario();

    c.tocar();
    c.tocar();
    c.tocar();
    expect(c.item.curtidaPeloSolicitante, isTrue);

    c.social.confirmarCurtida(5);
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isTrue);
    expect(c.item.totalCurtidas, 5);
    expect(c.social.pedidos, <String>['curtir a1']);
  });

  test('falha da requisição extra volta ao que o servidor já confirmou', () async {
    final c = _Cenario();

    c.tocar();
    c.tocar();
    c.social.confirmarCurtida(5);
    await _esvaziar();
    c.social._descurtidas.removeAt(0).completeError(_erro);
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isTrue);
    expect(c.item.totalCurtidas, 5);
    expect(c.erros, <ApiException>[_erro]);
  });

  test('novo toque depois de convergir abre uma requisição nova', () async {
    final c = _Cenario();

    c.tocar();
    c.social.confirmarCurtida(5);
    await _esvaziar();
    c.tocar();
    c.social.confirmarDescurtida();
    await _esvaziar();

    expect(c.social.pedidos, <String>['curtir a1', 'descurtir a1']);
    expect(c.item.curtidaPeloSolicitante, isFalse);
    expect(c.item.totalCurtidas, 4);
  });

  test('descartar as pendências ignora a resposta antiga e não dispara nova requisição', () async {
    final c = _Cenario();

    c.tocar();
    c.tocar();
    c.curtidas.descartarPendentes();
    c.lista = <Atividade>[Atividade.fromJson(atividadeJson(curtidas: 7, curtida: true))];
    c.social.confirmarCurtida(5);
    await _esvaziar();

    expect(c.item.curtidaPeloSolicitante, isTrue);
    expect(c.item.totalCurtidas, 7);
    expect(c.social.pedidos, <String>['curtir a1']);
    expect(c.erros, isEmpty);
  });

  test('falha depois de descartar não reverte nem avisa', () async {
    final c = _Cenario();

    c.tocar();
    c.curtidas.descartarPendentes();
    c.lista = <Atividade>[Atividade.fromJson(atividadeJson(curtidas: 7, curtida: true))];
    c.social.falharCurtida(_erro);
    await _esvaziar();

    expect(c.item.totalCurtidas, 7);
    expect(c.erros, isEmpty);
  });

  test('depois de descartar, um toque novo volta a funcionar', () async {
    final c = _Cenario();

    c.tocar();
    c.curtidas.descartarPendentes();
    c.tocar();

    expect(c.social.pedidos, <String>['curtir a1', 'descurtir a1']);
  });

  test('atividade que saiu da lista é ignorada em silêncio', () async {
    final c = _Cenario();
    final fora = c.item;
    c.lista = <Atividade>[];

    c.curtidas.alternar(fora);

    expect(c.social.pedidos, isEmpty);
    expect(c.erros, isEmpty);
  });
}

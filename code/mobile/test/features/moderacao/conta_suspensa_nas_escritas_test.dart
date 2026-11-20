// L-37 (E6-02): conta suspensa dentro dos 15 minutos do token de acesso (F-MOD-OPC).
//
// Divergência aceita em `feature-F-MOD-OPC.md`: nessa janela o `leitura` recusa as escritas com
// 403, e a sessão só acaba na renovação seguinte, quando o `identidade` responde
// `CONTA_SUSPENSA`. As escritas do `leitura` tratam o 403 como 4xx comum. Estes testes fixam esse
// comportamento: se ele mudar, a divergência muda junto.
//
// O `leitura` responde `ACESSO_NEGADO` com "Sua conta não está disponível para esta ação." nas
// transições da leitura (iniciar, reler, finalizar, abandonar, retomar: `snapshotDoUsuario` em
// `leituras.service.ts`). O registro de progresso não consulta o perfil e hoje passa; o teste da
// fila fixa o que o app faz se um 403 chegar a ela. O `CONTA_SUSPENSA` entra também, porque nem
// esse código, fora da renovação, encerra a sessão nessas escritas.
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/features/estante/acao_leitura_controller.dart';
import 'package:le_ai_mobile/features/estante/acoes_disponiveis.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/progresso/progresso_service.dart';

import '../livros/apoio.dart' show erro;
import '../progresso/apoio_progresso.dart' show ArmazemEmMemoria, pendente;

const String _mensagem = 'Sua conta não está disponível para esta ação.';

class _TokensEmMemoria implements TokenStore {
  String? valor;

  @override
  Future<String?> read() async => valor;

  @override
  Future<void> write(String value) async => valor = value;

  @override
  Future<void> delete() async => valor = null;
}

/// Sessão aberta e um `ApiClient` do `leitura` ligado a ela como no app: token da sessão no
/// `Authorization` e renovação no `401`. [renovacoes] conta as idas ao `identidade`.
class _Montagem {
  final SessionController sessao;
  final ApiClient cliente;
  int renovacoes = 0;

  _Montagem._(this.sessao, this.cliente);

  static Future<_Montagem> criar(
    Future<http.Response> Function(http.Request) handler,
  ) async {
    final sessao = SessionController(_TokensEmMemoria());
    await sessao.entrar('jwt-a', refreshToken: 'renovacao-a');
    late final _Montagem montagem;
    final cliente = ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      getToken: () => sessao.token,
      renovarSessao: (tokenQueFalhou) =>
          sessao.renovar(tokenQueFalhou, (refresh) async {
            montagem.renovacoes++;
            throw ApiException(
              kind: ApiFailureKind.invalidResponse,
              correlationId: '',
              message: 'Conta suspensa.',
              status: 403,
              codigo: SessionController.codigoContaSuspensa,
            );
          }),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    );
    return montagem = _Montagem._(sessao, cliente);
  }

  void esperarSessaoAberta() {
    expect(sessao.estaAutenticado, isTrue);
    expect(sessao.token, 'jwt-a');
    expect(sessao.consumirAvisoDeSaida(), isNull);
    expect(renovacoes, 0);
  }
}

void main() {
  for (final codigo in <String>[
    'ACESSO_NEGADO',
    SessionController.codigoContaSuspensa,
  ]) {
    test(
      '403 $codigo numa ação da estante mostra a mensagem do servidor, descarta a chave e não '
      'encerra a sessão',
      () async {
        final pedidos = <http.Request>[];
        final montagem = await _Montagem.criar((pedido) async {
          pedidos.add(pedido);
          return erro(403, codigo, _mensagem);
        });
        final controller = AcaoLeituraController(
          EstanteService(montagem.cliente),
        );
        const pedido = PedidoDeAcao(
          acao: IdAcao.iniciarLeitura,
          livroId: 'livro-1',
        );

        expect(await controller.executar(pedido), isNull);
        expect(controller.erro, _mensagem);
        expect(controller.salvando, isFalse);
        // 403 não é retentado: um pedido só, com o token da sessão.
        expect(pedidos, hasLength(1));
        expect(pedidos.single.headers['Authorization'], 'Bearer jwt-a');
        montagem.esperarSessaoAberta();

        // A intenção acabou com o 4xx: repetir a mesma ação vai com chave nova.
        await controller.executar(pedido);
        expect(pedidos, hasLength(2));
        expect(
          pedidos.map((p) => p.headers['Idempotency-Key']).toSet(),
          hasLength(2),
        );
        montagem.esperarSessaoAberta();
      },
    );

    test('403 $codigo pausa a fila de progresso sem perder o registro', () async {
      final chaves = <String?>[];
      final montagem = await _Montagem.criar((pedido) async {
        chaves.add(pedido.headers['Idempotency-Key']);
        return erro(403, codigo, _mensagem);
      });
      final armazem = ArmazemEmMemoria();
      final fila = FilaDeProgresso(ProgressoService(montagem.cliente), armazem);
      await fila.enfileirar(pendente('k1', 150));
      await fila.enfileirar(pendente('k2', 160));

      await fila.sincronizar();

      // Só o primeiro foi enviado; ele fica pausado com a mensagem, e o seguinte espera atrás.
      expect(chaves, <String>['k1']);
      final pendentes = fila.pendentesDe('le1');
      expect(pendentes.map((item) => item.chave), <String>['k1', 'k2']);
      expect(pendentes.first.pausa, _mensagem);
      expect(pendentes.last.pausado, isFalse);
      montagem.esperarSessaoAberta();

      // O registro sobrevive ao reinício do app, ainda pausado.
      final depois = FilaDeProgresso(
        ProgressoService(montagem.cliente),
        armazem,
      );
      await depois.carregar();
      expect(depois.pendentesDe('le1').map((item) => item.chave), <String>[
        'k1',
        'k2',
      ]);
      expect(depois.pendentesDe('le1').first.pausa, _mensagem);

      // Pausada, a fila não reenvia sozinha (o reenvio a cada 30 s e na volta ao app).
      await depois.sincronizar();
      expect(chaves, <String>['k1']);
    });
  }
}

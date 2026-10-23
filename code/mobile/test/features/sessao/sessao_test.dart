import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/progresso/progresso_service.dart';
import 'package:le_ai_mobile/features/progresso/registrar_progresso.dart';
import 'package:le_ai_mobile/features/sessao/armazem_da_sessao.dart';
import 'package:le_ai_mobile/features/sessao/regras.dart';
import 'package:le_ai_mobile/features/sessao/rotas_sessao.dart';
import 'package:le_ai_mobile/features/sessao/sessao_controller.dart';
import 'package:le_ai_mobile/features/sessao/sessao_de_leitura.dart';
import 'package:le_ai_mobile/features/sessao/textos.dart';

import '../livros/apoio.dart';
import '../progresso/apoio_progresso.dart';

class _ArmazemDaSessaoEmMemoria implements ArmazemDaSessao {
  String? conteudo;

  @override
  Future<String?> ler() async => conteudo;

  @override
  Future<void> gravar(String? novo) async => conteudo = novo;
}

const LeituraDoRegistro _leitura = LeituraDoRegistro(
  leituraId: 'le1',
  titulo: 'Tudo é rio',
  autor: 'Carla Madeira',
  paginaAtual: 88,
  totalPaginas: 210,
);

const String _origem = '/estante';

http.Response _semRede() => throw http.ClientException('sem rede');

class _Cenario {
  DateTime agora = DateTime.utc(2026, 10, 17, 12);
  final _ArmazemDaSessaoEmMemoria armazem = _ArmazemDaSessaoEmMemoria();
  final ArmazemEmMemoria armazemDaFila = ArmazemEmMemoria();
  final List<http.Request> envios = <http.Request>[];
  http.Response Function(http.Request request) responder = (request) =>
      json(comResumoJson(progressoJson('p1', posicao: 1, pagina: 131, paginaAnterior: 88)), 201);

  late final ProgressoService servico = progressoSimulado((request) async {
    if (request.method == 'POST') {
      envios.add(request);
    }
    return responder(request);
  });

  late final FilaDeProgresso fila = FilaDeProgresso(servico, armazemDaFila);

  SessaoController controller() =>
      SessaoController(armazem, servico, fila: fila, agora: () => agora);

  void avancar(Duration tempo) => agora = agora.add(tempo);

  Map<String, dynamic> corpo(int indice) => jsonDecode(envios[indice].body) as Map<String, dynamic>;
}

Future<SessaoController> _iniciada(_Cenario cenario) async {
  final sessao = cenario.controller();
  await sessao.carregar();
  await sessao.iniciar(_leitura, status: StatusEstante.lendo, origem: _origem);
  return sessao;
}

void main() {
  group('regras', () {
    test('arredonda para o minuto mais próximo, com mínimo de 1 e teto de 12 horas', () {
      expect(minutosDaSessao(const Duration(seconds: 29)), 1);
      expect(minutosDaSessao(const Duration(minutes: 47, seconds: 29)), 47);
      expect(minutosDaSessao(const Duration(minutes: 47, seconds: 30)), 48);
      expect(minutosDaSessao(const Duration(hours: 13)), 720);
    });

    test('cronômetro em h:mm:ss sem zero à esquerda na hora', () {
      expect(formatarCronometro(const Duration(minutes: 47, seconds: 12)), '0:47:12');
      expect(formatarCronometro(const Duration(hours: 11, minutes: 59, seconds: 59)), '11:59:59');
      expect(formatarContagem(const Duration(minutes: 6, seconds: 37, milliseconds: 400)), '6:38');
    });

    test('página igual à atual é válida; menor ou acima do total não', () {
      expect(validarPaginaDaSessao(88, 210, 88), isNull);
      expect(validarPaginaDaSessao(88, 210, 80), TextosDoEncerramento.erroPaginaBaixa(88));
      expect(validarPaginaDaSessao(88, 210, 240), isNotNull);
      expect(validarPaginaDaSessao(88, 210, null), TextosDoEncerramento.erroPaginaAusente);
    });
  });

  group('SessaoController', () {
    test('só inicia em Lendo ou Relendo e uma por aparelho', () async {
      final cenario = _Cenario();
      final sessao = cenario.controller();

      expect(
        await sessao.iniciar(_leitura, status: StatusEstante.queroLer, origem: _origem),
        false,
      );
      expect(await sessao.iniciar(_leitura, status: StatusEstante.relendo, origem: _origem), true);
      expect(await sessao.iniciar(_leitura, status: StatusEstante.lendo, origem: _origem), false);
      expect(cenario.envios, isEmpty);
    });

    test('o tempo vem do relógio e a sessão é recuperada ao reabrir o app', () async {
      final cenario = _Cenario();
      await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 47, seconds: 12));

      final reaberta = cenario.controller();
      await reaberta.carregar();

      expect(reaberta.situacao, SituacaoDaSessao.emAndamento);
      expect(reaberta.tempoLido, const Duration(minutes: 47, seconds: 12));
      expect(reaberta.sessao?.leitura.titulo, 'Tudo é rio');
    });

    test('a pausa não conta tempo, retomar acumula e pausa esgotada preserva o lido', () async {
      final cenario = _Cenario();
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 10));
      await sessao.pausar(const Duration(minutes: 5));
      cenario.avancar(const Duration(minutes: 3));

      expect(sessao.situacao, SituacaoDaSessao.pausada);
      expect(sessao.tempoLido, const Duration(minutes: 10));
      expect(sessao.pausaRestante, const Duration(minutes: 2));

      await sessao.retomar();
      cenario.avancar(const Duration(minutes: 5));
      expect(sessao.tempoLido, const Duration(minutes: 15));

      await sessao.pausar(const Duration(minutes: 5));
      cenario.avancar(const Duration(minutes: 6));
      final reaberta = cenario.controller();
      await reaberta.carregar();
      await reaberta.retomar();

      expect(reaberta.situacao, SituacaoDaSessao.pausaEsgotada);
      expect(reaberta.tempoLido, const Duration(minutes: 15));
    });

    test('acima de 12 horas fica expirada e registra no máximo 720 minutos', () async {
      final cenario = _Cenario();
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(hours: 12, minutes: 30));

      expect(sessao.situacao, SituacaoDaSessao.expirada);
      expect(await sessao.encerrar(131), true);
      expect(cenario.corpo(0)['minutos'], 720);
      expect(cenario.corpo(0)['pagina'], 131);
    });

    test('página igual à atual encerra sem chamar o servidor', () async {
      final cenario = _Cenario();
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 20));

      expect(await sessao.encerrar(88), true);
      expect(cenario.envios, isEmpty);
      expect(sessao.sessao, isNull);
      expect(cenario.armazem.conteudo, isNull);
    });

    test('sem rede o registro vai para a fila e só então a sessão some', () async {
      final cenario = _Cenario()..responder = (request) => _semRede();
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 47));

      expect(await sessao.encerrar(131), true);
      expect(sessao.sessao, isNull);
      expect(cenario.armazem.conteudo, isNull);
      final pendentes = cenario.fila.pendentesDe('le1');
      expect(pendentes.single.pagina, 131);
      expect(pendentes.single.minutos, 47);
    });

    test('erro do servidor mantém a sessão e a nova tentativa reusa chave e instante', () async {
      final cenario = _Cenario()..responder = (request) => erro(503, 'INDISPONIVEL', 'Fora do ar.');
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 47));

      expect(await sessao.encerrar(131), false);
      expect(sessao.erroDeEnvio, TextosDoEncerramento.erroEnvio);
      expect(sessao.sessao, isNotNull);

      cenario.avancar(const Duration(minutes: 5));
      cenario.responder = (request) => json(
        comResumoJson(progressoJson('p1', posicao: 1, pagina: 131, paginaAnterior: 88)),
        201,
      );
      final reaberta = cenario.controller();
      await reaberta.carregar();

      expect(await reaberta.encerrar(131), true);
      final primeira = cenario.envios.first;
      final ultima = cenario.envios.last;
      expect(ultima.headers['Idempotency-Key'], primeira.headers['Idempotency-Key']);
      expect(cenario.corpo(cenario.envios.length - 1), cenario.corpo(0));
      expect(reaberta.sessao, isNull);
    });

    test('página recusada porque outro aparelho avançou atualiza a página base', () async {
      final cenario = _Cenario()
        ..responder = (request) => request.method == 'POST'
            ? erro(422, 'VALIDACAO', 'Página inválida.', <String, Object?>{
                'campos': <Map<String, String>>[
                  <String, String>{'campo': 'pagina', 'mensagem': 'Página inválida.'},
                ],
              })
            : json(
                paginaProgressoJson(
                  const [],
                  resumo: resumoJson(paginaAtual: 140, totalPaginas: 210),
                ),
                200,
              );
      final sessao = await _iniciada(cenario);
      cenario.avancar(const Duration(minutes: 47));

      expect(await sessao.encerrar(131), false);
      expect(sessao.paginaBase, 140);
      expect(sessao.erroDaPagina, TextosDoEncerramento.erroOutroAparelho(140));
      expect(sessao.sessao, isNotNull);
    });
  });

  group('modo de foco', () {
    test('a sessão ativa leva toda rota à tela da sessão e a pendente à de confirmação', () async {
      final cenario = _Cenario();
      final sessao = await _iniciada(cenario);

      expect(guardaDaSessao(sessao, '/perfil', semSessao: _origem), rotaSessao);
      expect(guardaDaSessao(sessao, rotaSessao, semSessao: _origem), isNull);

      await sessao.pausar(const Duration(minutes: 5));
      expect(guardaDaSessao(sessao, '/descobrir', semSessao: _origem), rotaSessao);

      cenario.avancar(const Duration(minutes: 6));
      expect(guardaDaSessao(sessao, rotaSessao, semSessao: _origem), rotaSessaoPendente);

      await sessao.descartar();
      expect(guardaDaSessao(sessao, rotaSessaoPendente, semSessao: '/outra'), _origem);
      expect(guardaDaSessao(sessao, '/perfil', semSessao: _origem), isNull);
    });
  });

  group('conta dona da sessão', () {
    test('sair da conta encerra a sessão em andamento e apaga o que foi guardado', () async {
      final cenario = _Cenario();
      final conta = SessionController(_CofreDeTokens());
      await conta.load();
      await conta.entrar('acesso');
      final sessao = await _iniciada(cenario);
      sessao.acompanharConta(conta);

      await conta.sair();
      await Future<void>.delayed(Duration.zero);

      expect(sessao.sessao, isNull);
      expect(cenario.armazem.conteudo, isNull);
      expect(conta.consumirAvisoDeSaida(), isNull);
    });

    test('token vencido sem renovação encerra a sessão e deixa o aviso para a entrada', () async {
      final cenario = _Cenario();
      final conta = SessionController(_CofreDeTokens());
      await conta.load();
      await conta.entrar('acesso', refreshToken: 'renovacao');
      final sessao = await _iniciada(cenario);
      sessao.acompanharConta(conta);

      final renovou = await conta.renovar(
        'acesso',
        (_) async => throw const ApiException(
          kind: ApiFailureKind.invalidResponse,
          correlationId: 'c1',
          message: 'Sua sessão expirou.',
          status: 401,
        ),
      );
      await Future<void>.delayed(Duration.zero);

      expect(renovou, false);
      expect(sessao.sessao, isNull);
      expect(cenario.armazem.conteudo, isNull);
      expect(conta.consumirAvisoDeSaida(), TextosDoAvisoDeSaida.encerradaPorExpiracao);
      expect(conta.consumirAvisoDeSaida(), isNull);
    });

    test('renovar o token da mesma conta mantém a sessão', () async {
      final cenario = _Cenario();
      final conta = SessionController(_CofreDeTokens());
      await conta.load();
      await conta.entrar('acesso', refreshToken: 'renovacao');
      final sessao = await _iniciada(cenario);
      sessao.acompanharConta(conta);

      await conta.entrar('acesso-novo', refreshToken: 'renovacao-nova');
      await Future<void>.delayed(Duration.zero);

      expect(sessao.sessao, isNotNull);
    });

    test('abrir o app sem conta logada descarta a sessão guardada de antes', () async {
      final cenario = _Cenario();
      await _iniciada(cenario);

      final reaberta = cenario.controller();
      final conta = SessionController(_CofreDeTokens());
      reaberta.acompanharConta(conta);
      await conta.load();
      await Future<void>.delayed(Duration.zero);

      expect(reaberta.sessao, isNull);
      expect(cenario.armazem.conteudo, isNull);
    });
  });
}

class _CofreDeTokens implements TokenStore {
  String? _valor;

  @override
  Future<String?> read() async => _valor;

  @override
  Future<void> write(String value) async => _valor = value;

  @override
  Future<void> delete() async => _valor = null;
}

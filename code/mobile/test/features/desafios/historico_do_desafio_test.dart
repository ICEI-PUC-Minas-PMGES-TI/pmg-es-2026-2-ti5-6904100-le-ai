import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';
import 'package:le_ai_mobile/features/desafios/historico_do_desafio.dart';
import 'package:le_ai_mobile/features/desafios/textos_do_historico.dart';

import 'apoio_desafios.dart';

JanelaEncerrada _janela({
  String inicio = '2026-09-14',
  String fim = '2026-09-20',
  String unidade = 'minutos',
  String periodicidade = 'semanal',
  int alvo = 150,
  int acumulado = 170,
  String pausa = 'nenhuma',
}) => JanelaEncerrada.fromJson(
  janelaJson(
    inicio: inicio,
    fim: fim,
    unidade: unidade,
    periodicidade: periodicidade,
    alvo: alvo,
    acumulado: acumulado,
    pausa: pausa,
  ),
);

Desafio _desafio({String janela = 'semanal', bool pausado = false}) =>
    Desafio.fromJson(desafioJson(janela: janela, pausado: pausado));

void main() {
  group('textos', () {
    test('nome da janela por periodicidade (§8)', () {
      expect(nomeDaJanelaEncerrada(_janela()), '14 a 20 de setembro');
      expect(
        nomeDaJanelaEncerrada(_janela(inicio: '2026-08-31', fim: '2026-09-06')),
        '31 de agosto a 6 de setembro',
      );
      expect(
        nomeDaJanelaEncerrada(
          _janela(inicio: '2026-09-03', fim: '2026-09-03', periodicidade: 'diaria'),
        ),
        'Quinta, 3 de setembro',
      );
      expect(
        nomeDaJanelaEncerrada(
          _janela(inicio: '2026-08-01', fim: '2026-08-31', periodicidade: 'mensal'),
        ),
        'Agosto de 2026',
      );
      expect(
        nomeDaJanelaEncerrada(
          _janela(inicio: '2025-01-01', fim: '2025-12-31', periodicidade: 'anual'),
        ),
        '2025',
      );
    });

    test('grupo: semana no mês em que começa, mês no ano, ano sem grupo', () {
      expect(grupoDaJanela(_janela(inicio: '2026-08-31', fim: '2026-09-06')), 'Agosto de 2026');
      expect(
        grupoDaJanela(_janela(inicio: '2026-09-03', fim: '2026-09-03', periodicidade: 'diaria')),
        'Setembro de 2026',
      );
      expect(
        grupoDaJanela(_janela(inicio: '2026-07-01', fim: '2026-07-31', periodicidade: 'mensal')),
        '2026',
      );
      expect(
        grupoDaJanela(_janela(inicio: '2025-01-01', fim: '2025-12-31', periodicidade: 'anual')),
        isNull,
      );
    });

    test('a fração usa o alvo da própria janela, com a unidade concordando', () {
      expect(textoDoAcumuladoDaJanela(_janela(alvo: 120, acumulado: 130)), '130 de 120 minutos');
      expect(
        textoDoAcumuladoDaJanela(_janela(unidade: 'livros', alvo: 1, acumulado: 1)),
        '1 de 1 livro',
      );
    });

    test('linha de pausa inteira e em parte, pela janela', () {
      expect(textoDaPausaDaJanela(_janela(pausa: 'inteira')), 'Desafio pausado nesta semana');
      expect(
        textoDaPausaDaJanela(_janela(pausa: 'parcial')),
        'Desafio pausado em parte desta semana',
      );
      expect(
        textoDaPausaDaJanela(
          _janela(
            inicio: '2026-09-03',
            fim: '2026-09-03',
            periodicidade: 'diaria',
            pausa: 'inteira',
          ),
        ),
        'Desafio pausado neste dia',
      );
      expect(
        textoDaPausaDaJanela(
          _janela(
            inicio: '2026-08-01',
            fim: '2026-08-31',
            periodicidade: 'mensal',
            pausa: 'parcial',
          ),
        ),
        'Desafio pausado em parte deste mês',
      );
      expect(textoDaPausaDaJanela(_janela()), isNull);
    });

    test('o leitor de tela lê a janela como uma frase (§9)', () {
      expect(semanticaDaJanela(_janela()), '14 a 20 de setembro. 170 de 150 minutos. Cumprido.');
      expect(
        semanticaDaJanela(
          _janela(
            inicio: '2026-08-17',
            fim: '2026-08-23',
            alvo: 120,
            acumulado: 0,
            pausa: 'inteira',
          ),
        ),
        '17 a 23 de agosto. 0 de 120 minutos. Não cumprido. Desafio pausado nesta semana.',
      );
    });

    test('mudanças na ordem unidade, período, meta, com a meta na configuração nova', () {
      expect(mudancasEntre(_janela(), _janela(alvo: 120)), <String>[
        'Meta alterada: de 120 para 150 minutos por semana',
      ]);
      expect(
        mudancasEntre(_janela(), _janela(unidade: 'paginas', periodicidade: 'mensal', alvo: 300)),
        <String>[
          'Unidade alterada: de páginas para minutos',
          'Período alterado: de mensal para semanal',
          'Meta alterada: de 300 para 150 minutos por semana',
        ],
      );
      expect(mudancasEntre(_janela(), _janela(acumulado: 0)), isEmpty);
    });

    test('rodapé de criação pela janela de criação', () {
      final criado = DateTime(2026, 8, 5, 12);
      expect(
        rodapeDeCriacao(criado, JanelaDesafio.semanal),
        'Desafio criado em 5 de agosto de 2026. A primeira semana conta o que você registrou '
        'desde o início dela.',
      );
      expect(
        rodapeDeCriacao(criado, JanelaDesafio.diaria),
        'Desafio criado em 5 de agosto de 2026.',
      );
      expect(rodapeDeCriacao(criado, JanelaDesafio.mensal), endsWith('desde o início dele.'));
    });

    test('vazio nomeia quando a janela corrente fecha', () {
      expect(tituloSemJanelaEncerrada(JanelaDesafio.anual), 'Nenhum ano encerrado ainda');
      expect(
        textoSemJanelaEncerrada(_desafio(janela: 'anual')),
        'Cada ano entra aqui quando termina. 2026 aparece a partir de 1º de janeiro de 2027.',
      );
      expect(
        textoSemJanelaEncerrada(_desafio()),
        'Esta semana aparece aqui a partir de segunda-feira, 28 de setembro.',
      );
      expect(
        textoSemJanelaEncerrada(_desafio(janela: 'mensal')),
        'Setembro aparece aqui a partir de 1º de outubro.',
      );
      expect(
        textoSemJanelaEncerrada(_desafio(janela: 'diaria')),
        'Hoje aparece aqui a partir de amanhã.',
      );
    });

    test('header diz quando o desafio está pausado', () {
      expect(subtituloDoHistorico(_desafio()), 'Histórico');
      expect(
        subtituloDoHistorico(_desafio(pausado: true)),
        'Histórico · Pausado desde 15 de setembro',
      );
    });
  });

  group('agruparHistorico', () {
    test('agrupa por mês e põe a marca de meta entre as vizinhas do mesmo grupo', () {
      final janelas = historicoDoPrototipo().map(JanelaEncerrada.fromJson).toList();

      final grupos = agruparHistorico(janelas);

      expect(grupos.map((grupo) => grupo.titulo), <String>['Setembro de 2026', 'Agosto de 2026']);
      expect(grupos.first.itens, everyElement(isA<LinhaDeJanela>()));
      final agosto = grupos.last.itens;
      expect(agosto[0], isA<LinhaDeJanela>());
      expect((agosto[1] as MarcaDeMudanca).mudancas, <String>[
        'Meta alterada: de 120 para 150 minutos por semana',
      ]);
      expect(agosto.whereType<LinhaDeJanela>(), hasLength(5));
    });

    test('mudança na troca de grupo fecha o grupo da janela nova', () {
      final grupos = agruparHistorico(<JanelaEncerrada>[
        _janela(inicio: '2026-09-07', fim: '2026-09-13'),
        _janela(inicio: '2026-08-31', fim: '2026-09-06', alvo: 120),
      ]);

      expect(grupos.first.itens.last, isA<MarcaDeMudanca>());
      expect(grupos.last.itens.single, isA<LinhaDeJanela>());
    });

    test('anuais ficam juntas, sem título de grupo', () {
      final grupos = agruparHistorico(<JanelaEncerrada>[
        _janela(inicio: '2025-01-01', fim: '2025-12-31', periodicidade: 'anual'),
        _janela(inicio: '2024-01-01', fim: '2024-12-31', periodicidade: 'anual'),
      ]);

      expect(grupos.single.titulo, isNull);
      expect(grupos.single.itens, hasLength(2));
    });
  });

  group('HistoricoDoDesafio', () {
    test('acumula as páginas sem repetir período e diz quando acabou', () async {
      final paginas = <int, List<Map<String, Object?>>>{
        1: historicoDoPrototipo().sublist(0, 4),
        2: historicoDoPrototipo().sublist(3),
      };
      final historico = HistoricoDoDesafio(
        (pagina) async => PaginaJanelas.fromJson(
          paginaDeJanelas(paginas[pagina]!, page: pagina, totalItens: 7, totalPaginas: 2),
        ),
      );

      await historico.carregar();
      expect(historico.temMais, isTrue);
      expect(historico.chegouAoFim, isFalse);
      expect(await historico.carregarMais(), isTrue);

      expect(historico.janelas, hasLength(7));
      expect(historico.chegouAoFim, isTrue);
      expect(await historico.carregarMais(), isFalse);
    });

    test('separa a falta de rede do servidor fora', () async {
      Future<PaginaJanelas> falhar(ApiException erro) async => throw erro;
      final semRede = HistoricoDoDesafio(
        (_) => falhar(
          const ApiException(kind: ApiFailureKind.network, correlationId: '', message: ''),
        ),
      );
      final foraDoAr = HistoricoDoDesafio(
        (_) => falhar(
          const ApiException(
            kind: ApiFailureKind.network,
            correlationId: '',
            message: '',
            status: 500,
          ),
        ),
      );

      await semRede.carregar();
      await foraDoAr.carregar();

      expect(semRede.falha, FalhaDoHistorico.semConexao);
      expect(foraDoAr.falha, FalhaDoHistorico.servidor);
    });

    test('a falha da página seguinte não apaga as anteriores', () async {
      var chamadas = 0;
      final historico = HistoricoDoDesafio((pagina) async {
        chamadas++;
        if (pagina == 2) {
          throw const ApiException(kind: ApiFailureKind.network, correlationId: '', message: '');
        }
        return PaginaJanelas.fromJson(
          paginaDeJanelas(historicoDoPrototipo().sublist(0, 3), totalItens: 7, totalPaginas: 2),
        );
      });

      await historico.carregar();
      await historico.carregarMais();

      expect(chamadas, 2);
      expect(historico.janelas, hasLength(3));
      expect(historico.falhaAoCarregarMais, FalhaDoHistorico.semConexao);
      expect(historico.falha, isNull);
    });
  });

  group('DesafiosService.listarJanelas', () {
    test('pede a página do desafio e lê o snapshot de cada janela', () async {
      late http.Request pedido;
      final servico = desafiosSimulado((recebido) async {
        pedido = recebido;
        return json(
          paginaDeJanelas(
            <Map<String, Object?>>[janelaJson(pausa: 'parcial')],
            page: 2,
            totalItens: 21,
            totalPaginas: 2,
          ),
          200,
        );
      });

      final pagina = await servico.listarJanelas(idDoDesafio, pagina: 2);

      expect(pedido.method, 'GET');
      expect(pedido.url.path, '/desafios/$idDoDesafio/janelas');
      expect(pedido.url.queryParameters, <String, String>{'page': '2', 'limite': '20'});
      final janela = pagina.itens.single;
      expect(janela.inicio, DateTime(2026, 9, 14));
      expect(janela.fim, DateTime(2026, 9, 20));
      expect(janela.unidade, UnidadeDesafio.minutos);
      expect(janela.periodicidade, JanelaDesafio.semanal);
      expect(janela.pausa, PausaDaJanela.parcial);
      expect(pagina.totalPaginas, 2);
    });

    test('janela fora do contrato é resposta inválida', () async {
      final servico = desafiosSimulado(
        (_) async =>
            json(paginaDeJanelas(<Map<String, Object?>>[janelaJson(pausa: 'talvez')]), 200),
      );

      await expectLater(
        servico.listarJanelas(idDoDesafio),
        throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.invalidResponse)),
      );
    });

    test('404 de desafio de outra pessoa sobe como ApiException', () async {
      final servico = desafiosSimulado(
        (_) async => erro(404, 'NAO_ENCONTRADO', 'Não encontramos este desafio.'),
      );

      await expectLater(
        servico.listarJanelas(idDoDesafio),
        throwsA(isA<ApiException>().having((e) => e.status, 'status', 404)),
      );
    });
  });
}

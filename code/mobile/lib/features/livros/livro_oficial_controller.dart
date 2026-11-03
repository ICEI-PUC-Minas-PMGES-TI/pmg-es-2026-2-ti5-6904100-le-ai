import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'acervo_service.dart';
import 'livro_oficial.dart';

enum EstadoDaPagina { carregando, pronta, naoEncontrada, erro }

/// Estado da página do livro oficial (pagina-do-livro.md), no molde de `ChangeNotifier` do app.
///
/// - **Polling da sinopse** com esperas crescentes, cerca de 2 minutos no total: cobre o consumidor
///   e alguns livros na fila à frente. Para em `disponivel`, `ausente` ou `falha_transitoria`, e
///   quando a tela sai. Cada consulta aproveita **só a sinopse**: a `GET /livros/{id}` devolve a
///   primeira página de resenhas de novo, e sobrescrever apagaria as já carregadas e os spoilers
///   revelados.
/// - **Resenhas por cursor**, acumuladas. `resenhas: null` na página vira [resenhasIndisponiveis],
///   com "Tentar de novo".
/// - Cold start é carregamento (RNF-ERR-09): depois de 3 s a tela avisa que o servidor está
///   iniciando.
/// - **Recarga das notas** (F-ACV-NOTA) depois que o leitor salva, altera ou remove a nota: o
///   `acervo` recompõe a nota dos leitores ao consumir `nota.alterada`, de forma assíncrona, então
///   a página reconsulta algumas vezes, em silêncio, e aproveita **só** as três notas.
class LivroOficialController extends ChangeNotifier {
  static const List<Duration> esperasDaSinopse = <Duration>[
    Duration(seconds: 2),
    Duration(seconds: 3),
    Duration(seconds: 5),
    Duration(seconds: 8),
    Duration(seconds: 13),
    Duration(seconds: 20),
    Duration(seconds: 30),
    Duration(seconds: 40),
  ];
  static const Duration limiteDoColdStart = Duration(seconds: 3);

  /// Quando reconsultar as notas, contado da escrita: o consumo costuma levar poucos segundos. Com
  /// as retentativas do consumidor (1, 5 e 15 s, em sequência) e a outbox da `leitura` (1 s), a
  /// última tentativa começa uns 22 s depois da escrita; 25 s cobre o caso normal dela e 40 s, uma
  /// tentativa lenta.
  static const List<Duration> esperasDasNotas = <Duration>[
    Duration(seconds: 2),
    Duration(seconds: 6),
    Duration(seconds: 15),
    Duration(seconds: 25),
    Duration(seconds: 40),
  ];

  final AcervoService _servico;
  final String livroId;

  LivroOficialController(this._servico, this.livroId);

  EstadoDaPagina estado = EstadoDaPagina.carregando;
  bool coldStart = false;
  LivroOficialDetalhe? livro;
  SinopseDoLivro sinopse = const SinopseDoLivro(status: StatusDaSinopse.pendente, texto: null);

  /// A sinopse ainda estava pendente quando as esperas acabaram.
  bool sinopseDemorou = false;

  List<ResenhaDoLivro> resenhas = const <ResenhaDoLivro>[];
  String? _proximoCursor;
  bool resenhasIndisponiveis = false;
  bool carregandoResenhas = false;

  /// A falha de "Ver todas as resenhas": avisa sem apagar as já carregadas.
  bool falhouMaisResenhas = false;

  /// A mensagem do servidor no 429, porque "a conexão falhou" seria falso.
  String? mensagemDoErro;

  bool _descartado = false;
  int _consultasDaSinopse = 0;
  Timer? _proximaConsulta;
  Timer? _timerDoColdStart;
  List<Timer> _recargasDasNotas = const <Timer>[];
  int _consultasDasNotas = 0;
  int _ultimaConsultaAplicada = 0;

  bool get temMaisResenhas => _proximoCursor != null;

  Future<void> carregar() async {
    estado = EstadoDaPagina.carregando;
    coldStart = false;
    mensagemDoErro = null;
    _avisar();
    _timerDoColdStart?.cancel();
    _timerDoColdStart = Timer(limiteDoColdStart, () {
      if (estado == EstadoDaPagina.carregando) {
        coldStart = true;
        _avisar();
      }
    });
    try {
      final detalhe = await _servico.obterLivroOficial(livroId);
      if (_descartado) {
        return;
      }
      livro = detalhe;
      sinopse = detalhe.sinopse;
      sinopseDemorou = false;
      resenhasIndisponiveis = detalhe.resenhas == null;
      resenhas = detalhe.resenhas?.itens ?? const <ResenhaDoLivro>[];
      _proximoCursor = detalhe.resenhas?.proximoCursor;
      estado = EstadoDaPagina.pronta;
      _consultasDaSinopse = 0;
      _agendarSinopse();
    } on ApiException catch (erro) {
      if (_descartado) {
        return;
      }
      // 400 é id que não é de livro (deep link malformado): "não encontrado", não "tente de novo".
      estado = erro.status == 404 || erro.status == 400
          ? EstadoDaPagina.naoEncontrada
          : EstadoDaPagina.erro;
      // A mensagem do servidor só quando o corpo seguiu o contrato; um 429 do proxy vem sem ele.
      mensagemDoErro = erro.status != 429
          ? null
          : erro.codigo == 'MUITAS_REQUISICOES'
          ? erro.message
          : 'Muitas requisições em pouco tempo. Tente novamente em instantes.';
    } finally {
      _timerDoColdStart?.cancel();
      coldStart = false;
      _avisar();
    }
  }

  /// "Ver todas as resenhas" e o "Tentar de novo" das resenhas indisponíveis.
  Future<void> carregarResenhas() async {
    if (carregandoResenhas) {
      return;
    }
    final continuacao = !resenhasIndisponiveis;
    if (continuacao && _proximoCursor == null) {
      return;
    }
    carregandoResenhas = true;
    falhouMaisResenhas = false;
    _avisar();
    try {
      final pagina = await _servico.listarResenhasDoLivro(
        livroId,
        cursor: continuacao ? _proximoCursor : null,
      );
      if (_descartado) {
        return;
      }
      final vistas = resenhas.map((resenha) => resenha.id).toSet();
      resenhas = <ResenhaDoLivro>[
        if (continuacao) ...resenhas,
        ...pagina.itens.where((resenha) => !continuacao || !vistas.contains(resenha.id)),
      ];
      _proximoCursor = pagina.proximoCursor;
      resenhasIndisponiveis = false;
    } on ApiException {
      if (continuacao) {
        falhouMaisResenhas = true;
      } else {
        resenhasIndisponiveis = true;
      }
    } finally {
      carregandoResenhas = false;
      _avisar();
    }
  }

  void _agendarSinopse() {
    _proximaConsulta?.cancel();
    if (sinopse.status != StatusDaSinopse.pendente &&
        sinopse.status != StatusDaSinopse.naoConsultada) {
      return;
    }
    if (_consultasDaSinopse >= esperasDaSinopse.length) {
      sinopseDemorou = true;
      _avisar();
      return;
    }
    _proximaConsulta = Timer(esperasDaSinopse[_consultasDaSinopse++], _consultarSinopse);
  }

  Future<void> _consultarSinopse() async {
    try {
      final detalhe = await _servico.obterLivroOficial(livroId);
      if (_descartado) {
        return;
      }
      sinopse = detalhe.sinopse;
      _avisar();
    } on ApiException {
      // Uma consulta perdida não é erro de tela: a próxima espera tenta de novo.
    }
    if (!_descartado) {
      _agendarSinopse();
    }
  }

  /// Depois de salvar, alterar ou remover a nota do leitor: agenda as reconsultas de
  /// [esperasDasNotas]. Uma escrita nova recomeça o agendamento.
  void recarregarNotas() {
    _cancelarRecargasDasNotas();
    if (_descartado) {
      return;
    }
    _recargasDasNotas = <Timer>[
      for (final espera in esperasDasNotas) Timer(espera, _consultarNotas),
    ];
  }

  /// Em silêncio: não mexe no estado da tela, e uma falha só espera a próxima reconsulta.
  Future<void> _consultarNotas() async {
    final consulta = ++_consultasDasNotas;
    try {
      final detalhe = await _servico.obterLivroOficial(livroId);
      final atual = livro;
      // Uma resposta mais antiga que chega depois de uma mais nova não volta a nota para trás.
      if (_descartado || atual == null || consulta < _ultimaConsultaAplicada) {
        return;
      }
      _ultimaConsultaAplicada = consulta;
      livro = atual.comNotasDe(detalhe);
      _avisar();
    } on ApiException {
      // Uma reconsulta perdida não é erro de tela.
    }
  }

  void _cancelarRecargasDasNotas() {
    for (final recarga in _recargasDasNotas) {
      recarga.cancel();
    }
    _recargasDasNotas = const <Timer>[];
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    _proximaConsulta?.cancel();
    _timerDoColdStart?.cancel();
    _cancelarRecargasDasNotas();
    super.dispose();
  }
}

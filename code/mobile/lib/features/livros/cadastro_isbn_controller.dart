import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'acervo_service.dart';
import 'isbn.dart';

/// Estados de `cadastro-por-isbn.md` §4, mais `naoEncontrado`, que é a tela seguinte, e
/// `limitado`, o `429` de RNF-SEC-18 que o prompt não desenhou.
enum FaseDoCadastroIsbn {
  ocioso,
  invalido,
  buscando,
  encontrado,
  duplicata,
  indisponivel,
  naoEncontrado,
  limitado,
  semConexao,
}

/// Máquina de estados do cadastro por ISBN, fora do widget para ser testada sem árvore de
/// widgets. O acompanhamento acontece **nesta** tela (cadastro-por-isbn.md §10): `202`, depois
/// consulta periódica da importação até ela sair de `pendente`.
class CadastroIsbnController extends ChangeNotifier {
  final AcervoService servico;

  /// Intervalo entre consultas do estado da importação.
  final Duration intervaloDeConsulta;

  /// Depois disto no mesmo estado, a linha do cartão troca para "Ainda procurando." (§4.3).
  final Duration aposEsteTempoEstaLento;

  /// Depois disto sem resposta do `POST`, a linha vira a de cold start (§4.8, RNF-ERR-09).
  final Duration aposEsteTempoEColdStart;

  /// Teto do acompanhamento. O consumidor esgota a própria política bem antes disso; passar
  /// daqui significa que a mensagem nem chegou a ser processada, e o pedido continua guardado.
  final Duration limiteDoAcompanhamento;

  CadastroIsbnController({
    required this.servico,
    this.intervaloDeConsulta = const Duration(seconds: 2),
    this.aposEsteTempoEstaLento = const Duration(seconds: 8),
    this.aposEsteTempoEColdStart = const Duration(seconds: 3),
    this.limiteDoAcompanhamento = const Duration(seconds: 90),
  });

  FaseDoCadastroIsbn _fase = FaseDoCadastroIsbn.ocioso;
  FaseDoCadastroIsbn get fase => _fase;

  bool _lento = false;
  bool get lento => _lento;

  bool _coldStart = false;
  bool get coldStart => _coldStart;

  String? _livroId;
  String? get livroId => _livroId;

  /// ISBN normalizado do último envio, para a tela de não encontrado conferir.
  String? _isbn;
  String? get isbn => _isbn;

  String? _mensagemDoServidor;
  String? get mensagemDoServidor => _mensagemDoServidor;

  String? _importacaoId;
  bool _reprocessavel = false;

  // A chave é da intenção "buscar este ISBN": reenviar o mesmo ISBN reaproveita, e o servidor
  // devolve a mesma solicitação em vez de criar outra (RNF-ERR-04).
  String? _chave;
  String? _isbnDaChave;

  Timer? _consulta;
  Timer? _lentidao;
  Timer? _coldStartTimer;
  int _consultasFeitas = 0;
  bool _descartado = false;

  bool podeEnviar(String bruto) => digitosDoIsbn(bruto.trim()).length == 13;

  Future<void> buscar(String bruto) async {
    final normalizado = normalizarIsbn13(bruto);
    if (normalizado == null) {
      _mudar(FaseDoCadastroIsbn.invalido);
      return;
    }
    _isbn = normalizado;
    if (_isbnDaChave != normalizado) {
      _chave = ApiClient.newIdempotencyKey();
      _isbnDaChave = normalizado;
    }

    _iniciarEspera();
    _coldStartTimer = Timer(aposEsteTempoEColdStart, () {
      _coldStart = true;
      _notificar();
    });

    try {
      final resultado = await servico.solicitarImportacao(
        isbn: normalizado,
        idempotencyKey: _chave!,
      );
      _coldStartTimer?.cancel();
      _coldStart = false;
      switch (resultado) {
        case SolicitacaoAceita(:final importacaoId):
          _importacaoId = importacaoId;
          _acompanhar();
        case LivroJaCadastrado(:final livroId):
          _livroId = livroId;
          _encerrar(FaseDoCadastroIsbn.duplicata);
      }
    } on ApiException catch (erro) {
      _coldStartTimer?.cancel();
      _coldStart = false;
      if (erro.status == 400) {
        _encerrar(FaseDoCadastroIsbn.invalido);
      } else if (erro.status == 429) {
        _mensagemDoServidor = erro.message;
        _encerrar(FaseDoCadastroIsbn.limitado);
      } else {
        // O pedido não foi aceito: não dá para dizer "seu pedido foi guardado".
        _mensagemDoServidor = erro.message;
        _encerrar(FaseDoCadastroIsbn.semConexao);
      }
    }
  }

  /// `Tentar de novo` do estado indisponível: reprocessa uma `falha_transitoria`, ou só retoma o
  /// acompanhamento quando a importação ainda estava `pendente`.
  Future<void> tentarDeNovo() async {
    final importacaoId = _importacaoId;
    if (importacaoId == null) {
      return;
    }
    _iniciarEspera();
    if (_reprocessavel) {
      try {
        await servico.reprocessarImportacao(
          importacaoId: importacaoId,
          idempotencyKey: ApiClient.newIdempotencyKey(),
        );
        _reprocessavel = false;
      } on ApiException catch (erro) {
        _mensagemDoServidor = erro.message;
        _encerrar(
          erro.status == 429 ? FaseDoCadastroIsbn.limitado : FaseDoCadastroIsbn.indisponivel,
        );
        return;
      }
    }
    _acompanhar();
  }

  /// `Cadastrar outro ISBN`: volta à aterrissagem.
  void recomecar() {
    _cancelarTimers();
    _livroId = null;
    _importacaoId = null;
    _mensagemDoServidor = null;
    _lento = false;
    _coldStart = false;
    _mudar(FaseDoCadastroIsbn.ocioso);
  }

  /// A pessoa editou o campo: sai do erro de validação ou da mensagem anterior.
  void campoAlterado() {
    if (_fase == FaseDoCadastroIsbn.invalido ||
        _fase == FaseDoCadastroIsbn.semConexao ||
        _fase == FaseDoCadastroIsbn.limitado) {
      _mudar(FaseDoCadastroIsbn.ocioso);
    }
  }

  void _iniciarEspera() {
    _cancelarTimers();
    _lento = false;
    _coldStart = false;
    _mensagemDoServidor = null;
    _mudar(FaseDoCadastroIsbn.buscando);
    _lentidao = Timer(aposEsteTempoEstaLento, () {
      _lento = true;
      _notificar();
    });
  }

  void _acompanhar() {
    _consultasFeitas = 0;
    _agendarConsulta();
  }

  void _agendarConsulta() {
    _consulta?.cancel();
    _consulta = Timer(intervaloDeConsulta, _consultar);
  }

  Future<void> _consultar() async {
    if (_descartado || _importacaoId == null) {
      return;
    }
    try {
      final importacao = await servico.obterImportacao(_importacaoId!);
      if (_descartado) {
        return;
      }
      switch (importacao.estado) {
        case EstadoImportacao.concluida:
          _livroId = importacao.livroId;
          _encerrar(FaseDoCadastroIsbn.encontrado);
          return;
        case EstadoImportacao.naoEncontrado:
          _encerrar(FaseDoCadastroIsbn.naoEncontrado);
          return;
        case EstadoImportacao.falhaTransitoria:
          _reprocessavel = true;
          _encerrar(FaseDoCadastroIsbn.indisponivel);
          return;
        case EstadoImportacao.pendente:
          break;
      }
    } on ApiException {
      // Falha ao consultar não muda o estado da importação no servidor; continua tentando até
      // o teto do acompanhamento.
    }
    // Contado em consultas, não em relógio: o intervalo é fixo, e contar não depende de
    // `DateTime.now()`, que o tempo simulado dos testes não avança.
    _consultasFeitas++;
    final limite =
        limiteDoAcompanhamento.inMilliseconds ~/ intervaloDeConsulta.inMilliseconds;
    if (_consultasFeitas >= limite) {
      _reprocessavel = false;
      _encerrar(FaseDoCadastroIsbn.indisponivel);
      return;
    }
    _agendarConsulta();
  }

  void _encerrar(FaseDoCadastroIsbn fase) {
    _cancelarTimers();
    _lento = false;
    _mudar(fase);
  }

  void _mudar(FaseDoCadastroIsbn fase) {
    _fase = fase;
    _notificar();
  }

  void _notificar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  void _cancelarTimers() {
    _consulta?.cancel();
    _lentidao?.cancel();
    _coldStartTimer?.cancel();
  }

  @override
  void dispose() {
    _descartado = true;
    _cancelarTimers();
    super.dispose();
  }
}

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../conta/validacao_de_senha.dart';
import 'leitura_service.dart';

enum EstadoDaAvaliacao { carregando, pronta, erro }

/// Nota e resenha do leitor para um livro (F-AVA), carregadas à parte da página do livro: se o
/// `leitura` estiver lento ou fora, a página abre igual e só este bloco espera ou mostra erro.
class AvaliacaoController extends ChangeNotifier {
  final LeituraService _servico;
  final String livroId;

  AvaliacaoController(this._servico, this.livroId);

  EstadoDaAvaliacao estado = EstadoDaAvaliacao.carregando;
  MinhaAvaliacao? avaliacao;

  /// Uma chave por intenção: reenviar a mesma nota depois de um erro repete a chave e não cria
  /// uma segunda nota (RNF-ERR-04); trocar o valor é outra intenção. Depois do sucesso a chave é
  /// trocada: dar 4 de novo depois de remover é uma intenção nova, e a chave antiga só repetiria
  /// a resposta guardada no servidor, sem gravar nada.
  ChaveDaIntencao _chaveDaNota = ChaveDaIntencao();
  ChaveDaIntencao _chaveDaRemocao = ChaveDaIntencao();
  ChaveDaIntencao _chaveDaResenha = ChaveDaIntencao();
  ChaveDaIntencao _chaveDaExclusao = ChaveDaIntencao();

  bool _descartado = false;

  Nota? get nota => avaliacao?.nota;
  Resenha? get resenha => avaliacao?.resenha;

  Future<void> carregar() async {
    estado = EstadoDaAvaliacao.carregando;
    _avisar();
    try {
      avaliacao = await _servico.obterMinhaAvaliacao(livroId);
      estado = EstadoDaAvaliacao.pronta;
    } on ApiException {
      estado = EstadoDaAvaliacao.erro;
    } on FormatException {
      estado = EstadoDaAvaliacao.erro;
    }
    _avisar();
  }

  /// Salva a nota. Lança [ApiException] para o painel mostrar o erro e ficar aberto.
  Future<void> salvarNota(double valor) async {
    final chave = _chaveDaNota.para('$valor', ApiClient.newIdempotencyKey);
    final salva = await _servico.salvarNota(livroId, valor, idempotencyKey: chave);
    _chaveDaNota = ChaveDaIntencao();
    _aplicar((atual) => atual.comNota(salva));
  }

  /// Remove a nota, depois da confirmação da tela (RNF-USA-04). A resenha não é afetada.
  Future<void> removerNota() async {
    final chave = _chaveDaRemocao.para(
      nota?.atualizadoEm.toIso8601String() ?? '',
      ApiClient.newIdempotencyKey,
    );
    await _servico.excluirNota(livroId, idempotencyKey: chave);
    _chaveDaRemocao = ChaveDaIntencao();
    _aplicar((atual) => atual.comNota(null));
  }

  /// Publica ou salva a resenha. Lança [ApiException] para o editor mostrar o erro com o texto
  /// preservado.
  Future<void> salvarResenha(String texto, {required bool spoiler}) async {
    final chave = _chaveDaResenha.para('$spoiler|$texto', ApiClient.newIdempotencyKey);
    final salva = await _servico.salvarResenha(
      livroId,
      texto: texto,
      spoiler: spoiler,
      idempotencyKey: chave,
    );
    _chaveDaResenha = ChaveDaIntencao();
    // O `PUT` devolve a resenha sem as contagens: editar não mexe nas reações, que continuam.
    _aplicar(
      (atual) => atual.comResenha(
        atual.resenha?.id == salva.id ? salva.comReacoes(atual.resenha?.reacoes) : salva,
      ),
    );
  }

  /// Exclui a resenha depois da confirmação irreversível (RNF-USA-04). A nota não é afetada.
  Future<void> excluirResenha() async {
    final chave = _chaveDaExclusao.para(resenha?.id ?? '', ApiClient.newIdempotencyKey);
    await _servico.excluirResenha(livroId, idempotencyKey: chave);
    _chaveDaExclusao = ChaveDaIntencao();
    _aplicar((atual) => atual.comResenha(null));
  }

  /// Depois de uma escrita: com a avaliação conhecida, atualiza no lugar. Sem ela (a carga falhou
  /// ou ainda não voltou), o resto continua desconhecido e vem do servidor — declarar `pronta` com
  /// a resenha nula abriria o editor vazio sobre uma resenha que existe.
  void _aplicar(MinhaAvaliacao Function(MinhaAvaliacao atual) mudanca) {
    final atual = avaliacao;
    if (estado == EstadoDaAvaliacao.pronta && atual != null) {
      avaliacao = mudanca(atual);
      _avisar();
    } else {
      carregar();
    }
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }
}

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
  /// uma segunda nota (RNF-ERR-04); trocar o valor é outra intenção.
  final ChaveDaIntencao _chaveDaNota = ChaveDaIntencao();
  final ChaveDaIntencao _chaveDaRemocao = ChaveDaIntencao();

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
    avaliacao = (avaliacao ?? MinhaAvaliacao(livroId: livroId)).comNota(salva);
    estado = EstadoDaAvaliacao.pronta;
    _avisar();
  }

  /// Remove a nota, depois da confirmação da tela (RNF-USA-04). A resenha não é afetada.
  Future<void> removerNota() async {
    final chave = _chaveDaRemocao.para(
      nota?.atualizadoEm.toIso8601String() ?? '',
      ApiClient.newIdempotencyKey,
    );
    await _servico.excluirNota(livroId, idempotencyKey: chave);
    avaliacao = (avaliacao ?? MinhaAvaliacao(livroId: livroId)).comNota(null);
    _avisar();
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

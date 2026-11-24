import '../../core/session/session_controller.dart';

/// Contador de descartes por livro e supressão da pergunta de descarte em lote (RN-22.12/13,
/// F-REC-ALG). Vivem só na memória do processo: fechar e reabrir o app zera os dois, e o servidor
/// não guarda nenhum. A pergunta cabe a partir do terceiro descarte do mesmo livro, enquanto não
/// tiver sido recusada para ele nesta sessão. Sair da conta também zera os dois
/// ([acompanharContaDoDescarteEmLote]), para outra conta no mesmo aparelho não herdar a contagem
/// nem a recusa.
const int _descartesParaPerguntar = 3;

final Map<String, int> _descartesPorLivro = <String, int>{};
final Set<String> _recusados = <String>{};
SessionController? _conta;

/// Conta um descarte individual que o servidor confirmou e diz se a pergunta cabe agora.
bool registrarDescarte(String livroId) {
  final total = (_descartesPorLivro[livroId] ?? 0) + 1;
  _descartesPorLivro[livroId] = total;
  return total >= _descartesParaPerguntar && !_recusados.contains(livroId);
}

/// `Agora não`, ou fechar sem escolher: a pergunta não volta para este livro nesta sessão.
void recusarPergunta(String livroId) => _recusados.add(livroId);

/// Zera contagem e supressão quando a conta sai (logout, expiração, suspensão), no molde de
/// `SessaoController.acompanharConta`: não há `usuarioId` no app, mas trocar de conta exige sair
/// antes. Chamado pelo `router.dart`; uma conta nova troca a anterior.
void acompanharContaDoDescarteEmLote(SessionController conta) {
  _conta?.removeListener(_aoMudarConta);
  _conta = conta..addListener(_aoMudarConta);
}

void _aoMudarConta() {
  final conta = _conta;
  if (conta == null || conta.carregando || conta.estaAutenticado) {
    return;
  }
  zerarSessaoDoDescarteEmLote();
}

/// Começa uma sessão nova do descarte em lote. Os testes também usam, para simular uma sessão
/// nova sem reiniciar o processo.
void zerarSessaoDoDescarteEmLote() {
  _descartesPorLivro.clear();
  _recusados.clear();
}

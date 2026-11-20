/// Contador de descartes por livro e supressão da pergunta de descarte em lote (RN-22.12/13,
/// F-REC-ALG). Vivem só na memória do processo: fechar e reabrir o app zera os dois, e o servidor
/// não guarda nenhum. A pergunta cabe a partir do terceiro descarte do mesmo livro, enquanto não
/// tiver sido recusada para ele nesta sessão.
const int _descartesParaPerguntar = 3;

final Map<String, int> _descartesPorLivro = <String, int>{};
final Set<String> _recusados = <String>{};

/// Conta um descarte individual que o servidor confirmou e diz se a pergunta cabe agora.
bool registrarDescarte(String livroId) {
  final total = (_descartesPorLivro[livroId] ?? 0) + 1;
  _descartesPorLivro[livroId] = total;
  return total >= _descartesParaPerguntar && !_recusados.contains(livroId);
}

/// `Agora não`, ou fechar sem escolher: a pergunta não volta para este livro nesta sessão.
void recusarPergunta(String livroId) => _recusados.add(livroId);

/// Para os testes, que simulam uma sessão nova sem reiniciar o processo.
void zerarSessaoDoDescarteEmLote() {
  _descartesPorLivro.clear();
  _recusados.clear();
}

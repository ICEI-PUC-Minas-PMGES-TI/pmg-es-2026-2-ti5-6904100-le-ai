/// Validação do cliente para senha nova, comum a redefinir e alterar senha. Reforça a do
/// servidor, não substitui (RNF-SEC-13): a lista de senhas comuns só existe lá, e a mensagem dela
/// chega no erro da resposta. Mensagens de redefinir-senha.md e alterar-senha.md §8, as mesmas
/// da web (`validacaoDeSenha.ts`).
library;

const String senhaCurta = 'Escolha uma senha com pelo menos 8 caracteres.';
const String senhasDiferentes = 'As duas senhas precisam ser iguais.';

({String? nova, String? confirmacao}) validarSenhaNova(String nova, String confirmacao) {
  final erroNova = nova.length < 8 ? senhaCurta : null;
  final erroConfirmacao = erroNova == null && nova != confirmacao ? senhasDiferentes : null;
  return (nova: erroNova, confirmacao: erroConfirmacao);
}

/// Chave de idempotência da intenção: o mesmo formulário reenviado repete a chave; qualquer
/// campo alterado é outra intenção (RNF-ERR-04).
class ChaveDaIntencao {
  String? _corpo;
  String? _chave;

  String para(String corpo, String Function() nova) {
    if (_corpo != corpo || _chave == null) {
      _corpo = corpo;
      _chave = nova();
    }
    return _chave!;
  }
}

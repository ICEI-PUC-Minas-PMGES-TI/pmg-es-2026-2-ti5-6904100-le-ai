/// Textos derivados das telas de F-PERFIL, iguais aos de `code/front/src/perfil/textos.ts`. Os
/// modais usam o primeiro nome da pessoa, e todo número aparece com unidade.
///
/// **Sem pronome de gênero.** Os protótipos escrevem "ele" e "ela" a partir do nome, mas o
/// produto não sabe o gênero de ninguém, e adivinhar pelo nome erra com gente real. As frases
/// usam "essa pessoa" e o nome.
library;

String primeiroNome(String displayName) {
  final partes = displayName.trim().split(RegExp(r'\s+'));
  return partes.isEmpty || partes.first.isEmpty ? displayName : partes.first;
}

String contagem(int valor, String singular, String plural) =>
    '$valor ${valor == 1 ? singular : plural}';

/// `há 2 horas`, `há 3 dias`, `há 1 semana` (solicitacoes-de-seguir.md §3).
String tempoDeEspera(DateTime criadaEm, [DateTime? agora]) {
  final passado = (agora ?? DateTime.now()).difference(criadaEm);
  final faixas = <(Duration, String, String)>[
    (const Duration(days: 365), 'ano', 'anos'),
    (const Duration(days: 30), 'mês', 'meses'),
    (const Duration(days: 7), 'semana', 'semanas'),
    (const Duration(days: 1), 'dia', 'dias'),
    (const Duration(hours: 1), 'hora', 'horas'),
    (const Duration(minutes: 1), 'minuto', 'minutos'),
  ];
  for (final (tamanho, singular, plural) in faixas) {
    if (passado >= tamanho) {
      return 'há ${contagem(passado.inMicroseconds ~/ tamanho.inMicroseconds, singular, plural)}';
    }
  }
  return 'agora';
}

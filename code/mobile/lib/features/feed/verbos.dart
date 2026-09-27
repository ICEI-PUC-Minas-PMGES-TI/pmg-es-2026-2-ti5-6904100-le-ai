import 'social_service.dart';

/// Verbo de cada tipo de atividade (feed.md §4), igual a `code/front/src/feed/verbos.ts`.
String verboDeAtividade(TipoAtividade tipo) => switch (tipo) {
  TipoAtividade.leituraIniciada => 'começou a ler',
  TipoAtividade.leituraRetomada => 'retomou a leitura',
  TipoAtividade.leituraFinalizada => 'terminou de ler',
  TipoAtividade.leituraAbandonada => 'abandonou a leitura',
  TipoAtividade.resenhaPublicada => 'publicou uma resenha',
};

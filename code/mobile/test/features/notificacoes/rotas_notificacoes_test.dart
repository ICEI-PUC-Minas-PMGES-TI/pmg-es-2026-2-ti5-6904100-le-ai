import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/notificacoes/notificacao.dart';
import 'package:le_ai_mobile/features/notificacoes/rotas_notificacoes.dart';

Notificacao _de(TipoNotificacao tipo, {AtorDaNotificacao? ator, LivroDaNotificacao? livro}) =>
    Notificacao(
      id: 'n',
      tipo: tipo,
      mensagem: 'm',
      ator: ator,
      livro: livro,
      lida: false,
      criadoEm: DateTime(2026, 9, 26),
    );

void main() {
  const ator = AtorDaNotificacao(id: 'u', username: 'caio ferraz', nomeExibicao: 'Caio');

  test('novo seguidor e solicitacao aceita levam ao perfil de quem agiu', () {
    expect(
      destinoDaNotificacao(_de(TipoNotificacao.novoSeguidor, ator: ator)),
      '/perfil/leitores/caio%20ferraz',
    );
    expect(
      destinoDaNotificacao(_de(TipoNotificacao.solicitacaoAceita, ator: ator)),
      '/perfil/leitores/caio%20ferraz',
    );
  });

  test('ator oculto (conta suspensa) leva ao proprio perfil, nunca a um perfil vazio', () {
    expect(destinoDaNotificacao(_de(TipoNotificacao.novoSeguidor)), '/perfil');
  });

  test('solicitacao recebida leva a caixa de solicitacoes, onde a decisao acontece', () {
    expect(destinoDaNotificacao(_de(TipoNotificacao.solicitacaoCriada)), '/perfil/solicitacoes');
  });

  test('leitura em risco e expirada levam a pagina do livro certo', () {
    const oficial = LivroDaNotificacao(id: 'l1', pessoal: false, titulo: 'T');
    const pessoal = LivroDaNotificacao(id: 'l2', pessoal: true, titulo: 'T');
    expect(
      destinoDaNotificacao(_de(TipoNotificacao.leituraEmRisco, livro: oficial)),
      '/descobrir/livro/l1',
    );
    expect(
      destinoDaNotificacao(_de(TipoNotificacao.leituraExpirada, livro: pessoal)),
      '/estante/livro-pessoal/l2',
    );
  });

  test('tipo desconhecido do servidor e ignorado, nao quebra a lista', () {
    final pagina = PaginaDeNotificacoes.fromJson(<String, dynamic>{
      'itens': <Object>[
        <String, dynamic>{
          'id': 'x',
          'tipo': 'RECOMENDACAO_RECEBIDA',
          'mensagem': 'm',
          'lida': false,
          'criadoEm': '2026-09-26T12:00:00Z',
        },
      ],
      'totalItens': 1,
      'totalPaginas': 1,
      'totalNaoLidas': 1,
    });

    expect(pagina.itens, isEmpty);
    expect(pagina.totalNaoLidas, 1);
  });
}

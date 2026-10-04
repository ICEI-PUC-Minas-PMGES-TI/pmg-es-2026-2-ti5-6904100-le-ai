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

  test('reconhece a tela de notificacoes de qualquer aba, e so ela', () {
    expect(ehRotaDeNotificacoes(rotaNotificacoes('/estante')), isTrue);
    expect(ehRotaDeNotificacoes('/perfil/notificacoes'), isTrue);
    expect(ehRotaDeNotificacoes('/estante'), isFalse);
    expect(ehRotaDeNotificacoes('/perfil/solicitacoes'), isFalse);
    expect(ehRotaDeNotificacoes('/estante/notificacoes/outra'), isFalse);
  });

  test('recomendacao recebida traz o livro e a mensagem de quem recomendou', () {
    final notificacao = Notificacao.fromJson(<String, dynamic>{
      'id': 'n1',
      'tipo': 'RECOMENDACAO_RECEBIDA',
      'mensagem': 'Lívia Carvalho te recomendou Tudo É Rio.',
      'livro': <String, dynamic>{'id': 'l9', 'tipo': 'oficial', 'titulo': 'Tudo É Rio'},
      'recomendacaoMensagem': 'Terminei ontem.',
      'lida': false,
      'criadoEm': '2026-09-26T12:00:00Z',
    })!;

    expect(notificacao.recomendacaoMensagem, 'Terminei ontem.');
    expect(destinoDaNotificacao(notificacao), '/descobrir/livro/l9');
  });

  test('tipo desconhecido do servidor e ignorado, nao quebra a lista', () {
    final pagina = PaginaDeNotificacoes.fromJson(<String, dynamic>{
      'itens': <Object>[
        <String, dynamic>{
          'id': 'x',
          'tipo': 'LEMBRETE_DE_SEQUENCIA',
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

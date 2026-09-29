package br.com.leai.social.notificacao.model;

/**
 * Chaves do snapshot gravado em {@code notificacao.dados} (jsonb). O snapshot é tirado no consumo
 * do evento, como o do feed: a lista não hidrata perfil nem livro de outro schema a cada página.
 *
 * <pre>
 * { "ator": { id, username, nomeExibicao, avatarUrl },
 *   "atividadeId", "comentarioId", "solicitacaoId", "seguimentoId",
 *   "leituraId", "limiarDias", "livro": { id, tipo, titulo },
 *   "atividade": { tipo, livroTitulo, autorId, autorNome } }
 * </pre>
 *
 * Todas são opcionais; cada tipo grava as suas (ver {@link EventoDeNotificacao}).
 */
public final class DadosDeNotificacao {

  public static final String ATOR = "ator";
  public static final String ATOR_ID = "id";
  public static final String ATOR_USERNAME = "username";
  public static final String ATOR_NOME = "nomeExibicao";
  public static final String ATOR_AVATAR = "avatarUrl";

  public static final String ATIVIDADE_ID = "atividadeId";
  public static final String COMENTARIO_ID = "comentarioId";
  public static final String SOLICITACAO_ID = "solicitacaoId";
  public static final String SEGUIMENTO_ID = "seguimentoId";
  public static final String LEITURA_ID = "leituraId";
  public static final String LIMIAR_DIAS = "limiarDias";

  public static final String LIVRO = "livro";
  public static final String LIVRO_ID = "id";
  public static final String LIVRO_TIPO = "tipo";
  public static final String LIVRO_TITULO = "titulo";

  public static final String ATIVIDADE = "atividade";
  public static final String ATIVIDADE_TIPO = "tipo";
  public static final String ATIVIDADE_LIVRO_TITULO = "livroTitulo";
  public static final String ATIVIDADE_AUTOR_ID = "autorId";
  public static final String ATIVIDADE_AUTOR_NOME = "autorNome";

  private DadosDeNotificacao() {}
}

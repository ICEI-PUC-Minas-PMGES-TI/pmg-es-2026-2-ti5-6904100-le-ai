package br.com.leai.social.notificacao.service;

import br.com.leai.social.notificacao.model.DadosDeNotificacao;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import java.util.Map;
import java.util.UUID;

/**
 * Frase pt-BR de cada notificação, montada na leitura a partir do snapshot (copy de {@code
 * docs/design/periodo-1/F-NOT/notificacoes.md} §8). Fica fora do banco de propósito: corrigir a
 * copy não exige migrar notificações já gravadas. Sem detalhe técnico, sem exclamação, sem
 * em-dash, e todo número com unidade.
 */
final class RedacaoDeNotificacao {

  /** Nome exibido quando quem agiu não é mais um perfil visível (conta suspensa ou excluída). */
  static final String ATOR_OCULTO = "Um leitor";

  private static final String TIPO_ATIVIDADE_RESENHA = "resenha_publicada";

  private RedacaoDeNotificacao() {}

  static String mensagem(
      TipoNotificacao tipo, Map<String, Object> dados, String nomeDoAtor, UUID destinatarioId) {
    return switch (tipo) {
      case NOVO_SEGUIDOR -> nomeDoAtor + " começou a seguir você.";
      case SOLICITACAO_CRIADA -> nomeDoAtor + " pediu para seguir você.";
      case SOLICITACAO_ACEITA -> nomeDoAtor + " aceitou sua solicitação para seguir.";
      case ATIVIDADE_CURTIDA -> nomeDoAtor + " curtiu " + objetoDaAtividade(dados, "sua") + ".";
      case ATIVIDADE_COMENTADA ->
          nomeDoAtor + " comentou " + objetoDaAtividade(dados, "a sua") + ".";
      case COMENTARIO_RESPONDIDO ->
          nomeDoAtor + " respondeu ao seu comentário" + ondeFoiOComentario(dados, destinatarioId) + ".";
      case USUARIO_MENCIONADO ->
          nomeDoAtor + " mencionou você num comentário" + ondeFoiOComentario(dados, destinatarioId) + ".";
      case LEITURA_EM_RISCO ->
          "Você não registra progresso em "
              + tituloDoLivro(dados)
              + " há "
              + dados.get(DadosDeNotificacao.LIMIAR_DIAS)
              + " dias. No dia 40 ele é abandonado automaticamente.";
      case LEITURA_EXPIRADA ->
          tituloDoLivro(dados)
              + " foi abandonado automaticamente depois de "
              + dados.get(DadosDeNotificacao.LIMIAR_DIAS)
              + " dias sem progresso.";
      case RESENHA_CURTIDA -> nomeDoAtor + " curtiu sua resenha de " + tituloDoLivro(dados) + ".";
    };
  }

  /** "sua resenha de Vidas Secas", "a sua leitura de Torto Arado"; "sua atividade" sem contexto. */
  private static String objetoDaAtividade(Map<String, Object> dados, String possessivo) {
    Map<String, Object> atividade = mapa(dados, DadosDeNotificacao.ATIVIDADE);
    if (atividade == null) {
      return possessivo + " atividade";
    }
    String objeto =
        TIPO_ATIVIDADE_RESENHA.equals(atividade.get(DadosDeNotificacao.ATIVIDADE_TIPO))
            ? "resenha"
            : "leitura";
    return possessivo + " " + objeto + " de " + atividade.get(DadosDeNotificacao.ATIVIDADE_LIVRO_TITULO);
  }

  private static String ondeFoiOComentario(Map<String, Object> dados, UUID destinatarioId) {
    Map<String, Object> atividade = mapa(dados, DadosDeNotificacao.ATIVIDADE);
    if (atividade == null) {
      return "";
    }
    if (destinatarioId.toString().equals(atividade.get(DadosDeNotificacao.ATIVIDADE_AUTOR_ID))) {
      return " na sua atividade";
    }
    return " na atividade de " + atividade.get(DadosDeNotificacao.ATIVIDADE_AUTOR_NOME);
  }

  private static String tituloDoLivro(Map<String, Object> dados) {
    Map<String, Object> livro = mapa(dados, DadosDeNotificacao.LIVRO);
    return (String) livro.get(DadosDeNotificacao.LIVRO_TITULO);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mapa(Map<String, Object> dados, String campo) {
    return (Map<String, Object>) dados.get(campo);
  }
}

package br.com.leai.identidade.perfil.service;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Relação de quem pergunta com o perfil consultado (schema `RelacaoPerfil`) e o acesso ao
 * conteúdo segundo RN-08. Uma consulta só ao banco, sem cache: a relação muda a cada seguir,
 * aceitar ou remover, e RNF-SEC-03 pede a decisão no servidor a cada leitura.
 */
@Component
public class RelacaoEntrePerfis {

  public static final String PROPRIO = "proprio";
  public static final String NENHUMA = "nenhuma";
  public static final String SEGUINDO = "seguindo";
  public static final String SOLICITACAO_ENVIADA = "solicitacao_enviada";
  public static final String SOLICITACAO_RECEBIDA = "solicitacao_recebida";

  private final JdbcTemplate jdbc;

  public RelacaoEntrePerfis(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * Seguir vence as solicitações: quem já segue não tem pedido pendente para o mesmo perfil. Se
   * as duas pessoas pediram uma à outra, vale o pedido enviado, que é o que o botão da tela mostra.
   */
  public String entre(UUID quemPergunta, UUID perfil) {
    if (quemPergunta.equals(perfil)) {
      return PROPRIO;
    }
    return jdbc.queryForObject(
        """
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?)
            THEN 'seguindo'
          WHEN EXISTS (SELECT 1 FROM solicitacao_seguir
                        WHERE solicitante_id = ? AND alvo_id = ? AND status = 'pendente')
            THEN 'solicitacao_enviada'
          WHEN EXISTS (SELECT 1 FROM solicitacao_seguir
                        WHERE solicitante_id = ? AND alvo_id = ? AND status = 'pendente')
            THEN 'solicitacao_recebida'
          ELSE 'nenhuma'
        END
        """,
        String.class,
        quemPergunta,
        perfil,
        quemPergunta,
        perfil,
        perfil,
        quemPergunta);
  }

  /** RN-08: conteúdo de perfil privado só para o dono e para seguidor aceito. */
  public static boolean conteudoRestrito(boolean privado, String relacao) {
    return privado && !PROPRIO.equals(relacao) && !SEGUINDO.equals(relacao);
  }
}

package br.com.leai.social.conta.service;

import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.ConsumerDefinition;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessageHandler;
import br.com.leai.social.messaging.MessagingConstants;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Consumidor de {@code conta.excluida} (F-CONTA-2, RN-23.5 e 23.7): remove do schema {@code
 * social} o que é da conta excluída e anonimiza os registros técnicos e de auditoria. Validação por
 * schema, recibo em {@code mensagem_processada}, retry 1/5/15s e DLQ vêm de {@link
 * AmqpConsumerService} (RNF-SEC-32, RNF-ERR-06/07); o handler roda na transação do recibo.
 *
 * <p>Conteúdo de outros leitores pendurado no da conta sai junto, pelo CASCADE que o modelo já
 * tem (decisão do dono, 07/10/2026): curtidas e comentários nas atividades dela e respostas abaixo
 * dos comentários-raiz dela. Comentários de outros que apenas responderam a ela ficam, sem a
 * referência ({@code respondido_usuario_id}).
 *
 * <p>A ordem importa: denúncias e o log de moderação são resolvidos antes de apagar atividades e
 * comentários, porque só eles dizem quais resenhas e comentários eram da conta. O {@code social}
 * não guarda as frases da conta, então log de moderação de frase dela fica sem anonimizar aqui.
 */
@Component
public class ConsumidorDeContaExcluida implements MessageHandler {

  private static final Logger log = LoggerFactory.getLogger(ConsumidorDeContaExcluida.class);

  /** Comentários que somem com a conta: dela, nas atividades dela e abaixo dos comentários dela. */
  private static final String COMENTARIOS_QUE_SOMEM =
      "SELECT c.id FROM comentario c WHERE c.autor_id = ?"
          + " OR c.atividade_id IN (SELECT a.id FROM atividade a WHERE a.autor_id = ?)"
          + " OR c.comentario_raiz_id IN (SELECT r.id FROM comentario r WHERE r.autor_id = ?)";

  private static final String RESENHAS_DA_CONTA =
      "SELECT a.origem_id FROM atividade a WHERE a.autor_id = ? AND a.origem_tipo = 'resenha'";

  private final JdbcTemplate jdbc;

  public ConsumidorDeContaExcluida(AmqpConsumerService consumidor, JdbcTemplate jdbc) {
    this.jdbc = jdbc;
    consumidor.register(
        new ConsumerDefinition(
            MessagingConstants.CONTA_CONSUMER_NAME,
            MessagingConstants.CONTA_QUEUE,
            MessagingConstants.IDENTIDADE_EXCHANGE,
            List.of(MessagingConstants.EVENTO_CONTA_EXCLUIDA)),
        this);
  }

  @Override
  public void handle(MessageEnvelope envelope) {
    UUID u = UUID.fromString((String) envelope.data().get("usuarioId"));

    // Auditoria (RNF-SEC-35) fica, sem nada que aponte para a conta (RN-23.7).
    jdbc.update(
        "UPDATE log_moderacao SET alvo_id = NULL, denuncia_id = NULL, detalhe = NULL,"
            + " anonimizado_em = now() WHERE anonimizado_em IS NULL AND ("
            + " (alvo_tipo = 'usuario' AND alvo_id = ?)"
            + " OR (alvo_tipo = 'comentario' AND alvo_id IN ("
            + COMENTARIOS_QUE_SOMEM
            + "))"
            + " OR (alvo_tipo = 'resenha' AND alvo_id IN ("
            + RESENHAS_DA_CONTA
            + "))"
            + " OR denuncia_id IN (SELECT d.id FROM denuncia d WHERE d.denunciante_id = ?))",
        u,
        u,
        u,
        u,
        u,
        u);
    jdbc.update(
        "DELETE FROM denuncia WHERE denunciante_id = ?"
            + " OR (alvo_tipo = 'comentario' AND alvo_id IN ("
            + COMENTARIOS_QUE_SOMEM
            + "))"
            + " OR (alvo_tipo = 'resenha' AND alvo_id IN ("
            + RESENHAS_DA_CONTA
            + "))",
        u,
        u,
        u,
        u,
        u);

    String texto = u.toString();
    jdbc.update(
        "DELETE FROM notificacao WHERE destinatario_id = ?"
            + " OR dados -> 'ator' ->> 'id' = ? OR dados -> 'atividade' ->> 'autorId' = ?",
        u,
        texto,
        texto);
    jdbc.update(
        "UPDATE comentario SET respondido_usuario_id = NULL"
            + " WHERE respondido_usuario_id = ? AND autor_id <> ?",
        u,
        u);
    jdbc.update("DELETE FROM comentario_mencao WHERE mencionado_id = ?", u);
    jdbc.update("DELETE FROM curtida_atividade WHERE usuario_id = ?", u);
    // CASCADE: respostas abaixo dos comentários-raiz dela.
    jdbc.update("DELETE FROM comentario WHERE autor_id = ?", u);
    // CASCADE: curtidas e comentários de outros nas atividades dela.
    jdbc.update("DELETE FROM atividade WHERE autor_id = ?", u);
    // CASCADE: itens das listas.
    jdbc.update("DELETE FROM lista WHERE usuario_id = ?", u);
    jdbc.update("DELETE FROM recomendacao WHERE remetente_id = ? OR destinatario_id = ?", u, u);
    jdbc.update("DELETE FROM sugestao_descartada WHERE usuario_id = ?", u);
    jdbc.update("DELETE FROM preferencia_notificacao WHERE usuario_id = ?", u);
    jdbc.update("DELETE FROM dispositivo_push WHERE usuario_id = ?", u);

    jdbc.update(
        "UPDATE idempotencia_social SET subject_ref = NULL, chave = NULL, payload_hash = NULL,"
            + " resposta = NULL, anonimizado_em = now()"
            + " WHERE subject_ref = ? AND anonimizado_em IS NULL",
        u);

    // A outbox não tem coluna de usuário: a busca é textual. Pendente sai (o CHECK só anonimiza
    // publicado, e publicar republicaria dado de quem foi excluído); publicado é anonimizado.
    String padrao = "%" + texto + "%";
    jdbc.update(
        "DELETE FROM outbox_social WHERE status = 'pendente'"
            + " AND (payload::text LIKE ? OR chave_negocio LIKE ?)",
        padrao,
        padrao);
    jdbc.update(
        "UPDATE outbox_social SET chave_negocio = NULL, correlation_id = NULL, payload = NULL,"
            + " anonimizado_em = now() WHERE status = 'publicado' AND anonimizado_em IS NULL"
            + " AND (payload::text LIKE ? OR chave_negocio LIKE ?)",
        padrao,
        padrao);

    log.info("Dados da conta excluída removidos do social (evento {})", envelope.eventId());
  }
}

package br.com.leai.social.conta.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.messaging.MessageEnvelope;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ConsumidorDeContaExcluida} contra Postgres real (F-CONTA-2, RNF-TST-02): a matriz de
 * remoção do {@code social} com massa de duas pessoas, para provar que o que é da outra fica.
 *
 * <p>O envelope vai direto ao handler, como em {@code ConsumidorDeAtividadeIntegracaoTest}: a
 * validação de schema, o recibo, o retry e a DLQ são do {@code AmqpConsumerService} e já têm teste
 * próprio; o schema de {@code conta.excluida} está em {@code MessageValidatorTest}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ConsumidorDeContaExcluidaIntegracaoTest extends IntegracaoComPostgres {

  private static final String LOGS_ANONIMIZADOS =
      "SELECT count(*) FROM log_moderacao WHERE anonimizado_em IS NOT NULL";
  private static final String EVENTOS_ANONIMIZADOS =
      "SELECT count(*) FROM outbox_social WHERE anonimizado_em IS NOT NULL";

  @Autowired private ConsumidorDeContaExcluida consumidor;
  @Autowired private JdbcTemplate jdbc;

  private static MessageEnvelope envelope(UUID usuarioId) {
    return new MessageEnvelope(
        UUID.randomUUID(),
        "conta.excluida",
        1,
        OffsetDateTime.now(),
        UUID.randomUUID(),
        "conta:" + usuarioId,
        Map.of("usuarioId", usuarioId.toString()));
  }

  private UUID atividade(UUID autor, String origemTipo, UUID origemId) {
    UUID id = UUID.randomUUID();
    String tipo = "resenha".equals(origemTipo) ? "resenha_publicada" : "leitura_iniciada";
    jdbc.update(
        "INSERT INTO atividade (id, autor_id, tipo, livro_id, event_id, chave_fato, origem_tipo,"
            + " origem_id, snap_usuario_nome, snap_usuario_username, snap_livro_titulo,"
            + " snap_livro_autor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Nome', 'nome', 'Livro', 'Autor')",
        id,
        autor,
        tipo,
        UUID.randomUUID(),
        UUID.randomUUID(),
        "fato:" + id,
        origemTipo,
        origemId);
    return id;
  }

  private UUID comentario(UUID atividadeId, UUID autor, UUID raiz, UUID respondido) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO comentario (id, atividade_id, autor_id, comentario_raiz_id,"
            + " respondido_usuario_id, texto) VALUES (?, ?, ?, ?, ?, 'Oi')",
        id,
        atividadeId,
        autor,
        raiz,
        respondido);
    return id;
  }

  private UUID denuncia(UUID denunciante, String alvoTipo, UUID alvoId) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO denuncia (id, denunciante_id, alvo_tipo, alvo_id, motivo)"
            + " VALUES (?, ?, ?, ?, 'Ofensivo')",
        id,
        denunciante,
        alvoTipo,
        alvoId);
    return id;
  }

  private void logModeracao(String alvoTipo, UUID alvoId, UUID denunciaId) {
    jdbc.update(
        "INSERT INTO log_moderacao (admin, acao, alvo_tipo, alvo_id, denuncia_id, detalhe)"
            + " VALUES ('admin', 'remover_conteudo', ?, ?, ?, 'Texto citado')",
        alvoTipo,
        alvoId,
        denunciaId);
  }

  private void notificacao(UUID destinatario, UUID ator) {
    jdbc.update(
        "INSERT INTO notificacao (destinatario_id, tipo, dados, event_id, chave_negocio)"
            + " VALUES (?, 'novo_seguidor', ?::jsonb, ?, ?)",
        destinatario,
        "{\"ator\":{\"id\":\"" + ator + "\",\"username\":\"x\"}}",
        UUID.randomUUID(),
        "seguimento:" + UUID.randomUUID());
  }

  private int contar(String sql, Object... argumentos) {
    Integer total = jdbc.queryForObject(sql, Integer.class, argumentos);
    return total == null ? 0 : total;
  }

  @Test
  @DisplayName("remove o que é da conta e o que pende do conteúdo dela; o da outra fica")
  void matrizDeRemocao() {
    UUID excluida = UUID.randomUUID();
    UUID outra = UUID.randomUUID();
    UUID resenhaDaExcluida = UUID.randomUUID();

    UUID atividadeDaExcluida = atividade(excluida, "resenha", resenhaDaExcluida);
    UUID atividadeDaOutra = atividade(outra, "leitura", UUID.randomUUID());
    // A outra comenta na atividade da excluída: sai pelo CASCADE.
    UUID comentarioDaOutraNaExcluida = comentario(atividadeDaExcluida, outra, null, null);
    // A excluída comenta na atividade da outra, e a outra responde a ela.
    UUID raizDaExcluida = comentario(atividadeDaOutra, excluida, null, null);
    UUID respostaDaOutra = comentario(atividadeDaOutra, outra, raizDaExcluida, excluida);
    // Um comentário-raiz da outra, com resposta dirigida à excluída noutra raiz que fica.
    UUID raizDaOutra = comentario(atividadeDaOutra, outra, null, null);
    UUID respostaParaExcluida = comentario(atividadeDaOutra, outra, raizDaOutra, excluida);
    jdbc.update(
        "INSERT INTO curtida_atividade (atividade_id, usuario_id) VALUES (?, ?), (?, ?)",
        atividadeDaOutra,
        excluida,
        atividadeDaExcluida,
        outra);
    jdbc.update(
        "INSERT INTO lista (usuario_id, titulo) VALUES (?, 'Da excluída'), (?, 'Da outra')",
        excluida,
        outra);
    jdbc.update(
        "INSERT INTO recomendacao (remetente_id, destinatario_id, livro_id) VALUES (?, ?, ?)",
        outra,
        excluida,
        UUID.randomUUID());
    notificacao(excluida, outra);
    notificacao(outra, excluida);
    notificacao(outra, UUID.randomUUID());
    UUID denunciaContraResenha = denuncia(outra, "resenha", resenhaDaExcluida);
    UUID denunciaFeitaPelaExcluida = denuncia(excluida, "comentario", raizDaOutra);
    UUID denunciaQueFica = denuncia(outra, "comentario", raizDaOutra);
    logModeracao("resenha", resenhaDaExcluida, denunciaContraResenha);
    logModeracao("comentario", raizDaOutra, denunciaFeitaPelaExcluida);
    logModeracao("usuario", excluida, null);
    logModeracao("comentario", raizDaOutra, denunciaQueFica);
    // O banco é compartilhado com os outros testes da suíte: o anonimizado se mede pela diferença.
    int logsAnonimizadosAntes = contar(LOGS_ANONIMIZADOS);

    consumidor.handle(envelope(excluida));

    assertThat(contar("SELECT count(*) FROM atividade WHERE autor_id = ?", excluida)).isZero();
    assertThat(contar("SELECT count(*) FROM comentario WHERE autor_id = ?", excluida)).isZero();
    assertThat(contar("SELECT count(*) FROM comentario WHERE id = ?", comentarioDaOutraNaExcluida))
        .isZero();
    assertThat(contar("SELECT count(*) FROM comentario WHERE id = ?", respostaDaOutra)).isZero();
    assertThat(contar("SELECT count(*) FROM comentario WHERE id = ?", respostaParaExcluida))
        .isEqualTo(1);
    assertThat(
            contar(
                "SELECT count(*) FROM comentario WHERE respondido_usuario_id = ?", excluida))
        .isZero();
    assertThat(
            contar(
                "SELECT count(*) FROM curtida_atividade WHERE usuario_id IN (?, ?)",
                excluida,
                outra))
        .isZero();
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", excluida)).isZero();
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", outra)).isEqualTo(1);
    assertThat(
            contar(
                "SELECT count(*) FROM recomendacao WHERE remetente_id = ? OR destinatario_id = ?",
                outra,
                excluida))
        .isZero();
    assertThat(
            contar(
                "SELECT count(*) FROM notificacao WHERE destinatario_id IN (?, ?)", excluida, outra))
        .isEqualTo(1);
    assertThat(contar("SELECT count(*) FROM atividade WHERE id = ?", atividadeDaOutra))
        .isEqualTo(1);

    assertThat(contar("SELECT count(*) FROM denuncia WHERE id = ?", denunciaQueFica)).isEqualTo(1);
    assertThat(
            contar(
                "SELECT count(*) FROM denuncia WHERE denunciante_id IN (?, ?)", excluida, outra))
        .isEqualTo(1);
    assertThat(contar(LOGS_ANONIMIZADOS)).isEqualTo(logsAnonimizadosAntes + 3);
    assertThat(
            contar(
                "SELECT count(*) FROM log_moderacao WHERE anonimizado_em IS NULL"
                    + " AND denuncia_id = ?",
                denunciaQueFica))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("recibos e eventos que citam a conta são anonimizados; pendentes saem")
  void registrosTecnicos() {
    UUID excluida = UUID.randomUUID();
    UUID outra = UUID.randomUUID();
    for (UUID sujeito : new UUID[] {excluida, outra}) {
      jdbc.update(
          "INSERT INTO idempotencia_social (subject_ref, operacao, chave, payload_hash,"
              + " status_http, resposta, replay_ate)"
              + " VALUES (?, 'criarLista', ?, 'h', 201, '{}'::jsonb, now() + interval '1 day')",
          sujeito,
          UUID.randomUUID().toString());
    }
    for (String status : new String[] {"pendente", "publicado"}) {
      jdbc.update(
          "INSERT INTO outbox_social (event_id, tipo, versao, chave_negocio, correlation_id, payload,"
              + " status, publicado_em) VALUES (?, 'atividade.curtida', 1, ?, ?, ?::jsonb, ?,"
              + " CASE WHEN ? = 'publicado' THEN now() END)",
          UUID.randomUUID(),
          "atividade:x:curtida:" + excluida,
          UUID.randomUUID(),
          "{\"destinatarioId\":\"" + outra + "\"}",
          status,
          status);
    }
    int eventosAnonimizadosAntes = contar(EVENTOS_ANONIMIZADOS);

    consumidor.handle(envelope(excluida));

    assertThat(
            contar("SELECT count(*) FROM idempotencia_social WHERE subject_ref = ?", excluida))
        .isZero();
    assertThat(contar("SELECT count(*) FROM idempotencia_social WHERE subject_ref = ?", outra))
        .isEqualTo(1);
    assertThat(
            contar(
                "SELECT count(*) FROM outbox_social WHERE chave_negocio LIKE ?",
                "%" + excluida + "%"))
        .isZero();
    assertThat(contar(EVENTOS_ANONIMIZADOS)).isEqualTo(eventosAnonimizadosAntes + 1);
  }

  @Test
  @DisplayName("entregar de novo não falha nem apaga o que não é da conta")
  void repeticao() {
    UUID excluida = UUID.randomUUID();
    UUID outra = UUID.randomUUID();
    atividade(outra, "leitura", UUID.randomUUID());

    consumidor.handle(envelope(excluida));
    consumidor.handle(envelope(excluida));

    assertThat(contar("SELECT count(*) FROM atividade WHERE autor_id = ?", outra)).isEqualTo(1);
  }
}

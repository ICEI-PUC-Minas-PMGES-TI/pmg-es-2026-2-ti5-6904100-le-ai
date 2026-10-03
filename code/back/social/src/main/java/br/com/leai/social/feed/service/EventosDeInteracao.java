package br.com.leai.social.feed.service;

import br.com.leai.social.common.CorrelationIdFilter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Os três eventos de interação de F-FEED (Task 4), gravados em {@code outbox_social} na mesma
 * transação do fato (catálogo de mensageria; RNF-ERR-10). Porte do racional de {@code
 * identidade.seguimento.EventosDeSeguimento}: se a transação do fato for desfeita, a linha some
 * junto — nunca sai evento de curtida/comentário que não aconteceu, e nunca fica escrita sem
 * evento.
 *
 * <p>Exatamente um evento por escrita: {@link ServicoDeInteracao} decide qual destes três chamar,
 * nunca mais de um para a mesma escrita (RN-10 / contrato de {@code docs/api/social.yaml}).
 */
@Component
class EventosDeInteracao {

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  EventosDeInteracao(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  /** Curtida nova em uma atividade: avisa o autor da atividade. */
  void atividadeCurtida(UUID atividadeId, UUID destinatarioId, UUID autorAcaoId) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", destinatarioId.toString());
    data.put("atividadeId", atividadeId.toString());
    data.put("autorAcao", snapshot(autorAcaoId));
    gravar("atividade.curtida", "atividade:" + atividadeId + ":curtida:" + autorAcaoId, data);
  }

  /** Comentário-raiz novo em uma atividade: avisa o autor da atividade. */
  void atividadeComentada(UUID atividadeId, UUID comentarioId, UUID destinatarioId, UUID autorAcaoId) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", destinatarioId.toString());
    data.put("atividadeId", atividadeId.toString());
    data.put("comentarioId", comentarioId.toString());
    data.put("autorAcao", snapshot(autorAcaoId));
    gravar("atividade.comentada", "comentario:" + comentarioId, data);
  }

  /** Resposta nova a um comentário (raiz ou resposta): avisa quem foi respondido. */
  void comentarioRespondido(
      UUID atividadeId,
      UUID comentarioId,
      UUID comentarioAlvoId,
      UUID destinatarioId,
      UUID autorAcaoId) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", destinatarioId.toString());
    data.put("atividadeId", atividadeId.toString());
    data.put("comentarioId", comentarioId.toString());
    data.put("comentarioAlvoId", comentarioAlvoId.toString());
    data.put("autorAcao", snapshot(autorAcaoId));
    gravar("comentario.respondido", "comentario:" + comentarioId, data);
  }

  void usuarioMencionado(UUID atividadeId, UUID comentarioId, UUID destinatarioId, UUID autorAcaoId) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", destinatarioId.toString());
    data.put("atividadeId", atividadeId.toString());
    data.put("comentarioId", comentarioId.toString());
    data.put("autorAcao", snapshot(autorAcaoId));
    gravar("usuario.mencionado", "mencao:" + comentarioId + ":" + destinatarioId, data);
  }

  /**
   * {@code UsuarioSnapshot} de {@code common-v1.schema.json}, batido contra {@code
   * identidade.v_perfil_referencia_v1} — a mesma view cross-schema que outras consultas de
   * `social` já usam para dados de outro schema sem hidratação síncrona de domínio.
   */
  private Map<String, Object> snapshot(UUID usuarioId) {
    List<Map<String, Object>> linhas =
        jdbc.queryForList(
            "SELECT username, nome_exibicao, avatar_url FROM identidade.v_perfil_referencia_v1"
                + " WHERE id = ?",
            usuarioId);
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("id", usuarioId.toString());
    if (linhas.isEmpty()) {
      // Não deveria ocorrer: o autor da ação é sempre o usuário autenticado. Cinto de segurança
      // para não deixar o evento vazar SQLException nem NullPointerException.
      snapshot.put("username", "");
      snapshot.put("displayName", "");
      snapshot.put("avatarUrl", null);
      return snapshot;
    }
    Map<String, Object> linha = linhas.get(0);
    snapshot.put("username", linha.get("username"));
    snapshot.put("displayName", linha.get("nome_exibicao"));
    snapshot.put("avatarUrl", linha.get("avatar_url"));
    return snapshot;
  }

  private void gravar(String tipo, String chaveDeNegocio, Map<String, Object> data) {
    jdbc.update(
        "INSERT INTO outbox_social (event_id, tipo, versao, chave_negocio, correlation_id, payload)"
            + " VALUES (?, ?, 1, ?, ?, ?::jsonb)",
        UUID.randomUUID(),
        tipo,
        chaveDeNegocio,
        correlationId(),
        objectMapper.writeValueAsString(data));
  }

  private static UUID correlationId() {
    try {
      return UUID.fromString(CorrelationIdFilter.atual());
    } catch (IllegalArgumentException | NullPointerException semCorrelationValido) {
      return UUID.randomUUID();
    }
  }
}

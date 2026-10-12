package br.com.leai.social.messaging;

import br.com.leai.social.common.CorrelationIdFilter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class OutboxSocial {

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public OutboxSocial(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  public UUID gravar(String tipo, String chaveDeNegocio, Map<String, Object> data) {
    UUID eventId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO outbox_social (event_id, tipo, versao, chave_negocio, correlation_id, payload)"
            + " VALUES (?, ?, 1, ?, ?, ?::jsonb)",
        eventId,
        tipo,
        chaveDeNegocio,
        correlationId(),
        objectMapper.writeValueAsString(data));
    return eventId;
  }

  // username é citext em identidade; sem o cast o driver não o serializa como string.
  public Map<String, Object> usuarioSnapshot(UUID usuarioId) {
    List<Map<String, Object>> linhas =
        jdbc.queryForList(
            "SELECT username::text AS username, nome_exibicao, avatar_url"
                + " FROM identidade.v_perfil_referencia_v1"
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

  private static UUID correlationId() {
    try {
      return UUID.fromString(CorrelationIdFilter.atual());
    } catch (IllegalArgumentException | NullPointerException semCorrelationValido) {
      return UUID.randomUUID();
    }
  }
}

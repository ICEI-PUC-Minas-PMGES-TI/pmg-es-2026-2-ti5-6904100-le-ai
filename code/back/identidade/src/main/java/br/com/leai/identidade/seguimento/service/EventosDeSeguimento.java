package br.com.leai.identidade.seguimento.service;

import br.com.leai.identidade.common.CorrelationIdFilter;
import br.com.leai.identidade.usuario.Usuario;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Os três eventos de F-PERFIL, gravados em `outbox_identidade` na mesma transação do fato
 * (catálogo de mensageria; RNF-ERR-10). O dispatcher de P0-MSG monta o envelope e publica em
 * `leai.events.identidade`; aqui vai só o `data`, validado pelos schemas
 * `docs/mensageria/schemas/*.v1.schema.json`.
 *
 * <p>Se a transação do fato for desfeita, a linha some junto: nunca sai evento de seguimento que
 * não aconteceu, e nunca fica seguimento sem evento.
 */
@Component
public class EventosDeSeguimento {

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public EventosDeSeguimento(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  /** Seguimento imediato de perfil público: avisa quem foi seguido. */
  void seguidorNovo(UUID seguimentoId, UUID seguidoId, Usuario seguidor) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", seguidoId.toString());
    data.put("seguimentoId", seguimentoId.toString());
    data.put("seguidor", snapshot(seguidor));
    gravar("seguidor.novo", "seguimento:" + seguimentoId, data);
  }

  /** Pedido para seguir perfil privado: avisa o dono do perfil. */
  void solicitacaoCriada(UUID solicitacaoId, UUID alvoId, Usuario solicitante) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", alvoId.toString());
    data.put("solicitacaoId", solicitacaoId.toString());
    data.put("solicitante", snapshot(solicitante));
    gravar("solicitacao.criada", "solicitacao:" + solicitacaoId, data);
  }

  /** Pedido aceito: avisa quem pediu, com o perfil de quem aceitou. */
  void solicitacaoAceita(
      UUID solicitacaoId, UUID seguimentoId, UUID solicitanteId, Usuario aceitante) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("destinatarioId", solicitanteId.toString());
    data.put("solicitacaoId", solicitacaoId.toString());
    data.put("seguimentoId", seguimentoId.toString());
    data.put("perfilAceitante", snapshot(aceitante));
    gravar("solicitacao.aceita", "solicitacao:" + solicitacaoId, data);
  }

  /** `UsuarioSnapshot` de `common-v1.schema.json`: `avatarUrl` presente mesmo quando nulo. */
  private static Map<String, Object> snapshot(Usuario usuario) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("id", usuario.id().toString());
    snapshot.put("username", usuario.username());
    snapshot.put("displayName", usuario.nomeExibicao());
    snapshot.put("avatarUrl", usuario.avatarUrl());
    return snapshot;
  }

  private void gravar(String tipo, String chaveDeNegocio, Map<String, Object> data) {
    jdbc.update(
        "INSERT INTO outbox_identidade (event_id, tipo, versao, chave_negocio, correlation_id, payload)"
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

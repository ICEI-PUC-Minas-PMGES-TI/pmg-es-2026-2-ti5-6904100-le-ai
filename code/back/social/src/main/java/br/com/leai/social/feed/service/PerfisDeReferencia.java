package br.com.leai.social.feed.service;

import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class PerfisDeReferencia {

  private final JdbcTemplate jdbc;

  PerfisDeReferencia(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  Map<UUID, AutorSnapshotResposta> porIds(Collection<UUID> usuarioIds) {
    List<UUID> ids = usuarioIds.stream().filter(Objects::nonNull).distinct().toList();
    if (ids.isEmpty()) {
      return Map.of();
    }
    return jdbc.query(
        "SELECT id, username, nome_exibicao, avatar_url FROM identidade.v_perfil_referencia_v1"
            + " WHERE id IN (" + placeholders(ids.size()) + ")",
        rs -> {
          Map<UUID, AutorSnapshotResposta> mapa = new HashMap<>();
          while (rs.next()) {
            UUID id = rs.getObject("id", UUID.class);
            mapa.put(
                id,
                new AutorSnapshotResposta(
                    id.toString(),
                    rs.getString("username"),
                    rs.getString("nome_exibicao"),
                    rs.getString("avatar_url")));
          }
          return mapa;
        },
        ids.toArray());
  }

  Map<String, UUID> idsPorUsername(Collection<String> usernames) {
    List<String> chaves = usernames.stream().map(PerfisDeReferencia::chave).distinct().toList();
    if (chaves.isEmpty()) {
      return Map.of();
    }
    return jdbc.query(
        "SELECT id, lower(username) AS chave FROM identidade.v_perfil_referencia_v1"
            + " WHERE lower(username) IN (" + placeholders(chaves.size()) + ")",
        rs -> {
          Map<String, UUID> mapa = new HashMap<>();
          while (rs.next()) {
            mapa.put(rs.getString("chave"), rs.getObject("id", UUID.class));
          }
          return mapa;
        },
        chaves.toArray());
  }

  static String chave(String username) {
    return username.toLowerCase(Locale.ROOT);
  }

  private static String placeholders(int quantidade) {
    return String.join(", ", Collections.nCopies(quantidade, "?"));
  }
}

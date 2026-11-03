package br.com.leai.social.feed.repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MencaoDeComentarioRepository {

  public record Mencao(UUID comentarioId, UUID mencionadoId, int posicao) {}

  private final JdbcTemplate jdbc;

  public MencaoDeComentarioRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void substituir(UUID comentarioId, Map<Integer, UUID> mencionadoPorPosicao) {
    jdbc.update("DELETE FROM comentario_mencao WHERE comentario_id = ?", comentarioId);
    List<Object[]> linhas = new ArrayList<>();
    mencionadoPorPosicao.forEach(
        (posicao, mencionadoId) -> linhas.add(new Object[] {comentarioId, mencionadoId, posicao}));
    if (!linhas.isEmpty()) {
      jdbc.batchUpdate(
          "INSERT INTO comentario_mencao (comentario_id, mencionado_id, posicao) VALUES (?, ?, ?)",
          linhas);
    }
  }

  public Map<UUID, List<Mencao>> porComentarios(Collection<UUID> comentarioIds) {
    if (comentarioIds.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = List.copyOf(comentarioIds);
    return jdbc.query(
        "SELECT comentario_id, mencionado_id, posicao FROM comentario_mencao"
            + " WHERE comentario_id IN (" + String.join(", ", Collections.nCopies(ids.size(), "?")) + ")"
            + " ORDER BY comentario_id, posicao",
        rs -> {
          Map<UUID, List<Mencao>> mapa = new HashMap<>();
          while (rs.next()) {
            UUID comentarioId = rs.getObject("comentario_id", UUID.class);
            mapa.computeIfAbsent(comentarioId, id -> new ArrayList<>())
                .add(
                    new Mencao(
                        comentarioId, rs.getObject("mencionado_id", UUID.class), rs.getInt("posicao")));
          }
          return mapa;
        },
        ids.toArray());
  }
}

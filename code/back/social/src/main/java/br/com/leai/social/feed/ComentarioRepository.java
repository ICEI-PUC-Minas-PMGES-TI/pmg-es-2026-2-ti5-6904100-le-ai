package br.com.leai.social.feed;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Acesso a {@link Comentario}: comentários-raiz paginados e respostas paginadas por cursor. */
public interface ComentarioRepository extends JpaRepository<Comentario, UUID> {

  /** Comentários-raiz de uma atividade (RF-SOC-15), mais antigos primeiro. */
  @Query(
      """
      SELECT c FROM Comentario c
       WHERE c.atividadeId = :atividadeId AND c.comentarioRaizId IS NULL
       ORDER BY c.criadoEm ASC, c.id ASC
      """)
  Page<Comentario> buscarRaizesPorAtividade(@Param("atividadeId") UUID atividadeId, Pageable pageable);

  List<Comentario> findByAtividadeIdAndComentarioRaizIdIsNull(UUID atividadeId);

  /** Quantas respostas uma raiz já tem, para o campo {@code totalRespostas} do contrato. */
  long countByComentarioRaizId(UUID comentarioRaizId);

  /**
   * Respostas de uma raiz (RF-SOC-18), paginadas por cursor opaco em vez de offset: decodifica
   * {@code cursor} (nulo na primeira página) em {@code (criadoEm, id)} e delega à query nativa que
   * monta o {@code WHERE (criado_em, id) > (?, ?)}.
   */
  default List<Comentario> buscarRespostasPorRaiz(UUID comentarioRaizId, String cursor, int limite) {
    CursorComentario decodificado = cursor == null ? null : CursorComentario.decodificar(cursor);
    return buscarRespostasPorRaizNativa(
        comentarioRaizId,
        decodificado == null ? null : decodificado.criadoEm(),
        decodificado == null ? null : decodificado.id(),
        limite);
  }

  @Query(
      value =
          """
          SELECT *
            FROM comentario
           WHERE comentario_raiz_id = :raizId
             AND (
               CAST(:cursorCriadoEm AS timestamptz) IS NULL
               OR (criado_em, id) > (CAST(:cursorCriadoEm AS timestamptz), CAST(:cursorId AS uuid))
             )
           ORDER BY criado_em ASC, id ASC
           LIMIT :limite
          """,
      nativeQuery = true)
  List<Comentario> buscarRespostasPorRaizNativa(
      @Param("raizId") UUID raizId,
      @Param("cursorCriadoEm") Instant cursorCriadoEm,
      @Param("cursorId") UUID cursorId,
      @Param("limite") int limite);
}

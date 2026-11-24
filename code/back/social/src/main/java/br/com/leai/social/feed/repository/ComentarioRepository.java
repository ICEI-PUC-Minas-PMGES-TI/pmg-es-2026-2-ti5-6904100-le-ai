package br.com.leai.social.feed.repository;

import br.com.leai.social.feed.entity.Comentario;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Acesso a {@link Comentario}: comentários-raiz paginados e respostas paginadas por cursor.
 *
 * <p><b>F-MOD-OPC (05/11/2026):</b> toda leitura que chega a outro leitor passa pelo filtro {@link
 * #VISIVEL}. O autor do comentário é o próprio leitor ou está em {@code
 * identidade.v_perfil_referencia_v1} (some a conta suspensa ou com exclusão pendente), e uma
 * resposta exige também a raiz visível: a thread de raiz oculta some inteira (decisão 11). Nada é
 * apagado; a reativação devolve tudo. As consultas são nativas porque a VIEW é de outro schema.
 */
public interface ComentarioRepository extends JpaRepository<Comentario, UUID> {

  /** Comentário {@code c} visível para {@code :leitor}. Usa o alias {@code c}. */
  String VISIVEL =
      """
      (c.autor_id = :leitor
         OR EXISTS (SELECT 1 FROM identidade.v_perfil_referencia_v1 p WHERE p.id = c.autor_id))
      AND (c.comentario_raiz_id IS NULL
         OR EXISTS (SELECT 1 FROM comentario r
                     WHERE r.id = c.comentario_raiz_id
                       AND (r.autor_id = :leitor
                         OR EXISTS (SELECT 1 FROM identidade.v_perfil_referencia_v1 pr
                                     WHERE pr.id = r.autor_id))))
      """;

  /** Comentários-raiz visíveis de uma atividade (RF-SOC-15), mais antigos primeiro. */
  @Query(
      value =
          "SELECT c.* FROM comentario c"
              + " WHERE c.atividade_id = :atividadeId AND c.comentario_raiz_id IS NULL AND "
              + VISIVEL
              + " ORDER BY c.criado_em ASC, c.id ASC",
      countQuery =
          "SELECT count(*) FROM comentario c"
              + " WHERE c.atividade_id = :atividadeId AND c.comentario_raiz_id IS NULL AND "
              + VISIVEL,
      nativeQuery = true)
  Page<Comentario> buscarRaizesPorAtividade(
      @Param("atividadeId") UUID atividadeId, @Param("leitor") UUID leitor, Pageable pageable);

  List<Comentario> findByAtividadeIdAndComentarioRaizIdIsNull(UUID atividadeId);

  /** Total visível (raiz + respostas) de uma atividade, para o campo `totalComentarios`. */
  @Query(
      value = "SELECT count(*) FROM comentario c WHERE c.atividade_id = :atividadeId AND " + VISIVEL,
      nativeQuery = true)
  long contarVisiveisPorAtividade(
      @Param("atividadeId") UUID atividadeId, @Param("leitor") UUID leitor);

  /** Quantas respostas visíveis uma raiz tem, para o campo {@code totalRespostas} do contrato. */
  @Query(
      value =
          "SELECT count(*) FROM comentario c WHERE c.comentario_raiz_id = :raizId AND " + VISIVEL,
      nativeQuery = true)
  long contarRespostasVisiveis(@Param("raizId") UUID raizId, @Param("leitor") UUID leitor);

  /** O comentário existe e é visível para o leitor (responder, listar respostas, denunciar). */
  @Query(
      value = "SELECT EXISTS (SELECT 1 FROM comentario c WHERE c.id = :id AND " + VISIVEL + ")",
      nativeQuery = true)
  boolean visivelPara(@Param("id") UUID comentarioId, @Param("leitor") UUID leitor);

  /**
   * Respostas visíveis de uma raiz (RF-SOC-18), paginadas por cursor opaco em vez de offset:
   * decodifica {@code cursor} (nulo na primeira página) em {@code (criadoEm, id)} e delega à query
   * nativa que monta o {@code WHERE (criado_em, id) > (?, ?)}.
   */
  default List<Comentario> buscarRespostasPorRaiz(
      UUID comentarioRaizId, UUID leitor, String cursor, int limite) {
    CursorComentario decodificado = cursor == null ? null : CursorComentario.decodificar(cursor);
    return buscarRespostasPorRaizNativa(
        comentarioRaizId,
        leitor,
        decodificado == null ? null : decodificado.criadoEm(),
        decodificado == null ? null : decodificado.id(),
        limite);
  }

  @Query(
      value =
          """
          SELECT c.*
            FROM comentario c
           WHERE c.comentario_raiz_id = :raizId
             AND (
               CAST(:cursorCriadoEm AS timestamptz) IS NULL
               OR (c.criado_em, c.id) > (CAST(:cursorCriadoEm AS timestamptz), CAST(:cursorId AS uuid))
             )
             AND """
              + VISIVEL
              + """
           ORDER BY c.criado_em ASC, c.id ASC
           LIMIT :limite
          """,
      nativeQuery = true)
  List<Comentario> buscarRespostasPorRaizNativa(
      @Param("raizId") UUID raizId,
      @Param("leitor") UUID leitor,
      @Param("cursorCriadoEm") Instant cursorCriadoEm,
      @Param("cursorId") UUID cursorId,
      @Param("limite") int limite);
}

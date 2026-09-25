package br.com.leai.social.feed.repository;

import br.com.leai.social.feed.entity.Atividade;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Acesso a {@link Atividade}. {@link #buscarFeed} é a única query de negócio deste repositório:
 * as demais operações (persistir, ler por id, listar por autor) já vêm de {@link JpaRepository}.
 */
public interface AtividadeRepository extends JpaRepository<Atividade, UUID> {

  /**
   * Feed de quem {@code usuarioId} segue (RF-SOC-08): junta {@code atividade} com as views
   * cross-schema {@code identidade.v_seguimento_aceito_v1} (seguimentos aceitos, já excluindo
   * contas suspensas/em exclusão) e {@code acervo.v_livro_referencia_v1} (livro ainda ativo no
   * acervo), ordenado pelo mesmo critério do índice {@code atividade_feed_autor_idx}.
   *
   * <p>{@code LIMIT}/{@code OFFSET} nascem do {@link Pageable} via parâmetro, nunca concatenação
   * de string; a contagem total vem de uma {@code countQuery} equivalente (mais simples de manter
   * que {@code COUNT(*) OVER()} + desempacotar a janela na camada Java).
   */
  @Query(
      value =
          """
          SELECT a.*
            FROM atividade a
            JOIN identidade.v_seguimento_aceito_v1 seg ON seg.seguido_id = a.autor_id
            JOIN acervo.v_livro_referencia_v1 livro ON livro.livro_id = a.livro_id
           WHERE a.ativo = true
             AND livro.ativo = true
             AND seg.seguidor_id = :usuarioId
           ORDER BY a.criado_em DESC, a.id DESC
          """,
      countQuery =
          """
          SELECT count(*)
            FROM atividade a
            JOIN identidade.v_seguimento_aceito_v1 seg ON seg.seguido_id = a.autor_id
            JOIN acervo.v_livro_referencia_v1 livro ON livro.livro_id = a.livro_id
           WHERE a.ativo = true
             AND livro.ativo = true
             AND seg.seguidor_id = :usuarioId
          """,
      nativeQuery = true)
  Page<Atividade> buscarFeed(@Param("usuarioId") UUID usuarioId, Pageable pageable);

  /**
   * Mesmo critério de visibilidade de {@link #buscarFeed}, para uma única atividade: usada pelo
   * detalhe (RN-08/RN-09) para decidir entre 200 e o 404 disfarçado (nunca 403), sem duplicar a
   * regra em dois lugares nem trazer a página inteira só para checar um id.
   */
  @Query(
      value =
          """
          SELECT EXISTS (
            SELECT 1
              FROM atividade a
              JOIN identidade.v_seguimento_aceito_v1 seg ON seg.seguido_id = a.autor_id
              JOIN acervo.v_livro_referencia_v1 livro ON livro.livro_id = a.livro_id
             WHERE a.id = :atividadeId
               AND a.ativo = true
               AND livro.ativo = true
               AND seg.seguidor_id = :usuarioId
          )
          """,
      nativeQuery = true)
  boolean visivelNoFeed(@Param("usuarioId") UUID usuarioId, @Param("atividadeId") UUID atividadeId);
}

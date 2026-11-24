package br.com.leai.social.feed.repository;

import br.com.leai.social.feed.entity.CurtidaAtividade;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Acesso a {@link CurtidaAtividade}: existência, contagem e leitura por par (atividade, usuário). */
public interface CurtidaAtividadeRepository extends JpaRepository<CurtidaAtividade, UUID> {

  boolean existsByAtividadeIdAndUsuarioId(UUID atividadeId, UUID usuarioId);

  Optional<CurtidaAtividade> findByAtividadeIdAndUsuarioId(UUID atividadeId, UUID usuarioId);

  long countByAtividadeId(UUID atividadeId);

  /**
   * F-MOD-OPC: curtidas que o leitor vê, sem as de conta suspensa ou em exclusão (fora de {@code
   * identidade.v_perfil_referencia_v1}); a do próprio leitor sempre conta. A curtida continua
   * gravada e volta a contar na reativação.
   */
  @Query(
      value =
          "SELECT count(*) FROM curtida_atividade c WHERE c.atividade_id = :atividadeId"
              + " AND (c.usuario_id = :leitor OR EXISTS (SELECT 1"
              + " FROM identidade.v_perfil_referencia_v1 p WHERE p.id = c.usuario_id))",
      nativeQuery = true)
  long contarVisiveisPorAtividade(
      @Param("atividadeId") UUID atividadeId, @Param("leitor") UUID leitor);
}

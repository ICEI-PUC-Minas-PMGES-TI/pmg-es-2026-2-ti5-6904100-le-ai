package br.com.leai.social.feed;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Acesso a {@link CurtidaAtividade}: existência, contagem e leitura por par (atividade, usuário). */
public interface CurtidaAtividadeRepository extends JpaRepository<CurtidaAtividade, UUID> {

  boolean existsByAtividadeIdAndUsuarioId(UUID atividadeId, UUID usuarioId);

  Optional<CurtidaAtividade> findByAtividadeIdAndUsuarioId(UUID atividadeId, UUID usuarioId);

  long countByAtividadeId(UUID atividadeId);
}

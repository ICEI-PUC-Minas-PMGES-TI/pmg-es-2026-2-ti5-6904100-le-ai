package br.com.leai.social.feed;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Curtida de um leitor em uma {@link Atividade} (RF-SOC-13/14). Mapeia {@code curtida_atividade}
 * da migration {@code V20260916024928__cria_modelo_social.sql}; a unicidade (atividade_id,
 * usuario_id) é garantida por constraint no banco, não por esta classe.
 *
 * <p>{@code atividadeId} fica como coluna simples (sem {@code @ManyToOne}): a task 2 não precisa
 * navegar de curtida para atividade, e evitar a associação mantém a entidade e as queries de
 * contagem/existência simples.
 */
@Entity
@Table(name = "curtida_atividade")
public class CurtidaAtividade {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "atividade_id", nullable = false, updatable = false)
  private UUID atividadeId;

  @Column(name = "usuario_id", nullable = false, updatable = false)
  private UUID usuarioId;

  @Column(name = "criado_em", nullable = false, updatable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. Não usar no código de domínio: prefira {@link #nova}. */
  protected CurtidaAtividade() {}

  private CurtidaAtividade(UUID id, UUID atividadeId, UUID usuarioId, Instant criadoEm) {
    this.id = id;
    this.atividadeId = atividadeId;
    this.usuarioId = usuarioId;
    this.criadoEm = criadoEm;
  }

  public static CurtidaAtividade nova(UUID atividadeId, UUID usuarioId) {
    return new CurtidaAtividade(UUID.randomUUID(), atividadeId, usuarioId, Instant.now());
  }

  public UUID id() {
    return id;
  }

  public UUID atividadeId() {
    return atividadeId;
  }

  public UUID usuarioId() {
    return usuarioId;
  }

  public Instant criadoEm() {
    return criadoEm;
  }
}

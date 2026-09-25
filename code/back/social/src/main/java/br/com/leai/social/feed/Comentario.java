package br.com.leai.social.feed;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Comentário (raiz ou resposta) em uma {@link Atividade} (RF-SOC-15..18). Mapeia {@code
 * comentario} da migration {@code V20260916024928__cria_modelo_social.sql}.
 *
 * <p>{@code comentarioRaizId} fica como coluna {@code UUID} simples, sem {@code @ManyToOne}: a
 * integridade de "a raiz pertence à mesma atividade" já é garantida pela FK composta {@code
 * comentario_raiz_mesma_atividade_fk} e pelo trigger {@code validar_comentario_raiz} no banco, não
 * precisando de navegação JPA aqui.
 */
@Entity
@Table(name = "comentario")
public class Comentario {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "atividade_id", nullable = false, updatable = false)
  private UUID atividadeId;

  @Column(name = "autor_id", nullable = false, updatable = false)
  private UUID autorId;

  /** Nulo em comentário-raiz; aponta para a raiz em uma resposta. */
  @Column(name = "comentario_raiz_id", updatable = false)
  private UUID comentarioRaizId;

  /** Autor do alvo contextual da resposta. Nulo em raiz. */
  @Column(name = "respondido_usuario_id", updatable = false)
  private UUID respondidoUsuarioId;

  /**
   * Id do comentário-alvo da resposta (pode ser outra resposta, não só a raiz). Nulo em raiz.
   * Coluna simples, sem {@code @ManyToOne}: a FK composta {@code
   * comentario_respondido_mesma_atividade_fk} (migration {@code
   * V20260925140000__adiciona_comentario_respondido_id.sql}) já garante que o alvo pertence à
   * mesma atividade.
   */
  @Column(name = "comentario_respondido_id", updatable = false)
  private UUID comentarioRespondidoId;

  @Column(name = "texto", nullable = false)
  private String texto;

  @Column(name = "criado_em", nullable = false, updatable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em")
  private Instant atualizadoEm;

  /** Exigido pelo JPA. Não usar no código de domínio: prefira {@link #novo}. */
  protected Comentario() {}

  private Comentario(
      UUID id,
      UUID atividadeId,
      UUID autorId,
      UUID comentarioRaizId,
      UUID respondidoUsuarioId,
      UUID comentarioRespondidoId,
      String texto,
      Instant criadoEm) {
    this.id = id;
    this.atividadeId = atividadeId;
    this.autorId = autorId;
    this.comentarioRaizId = comentarioRaizId;
    this.respondidoUsuarioId = respondidoUsuarioId;
    this.comentarioRespondidoId = comentarioRespondidoId;
    this.texto = texto;
    this.criadoEm = criadoEm;
  }

  /**
   * Cria um comentário-raiz ou resposta pronto para persistir. {@code comentarioRaizId} nulo
   * identifica um comentário-raiz; caso contrário é uma resposta, e {@code respondidoUsuarioId}/
   * {@code comentarioRespondidoId} devem vir preenchidos pelo chamador (derivados do
   * comentário-alvo, nunca confiados ao cliente).
   */
  public static Comentario novo(
      UUID atividadeId,
      UUID autorId,
      UUID comentarioRaizId,
      UUID respondidoUsuarioId,
      UUID comentarioRespondidoId,
      String texto) {
    return new Comentario(
        UUID.randomUUID(),
        atividadeId,
        autorId,
        comentarioRaizId,
        respondidoUsuarioId,
        comentarioRespondidoId,
        texto,
        Instant.now());
  }

  public UUID id() {
    return id;
  }

  public UUID atividadeId() {
    return atividadeId;
  }

  public UUID autorId() {
    return autorId;
  }

  public UUID comentarioRaizId() {
    return comentarioRaizId;
  }

  public boolean ehRaiz() {
    return comentarioRaizId == null;
  }

  public UUID respondidoUsuarioId() {
    return respondidoUsuarioId;
  }

  public UUID comentarioRespondidoId() {
    return comentarioRespondidoId;
  }

  public String texto() {
    return texto;
  }

  public Instant criadoEm() {
    return criadoEm;
  }

  public Instant atualizadoEm() {
    return atualizadoEm;
  }
}

package br.com.leai.social.feed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Fato imutável do feed social (RF-SOC-08..12): leitura iniciada/retomada/concluída/abandonada ou
 * resenha publicada, com o snapshot de autor e livro capturado no momento do evento — o feed nunca
 * hidrata autor/livro em tempo real (RN-simplicidade do desenho de eventos).
 *
 * <p>Mapeia a tabela {@code atividade} da migration {@code
 * V20260916024928__cria_modelo_social.sql}. {@code ativo} controla a exclusão lógica (ex.: livro
 * removido do acervo) sem apagar a linha, preservando o {@code event_id} único usado pela
 * idempotência de ingestão.
 */
@Entity
@Table(name = "atividade")
public class Atividade {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "autor_id", nullable = false, updatable = false)
  private UUID autorId;

  @Column(name = "tipo", nullable = false, updatable = false)
  private TipoAtividade tipo;

  @Column(name = "livro_id", nullable = false, updatable = false)
  private UUID livroId;

  @Column(name = "event_id", nullable = false, updatable = false)
  private UUID eventId;

  @Column(name = "chave_fato", nullable = false, updatable = false)
  private String chaveFato;

  /** {@code leitura} ou {@code resenha} (CHECK {@code atividade_origem_tipo_valido}). */
  @Column(name = "origem_tipo", nullable = false, updatable = false)
  private String origemTipo;

  @Column(name = "origem_id", nullable = false, updatable = false)
  private UUID origemId;

  @Column(name = "snap_usuario_nome", nullable = false, updatable = false)
  private String snapUsuarioNome;

  @Column(name = "snap_usuario_username", nullable = false, updatable = false)
  private String snapUsuarioUsername;

  @Column(name = "snap_usuario_avatar", updatable = false)
  private String snapUsuarioAvatar;

  @Column(name = "snap_livro_titulo", nullable = false, updatable = false)
  private String snapLivroTitulo;

  @Column(name = "snap_livro_autor", nullable = false, updatable = false)
  private String snapLivroAutor;

  @Column(name = "snap_livro_capa", updatable = false)
  private String snapLivroCapa;

  @Column(name = "ativo", nullable = false)
  private boolean ativo;

  @Column(name = "criado_em", nullable = false, updatable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. Não usar no código de domínio: prefira {@link #nova}. */
  protected Atividade() {}

  private Atividade(
      UUID id,
      UUID autorId,
      TipoAtividade tipo,
      UUID livroId,
      UUID eventId,
      String chaveFato,
      String origemTipo,
      UUID origemId,
      String snapUsuarioNome,
      String snapUsuarioUsername,
      String snapUsuarioAvatar,
      String snapLivroTitulo,
      String snapLivroAutor,
      String snapLivroCapa,
      Instant criadoEm) {
    this.id = id;
    this.autorId = autorId;
    this.tipo = tipo;
    this.livroId = livroId;
    this.eventId = eventId;
    this.chaveFato = chaveFato;
    this.origemTipo = origemTipo;
    this.origemId = origemId;
    this.snapUsuarioNome = snapUsuarioNome;
    this.snapUsuarioUsername = snapUsuarioUsername;
    this.snapUsuarioAvatar = snapUsuarioAvatar;
    this.snapLivroTitulo = snapLivroTitulo;
    this.snapLivroAutor = snapLivroAutor;
    this.snapLivroCapa = snapLivroCapa;
    this.ativo = true;
    this.criadoEm = criadoEm;
  }

  /**
   * Cria uma atividade pronta para persistir, com o identificador nascendo aqui (como em {@code
   * Usuario.novo}) e não por default do banco.
   */
  public static Atividade nova(
      UUID autorId,
      TipoAtividade tipo,
      UUID livroId,
      UUID eventId,
      String chaveFato,
      String origemTipo,
      UUID origemId,
      String snapUsuarioNome,
      String snapUsuarioUsername,
      String snapUsuarioAvatar,
      String snapLivroTitulo,
      String snapLivroAutor,
      String snapLivroCapa) {
    return new Atividade(
        UUID.randomUUID(),
        autorId,
        tipo,
        livroId,
        eventId,
        chaveFato,
        origemTipo,
        origemId,
        snapUsuarioNome,
        snapUsuarioUsername,
        snapUsuarioAvatar,
        snapLivroTitulo,
        snapLivroAutor,
        snapLivroCapa,
        Instant.now());
  }

  public UUID id() {
    return id;
  }

  public UUID autorId() {
    return autorId;
  }

  public TipoAtividade tipo() {
    return tipo;
  }

  public UUID livroId() {
    return livroId;
  }

  public UUID eventId() {
    return eventId;
  }

  public String chaveFato() {
    return chaveFato;
  }

  public String origemTipo() {
    return origemTipo;
  }

  public UUID origemId() {
    return origemId;
  }

  public String snapUsuarioNome() {
    return snapUsuarioNome;
  }

  public String snapUsuarioUsername() {
    return snapUsuarioUsername;
  }

  public String snapUsuarioAvatar() {
    return snapUsuarioAvatar;
  }

  public String snapLivroTitulo() {
    return snapLivroTitulo;
  }

  public String snapLivroAutor() {
    return snapLivroAutor;
  }

  public String snapLivroCapa() {
    return snapLivroCapa;
  }

  public boolean ativo() {
    return ativo;
  }

  public Instant criadoEm() {
    return criadoEm;
  }
}

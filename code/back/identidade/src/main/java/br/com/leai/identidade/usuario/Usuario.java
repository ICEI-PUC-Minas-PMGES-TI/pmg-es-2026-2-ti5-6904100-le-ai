package br.com.leai.identidade.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Conta de leitor (RF-AUT-01). Primeira entidade do serviço.
 *
 * <p>Escopo deliberadamente mínimo: é o esqueleto de autenticação de P0-NAV. Avatar, bio,
 * privacidade de perfil e seguidores chegam com F-PERFIL; token de renovação, recuperação de senha
 * e papel de administrador chegam com F-AUT.
 *
 * <p>E-mail e username são guardados como o leitor digitou, para exibição. A unicidade ignora caixa
 * e é garantida por índice funcional no banco, não por esta classe: o 409 do cadastro nasce da
 * violação de constraint, que é a única checagem livre de corrida.
 *
 * <p>O schema vem de {@code hibernate.default_schema} no {@code application.yml}, por isso a anotação
 * não o repete: mudar {@code DB_SCHEMA} não deve exigir recompilar.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "email", nullable = false, length = 254)
  private String email;

  @Column(name = "username", nullable = false, length = 30)
  private String username;

  @Column(name = "nome_exibicao", nullable = false, length = 60)
  private String nomeExibicao;

  @Column(name = "data_nascimento", nullable = false)
  private LocalDate dataNascimento;

  /** Hash bcrypt, com sal embutido (RNF-SEC-09). Nunca a senha em claro. */
  @Column(name = "senha_hash", nullable = false, length = 255)
  private String senhaHash;

  @Column(name = "criado_em", nullable = false, updatable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. Não usar no código de domínio: prefira {@link #novo}. */
  protected Usuario() {}

  private Usuario(
      UUID id,
      String email,
      String username,
      String nomeExibicao,
      LocalDate dataNascimento,
      String senhaHash,
      Instant criadoEm) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.nomeExibicao = nomeExibicao;
    this.dataNascimento = dataNascimento;
    this.senhaHash = senhaHash;
    this.criadoEm = criadoEm;
  }

  /**
   * Cria uma conta pronta para persistir. O identificador nasce aqui, e não por default do banco,
   * para a entidade ter identidade antes do insert e o cadastro poder responder sem reler a linha.
   *
   * @param senhaHash já hasheado pelo chamador. Este construtor nunca recebe senha em claro.
   */
  public static Usuario novo(
      String email,
      String username,
      String nomeExibicao,
      LocalDate dataNascimento,
      String senhaHash) {
    return new Usuario(
        UUID.randomUUID(), email, username, nomeExibicao, dataNascimento, senhaHash, Instant.now());
  }

  public UUID id() {
    return id;
  }

  public String email() {
    return email;
  }

  public String username() {
    return username;
  }

  public String nomeExibicao() {
    return nomeExibicao;
  }

  public LocalDate dataNascimento() {
    return dataNascimento;
  }

  public String senhaHash() {
    return senhaHash;
  }

  public Instant criadoEm() {
    return criadoEm;
  }
}

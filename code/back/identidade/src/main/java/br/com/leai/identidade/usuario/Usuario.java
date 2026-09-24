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

  // Perfil (F-PERFIL). Colunas da migration de 15/09; todas têm default no banco, por isso não
  // entram no insert do cadastro.
  @Column(name = "biografia")
  private String biografia;

  @Column(name = "avatar_url")
  private String avatarUrl;

  /** `publicId` do Cloudinary; vem junto de `avatarUrl`, nunca sozinho. */
  @Column(name = "avatar_asset_id")
  private String avatarAssetId;

  /** `publico` ou `privado` (CHECK `usuario_privacidade_valida`). */
  @Column(name = "privacidade", nullable = false)
  private String privacidade = "publico";

  // Só leitura aqui: quem mantém é o SQL de seguir e deixar de seguir, com a linha travada. Se o
  // Hibernate regravasse o valor carregado, uma troca de senha simultânea desfaria um incremento.
  @Column(name = "qtd_seguidores", nullable = false, insertable = false, updatable = false)
  private int qtdSeguidores;

  @Column(name = "qtd_seguidos", nullable = false, insertable = false, updatable = false)
  private int qtdSeguidos;

  /** Preenchido pelo default do banco no insert; só as escritas desta classe o avançam. */
  @Column(name = "atualizado_em", nullable = false, insertable = false)
  private Instant atualizadoEm;

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

  public String biografia() {
    return biografia;
  }

  public String avatarUrl() {
    return avatarUrl;
  }

  public String avatarAssetId() {
    return avatarAssetId;
  }

  public String privacidade() {
    return privacidade;
  }

  public boolean ehPrivado() {
    return "privado".equals(privacidade());
  }

  public int qtdSeguidores() {
    return qtdSeguidores;
  }

  public int qtdSeguidos() {
    return qtdSeguidos;
  }

  /**
   * Substitui os campos editáveis do perfil (RF-SOC-01/04). O avatar vem validado pelo chamador,
   * URL e `publicId` juntos ou os dois nulos. Mudar para privado não mexe nos seguidores.
   */
  public void editarPerfil(
      String nomeExibicao,
      String biografia,
      String avatarUrl,
      String avatarAssetId,
      String privacidade) {
    this.nomeExibicao = nomeExibicao;
    this.biografia = biografia;
    this.avatarUrl = avatarUrl;
    this.avatarAssetId = avatarAssetId;
    this.privacidade = privacidade;
    this.atualizadoEm = Instant.now();
  }

  /**
   * Troca o hash da senha (RF-AUT-05).
   *
   * @param novoHash já hasheado pelo chamador. Este método nunca recebe senha em claro.
   */
  public void trocarSenha(String novoHash) {
    this.senhaHash = novoHash;
    this.atualizadoEm = Instant.now();
  }
}

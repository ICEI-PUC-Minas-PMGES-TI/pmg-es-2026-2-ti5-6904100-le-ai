package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.config.AppProperties;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.time.LocalDate;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Cria ou atualiza a conta administradora a partir de {@code ADMIN_EMAIL} e {@code
 * ADMIN_PASSWORD}, no arranque (RF-AUT-08, RNF-SEC-31; decisão de 24/09/2026).
 *
 * <p>O admin entra pelo mesmo {@code POST /auth/login} de qualquer leitor; o que muda é a claim
 * {@code papel} do token ({@link ContaAdministradora}). Não existe cadastro de admin nem rota que
 * conceda o papel: ele pertence à linha cujo e-mail é o do ambiente.
 *
 * <p><b>O ambiente manda na senha.</b> Se a senha do ambiente não confere com o hash gravado, o
 * hash é trocado e as renovações da conta caem: trocar {@code ADMIN_PASSWORD} e reiniciar é o
 * jeito de rotacionar a credencial. Pelo mesmo motivo a conta não troca nem recupera senha pela
 * API. Se alguém se cadastrou antes com o e-mail do admin, a linha é assumida e a senha dela passa
 * a ser a do ambiente, então quem a criou perde o acesso.
 *
 * <p><b>Configuração errada não sobe.</b> Só uma das duas variáveis, ou senha fraca, derruba o
 * arranque em vez de deixar o serviço de pé com um admin frágil ou sem admin sem ninguém notar.
 * As duas vazias é legítimo (ambiente de desenvolvimento): sobe sem admin, com WARN.
 */
@Component
public class ProvisionamentoDoAdmin implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(ProvisionamentoDoAdmin.class);

  /** Reservado: o cadastro recusa este username para qualquer outra conta. */
  static final String USERNAME = "admin";

  static final String NOME_DE_EXIBICAO = "Administração Lê Ai";

  /** A coluna é obrigatória e a conta não é de pessoa; qualquer data passada serve. */
  static final LocalDate NASCIMENTO = LocalDate.of(1970, 1, 1);

  /** Acima do mínimo de leitor (8), porque RNF-SEC-31 pede credencial forte para o admin. */
  static final int TAMANHO_MINIMO_DA_SENHA = 16;

  private final AppProperties propriedades;
  private final UsuarioRepositorio repositorio;
  private final PasswordEncoder codificadorDeSenha;
  private final PoliticaDeSenha politicaDeSenha;
  private final GestorDeRenovacao gestorDeRenovacao;
  private final ContaAdministradora conta;
  private final TransactionTemplate transacao;

  public ProvisionamentoDoAdmin(
      AppProperties propriedades,
      UsuarioRepositorio repositorio,
      PasswordEncoder codificadorDeSenha,
      PoliticaDeSenha politicaDeSenha,
      GestorDeRenovacao gestorDeRenovacao,
      ContaAdministradora conta,
      TransactionTemplate transacao) {
    this.propriedades = propriedades;
    this.repositorio = repositorio;
    this.codificadorDeSenha = codificadorDeSenha;
    this.politicaDeSenha = politicaDeSenha;
    this.gestorDeRenovacao = gestorDeRenovacao;
    this.conta = conta;
    this.transacao = transacao;
  }

  @Override
  public void run(ApplicationArguments argumentos) {
    provisionar(propriedades.adminEmail(), propriedades.adminPassword());
  }

  /** Visível para o teste de integração simular a rotação da senha sem reiniciar o contexto. */
  void provisionar(String email, String senha) {
    boolean temEmail = email != null && !email.isBlank();
    boolean temSenha = senha != null && !senha.isBlank();
    if (!temEmail && !temSenha) {
      log.warn("Conta administradora não provisionada: ADMIN_EMAIL e ADMIN_PASSWORD vazios");
      return;
    }
    if (!temEmail || !temSenha) {
      throw new IllegalStateException(
          "ADMIN_EMAIL e ADMIN_PASSWORD precisam vir juntos (RNF-SEC-31)");
    }
    exigirSenhaForte(senha);

    Usuario admin = transacao.execute(status -> gravar(email.trim(), senha));
    conta.definir(admin.id());
    log.info("Conta administradora provisionada: usuário {}", admin.id());
  }

  static void exigirSenhaForte(String senha, PoliticaDeSenha politica) {
    if (senha.length() < TAMANHO_MINIMO_DA_SENHA || senha.length() > 72) {
      throw new IllegalStateException(
          "ADMIN_PASSWORD precisa ter de "
              + TAMANHO_MINIMO_DA_SENHA
              + " a 72 caracteres (RNF-SEC-31)");
    }
    try {
      politica.recusarSeComum(senha);
    } catch (ErroDeNegocioException comum) {
      throw new IllegalStateException(
          "ADMIN_PASSWORD está na lista de senhas comuns (RNF-SEC-27/31)");
    }
  }

  private void exigirSenhaForte(String senha) {
    exigirSenhaForte(senha, politicaDeSenha);
  }

  private Usuario gravar(String email, String senha) {
    Optional<Usuario> existente = repositorio.findByEmailIgnoreCase(email);
    if (existente.isPresent()) {
      Usuario admin = repositorio.buscarParaAtualizar(existente.get().id()).orElseThrow();
      if (!codificadorDeSenha.matches(senha, admin.senhaHash())) {
        admin.trocarSenha(codificadorDeSenha.encode(senha));
        int revogadas = gestorDeRenovacao.revogarAtivos(admin.id());
        log.info(
            "Senha da conta administradora redefinida pelo ambiente; {} renovação(ões)"
                + " revogada(s)",
            revogadas);
      }
      return admin;
    }

    if (repositorio.existsByUsernameIgnoreCase(USERNAME)) {
      // Outra conta ficou com o username reservado (e-mail do admin trocado, por exemplo).
      // Resolver exige decisão humana: renomear a antiga ou voltar o e-mail.
      throw new IllegalStateException(
          "Username '" + USERNAME + "' já pertence a outra conta; admin não provisionado");
    }
    return repositorio.saveAndFlush(
        Usuario.novo(
            email, USERNAME, NOME_DE_EXIBICAO, NASCIMENTO, codificadorDeSenha.encode(senha)));
  }
}

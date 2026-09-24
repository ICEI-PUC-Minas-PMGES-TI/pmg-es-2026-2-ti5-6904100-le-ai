package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cadastro, login, renovação, logout, troca de senha e leitura da identidade do token (RF-AUT-01,
 * 02, 03, 05 e 06).
 */
@Service
public class ServicoDeAutenticacao {

  /**
   * Mensagem única para os três casos de falha no login: usuário inexistente, e-mail que não
   * confere e senha errada. Distinguir qualquer um deles transformaria o login num oráculo de
   * quem tem conta (RNF-SEC-28).
   */
  static final String CREDENCIAL_INVALIDA = "E-mail, nome de usuário ou senha incorretos.";

  /** Cópia de alterar-senha.md §4.2. */
  static final String SENHA_ATUAL_INCORRETA = "Senha atual incorreta.";

  static final String SENHA_DO_ADMIN =
      "A senha da conta administradora é definida pelo ambiente e não muda por aqui.";

  private static final Logger log = LoggerFactory.getLogger(ServicoDeAutenticacao.class);

  private final UsuarioRepositorio repositorio;
  private final PasswordEncoder codificadorDeSenha;
  private final EmissorDeToken emissorDeToken;
  private final ControleDeTentativas controleDeTentativas;
  private final PoliticaDeSenha politicaDeSenha;
  private final GestorDeRenovacao gestorDeRenovacao;
  private final ContaAdministradora contaAdministradora;

  /**
   * Hash descartável, calculado uma vez no arranque. Serve para o login gastar o mesmo tempo
   * quando o usuário não existe: sem isso, a resposta voltaria na hora por não ter hash para
   * comparar, e a diferença de tempo revelaria quem tem conta, contornando a mensagem única.
   */
  private final String hashDeComparacaoFalsa;

  public ServicoDeAutenticacao(
      UsuarioRepositorio repositorio,
      PasswordEncoder codificadorDeSenha,
      EmissorDeToken emissorDeToken,
      ControleDeTentativas controleDeTentativas,
      PoliticaDeSenha politicaDeSenha,
      GestorDeRenovacao gestorDeRenovacao,
      ContaAdministradora contaAdministradora) {
    this.repositorio = repositorio;
    this.codificadorDeSenha = codificadorDeSenha;
    this.emissorDeToken = emissorDeToken;
    this.controleDeTentativas = controleDeTentativas;
    this.politicaDeSenha = politicaDeSenha;
    this.gestorDeRenovacao = gestorDeRenovacao;
    this.contaAdministradora = contaAdministradora;
    this.hashDeComparacaoFalsa = codificadorDeSenha.encode("conta-inexistente");
  }

  @Transactional
  public UsuarioResposta cadastrar(CadastroRequisicao requisicao) {
    String email = requisicao.email().trim();
    String username = requisicao.username().trim();

    // Antes de qualquer consulta: a política não depende do banco e não revela nada sobre
    // contas existentes.
    politicaDeSenha.recusarSeComum(requisicao.senha());

    // Checagem antecipada para a mensagem ser específica. Ela não substitui o índice único:
    // entre esta consulta e o insert cabe outra requisição, e quem decide é o banco.
    // O username do admin é reservado mesmo antes de a conta existir: sem isto, um leitor que
    // o pegasse primeiro impediria o provisionamento e se passaria pela administração.
    if (username.equalsIgnoreCase(ProvisionamentoDoAdmin.USERNAME)
        || repositorio.existsByUsernameIgnoreCase(username)) {
      throw conflitoDeUsername();
    }
    if (repositorio.existsByEmailIgnoreCase(email)) {
      throw conflitoDeEmail();
    }

    Usuario usuario =
        Usuario.novo(
            email,
            username,
            requisicao.displayName().trim(),
            requisicao.dataNascimento(),
            codificadorDeSenha.encode(requisicao.senha()));

    try {
      return UsuarioResposta.de(repositorio.saveAndFlush(usuario));
    } catch (DataIntegrityViolationException corrida) {
      // Perdeu a corrida para outro cadastro simultâneo. Qual dos dois índices estourou não é
      // distinguível aqui sem ler a mensagem do driver, então a resposta fica genérica.
      throw new ErroDeNegocioException(
          CodigoErro.CONFLITO, "Esse e-mail ou nome de usuário já está em uso.");
    }
  }

  /** Não é mais só leitura: o login grava o token de renovação que emite. */
  @Transactional
  public SessaoResposta entrar(LoginRequisicao requisicao) {
    String identificador = requisicao.identificador().trim();

    // Antes de qualquer consulta ou comparação de hash: enquanto o bloqueio vale, nem a senha
    // certa entra (RNF-SEC-29). Sai 429, e não 401, porque a tela trata bloqueio como alerta e
    // credencial inválida como erro — são banners diferentes (login.md §4.2 e §4.3).
    controleDeTentativas.verificar(identificador);

    Optional<Usuario> encontrado =
        repositorio.findByEmailIgnoreCaseOrUsernameIgnoreCase(identificador, identificador);

    String hash = encontrado.map(Usuario::senhaHash).orElse(hashDeComparacaoFalsa);
    boolean senhaConfere = codificadorDeSenha.matches(requisicao.senha(), hash);

    if (encontrado.isEmpty() || !senhaConfere) {
      controleDeTentativas.registrarFalha(identificador);
      throw new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, CREDENCIAL_INVALIDA);
    }

    controleDeTentativas.registrarSucesso(identificador);
    return sessaoPara(encontrado.get());
  }

  /**
   * Troca um token de renovação válido por um par novo, revogando o apresentado (RF-AUT-03,
   * RNF-SEC-30). Rotação e emissão na mesma transação: se a emissão falhar, o token antigo
   * continua valendo.
   */
  @Transactional
  public SessaoResposta renovar(RefreshRequisicao requisicao) {
    UUID usuarioId = gestorDeRenovacao.consumir(requisicao.refreshToken());
    Usuario usuario =
        repositorio
            .findById(usuarioId)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(
                        CodigoErro.NAO_AUTENTICADO, GestorDeRenovacao.SESSAO_EXPIRADA));
    return sessaoPara(usuario);
  }

  /** Encerra a sessão revogando o token de renovação dela (RF-AUT-06, RNF-SEC-30). */
  @Transactional
  public void sair(RefreshRequisicao requisicao) {
    gestorDeRenovacao.revogar(requisicao.refreshToken());
  }

  /**
   * Troca a senha do dono do token (RF-AUT-05) e derruba todas as renovações da conta
   * (RNF-SEC-30), inclusive a do aparelho que pediu a troca: o contrato não recebe o token de
   * renovação dele, então quem quiser continuar conectado entra de novo com a senha nova.
   *
   * <p>A política roda antes da senha atual, porque não depende do banco nem gasta bcrypt. A
   * leitura da conta trava a linha: duas trocas simultâneas com a mesma senha atual não passam
   * as duas.
   */
  @Transactional
  public void alterarSenha(UUID usuarioId, AlterarSenhaRequisicao requisicao) {
    if (contaAdministradora.eh(usuarioId)) {
      // A senha do admin é a do ambiente; trocada aqui, voltaria no próximo arranque.
      throw new ErroDeNegocioException(CodigoErro.ACESSO_NEGADO, SENHA_DO_ADMIN);
    }
    politicaDeSenha.recusarSeComum(requisicao.novaSenha(), CodigoErro.ENTIDADE_NAO_PROCESSAVEL);

    Usuario usuario =
        repositorio
            .buscarParaAtualizar(usuarioId)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(
                        CodigoErro.NAO_AUTENTICADO, GestorDeRenovacao.SESSAO_EXPIRADA));

    if (!codificadorDeSenha.matches(requisicao.senhaAtual(), usuario.senhaHash())) {
      // RNF-SEC-35: falha de autenticação registrada; RNF-SEC-36: nunca a senha tentada.
      log.warn("Troca de senha recusada: senha atual incorreta para o usuário {}", usuarioId);
      // 422 e não 401: o token é válido, e um 401 aqui faria o cliente tentar renovar a sessão.
      throw new ErroDeNegocioException(
          CodigoErro.ENTIDADE_NAO_PROCESSAVEL, SENHA_ATUAL_INCORRETA);
    }

    usuario.trocarSenha(codificadorDeSenha.encode(requisicao.novaSenha()));
    int revogadas = gestorDeRenovacao.revogarAtivos(usuarioId);
    log.info(
        "Senha alterada pelo usuário {}; {} renovação(ões) ativa(s) revogada(s)",
        usuarioId,
        revogadas);
  }

  /** Resposta ao reuso de token revogado, depois que a idempotência descartou o replay. */
  public void encerrarRenovacoesPorReuso(UUID usuarioId) {
    gestorDeRenovacao.revogarPorReuso(usuarioId);
  }

  private SessaoResposta sessaoPara(Usuario usuario) {
    return SessaoResposta.de(
        emissorDeToken.emitir(
            usuario.id(), usuario.username(), contaAdministradora.papelDe(usuario.id())),
        emissorDeToken.validadeEmSegundos(),
        gestorDeRenovacao.emitir(usuario.id()));
  }

  /**
   * Identidade do portador do token. Lê do banco, e não das claims, porque o nome de exibição
   * pode ter mudado depois da emissão e o token vale 15 minutos.
   */
  @Transactional(readOnly = true)
  public UsuarioResposta doToken(UUID usuarioId) {
    return repositorio
        .findById(usuarioId)
        .map(UsuarioResposta::de)
        // Token válido de conta que não existe mais: a sessão acabou, não é erro de permissão.
        .orElseThrow(
            () ->
                new ErroDeNegocioException(
                    CodigoErro.NAO_AUTENTICADO, "Sua sessão expirou. Entre novamente."));
  }

  private static ErroDeNegocioException conflitoDeUsername() {
    return new ErroDeNegocioException(
        CodigoErro.CONFLITO, "Esse nome de usuário já está em uso. Escolha outro.");
  }

  private static ErroDeNegocioException conflitoDeEmail() {
    return new ErroDeNegocioException(CodigoErro.CONFLITO, "Esse e-mail já está em uso.");
  }
}

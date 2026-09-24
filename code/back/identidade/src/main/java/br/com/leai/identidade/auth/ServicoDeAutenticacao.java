package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cadastro, login, renovação e leitura da identidade do token (RF-AUT-01, 02 e 03). */
@Service
public class ServicoDeAutenticacao {

  /**
   * Mensagem única para os três casos de falha no login: usuário inexistente, e-mail que não
   * confere e senha errada. Distinguir qualquer um deles transformaria o login num oráculo de
   * quem tem conta (RNF-SEC-28).
   */
  static final String CREDENCIAL_INVALIDA = "E-mail, nome de usuário ou senha incorretos.";

  private final UsuarioRepositorio repositorio;
  private final PasswordEncoder codificadorDeSenha;
  private final EmissorDeToken emissorDeToken;
  private final ControleDeTentativas controleDeTentativas;
  private final PoliticaDeSenha politicaDeSenha;
  private final GestorDeRenovacao gestorDeRenovacao;

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
      GestorDeRenovacao gestorDeRenovacao) {
    this.repositorio = repositorio;
    this.codificadorDeSenha = codificadorDeSenha;
    this.emissorDeToken = emissorDeToken;
    this.controleDeTentativas = controleDeTentativas;
    this.politicaDeSenha = politicaDeSenha;
    this.gestorDeRenovacao = gestorDeRenovacao;
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
    if (repositorio.existsByUsernameIgnoreCase(username)) {
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

  /** Resposta ao reuso de token revogado, depois que a idempotência descartou o replay. */
  public void encerrarRenovacoesPorReuso(UUID usuarioId) {
    gestorDeRenovacao.revogarPorReuso(usuarioId);
  }

  private SessaoResposta sessaoPara(Usuario usuario) {
    return SessaoResposta.de(
        emissorDeToken.emitir(usuario.id(), usuario.username()),
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

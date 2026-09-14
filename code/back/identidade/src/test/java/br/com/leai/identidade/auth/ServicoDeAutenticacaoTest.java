package br.com.leai.identidade.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.config.AppProperties;
import br.com.leai.identidade.config.JwtConfig;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Regras de cadastro e login. Repositório mockado; nenhum teste toca banco.
 *
 * <p>O {@link PasswordEncoder} é o bcrypt de verdade, com custo 4 em vez de 12: o que está sendo
 * testado é que a senha nunca é gravada em claro e que a comparação funciona, não o custo.
 */
class ServicoDeAutenticacaoTest {

  private static final String SENHA = "senha-bem-comprida";
  private static final LocalDate NASCIMENTO = LocalDate.of(1999, 3, 14);

  private UsuarioRepositorio repositorio;
  private ServicoDeAutenticacao servico;

  @BeforeEach
  void montar() {
    repositorio = Mockito.mock(UsuarioRepositorio.class);
    PasswordEncoder codificador = new BCryptPasswordEncoder(4);

    JwtConfig jwtConfig = new JwtConfig();
    AppProperties propriedades =
        new AppProperties(
            "identidade",
            "identidade",
            "jdbc:postgresql://localhost:5432/leai",
            "http://localhost:5173",
            null,
            "segredo-de-teste-com-32-caracteres",
            null,
            null);
    EmissorDeToken emissor =
        new EmissorDeToken(jwtConfig.jwtEncoder(jwtConfig.chaveDeAssinatura(propriedades)));

    servico = new ServicoDeAutenticacao(repositorio, codificador, emissor);
  }

  private static CadastroRequisicao cadastro() {
    return new CadastroRequisicao(
        "marina.beltrao@gmail.com", "marinableu", "Marina Beltrão", NASCIMENTO, SENHA);
  }

  private static Usuario usuarioSalvo() {
    return Usuario.novo(
        "marina.beltrao@gmail.com",
        "marinableu",
        "Marina Beltrão",
        NASCIMENTO,
        new BCryptPasswordEncoder(4).encode(SENHA));
  }

  @Test
  @DisplayName("cadastro grava a senha como hash, nunca em claro")
  void cadastroGravaHash() {
    given(repositorio.saveAndFlush(any(Usuario.class)))
        .willAnswer(chamada -> chamada.getArgument(0));

    servico.cadastrar(cadastro());

    ArgumentCaptor<Usuario> capturado = ArgumentCaptor.forClass(Usuario.class);
    Mockito.verify(repositorio).saveAndFlush(capturado.capture());
    Usuario gravado = capturado.getValue();

    assertThat(gravado.senhaHash()).isNotEqualTo(SENHA).startsWith("$2");
    assertThat(new BCryptPasswordEncoder(4).matches(SENHA, gravado.senhaHash())).isTrue();
  }

  @Test
  @DisplayName("username já em uso vira 409 com a mensagem da tela")
  void usernameEmUsoVira409() {
    given(repositorio.existsByUsernameIgnoreCase("marinableu")).willReturn(true);

    assertThatErroDeNegocio(() -> servico.cadastrar(cadastro()))
        .hasMessage("Esse nome de usuário já está em uso. Escolha outro.")
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.CONFLITO);
  }

  @Test
  @DisplayName("e-mail já em uso vira 409")
  void emailEmUsoVira409() {
    given(repositorio.existsByEmailIgnoreCase("marina.beltrao@gmail.com")).willReturn(true);

    assertThatErroDeNegocio(() -> servico.cadastrar(cadastro()))
        .hasMessage("Esse e-mail já está em uso.");
  }

  @Test
  @DisplayName("corrida perdida no índice único vira 409, não 500")
  void corridaNoIndiceVira409() {
    willThrow(new DataIntegrityViolationException("usuario_username_unico"))
        .given(repositorio)
        .saveAndFlush(any(Usuario.class));

    assertThatErroDeNegocio(() -> servico.cadastrar(cadastro()))
        .hasMessage("Esse e-mail ou nome de usuário já está em uso.");
  }

  @Test
  @DisplayName("login funciona por e-mail e por username, com o mesmo identificador nos dois lados")
  void loginAceitaEmailOuUsername() {
    Usuario usuario = usuarioSalvo();
    given(repositorio.findByEmailIgnoreCaseOrUsernameIgnoreCase("marinableu", "marinableu"))
        .willReturn(Optional.of(usuario));

    TokenResposta resposta = servico.entrar(new LoginRequisicao("marinableu", SENHA));

    assertThat(resposta.tokenType()).isEqualTo("Bearer");
    assertThat(resposta.expiresIn()).isEqualTo(900L);
    assertThat(resposta.accessToken()).isNotBlank();
  }

  @Test
  @DisplayName("senha errada e conta inexistente devolvem exatamente a mesma mensagem")
  void falhasDeLoginSaoIndistinguiveis() {
    Usuario usuario = usuarioSalvo();
    given(repositorio.findByEmailIgnoreCaseOrUsernameIgnoreCase("marinableu", "marinableu"))
        .willReturn(Optional.of(usuario));
    given(repositorio.findByEmailIgnoreCaseOrUsernameIgnoreCase("fantasma", "fantasma"))
        .willReturn(Optional.empty());

    Throwable senhaErrada =
        catchErro(() -> servico.entrar(new LoginRequisicao("marinableu", "senha-errada")));
    Throwable contaInexistente =
        catchErro(() -> servico.entrar(new LoginRequisicao("fantasma", SENHA)));

    assertThat(senhaErrada).hasMessage(ServicoDeAutenticacao.CREDENCIAL_INVALIDA);
    assertThat(contaInexistente).hasMessage(ServicoDeAutenticacao.CREDENCIAL_INVALIDA);
    assertThat(((ErroDeNegocioException) senhaErrada).codigo())
        .isEqualTo(((ErroDeNegocioException) contaInexistente).codigo())
        .isEqualTo(CodigoErro.NAO_AUTENTICADO);
  }

  @Test
  @DisplayName("/me devolve o usuário do token lendo do banco")
  void meDevolveUsuarioDoToken() {
    Usuario usuario = usuarioSalvo();
    given(repositorio.findById(usuario.id())).willReturn(Optional.of(usuario));

    UsuarioResposta resposta = servico.doToken(usuario.id());

    assertThat(resposta.username()).isEqualTo("marinableu");
    assertThat(resposta.displayName()).isEqualTo("Marina Beltrão");
    assertThat(resposta.id()).isEqualTo(usuario.id().toString());
  }

  @Test
  @DisplayName("token válido de conta que não existe mais vira 401, não 404")
  void tokenDeContaApagadaVira401() {
    UUID fantasma = UUID.randomUUID();
    given(repositorio.findById(fantasma)).willReturn(Optional.empty());

    assertThatErroDeNegocio(() -> servico.doToken(fantasma))
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.NAO_AUTENTICADO);
  }

  private static org.assertj.core.api.AbstractThrowableAssert<?, ? extends Throwable>
      assertThatErroDeNegocio(ThrowingCallable acao) {
    return assertThatThrownBy(acao).isInstanceOf(ErroDeNegocioException.class);
  }

  private static Throwable catchErro(ThrowingCallable acao) {
    try {
      acao.call();
    } catch (Throwable erro) {
      return erro;
    }
    throw new AssertionError("esperava uma exceção");
  }
}

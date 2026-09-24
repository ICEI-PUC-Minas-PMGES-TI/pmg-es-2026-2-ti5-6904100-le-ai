package br.com.leai.identidade.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.CorrelationIdFilter;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.GlobalExceptionHandler;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Contrato HTTP do cadastro e do login: status, corpo e validação de entrada.
 *
 * <p>MockMvc standalone, sem contexto Spring e sem banco, como no {@code HealthControllerTest}.
 * A cadeia do Spring Security não participa daqui; a proteção do {@code /me} é exercitada em
 * {@code MeControllerSegurancaTest}.
 */
class AutenticacaoControllerTest {

  private static final String MAIOR_DE_IDADE = LocalDate.now().minusYears(30).toString();
  private static final String MENOR_DE_IDADE = LocalDate.now().minusYears(16).toString();

  private ServicoDeAutenticacao servico;
  private ServicoDeIdempotencia idempotencia;
  private MockMvc mockMvc;

  @BeforeEach
  void montar() {
    servico = Mockito.mock(ServicoDeAutenticacao.class);
    // Sem Idempotency-Key o controller não toca o serviço de idempotência; o caminho com chave
    // é exercitado contra Postgres real em IdempotenciaCadastroIntegracaoTest.
    idempotencia = Mockito.mock(ServicoDeIdempotencia.class);
    mockMvc =
        MockMvcBuilders.standaloneSetup(new AutenticacaoController(servico, idempotencia))
            .setControllerAdvice(new GlobalExceptionHandler())
            .addFilters(new CorrelationIdFilter())
            .build();
  }

  private static String corpoDeCadastro(String senha, String dataNascimento) {
    return """
        {
          "email": "marina.beltrao@gmail.com",
          "username": "marinableu",
          "displayName": "Marina Beltrão",
          "dataNascimento": "%s",
          "senha": "%s"
        }
        """
        .formatted(dataNascimento, senha);
  }

  @Test
  @DisplayName("cadastro válido responde 201 com id, username e displayName")
  void cadastroValidoResponde201() throws Exception {
    given(servico.cadastrar(any(CadastroRequisicao.class)))
        .willReturn(
            new UsuarioResposta(UUID.randomUUID().toString(), "marinableu", "Marina Beltrão"));

    mockMvc
        .perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpoDeCadastro("senha-bem-comprida", MAIOR_DE_IDADE)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.username").value("marinableu"))
        .andExpect(jsonPath("$.displayName").value("Marina Beltrão"))
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.email").doesNotExist())
        .andExpect(jsonPath("$.senha").doesNotExist());

    Mockito.verifyNoInteractions(idempotencia);
  }

  @Test
  @DisplayName("Idempotency-Key vazia ou acima de 128 caracteres vira 400 sem tocar o serviço")
  void chaveDeIdempotenciaInvalidaVira400() throws Exception {
    for (String chave : new String[] {"   ", "k".repeat(129)}) {
      mockMvc
          .perform(
              post("/auth/register")
                  .header("Idempotency-Key", chave)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(corpoDeCadastro("senha-bem-comprida", MAIOR_DE_IDADE)))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    Mockito.verifyNoInteractions(servico, idempotencia);
  }

  @Test
  @DisplayName("senha com 7 caracteres é recusada antes de chegar ao serviço (RNF-SEC-27)")
  void senhaCurtaVira400() throws Exception {
    mockMvc
        .perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpoDeCadastro("1234567", MAIOR_DE_IDADE)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));

    Mockito.verifyNoInteractions(servico);
  }

  @Test
  @DisplayName("menor de 18 anos é recusado (RNF-SEC-43)")
  void menorDeIdadeVira400() throws Exception {
    mockMvc
        .perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpoDeCadastro("senha-bem-comprida", MENOR_DE_IDADE)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));

    Mockito.verifyNoInteractions(servico);
  }

  @Test
  @DisplayName("conflito de username responde 409 no corpo de erro padrão")
  void conflitoVira409() throws Exception {
    willThrow(
            new ErroDeNegocioException(
                CodigoErro.CONFLITO, "Esse nome de usuário já está em uso. Escolha outro."))
        .given(servico)
        .cadastrar(any(CadastroRequisicao.class));

    mockMvc
        .perform(
            post("/auth/register")
                .header(CorrelationIdFilter.HEADER, "teste-409")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpoDeCadastro("senha-bem-comprida", MAIOR_DE_IDADE)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.codigo").value("CONFLITO"))
        .andExpect(jsonPath("$.mensagem").value("Esse nome de usuário já está em uso. Escolha outro."))
        .andExpect(jsonPath("$.correlationId").value("teste-409"));
  }

  @Test
  @DisplayName("login válido responde 200 com a sessão: acesso, tipo, validade e renovação")
  void loginValidoResponde200() throws Exception {
    given(servico.entrar(any(LoginRequisicao.class)))
        .willReturn(SessaoResposta.de("jwt-de-teste", 900L, "renovacao-de-teste"));

    mockMvc
        .perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identificador\":\"marinableu\",\"senha\":\"senha-bem-comprida\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("jwt-de-teste"))
        .andExpect(jsonPath("$.tokenType").value("Bearer"))
        .andExpect(jsonPath("$.expiresIn").value(900))
        .andExpect(jsonPath("$.refreshToken").value("renovacao-de-teste"));
  }

  @Test
  @DisplayName("refresh sem Idempotency-Key vira 400 sem tocar o serviço")
  void refreshSemChaveVira400() throws Exception {
    mockMvc
        .perform(
            post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"qualquer\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));

    Mockito.verifyNoInteractions(servico, idempotencia);
  }

  @Test
  @DisplayName("credencial inválida responde 401 sem revelar se a conta existe")
  void credencialInvalidaVira401() throws Exception {
    willThrow(
            new ErroDeNegocioException(
                CodigoErro.NAO_AUTENTICADO, ServicoDeAutenticacao.CREDENCIAL_INVALIDA))
        .given(servico)
        .entrar(any(LoginRequisicao.class));

    mockMvc
        .perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"identificador\":\"fantasma\",\"senha\":\"seja-o-que-for\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"))
        .andExpect(jsonPath("$.mensagem").value("E-mail, nome de usuário ou senha incorretos."));
  }
}

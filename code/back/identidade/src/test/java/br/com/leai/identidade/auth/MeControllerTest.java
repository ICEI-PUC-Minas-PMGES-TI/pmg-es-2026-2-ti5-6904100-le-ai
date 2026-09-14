package br.com.leai.identidade.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.leai.identidade.common.CorrelationIdFilter;
import br.com.leai.identidade.common.EscritorDeErro;
import br.com.leai.identidade.common.GlobalExceptionHandler;
import br.com.leai.identidade.config.SecurityConfig;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Prova o middleware de autenticação de ponta a ponta: a requisição atravessa a cadeia real do
 * Spring Security antes de chegar ao controller.
 *
 * <p>Fatia web, não {@code @SpringBootTest}: nenhum banco sobe e o CI não depende de
 * infraestrutura. O {@link JwtDecoder} é mockado em vez de assinar um token de verdade porque o
 * que está em teste aqui é a cadeia, não a criptografia; a ida e volta da assinatura fica no
 * {@code EmissorDeTokenTest}.
 */
@WebMvcTest(
    controllers = MeController.class,
    // A fatia não lê .env nem variáveis de ambiente, e o AppProperties é validado no boot: sem
    // estas quatro o contexto nem sobe, e o erro aparece como falha de binding, não de teste.
    properties = {
      "leai.service-name=identidade",
      "leai.db-schema=identidade",
      "leai.database-url=jdbc:postgresql://localhost:5432/leai",
      "leai.cors-allowed-origins=http://localhost:5173",
      "leai.jwt-secret=segredo-de-teste-com-32-caracteres"
    })
@Import({
  SecurityConfig.class,
  EscritorDeErro.class,
  CorrelationIdFilter.class,
  GlobalExceptionHandler.class
})
class MeControllerTest {

  private static final UUID USUARIO_ID = UUID.randomUUID();

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ServicoDeAutenticacao servico;

  @MockitoBean private JwtDecoder jwtDecoder;

  private static Jwt tokenDe(UUID usuarioId) {
    Instant agora = Instant.now();
    return Jwt.withTokenValue("token-de-teste")
        .header("alg", "HS256")
        .subject(usuarioId.toString())
        .claim("username", "marinableu")
        .issuedAt(agora)
        .expiresAt(agora.plus(15, ChronoUnit.MINUTES))
        .build();
  }

  @Test
  @DisplayName("sem Authorization responde 401 no corpo de erro padrão")
  void semTokenResponde401() throws Exception {
    mockMvc
        .perform(get("/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"))
        .andExpect(jsonPath("$.mensagem").value("É necessário autenticar-se para continuar."))
        .andExpect(jsonPath("$.correlationId").isNotEmpty());

    Mockito.verifyNoInteractions(servico);
  }

  @Test
  @DisplayName("token inválido responde 401 e nunca chega ao serviço")
  void tokenInvalidoResponde401() throws Exception {
    willThrow(new BadJwtException("assinatura não confere")).given(jwtDecoder).decode(any());

    mockMvc
        .perform(get("/me").header("Authorization", "Bearer token-adulterado"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));

    Mockito.verifyNoInteractions(servico);
  }

  @Test
  @DisplayName("token válido responde 200 com o usuário do token")
  void tokenValidoResponde200() throws Exception {
    given(jwtDecoder.decode(any())).willReturn(tokenDe(USUARIO_ID));
    given(servico.doToken(USUARIO_ID))
        .willReturn(new UsuarioResposta(USUARIO_ID.toString(), "marinableu", "Marina Beltrão"));

    mockMvc
        .perform(get("/me").header("Authorization", "Bearer token-de-teste"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(USUARIO_ID.toString()))
        .andExpect(jsonPath("$.username").value("marinableu"))
        .andExpect(jsonPath("$.displayName").value("Marina Beltrão"))
        .andExpect(jsonPath("$.email").doesNotExist());
  }
}

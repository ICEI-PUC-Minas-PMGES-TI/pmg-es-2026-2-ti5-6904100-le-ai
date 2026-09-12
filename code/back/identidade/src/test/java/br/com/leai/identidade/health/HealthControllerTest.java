package br.com.leai.identidade.health;

import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.leai.identidade.common.CorrelationIdFilter;
import br.com.leai.identidade.common.GlobalExceptionHandler;
import br.com.leai.identidade.common.SecurityHeadersFilter;
import br.com.leai.identidade.common.ServicoIndisponivelException;
import br.com.leai.identidade.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Espelha {@code health.controller.spec.ts} do serviço `acervo`, mas exercitando a resposta HTTP
 * de verdade — corpo, status e headers.
 *
 * <p>Monta o MockMvc no modo standalone, sem contexto Spring: o teste não pode depender de banco,
 * nem localmente nem no CI (P0-CI).
 */
class HealthControllerTest {

  private static final AppProperties PROPRIEDADES =
      new AppProperties(
          "identidade",
          "identidade",
          "jdbc:postgresql://localhost:5432/teste",
          "http://localhost:5173",
          null,
          null,
          null,
          null);

  private DatabaseHealthChecker banco;
  private MockMvc mockMvc;

  @BeforeEach
  void montar() {
    banco = Mockito.mock(DatabaseHealthChecker.class);
    mockMvc =
        MockMvcBuilders.standaloneSetup(new HealthController(banco, PROPRIEDADES))
            .setControllerAdvice(new GlobalExceptionHandler())
            .addFilters(new CorrelationIdFilter(), new SecurityHeadersFilter())
            .build();
  }

  @Test
  @DisplayName("retorna status ok com nome do serviço e timestamp ISO")
  void retornaStatusOk() throws Exception {
    mockMvc
        .perform(get("/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.service").value("identidade"))
        .andExpect(
            jsonPath("$.time").value(org.hamcrest.Matchers.matchesPattern("\\d{4}-.*\\.\\d{3}Z")));
  }

  @Test
  @DisplayName("devolve o corpo de erro padrão 503 quando o banco não responde")
  void bancoForaViraCorpoPadrao503() throws Exception {
    willThrow(new ServicoIndisponivelException("Banco indisponível", new RuntimeException()))
        .given(banco)
        .verificar();

    mockMvc
        .perform(get("/health").header(CorrelationIdFilter.HEADER, "teste-503"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.codigo").value("SERVICO_INDISPONIVEL"))
        .andExpect(
            jsonPath("$.mensagem")
                .value("Serviço temporariamente indisponível. Tente novamente em instantes."))
        .andExpect(jsonPath("$.correlationId").value("teste-503"));
  }

  @Test
  @DisplayName("devolve o X-Correlation-Id recebido e os cabeçalhos de segurança")
  void devolveCorrelationIdECabecalhosDeSeguranca() throws Exception {
    mockMvc
        .perform(get("/health").header(CorrelationIdFilter.HEADER, "teste-123"))
        .andExpect(header().string(CorrelationIdFilter.HEADER, "teste-123"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Referrer-Policy", "no-referrer"))
        .andExpect(
            header().string("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
  }
}

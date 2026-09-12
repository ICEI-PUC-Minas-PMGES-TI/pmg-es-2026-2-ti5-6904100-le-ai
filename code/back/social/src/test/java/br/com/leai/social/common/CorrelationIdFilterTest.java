package br.com.leai.social.common;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CorrelationIdFilterTest {

  private final CorrelationIdFilter filtro = new CorrelationIdFilter();

  @AfterEach
  void limparMdc() {
    MDC.clear();
  }

  @Test
  @DisplayName("reaproveita o X-Correlation-Id recebido e devolve no header")
  void reaproveitaIdRecebido() throws Exception {
    MockHttpServletRequest requisicao = new MockHttpServletRequest("GET", "/health");
    requisicao.addHeader(CorrelationIdFilter.HEADER, "teste-123");
    MockHttpServletResponse resposta = new MockHttpServletResponse();

    filtro.doFilter(requisicao, resposta, new MockFilterChain());

    assertThat(resposta.getHeader(CorrelationIdFilter.HEADER)).isEqualTo("teste-123");
  }

  @Test
  @DisplayName("gera um UUID quando o header não vem")
  void geraUuidQuandoNaoVem() throws Exception {
    MockHttpServletResponse resposta = new MockHttpServletResponse();

    filtro.doFilter(new MockHttpServletRequest("GET", "/health"), resposta, new MockFilterChain());

    String gerado = resposta.getHeader(CorrelationIdFilter.HEADER);
    assertThat(gerado).isNotBlank();
    assertThat(UUID.fromString(gerado)).isNotNull();
  }

  @Test
  @DisplayName("limpa o MDC ao final da requisição")
  void limpaMdcAoFinal() throws Exception {
    MockHttpServletRequest requisicao = new MockHttpServletRequest("GET", "/health");
    requisicao.addHeader(CorrelationIdFilter.HEADER, "teste-123");

    FilterChain cadeia =
        (req, res) ->
            assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isEqualTo("teste-123");

    filtro.doFilter(requisicao, new MockHttpServletResponse(), cadeia);

    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }

  @Test
  @DisplayName("descarta quebra de linha no id recebido para não permitir injeção no log")
  void descartaQuebraDeLinha() {
    assertThat(CorrelationIdFilter.sanitizar("abc\nFAKE LOG")).isEqualTo("abcFAKE LOG");
    assertThat(CorrelationIdFilter.sanitizar("   ")).isNull();
    assertThat(CorrelationIdFilter.sanitizar(null)).isNull();
    assertThat(CorrelationIdFilter.sanitizar("x".repeat(200))).hasSize(128);
  }
}

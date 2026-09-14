package br.com.leai.identidade.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Espelha {@code all-exceptions.filter.spec.ts} do serviço `acervo`: o corpo de erro é contrato
 * de saída e precisa ser idêntico nas duas stacks (arquitetura §2.1).
 */
class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @BeforeEach
  void definirCorrelationId() {
    MDC.put(CorrelationIdFilter.MDC_KEY, "teste-123");
  }

  @AfterEach
  void limparMdc() {
    MDC.clear();
  }

  @Test
  @DisplayName("formata erro conhecido com codigo, mensagem e correlationId")
  void formataErroConhecido() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(new ResponseStatusException(HttpStatus.NOT_FOUND));

    assertThat(resposta.getStatusCode().value()).isEqualTo(404);
    assertThat(resposta.getBody())
        .isEqualTo(
            new ErroResposta(
                "RECURSO_NAO_ENCONTRADO", "Não encontramos o que você procura.", "teste-123"));
  }

  @Test
  @DisplayName("erro desconhecido vira 500 e não vaza detalhe técnico")
  void erroDesconhecidoNaoVazaDetalhe() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(new IllegalStateException("detalhe interno secreto"));

    assertThat(resposta.getStatusCode().value()).isEqualTo(500);
    ErroResposta corpo = resposta.getBody();
    assertThat(corpo).isNotNull();
    assertThat(corpo.codigo()).isEqualTo("ERRO_INTERNO");
    assertThat(corpo.mensagem()).doesNotContain("secreto");
    assertThat(corpo.correlationId()).isEqualTo("teste-123");
  }

  @Test
  @DisplayName("rota inexistente vira 404, e não 500")
  void rotaInexistenteVira404() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(new NoResourceFoundException(HttpMethod.GET, "/rota-que-nao-existe", null));

    assertThat(resposta.getStatusCode().value()).isEqualTo(404);
    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().codigo()).isEqualTo("RECURSO_NAO_ENCONTRADO");
  }

  @Test
  @DisplayName("status HTTP fora do mapa vira ERRO_HTTP preservando o status original")
  void statusForaDoMapaViraErroHttp() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(new ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED));

    assertThat(resposta.getStatusCode().value()).isEqualTo(405);
    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().codigo()).isEqualTo("ERRO_HTTP");
    assertThat(resposta.getBody().mensagem()).isEqualTo("Não foi possível concluir a operação.");
  }

  @Test
  @DisplayName("banco indisponível vira 503 com o codigo de serviço indisponível")
  void bancoIndisponivelVira503() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(
            new ServicoIndisponivelException("Banco indisponível", new RuntimeException()));

    assertThat(resposta.getStatusCode().value()).isEqualTo(503);
    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().codigo()).isEqualTo("SERVICO_INDISPONIVEL");
  }

  @Test
  @DisplayName("sem requisição em curso o correlationId cai para desconhecido")
  void semRequisicaoUsaDesconhecido() {
    MDC.clear();

    ResponseEntity<ErroResposta> resposta = handler.tratar(new IllegalStateException("x"));

    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().correlationId()).isEqualTo("desconhecido");
  }

  @Test
  @DisplayName("corpo ilegível vira 400, não 500: o erro é de quem enviou")
  void corpoIlegivelVira400() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(new HttpMessageNotReadableException("JSON malformado", (HttpInputMessage) null));

    assertThat(resposta.getStatusCode().value()).isEqualTo(400);
    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().codigo()).isEqualTo("REQUISICAO_INVALIDA");
  }

  @Test
  @DisplayName("erro de negócio leva a mensagem específica, mantendo o formato do corpo")
  void erroDeNegocioLevaMensagemPropria() {
    ResponseEntity<ErroResposta> resposta =
        handler.tratar(
            new ErroDeNegocioException(
                CodigoErro.CONFLITO, "Esse nome de usuário já está em uso. Escolha outro."));

    assertThat(resposta.getStatusCode().value()).isEqualTo(409);
    assertThat(resposta.getBody()).isNotNull();
    assertThat(resposta.getBody().codigo()).isEqualTo("CONFLITO");
    assertThat(resposta.getBody().mensagem())
        .isEqualTo("Esse nome de usuário já está em uso. Escolha outro.");
    assertThat(resposta.getBody().correlationId()).isEqualTo("teste-123");
  }
}

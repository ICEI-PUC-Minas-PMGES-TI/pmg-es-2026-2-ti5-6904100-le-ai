package br.com.leai.identidade.integracao;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.model.Request;
import com.atlassian.oai.validator.model.SimpleRequest;
import com.atlassian.oai.validator.model.SimpleResponse;
import com.atlassian.oai.validator.report.ValidationReport;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URLDecoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.stream.Collectors;

/**
 * Teste de contrato (F-AUT e F-PERFIL, DoD): toda chamada que um teste de integração faz é
 * conferida contra {@code docs/api/identidade.yaml}. Uma divergência entre código e spec reprova o
 * teste que fez a chamada.
 *
 * <ul>
 *   <li><b>Resposta</b>, sempre: status, corpo e cabeçalhos documentados.
 *   <li><b>Requisição</b>, só quando a resposta é 2xx: o que o servidor aceitou tem de caber no
 *       spec (corpo, parâmetros e cabeçalhos obrigatórios). As requisições inválidas de propósito,
 *       que provam o 400, ficam de fora porque o servidor as recusa.
 * </ul>
 *
 * <p>Preflight de CORS e 5xx ficam de fora. Com {@code -Dleai.contrato=registrar}, as divergências
 * não reprovam: vão para {@code target/divergencias-contrato.txt}, para levantar tudo de uma vez.
 */
final class ContratoHttp {

  private static final Path SPEC = Path.of("..", "..", "..", "docs", "api", "identidade.yaml");
  private static final Path REGISTRO = Path.of("target", "divergencias-contrato.txt");
  private static final boolean SO_REGISTRAR = "registrar".equals(System.getProperty("leai.contrato"));

  // Sem resolver os combinadores, cada parte de um `allOf` recusa os campos da outra.
  private static final OpenApiInteractionValidator VALIDADOR =
      OpenApiInteractionValidator.createForSpecificationUrl(SPEC.toAbsolutePath().toUri().toString())
          .withResolveCombinators(true)
          .build();

  private ContratoHttp() {}

  static void validar(HttpRequest requisicao, HttpResponse<String> resposta) {
    // Fora do contrato: o preflight de CORS e o 5xx de falha inesperada (os testes de
    // atomicidade forçam um).
    if ("OPTIONS".equals(requisicao.method()) || resposta.statusCode() >= 500) {
      return;
    }
    String caminho = requisicao.uri().getPath();
    Request.Method metodo = Request.Method.valueOf(requisicao.method());
    SimpleResponse.Builder simples =
        SimpleResponse.Builder.status(resposta.statusCode()).withBody(resposta.body());
    resposta.headers().map().forEach(simples::withHeader);

    ValidationReport relatorio = VALIDADOR.validateResponse(caminho, metodo, simples.build());
    if (resposta.statusCode() < 300) {
      relatorio = relatorio.merge(VALIDADOR.validateRequest(comoSimples(requisicao, metodo)));
    }
    if (!relatorio.hasErrors()) {
      return;
    }
    String divergencias =
        relatorio.getMessages().stream()
            .filter(m -> m.getLevel() == ValidationReport.Level.ERROR)
            .map(m -> descrever(m, "  "))
            .collect(Collectors.joining("\n"));
    String texto =
        "%s %s -> %d diverge de identidade.yaml:%n%s%n"
            .formatted(metodo, caminho, resposta.statusCode(), divergencias);
    if (SO_REGISTRAR) {
      registrar(texto);
      return;
    }
    throw new AssertionError(texto);
  }

  private static SimpleRequest comoSimples(HttpRequest requisicao, Request.Method metodo) {
    SimpleRequest.Builder simples = new SimpleRequest.Builder(metodo, requisicao.uri().getPath());
    requisicao.headers().map().forEach(simples::withHeader);
    String consulta = requisicao.uri().getRawQuery();
    if (consulta != null) {
      for (String par : consulta.split("&")) {
        String[] partes = par.split("=", 2);
        simples.withQueryParam(
            decodificar(partes[0]), partes.length > 1 ? decodificar(partes[1]) : "");
      }
    }
    String corpo = corpo(requisicao);
    if (corpo != null) {
      simples.withBody(corpo);
    }
    return simples.build();
  }

  private static String decodificar(String texto) {
    return URLDecoder.decode(texto, StandardCharsets.UTF_8);
  }

  /**
   * O {@code HttpRequest} não expõe o corpo, só o publisher dele. Os publishers que os testes usam
   * ({@code ofString}, {@code noBody}) podem ser lidos de novo depois do envio.
   */
  private static String corpo(HttpRequest requisicao) {
    HttpRequest.BodyPublisher publisher = requisicao.bodyPublisher().orElse(null);
    if (publisher == null || publisher.contentLength() == 0) {
      return null;
    }
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    CompletableFuture<String> lido = new CompletableFuture<>();
    publisher.subscribe(
        new Flow.Subscriber<ByteBuffer>() {
          @Override
          public void onSubscribe(Flow.Subscription assinatura) {
            assinatura.request(Long.MAX_VALUE);
          }

          @Override
          public void onNext(ByteBuffer parte) {
            byte[] copia = new byte[parte.remaining()];
            parte.get(copia);
            bytes.writeBytes(copia);
          }

          @Override
          public void onError(Throwable erro) {
            lido.completeExceptionally(erro);
          }

          @Override
          public void onComplete() {
            lido.complete(bytes.toString(StandardCharsets.UTF_8));
          }
        });
    return lido.join();
  }

  /** {@code allOf}/{@code oneOf} guardam o motivo real nas mensagens aninhadas. */
  private static String descrever(ValidationReport.Message mensagem, String recuo) {
    StringBuilder texto =
        new StringBuilder(recuo + "- [" + mensagem.getKey() + "] " + mensagem.getMessage());
    for (ValidationReport.Message aninhada : mensagem.getNestedMessages()) {
      texto.append('\n').append(descrever(aninhada, recuo + "  "));
    }
    return texto.toString();
  }

  private static synchronized void registrar(String texto) {
    try {
      Files.createDirectories(REGISTRO.getParent());
      Files.writeString(
          REGISTRO,
          texto,
          StandardCharsets.UTF_8,
          StandardOpenOption.CREATE,
          StandardOpenOption.APPEND);
    } catch (IOException erro) {
      throw new UncheckedIOException(erro);
    }
  }
}

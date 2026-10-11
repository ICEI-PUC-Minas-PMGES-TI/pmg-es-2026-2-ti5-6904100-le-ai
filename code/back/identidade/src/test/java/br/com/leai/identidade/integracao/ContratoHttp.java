package br.com.leai.identidade.integracao;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.model.Request;
import com.atlassian.oai.validator.model.SimpleResponse;
import com.atlassian.oai.validator.report.ValidationReport;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.stream.Collectors;

/**
 * Teste de contrato (F-AUT e F-PERFIL, DoD): toda resposta que um teste de integração recebe é
 * validada contra {@code docs/api/identidade.yaml}, status, corpo e cabeçalhos documentados. Uma
 * divergência entre código e spec reprova o teste que fez a chamada.
 *
 * <p>Só a resposta é validada: os testes mandam requisições inválidas de propósito para provar o
 * 400, e o servidor já valida a entrada. Preflight de CORS e 5xx ficam de fora.
 *
 * <p>Com {@code -Dleai.contrato=registrar}, as divergências não reprovam: vão para {@code
 * target/divergencias-contrato.txt}, para levantar tudo de uma vez.
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

package br.com.leai.identidade.health;

import br.com.leai.identidade.common.ErroResposta;
import br.com.leai.identidade.config.AppProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /health} (RNF-OBS-02): 200 quando o serviço está de pé e o banco responde. Se o
 * banco cair, o checker lança e o corpo de erro padrão (503) é devolvido pelo
 * {@code GlobalExceptionHandler}.
 *
 * <p>Rota própria, e não {@code /actuator/health}: o critério de aceite de P0-INFRA fixa este
 * caminho e este corpo para os quatro serviços. O Actuator segue ativo em {@code /actuator} para
 * as sondas da plataforma.
 */
@Tag(name = "health")
@RestController
public class HealthController {

  private final DatabaseHealthChecker banco;
  private final AppProperties propriedades;

  public HealthController(DatabaseHealthChecker banco, AppProperties propriedades) {
    this.banco = banco;
    this.propriedades = propriedades;
  }

  @GetMapping(path = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
  @Operation(summary = "Health check do serviço (RNF-OBS-02)")
  @ApiResponse(responseCode = "200", description = "Serviço e banco saudáveis.")
  @ApiResponse(
      responseCode = "503",
      description = "Serviço indisponível (ex.: banco fora do ar).",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON_VALUE,
              schema = @Schema(implementation = ErroResposta.class)))
  public HealthResposta verificar() {
    banco.verificar();
    return new HealthResposta(
        "ok",
        propriedades.serviceName(),
        // Truncado no milissegundo para casar com o Date#toISOString() do lado Nest.
        Instant.now().truncatedTo(ChronoUnit.MILLIS).toString());
  }
}

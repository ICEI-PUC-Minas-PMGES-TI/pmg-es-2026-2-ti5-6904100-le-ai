package br.com.leai.social.feed;

import br.com.leai.social.feed.dto.AtividadeResposta;
import br.com.leai.social.feed.dto.PaginaAtividadesResposta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Leitura do feed (RF-SOC-09) e do detalhe de uma atividade. Só rotas {@code GET}: curtir e
 * comentar são a Task 4. Padrão exato de {@code identidade.seguimento.SeguimentoController}
 * (`@AuthenticationPrincipal Jwt`, {@code UUID.fromString(token.getSubject())}).
 */
@RestController
@Tag(name = "feed", description = "Feed cronológico e detalhe de atividade")
@SecurityRequirement(name = "bearerAuth")
public class FeedController {

  private final ServicoDeFeed servico;

  public FeedController(ServicoDeFeed servico) {
    this.servico = servico;
  }

  @GetMapping("/feed")
  @Operation(
      summary = "Lista o feed cronológico do leitor (RF-SOC-09)",
      description =
          "Atividades de quem o solicitante segue, mais recentes primeiro. A autorização é "
              + "revalidada a cada consulta: deixar de seguir, perfil suspenso, conteúdo privado "
              + "sem seguimento aceito ou livro ausente/inativo tiram a atividade do resultado.")
  @ApiResponse(responseCode = "200", description = "Página do feed em ordem cronológica decrescente.")
  @ApiResponse(
      responseCode = "400",
      description = "Página negativa ou tamanho fora de 1 a 50.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PaginaAtividadesResposta feed(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + ServicoDeFeed.TAMANHO_PADRAO) int size) {
    return servico.listar(autenticado(token), page, size);
  }

  @GetMapping("/atividades/{atividadeId}")
  @Operation(
      summary = "Obtém o detalhe de uma atividade visível",
      description =
          "Revalida se a atividade ainda integra o feed do solicitante sob RN-08 e RN-09. Para "
              + "evitar enumeração, uma atividade existente mas não visível responde como não "
              + "encontrada.")
  @ApiResponse(responseCode = "200", description = "Atividade visível com snapshot e contadores atuais.")
  @ApiResponse(
      responseCode = "404",
      description = "Atividade inexistente ou não visível ao solicitante.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public AtividadeResposta obter(@AuthenticationPrincipal Jwt token, @PathVariable UUID atividadeId) {
    return servico.obter(autenticado(token), atividadeId);
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

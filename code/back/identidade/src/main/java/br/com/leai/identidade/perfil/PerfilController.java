package br.com.leai.identidade.perfil;

import br.com.leai.identidade.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.identidade.common.idempotencia.OperacaoIdempotente;
import br.com.leai.identidade.common.idempotencia.RespostaIdempotente;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/** Perfil do próprio leitor (RF-SOC-01/04). Rotas autenticadas; o dono vem do `sub` do token. */
@RestController
@Tag(name = "perfil", description = "Perfil público, edição e busca exata")
@SecurityRequirement(name = "bearerAuth")
public class PerfilController {

  private final ServicoDePerfil servico;
  private final ServicoDeIdempotencia idempotencia;

  public PerfilController(ServicoDePerfil servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @GetMapping("/me/perfil")
  @Operation(summary = "Consulta o próprio perfil (RF-SOC-01)")
  @ApiResponse(responseCode = "200", description = "Perfil do usuário autenticado.")
  public PerfilResposta meu(@AuthenticationPrincipal Jwt token) {
    return servico.meu(UUID.fromString(token.getSubject()));
  }

  @PutMapping("/me/perfil")
  @Operation(
      summary = "Substitui os campos editáveis do próprio perfil (RF-SOC-01/04)",
      description =
          "Nome de exibição, biografia (texto, nunca HTML), avatar e privacidade. O avatar é a URL "
              + "e o publicId do upload direto ao Cloudinary; o servidor confere a origem e nunca "
              + "baixa a imagem (RNF-SEC-38). Mudar para privado não remove seguidores. Exige "
              + "Idempotency-Key.")
  @ApiResponse(responseCode = "200", description = "Perfil atualizado.")
  @ApiResponse(
      responseCode = "422",
      description = "Avatar fora do Cloudinary do projeto, da pasta de avatares ou dos formatos.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PerfilResposta editar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody EditarPerfilRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    UUID usuarioId = UUID.fromString(token.getSubject());
    return idempotencia
        .executar(
            usuarioId,
            OperacaoIdempotente.ATUALIZAR_PERFIL,
            chave,
            requisicao,
            PerfilResposta.class,
            () -> new RespostaIdempotente<>(HttpStatus.OK.value(), servico.editar(usuarioId, requisicao)))
        .corpo();
  }
}

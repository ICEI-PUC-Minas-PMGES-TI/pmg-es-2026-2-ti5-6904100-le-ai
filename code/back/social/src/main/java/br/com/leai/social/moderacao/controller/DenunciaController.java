package br.com.leai.social.moderacao.controller;

import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.moderacao.dto.CriarDenunciaRequisicao;
import br.com.leai.social.moderacao.dto.DenunciaResposta;
import br.com.leai.social.moderacao.service.ServicoDeDenuncia;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/** Denúncia pelo leitor (F-MOD, RF-MOD-01). O painel e as ações do admin ficam em outro controller. */
@RestController
@Tag(name = "moderacao", description = "Denúncias e moderação de conteúdo")
@SecurityRequirement(name = "bearerAuth")
public class DenunciaController {

  private final ServicoDeDenuncia servico;
  private final ServicoDeIdempotencia idempotencia;

  public DenunciaController(ServicoDeDenuncia servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/denuncias")
  @Operation(
      operationId = "criarDenuncia",
      summary = "Denuncia uma resenha ou um comentário (RF-MOD-01)",
      description =
          "Exige acesso atual ao alvo (RN-08; resenha de livro pessoal pela via de RN-15.4). "
              + "Se o leitor já tem denúncia pendente sobre o mesmo alvo, devolve essa, com 200.")
  @ApiResponse(responseCode = "201", description = "Denúncia registrada.")
  @ApiResponse(responseCode = "200", description = "O leitor já tinha denúncia pendente sobre o alvo.")
  @ApiResponse(
      responseCode = "404",
      description = "O alvo não existe ou o leitor não tem acesso a ele.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "422",
      description = "O conteúdo é do próprio leitor.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<DenunciaResposta> denunciar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody CriarDenunciaRequisicao pedido) {
    UUID eu = UUID.fromString(token.getSubject());
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("alvoTipo", pedido.alvoTipo());
    payload.put("alvoId", pedido.alvoId().toString());
    payload.put("motivo", pedido.motivo());
    payload.put("via", pedido.via());
    payload.put("referenciaId", pedido.referenciaId() == null ? null : pedido.referenciaId().toString());
    RespostaIdempotente<DenunciaResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.CRIAR_DENUNCIA,
            ChaveDeIdempotencia.exigir(chave),
            payload,
            DenunciaResposta.class,
            () -> {
              ServicoDeDenuncia.Resultado resultado = servico.denunciar(eu, pedido);
              HttpStatus status = resultado.nova() ? HttpStatus.CREATED : HttpStatus.OK;
              return new RespostaIdempotente<>(status.value(), resultado.denuncia());
            });
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }
}

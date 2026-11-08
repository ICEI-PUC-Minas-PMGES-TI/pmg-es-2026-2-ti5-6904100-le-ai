package br.com.leai.social.push.controller;

import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.push.dto.DispositivoPushResposta;
import br.com.leai.social.push.dto.RegistrarDispositivoPushRequisicao;
import br.com.leai.social.push.model.RegistroDeDispositivo;
import br.com.leai.social.push.service.ServicoDeDispositivoPush;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "notificacoes", description = "Dispositivos Android que recebem push (RF-NOT-07)")
@SecurityRequirement(name = "bearerAuth")
public class DispositivoPushController {

  private final ServicoDeDispositivoPush servico;
  private final ServicoDeIdempotencia idempotencia;

  public DispositivoPushController(
      ServicoDeDispositivoPush servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/me/dispositivos-push")
  @Operation(
      summary = "Registra ou renova o token FCM do dispositivo (RF-NOT-07)",
      description =
          "O token é único. Reenviar o mesmo token atualiza o registro e o reativa, sem "
              + "duplicar. Token que pertencia a outra conta passa a pertencer ao leitor "
              + "autenticado. Só android é aceito.")
  @ApiResponse(responseCode = "201", description = "Dispositivo registrado.")
  @ApiResponse(responseCode = "200", description = "Dispositivo já existia; registro atualizado.")
  @ApiResponse(
      responseCode = "400",
      description = "Token ausente ou longo demais, ou plataforma diferente de android.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<DispositivoPushResposta> registrar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody RegistrarDispositivoPushRequisicao requisicao) {
    UUID eu = autenticado(token);
    RespostaIdempotente<DispositivoPushResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.REGISTRAR_DISPOSITIVO_PUSH,
            ChaveDeIdempotencia.exigir(chave),
            Map.of("token", requisicao.token(), "plataforma", requisicao.plataforma()),
            DispositivoPushResposta.class,
            () -> {
              RegistroDeDispositivo registro = servico.registrar(eu, requisicao.token());
              HttpStatus status = registro.criado() ? HttpStatus.CREATED : HttpStatus.OK;
              return new RespostaIdempotente<>(status.value(), DispositivoPushResposta.de(registro));
            });
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/me/dispositivos-push/{id}")
  @Operation(
      summary = "Revoga o dispositivo de push (RF-NOT-07)",
      description =
          "Só o dono revoga o próprio dispositivo; id alheio ou inexistente responde 404. "
              + "Revogar de novo um dispositivo já revogado também responde 204.")
  @ApiResponse(responseCode = "204", description = "Dispositivo revogado.")
  @ApiResponse(
      responseCode = "404",
      description = "Dispositivo inexistente ou de outro leitor.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> revogar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID id,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    idempotencia.executar(
        eu,
        OperacaoIdempotente.REVOGAR_DISPOSITIVO_PUSH,
        ChaveDeIdempotencia.exigir(chave),
        Map.of("id", id.toString()),
        Void.class,
        () -> {
          servico.revogar(eu, id);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

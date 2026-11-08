package br.com.leai.social.notificacao.controller;

import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.notificacao.dto.AtualizarPreferenciasRequisicao;
import br.com.leai.social.notificacao.dto.PreferenciasDeNotificacaoResposta;
import br.com.leai.social.notificacao.service.ServicoDePreferenciaDeNotificacao;
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

@RestController
@Tag(name = "notificacoes", description = "Notificações in-app do leitor autenticado")
@SecurityRequirement(name = "bearerAuth")
public class PreferenciaNotificacaoController {

  private final ServicoDePreferenciaDeNotificacao servico;
  private final ServicoDeIdempotencia idempotencia;

  public PreferenciaNotificacaoController(
      ServicoDePreferenciaDeNotificacao servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @GetMapping("/me/notificacoes/preferencias")
  @Operation(
      summary = "Lista as preferências de notificação por tipo (RF-NOT-05)",
      description =
          "Todos os tipos configuráveis em ordem fixa, inclusive os nunca alterados, que vêm "
              + "habilitados. Só o dono lê as próprias preferências.")
  @ApiResponse(responseCode = "200", description = "Uma entrada por tipo configurável.")
  public PreferenciasDeNotificacaoResposta listar(@AuthenticationPrincipal Jwt token) {
    return servico.listar(autenticado(token));
  }

  @PutMapping("/me/notificacoes/preferencias")
  @Operation(
      summary = "Atualiza preferências de notificação por tipo (RF-NOT-05)",
      description =
          "Atualiza, de forma idempotente, os tipos enviados; os demais ficam como estão. Tipo "
              + "desconhecido ou repetido responde 400 sem alterar nada. Repetir a mesma chave "
              + "devolve o mesmo resultado.")
  @ApiResponse(responseCode = "200", description = "Conjunto completo depois da atualização.")
  @ApiResponse(
      responseCode = "400",
      description = "Corpo vazio, tipo desconhecido ou tipo repetido.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PreferenciasDeNotificacaoResposta atualizar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody AtualizarPreferenciasRequisicao requisicao) {
    UUID eu = autenticado(token);
    RespostaIdempotente<PreferenciasDeNotificacaoResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.ATUALIZAR_PREFERENCIAS_DE_NOTIFICACAO,
            ChaveDeIdempotencia.exigir(chave),
            requisicao,
            PreferenciasDeNotificacaoResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(), servico.atualizar(eu, requisicao)));
    return resposta.corpo();
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

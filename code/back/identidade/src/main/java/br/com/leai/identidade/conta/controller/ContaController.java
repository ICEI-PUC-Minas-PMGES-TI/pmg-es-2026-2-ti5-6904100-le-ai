package br.com.leai.identidade.conta.controller;

import br.com.leai.identidade.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.identidade.common.idempotencia.OperacaoIdempotente;
import br.com.leai.identidade.common.idempotencia.RespostaIdempotente;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.identidade.config.SecurityConfig;
import br.com.leai.identidade.conta.dto.ExclusaoSolicitadaResposta;
import br.com.leai.identidade.conta.dto.ResultadoJobExclusaoResposta;
import br.com.leai.identidade.conta.dto.SolicitarExclusaoRequisicao;
import br.com.leai.identidade.conta.service.ServicoDeExclusaoDeConta;
import br.com.leai.identidade.conta.service.TokenDoAgendador;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exclusão e recuperação de conta (F-CONTA-2, RF-AUT-07). Contrato em {@code
 * docs/api/identidade.yaml}: {@code solicitarExclusaoConta}, {@code cancelarExclusaoConta} e
 * {@code finalizarExclusoesVencidas}.
 */
@RestController
@Tag(name = "conta", description = "Exclusão e recuperação da conta")
public class ContaController {

  private final ServicoDeExclusaoDeConta servico;
  private final ServicoDeIdempotencia idempotencia;
  private final TokenDoAgendador tokenDoAgendador;

  public ContaController(
      ServicoDeExclusaoDeConta servico,
      ServicoDeIdempotencia idempotencia,
      TokenDoAgendador tokenDoAgendador) {
    this.servico = servico;
    this.idempotencia = idempotencia;
    this.tokenDoAgendador = tokenDoAgendador;
  }

  @DeleteMapping("/me/conta")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(
      operationId = "solicitarExclusaoConta",
      summary = "Solicita a exclusão da própria conta (RF-AUT-07)",
      description =
          "Exige senha atual, confirmação e Idempotency-Key. Abre 30 dias de recuperação, "
              + "oculta a conta e revoga as renovações.")
  public ResponseEntity<ExclusaoSolicitadaResposta> solicitar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody SolicitarExclusaoRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    UUID usuarioId = UUID.fromString(token.getSubject());
    RespostaIdempotente<ExclusaoSolicitadaResposta> resposta =
        idempotencia.executar(
            usuarioId,
            OperacaoIdempotente.SOLICITAR_EXCLUSAO_CONTA,
            chave,
            requisicao,
            ExclusaoSolicitadaResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.ACCEPTED.value(), servico.solicitar(usuarioId, chave, requisicao)));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  /** Só o acesso de recuperação chega aqui: a rota tem cadeia própria no {@link SecurityConfig}. */
  @PostMapping(SecurityConfig.ROTA_CANCELAR_EXCLUSAO)
  @SecurityRequirement(name = "recuperacaoAuth")
  @Operation(
      operationId = "cancelarExclusaoConta",
      summary = "Cancela a exclusão pendente dentro do prazo (RN-23.4)")
  public ResponseEntity<Void> cancelar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    UUID usuarioId = UUID.fromString(token.getSubject());
    idempotencia.executar(
        usuarioId,
        OperacaoIdempotente.CANCELAR_EXCLUSAO_CONTA,
        chave,
        Map.of(),
        Void.class,
        () -> {
          servico.cancelar(usuarioId);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }

  /**
   * Job diário (RN-23.5). A chave é exigida como nas demais escritas, mas sem recibo: o job já é
   * idempotente por natureza, porque só processa recibos pendentes e vencidos, e cada conta tem a
   * própria transação, que um recibo HTTP englobaria inteira.
   */
  @PostMapping("/internal/jobs/exclusao-conta")
  @SecurityRequirement(name = "schedulerToken")
  @Operation(
      operationId = "finalizarExclusoesVencidas",
      summary = "Job diário que finaliza exclusões vencidas (RN-23.5)")
  public ResultadoJobExclusaoResposta finalizar(
      @RequestHeader(name = TokenDoAgendador.CABECALHO, required = false) String tokenRecebido,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta) {
    tokenDoAgendador.exigir(tokenRecebido);
    ChaveDeIdempotencia.exigir(chaveBruta);
    return new ResultadoJobExclusaoResposta(servico.finalizarVencidas());
  }
}

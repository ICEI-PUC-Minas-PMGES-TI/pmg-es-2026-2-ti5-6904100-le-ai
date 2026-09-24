package br.com.leai.identidade.seguimento;

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
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Seguir, pedir para seguir, decidir pedidos e desfazer relações (RF-SOC-05..07). Toda escrita
 * exige `Idempotency-Key`, com o autenticado como sujeito: repetir a chave devolve a resposta
 * original sem segunda relação, pedido ou evento.
 */
@RestController
@Tag(name = "seguimento", description = "Seguidores, seguidos e solicitações de seguir")
@SecurityRequirement(name = "bearerAuth")
public class SeguimentoController {

  private final ServicoDeSeguimento servico;
  private final ServicoDeIdempotencia idempotencia;

  public SeguimentoController(ServicoDeSeguimento servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/perfis/{username}/seguir")
  @Operation(
      summary = "Segue um perfil público ou pede para seguir um privado (RF-SOC-05/06)",
      description =
          "Público: seguimento imediato e evento seguidor.novo. Privado: pedido pendente e evento "
              + "solicitacao.criada. Auto-seguimento, relação existente e pedido pendente são 409. "
              + "Limite de 30 por minuto por usuário (RNF-SEC-18).")
  @ApiResponse(responseCode = "201", description = "Seguindo ou pedido pendente.")
  @ApiResponse(
      responseCode = "409",
      description = "Próprio perfil, já segue, já pediu ou chave reutilizada.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<ResultadoSeguir> seguir(
      @AuthenticationPrincipal Jwt token,
      @PathVariable String username,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    RespostaIdempotente<ResultadoSeguir> resposta =
        executar(
            eu,
            OperacaoIdempotente.SEGUIR_PERFIL,
            chave,
            Map.of("username", username),
            ResultadoSeguir.class,
            () -> new RespostaIdempotente<>(HttpStatus.CREATED.value(), servico.seguir(eu, username)));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/perfis/{username}/seguir")
  @Operation(summary = "Deixa de seguir outro leitor (RF-SOC-07)")
  @ApiResponse(responseCode = "204", description = "Seguimento removido ou já ausente.")
  public ResponseEntity<Void> deixarDeSeguir(
      @AuthenticationPrincipal Jwt token,
      @PathVariable String username,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.DEIXAR_DE_SEGUIR,
        chave,
        Map.of("username", username),
        () -> servico.deixarDeSeguir(eu, username));
  }

  @DeleteMapping("/seguidores/{username}")
  @Operation(summary = "Remove um seguidor do usuário autenticado (RF-SOC-07)")
  @ApiResponse(responseCode = "204", description = "Seguidor removido ou relação já ausente.")
  public ResponseEntity<Void> removerSeguidor(
      @AuthenticationPrincipal Jwt token,
      @PathVariable String username,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.REMOVER_SEGUIDOR,
        chave,
        Map.of("username", username),
        () -> servico.removerSeguidor(eu, username));
  }

  @GetMapping("/solicitacoes")
  @Operation(summary = "Lista as solicitações de seguir recebidas, mais recentes primeiro")
  @ApiResponse(responseCode = "200", description = "Página de pedidos pendentes recebidos.")
  public Pagina<SolicitacaoResposta> solicitacoes(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + Pagina.TAMANHO_PADRAO) int size) {
    return servico.solicitacoes(autenticado(token), page, size);
  }

  @PostMapping("/solicitacoes/{id}/aceitar")
  @Operation(
      summary = "Aceita uma solicitação de seguir recebida (RF-SOC-06)",
      description =
          "Cria o seguimento e publica solicitacao.aceita. Pedido de outra pessoa é 404, como o "
              + "inexistente; pedido já respondido é 409.")
  @ApiResponse(responseCode = "204", description = "Aceita e seguimento criado.")
  public ResponseEntity<Void> aceitar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID id,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.ACEITAR_SOLICITACAO,
        chave,
        Map.of("id", id.toString()),
        () -> servico.aceitar(eu, id));
  }

  @PostMapping("/solicitacoes/{id}/recusar")
  @Operation(summary = "Recusa uma solicitação de seguir recebida (RF-SOC-06)")
  @ApiResponse(responseCode = "204", description = "Solicitação recusada.")
  public ResponseEntity<Void> recusar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID id,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.RECUSAR_SOLICITACAO,
        chave,
        Map.of("id", id.toString()),
        () -> servico.recusar(eu, id));
  }

  private ResponseEntity<Void> semCorpo(
      UUID eu, OperacaoIdempotente operacao, String chave, Object payload, Runnable efeito) {
    executar(
        eu,
        operacao,
        chave,
        payload,
        Void.class,
        () -> {
          efeito.run();
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }

  private <T> RespostaIdempotente<T> executar(
      UUID eu,
      OperacaoIdempotente operacao,
      String chaveBruta,
      Object payload,
      Class<T> tipo,
      Supplier<RespostaIdempotente<T>> efeito) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    return idempotencia.executar(eu, operacao, chave, payload, tipo, efeito);
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

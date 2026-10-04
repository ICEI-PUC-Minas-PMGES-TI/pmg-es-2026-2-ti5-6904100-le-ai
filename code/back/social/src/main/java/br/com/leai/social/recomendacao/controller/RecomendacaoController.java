package br.com.leai.social.recomendacao.controller;

import br.com.leai.social.common.Paginacao;
import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.recomendacao.dto.CriarRecomendacaoRequisicao;
import br.com.leai.social.recomendacao.dto.ListaCandidatosResposta;
import br.com.leai.social.recomendacao.dto.PaginaRecomendacoesResposta;
import br.com.leai.social.recomendacao.dto.ResultadoRecomendacaoResposta;
import br.com.leai.social.recomendacao.service.ServicoDeRecomendacao;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recomendação P2P (F-REC-P2P): enviar, listar candidatos, ver recebidas e descartar. Mesmo padrão
 * de {@code InteracaoController} para as escritas idempotentes.
 */
@RestController
@Tag(
    name = "recomendacoes",
    description = "Recomendação de livro entre leitores com seguimento mútuo (F-REC-P2P)")
@SecurityRequirement(name = "bearerAuth")
public class RecomendacaoController {

  private final ServicoDeRecomendacao servico;
  private final ServicoDeIdempotencia idempotencia;

  public RecomendacaoController(ServicoDeRecomendacao servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/recomendacoes")
  @Operation(
      summary = "Recomenda um livro oficial a um ou mais leitores (RF-REC-01/03/06/07)",
      description =
          "Cria uma recomendação por destinatário elegível e devolve o resultado de cada um. "
              + "Livro pessoal rejeita o envio inteiro; sem mútuo, já tem o livro, limite do par "
              + "ou recomendação ativa repetida bloqueiam só aquele destinatário.")
  @ApiResponse(responseCode = "200", description = "Resultado do envio por destinatário.")
  @ApiResponse(
      responseCode = "422",
      description = "O livro é pessoal.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<ResultadoRecomendacaoResposta> recomendar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody CriarRecomendacaoRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("livroId", requisicao.livroId().toString());
    payload.put("destinatarios", requisicao.destinatarios().stream().map(UUID::toString).toList());
    payload.put("mensagem", requisicao.mensagem());
    RespostaIdempotente<ResultadoRecomendacaoResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.RECOMENDAR_LIVRO,
            ChaveDeIdempotencia.exigir(chave),
            payload,
            ResultadoRecomendacaoResposta.class,
            () -> new RespostaIdempotente<>(HttpStatus.OK.value(), servico.recomendar(eu, requisicao)));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @GetMapping("/recomendacoes/candidatos")
  @Operation(
      summary = "Lista os mútuos do leitor que podem receber um livro",
      description =
          "Todos os mútuos, para a busca local, com jaTemLivro e limiteAtingido para o livro.")
  @ApiResponse(responseCode = "200", description = "Mútuos com a situação de cada um.")
  public ListaCandidatosResposta candidatos(
      @AuthenticationPrincipal Jwt token, @RequestParam UUID livroId) {
    return servico.candidatos(autenticado(token), livroId);
  }

  @GetMapping("/recomendacoes/recebidas")
  @Operation(
      summary = "Lista as recomendações recebidas pelo leitor (RF-REC-04/05/13/14)",
      description = "Só ativas e não expiradas, da mais recente para a mais antiga.")
  @ApiResponse(responseCode = "200", description = "Página de recomendações recebidas.")
  public PaginaRecomendacoesResposta recebidas(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + Paginacao.TAMANHO_PADRAO) int size) {
    return servico.recebidas(autenticado(token), page, size);
  }

  @DeleteMapping("/recomendacoes/{recomendacaoId}")
  @Operation(
      summary = "Descarta uma recomendação recebida (RF-REC-15, RN-22.11)",
      description =
          "Exclusivo do destinatário, sem motivo e sem avisar o remetente. Recomendação de outro "
              + "leitor responde 404, sem confirmar a existência.")
  @ApiResponse(responseCode = "204", description = "Recomendação descartada.")
  @ApiResponse(
      responseCode = "404",
      description = "Recomendação inexistente, expirada ou de outro leitor.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> descartar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID recomendacaoId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    idempotencia.executar(
        eu,
        OperacaoIdempotente.DESCARTAR_RECOMENDACAO,
        ChaveDeIdempotencia.exigir(chave),
        Map.of("recomendacaoId", recomendacaoId.toString()),
        Void.class,
        () -> {
          servico.descartar(eu, recomendacaoId);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

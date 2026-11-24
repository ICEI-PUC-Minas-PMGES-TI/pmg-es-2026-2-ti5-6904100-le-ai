package br.com.leai.social.recomendacao.controller;

import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.recomendacao.dto.DescartarLoteRequisicao;
import br.com.leai.social.recomendacao.dto.DescarteEmLoteResposta;
import br.com.leai.social.recomendacao.dto.RestantesDoLivroResposta;
import br.com.leai.social.recomendacao.dto.SugestoesResposta;
import br.com.leai.social.recomendacao.service.ServicoDeSugestao;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "recomendacoes")
@SecurityRequirement(name = "bearerAuth")
public class SugestaoController {

  private final ServicoDeSugestao servico;
  private final ServicoDeIdempotencia idempotencia;

  public SugestaoController(ServicoDeSugestao servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @GetMapping("/recomendacoes/sugestoes")
  @Operation(
      summary = "Sugere livros pelas leituras de quem o leitor segue e pelo gosto dele (RF-REC-08/09/10/11)",
      description =
          "Sem secao, devolve a primeira página das duas seções. Com secao (seguidos ou gosto) e "
              + "offset, devolve só a continuação daquela seção. O tamanho da página e o teto de "
              + "cada seção são do servidor. Livro na estante do leitor, livro pessoal e sugestão "
              + "descartada nunca aparecem; o motivo diz quantos leram, nunca quem (RN-08).")
  @ApiResponse(responseCode = "200", description = "Sugestões com o motivo de cada uma.")
  @ApiResponse(
      responseCode = "400",
      description = "Seção desconhecida ou offset sem seção.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public SugestoesResposta sugestoes(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(required = false) String secao,
      @RequestParam(defaultValue = "0") int offset) {
    return servico.sugestoes(autenticado(token), secao, offset);
  }

  @PostMapping("/recomendacoes/sugestoes/{livroId}/descartar")
  @Operation(
      summary = "Descarta uma sugestão, que não volta a aparecer (RF-REC-12)",
      description =
          "Exclusivo do próprio leitor. Repetir o descarte não é erro, com ou sem Idempotency-Key.")
  @ApiResponse(responseCode = "204", description = "Sugestão descartada.")
  @ApiResponse(
      responseCode = "404",
      description = "O livro não existe no catálogo.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> descartar(
      @AuthenticationPrincipal Jwt token, @PathVariable UUID livroId) {
    servico.descartar(autenticado(token), livroId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/recomendacoes/recebidas/restantes")
  @Operation(
      summary = "Conta as recomendações ativas de um livro na lista do leitor (RN-22.12)",
      description =
          "O cliente consulta no terceiro descarte do mesmo livro, para decidir se oferece o "
              + "descarte em lote. A contagem de descartes e a supressão da pergunta são do cliente.")
  @ApiResponse(responseCode = "200", description = "Quantas restam.")
  public RestantesDoLivroResposta restantes(
      @AuthenticationPrincipal Jwt token, @RequestParam UUID livroId) {
    return servico.restantes(autenticado(token), livroId);
  }

  @PostMapping("/recomendacoes/descartar-lote")
  @Operation(
      summary = "Descarta todas as recomendações recebidas de um livro (RF-REC-17, RN-22.12)",
      description =
          "Exclusivo do destinatário, sem avisar os remetentes e sem restauração. Lote já vazio "
              + "responde sucesso com zero.")
  @ApiResponse(responseCode = "200", description = "Quantas recomendações saíram.")
  public ResponseEntity<DescarteEmLoteResposta> descartarLote(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody DescartarLoteRequisicao requisicao) {
    UUID eu = autenticado(token);
    RespostaIdempotente<DescarteEmLoteResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.DESCARTAR_RECOMENDACOES_DO_LIVRO,
            ChaveDeIdempotencia.exigir(chave),
            Map.of("livroId", requisicao.livroId().toString()),
            DescarteEmLoteResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(), servico.descartarLote(eu, requisicao.livroId())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

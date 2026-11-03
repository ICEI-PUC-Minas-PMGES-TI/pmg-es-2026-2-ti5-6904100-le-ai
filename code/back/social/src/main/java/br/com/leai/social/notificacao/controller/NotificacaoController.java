package br.com.leai.social.notificacao.controller;

import br.com.leai.social.common.Paginacao;
import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.notificacao.dto.MarcarLidasRequisicao;
import br.com.leai.social.notificacao.dto.PaginaNotificacoesResposta;
import br.com.leai.social.notificacao.dto.ResultadoMarcarLidasResposta;
import br.com.leai.social.notificacao.service.CanaisDeNotificacao;
import br.com.leai.social.notificacao.service.ServicoDeNotificacao;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Notificações in-app do leitor autenticado (RF-NOT-02/03). Mesmo padrão de {@code
 * InteracaoController}: o destinatário vem sempre do token, nunca do cliente, e a escrita passa
 * por {@link ServicoDeIdempotencia} na mesma transação do efeito (RNF-ERR-04).
 */
@RestController
@Tag(name = "notificacoes", description = "Notificações in-app do leitor autenticado")
@SecurityRequirement(name = "bearerAuth")
public class NotificacaoController {

  private static final String CABECALHO_BUFFER_DE_PROXY = "X-Accel-Buffering";

  private final ServicoDeNotificacao servico;
  private final ServicoDeIdempotencia idempotencia;
  private final CanaisDeNotificacao canais;

  public NotificacaoController(
      ServicoDeNotificacao servico,
      ServicoDeIdempotencia idempotencia,
      CanaisDeNotificacao canais) {
    this.servico = servico;
    this.idempotencia = idempotencia;
    this.canais = canais;
  }

  @GetMapping("/notificacoes")
  @Operation(
      summary = "Lista as notificações do leitor (RF-NOT-02)",
      description =
          "Somente notificações cujo destinatário é o leitor autenticado, da mais recente para a "
              + "mais antiga, com estado lida/não lida e o total de não lidas para o badge. Quem "
              + "agiu e perdeu a visibilidade (conta suspensa ou em exclusão) não é exposto.")
  @ApiResponse(responseCode = "200", description = "Página de notificações do leitor autenticado.")
  @ApiResponse(
      responseCode = "400",
      description = "Página negativa ou tamanho fora de 1 a 50.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PaginaNotificacoesResposta listar(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + Paginacao.TAMANHO_PADRAO) int size) {
    return servico.listar(autenticado(token), page, size);
  }

  @PostMapping("/notificacoes/marcar-lidas")
  @Operation(
      summary = "Marca notificações como lidas, individualmente ou em lote (RF-NOT-03)",
      description =
          "SELECIONADAS exige ids (um id é a marcação individual, até 100 formam o lote); TODAS "
              + "não aceita ids e marca todas as não lidas. Id de outro destinatário responde 404 "
              + "sem alterar nada. Repetir a mesma chave devolve o mesmo resultado.")
  @ApiResponse(responseCode = "200", description = "Estado de leitura atualizado.")
  @ApiResponse(
      responseCode = "400",
      description = "Modo ausente, ids em TODAS, ids ausentes/repetidos em SELECIONADAS.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "404",
      description = "Alguma notificação inexistente ou de outro destinatário.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResultadoMarcarLidasResposta marcarLidas(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody MarcarLidasRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("modo", requisicao.modo().name());
    payload.put(
        "ids",
        requisicao.ids() == null ? null : requisicao.ids().stream().map(String::valueOf).toList());
    RespostaIdempotente<ResultadoMarcarLidasResposta> resposta =
        idempotencia.executar(
            eu,
            OperacaoIdempotente.MARCAR_NOTIFICACOES_LIDAS,
            ChaveDeIdempotencia.exigir(chave),
            payload,
            ResultadoMarcarLidasResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(), servico.marcarLidas(eu, requisicao)));
    return resposta.corpo();
  }

  @GetMapping(path = "/notificacoes/tempo-real", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  @Operation(
      summary = "Canal SSE de notificações em tempo real (RF-NOT-06)",
      description =
          "Server-Sent Events do leitor autenticado, com o token no cabeçalho Authorization. "
              + "Abre com o evento `sincronizacao` (total de não lidas); cada notificação nova "
              + "chega como `notificacao` (NotificacaoTempoReal). Comentários de heartbeat "
              + "mantêm a conexão viva. O servidor encerra o canal quando o token expira; o "
              + "cliente renova a sessão e reconecta com backoff. A lista paginada continua "
              + "sendo a fonte de verdade.")
  @ApiResponse(responseCode = "200", description = "Canal aberto (text/event-stream).")
  @ApiResponse(
      responseCode = "401",
      description = "Token ausente, inválido ou expirado.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public SseEmitter tempoReal(@AuthenticationPrincipal Jwt token, HttpServletResponse resposta) {
    // Proxies que bufferizam a resposta segurariam os eventos até o fim do canal.
    resposta.setHeader(CABECALHO_BUFFER_DE_PROXY, "no");
    return canais.abrir(autenticado(token), token.getExpiresAt());
  }

  private static UUID autenticado(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

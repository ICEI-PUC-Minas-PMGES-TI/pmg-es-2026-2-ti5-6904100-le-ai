package br.com.leai.social.feed.controller;

import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.feed.dto.ComentarioResposta;
import br.com.leai.social.feed.dto.CriarComentarioRequisicao;
import br.com.leai.social.feed.dto.EditarComentarioRequisicao;
import br.com.leai.social.feed.dto.EstadoCurtidaResposta;
import br.com.leai.social.feed.dto.ListaRespostasResposta;
import br.com.leai.social.feed.dto.PaginaComentariosResposta;
import br.com.leai.social.feed.service.ServicoDeFeed;
import br.com.leai.social.feed.service.ServicoDeInteracao;
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
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Curtir/descurtir, comentar e listar comentários/respostas (RF-SOC-11/12/15/18). Mesmo padrão de
 * {@code identidade.seguimento.SeguimentoController} (`@AuthenticationPrincipal Jwt`,
 * {@code UUID.fromString(token.getSubject())}, `executar`/`semCorpo` para as escritas
 * idempotentes). As rotas de escrita (curtir, descurtir, comentar) já são cobertas pelo {@code
 * RateLimitFilter} da Task 1 por sufixo de caminho.
 */
@RestController
@Tag(name = "interacoes", description = "Curtidas, comentários e respostas")
@SecurityRequirement(name = "bearerAuth")
public class InteracaoController {

  private final ServicoDeInteracao servico;
  private final ServicoDeIdempotencia idempotencia;

  public InteracaoController(ServicoDeInteracao servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/atividades/{atividadeId}/curtir")
  @Operation(
      summary = "Curte uma atividade visível (RF-SOC-11)",
      description =
          "Cria no máximo uma curtida por leitor e atividade. Revalida visibilidade e aplica rate "
              + "limiting. Repetir a mesma chave com o mesmo payload devolve o mesmo efeito. Grava "
              + "atividade.curtida na outbox só quando a curtida é efetivamente nova.")
  @ApiResponse(responseCode = "201", description = "Curtida criada, ou resposta reproduzida pela mesma chave.")
  @ApiResponse(
      responseCode = "404",
      description = "Atividade inexistente ou não visível.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<EstadoCurtidaResposta> curtir(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID atividadeId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    RespostaIdempotente<EstadoCurtidaResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.CURTIR_ATIVIDADE,
            chave,
            Map.of("atividadeId", atividadeId.toString()),
            EstadoCurtidaResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.CREATED.value(), servico.curtir(eu, atividadeId)));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/atividades/{atividadeId}/curtir")
  @Operation(
      summary = "Remove a própria curtida de uma atividade (RF-SOC-11)",
      description =
          "Remove somente a curtida do leitor autenticado. Ausência da própria curtida mantém o "
              + "resultado idempotente (204).")
  @ApiResponse(responseCode = "204", description = "Curtida própria ausente após a operação.")
  public ResponseEntity<Void> descurtir(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID atividadeId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.DESCURTIR_ATIVIDADE,
        chave,
        Map.of("atividadeId", atividadeId.toString()),
        () -> servico.descurtir(eu, atividadeId));
  }

  @GetMapping("/atividades/{atividadeId}/comentarios")
  @Operation(
      summary = "Lista comentários-raiz de uma atividade",
      description =
          "Só comentários-raiz, paginados do mais antigo para o mais recente. Respostas são "
              + "consultadas pela rota própria. A atividade precisa continuar visível.")
  @ApiResponse(responseCode = "200", description = "Página de comentários-raiz.")
  @ApiResponse(
      responseCode = "404",
      description = "Atividade inexistente ou não visível.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PaginaComentariosResposta listarComentarios(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID atividadeId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + ServicoDeFeed.TAMANHO_PADRAO) int size) {
    return servico.listarComentariosRaiz(autenticado(token), atividadeId, page, size);
  }

  @PostMapping("/atividades/{atividadeId}/comentarios")
  @Operation(
      summary = "Comenta uma atividade ou responde a um comentário (RF-SOC-12)",
      description =
          "Sem comentarioRespondidoId cria comentário-raiz. Com o campo, cria uma resposta: se o "
              + "alvo já é resposta, o novo registro vira irmão sob a mesma raiz (RN-10) — o "
              + "servidor deriva a raiz e usuarioRespondido do alvo, nunca do cliente. Revalida "
              + "visibilidade e aplica rate limiting. Publica atividade.comentada ou "
              + "comentario.respondido, nunca os dois.")
  @ApiResponse(responseCode = "201", description = "Comentário ou resposta criado.")
  @ApiResponse(
      responseCode = "404",
      description = "Atividade ou comentário respondido inexistente/não visível.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "422",
      description = "Regra de negócio de nesting violada (cinto de segurança do trigger).",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<ComentarioResposta> comentar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID atividadeId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody CriarComentarioRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("atividadeId", atividadeId.toString());
    payload.put("texto", requisicao.texto());
    payload.put(
        "comentarioRespondidoId",
        requisicao.comentarioRespondidoId() == null ? null : requisicao.comentarioRespondidoId().toString());
    RespostaIdempotente<ComentarioResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.CRIAR_COMENTARIO,
            chave,
            payload,
            ComentarioResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.CREATED.value(),
                    servico.comentar(
                        eu, atividadeId, requisicao.texto(), requisicao.comentarioRespondidoId())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @PatchMapping("/comentarios/{comentarioId}")
  @Operation(
      summary = "Edita o próprio comentário (RF-SOC-13)",
      description =
          "Só o autor edita (RNF-SEC-02). Raiz, alvo e nível não mudam (RN-10). As menções são "
              + "reprocessadas e só destinatário novo recebe usuario.mencionado. Aplica rate "
              + "limiting de comentário e de menção.")
  @ApiResponse(responseCode = "200", description = "Comentário com o texto novo.")
  @ApiResponse(
      responseCode = "403",
      description = "O comentário é de outra pessoa.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "404",
      description = "Comentário inexistente ou atividade não visível.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "429",
      description = "Limite de comentários ou de menções atingido.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<ComentarioResposta> editarComentario(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID comentarioId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody EditarComentarioRequisicao requisicao) {
    UUID eu = autenticado(token);
    RespostaIdempotente<ComentarioResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.EDITAR_COMENTARIO,
            chave,
            Map.of("comentarioId", comentarioId.toString(), "texto", requisicao.texto()),
            ComentarioResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(), servico.editar(eu, comentarioId, requisicao.texto())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/comentarios/{comentarioId}")
  @Operation(
      summary = "Exclui fisicamente o próprio comentário (RF-SOC-13)",
      description =
          "Só o autor exclui (RNF-SEC-02). Excluir uma raiz remove as respostas dela por cascade "
              + "(RN-10.5); não existe estado de comentário excluído.")
  @ApiResponse(responseCode = "204", description = "Comentário excluído.")
  @ApiResponse(
      responseCode = "403",
      description = "O comentário é de outra pessoa.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "404",
      description = "Comentário inexistente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> excluirComentario(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID comentarioId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.EXCLUIR_COMENTARIO,
        chave,
        Map.of("comentarioId", comentarioId.toString()),
        () -> servico.excluir(eu, comentarioId));
  }

  @GetMapping("/comentarios/{comentarioRaizId}/respostas")
  @Operation(
      summary = "Lista respostas diretas de um comentário-raiz",
      description =
          "Paginação por cursor estável. Só respostas irmãs sob a raiz, inclusive as criadas em "
              + "resposta a outra resposta (RN-10). Revalida visibilidade da atividade antes de "
              + "retornar qualquer comentário.")
  @ApiResponse(responseCode = "200", description = "Segmento de respostas e cursor para o próximo segmento.")
  @ApiResponse(
      responseCode = "404",
      description = "Comentário-raiz inexistente ou atividade não visível.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ListaRespostasResposta listarRespostas(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID comentarioRaizId,
      @RequestParam(required = false) String cursor,
      @RequestParam(name = "limit", defaultValue = "" + ServicoDeFeed.TAMANHO_PADRAO) int limit) {
    return servico.listarRespostas(autenticado(token), comentarioRaizId, cursor, limit);
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

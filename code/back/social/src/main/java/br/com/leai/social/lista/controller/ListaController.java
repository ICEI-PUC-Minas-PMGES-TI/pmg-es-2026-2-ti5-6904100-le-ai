package br.com.leai.social.lista.controller;

import br.com.leai.social.common.Paginacao;
import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.lista.dto.AdicionarLivroNaListaRequisicao;
import br.com.leai.social.lista.dto.CriarListaRequisicao;
import br.com.leai.social.lista.dto.EditarListaRequisicao;
import br.com.leai.social.lista.dto.ItemDeListaResposta;
import br.com.leai.social.lista.dto.ListaItensResposta;
import br.com.leai.social.lista.dto.ListaResposta;
import br.com.leai.social.lista.dto.MoverLivroNaListaRequisicao;
import br.com.leai.social.lista.dto.PaginaListasResposta;
import br.com.leai.social.lista.service.ServicoDeListas;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Listas de livros (F-LST, RF-LST-01..06). Mesmo padrão do {@code InteracaoController}: usuário
 * pelo {@code sub} do JWT e escritas pelo par {@code executar}/{@code semCorpo}, com {@code
 * Idempotency-Key} obrigatória.
 */
@RestController
@Tag(name = "listas", description = "Listas de livros curadas pelo leitor (F-LST)")
@SecurityRequirement(name = "bearerAuth")
public class ListaController {

  private final ServicoDeListas servico;
  private final ServicoDeIdempotencia idempotencia;

  public ListaController(ServicoDeListas servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/listas")
  @Operation(
      operationId = "criarLista",
      summary = "Cria uma lista do leitor (RF-LST-01)",
      description =
          "O dono é sempre o leitor autenticado. Com livroId, a lista nasce com esse livro na "
              + "posição 1, na mesma transação. O livro precisa estar ativo e ser oficial ou "
              + "livro pessoal do próprio leitor (RN-15.1).")
  @ApiResponse(responseCode = "201", description = "Lista criada, ou resposta reproduzida pela mesma chave.")
  @ApiResponse(
      responseCode = "422",
      description = "Livro inativo, inexistente ou pessoal de outro leitor.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<ListaResposta> criar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody CriarListaRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("titulo", requisicao.titulo());
    payload.put("descricao", requisicao.descricao());
    payload.put("livroId", texto(requisicao.livroId()));
    RespostaIdempotente<ListaResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.CRIAR_LISTA,
            chave,
            payload,
            ListaResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.CREATED.value(),
                    servico.criar(
                        eu, requisicao.titulo(), requisicao.descricao(), requisicao.livroId())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @GetMapping("/listas/{listaId}")
  @Operation(
      operationId = "obterLista",
      summary = "Obtém os metadados de uma lista visível (RF-LST-04)",
      description =
          "O dono sempre vê. Terceiros veem perfil público, ou privado com seguimento aceito "
              + "(RN-08); sem isso, 403 de perfil privado.")
  @ApiResponse(responseCode = "200", description = "Metadados da lista.")
  @ApiResponse(
      responseCode = "403",
      description = "Perfil privado sem seguimento aceito.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ListaResposta obter(@AuthenticationPrincipal Jwt token, @PathVariable UUID listaId) {
    return servico.obter(autenticado(token), listaId);
  }

  @PatchMapping("/listas/{listaId}")
  @Operation(
      operationId = "editarLista",
      summary = "Edita título e descrição da própria lista (RF-LST-03)",
      description =
          "Owner-only. Campo omitido permanece; descricao nula apaga a descrição. Lista alheia "
              + "responde 404.")
  @ApiResponse(responseCode = "200", description = "Lista atualizada.")
  public ResponseEntity<ListaResposta> editar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody EditarListaRequisicao requisicao) {
    UUID eu = autenticado(token);
    // Só entram no hash os campos enviados: omitir e mandar nulo são pedidos diferentes.
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("listaId", listaId.toString());
    if (requisicao.tituloInformado()) {
      payload.put("titulo", requisicao.titulo());
    }
    if (requisicao.descricaoInformada()) {
      payload.put("descricao", requisicao.descricao());
    }
    RespostaIdempotente<ListaResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.EDITAR_LISTA,
            chave,
            payload,
            ListaResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(),
                    servico.editar(
                        eu,
                        listaId,
                        requisicao.titulo(),
                        requisicao.tituloInformado(),
                        requisicao.descricao(),
                        requisicao.descricaoInformada())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/listas/{listaId}")
  @Operation(
      operationId = "excluirLista",
      summary = "Exclui a própria lista (RF-LST-03)",
      description =
          "Owner-only e lógica: a lista sai de todas as rotas e de v_lista_livro_pessoal_v1 na "
              + "mesma transação. Lista já excluída mantém o 204.")
  @ApiResponse(responseCode = "204", description = "Lista própria ausente após a operação.")
  public ResponseEntity<Void> excluir(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.EXCLUIR_LISTA,
        chave,
        Map.of("listaId", listaId.toString()),
        () -> servico.excluir(eu, listaId));
  }

  @GetMapping("/listas/{listaId}/livros")
  @Operation(
      operationId = "listarLivrosDaLista",
      summary = "Lista os livros de uma lista visível, na ordem do dono (RF-LST-04)",
      description =
          "Cursor estável, em ordem crescente de posição, com a visibilidade de obterLista. Livro "
              + "inativo não é exibido. Livro pessoal sai com via=lista e referenciaId da lista.")
  @ApiResponse(responseCode = "200", description = "Segmento de itens e cursor para o próximo.")
  public ListaItensResposta listarLivros(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @RequestParam(required = false) String cursor,
      @RequestParam(defaultValue = "" + Paginacao.TAMANHO_PADRAO) int limit) {
    return servico.listarItens(autenticado(token), listaId, cursor, limit);
  }

  @PostMapping("/listas/{listaId}/livros")
  @Operation(
      operationId = "adicionarLivroNaLista",
      summary = "Adiciona um livro à própria lista (RF-LST-02, RF-LST-05)",
      description =
          "Owner-only. Entra na última posição. Livro já presente não duplica: 200 com o item "
              + "existente. Livro pessoal de outro leitor responde 422 (RN-15.1).")
  @ApiResponse(responseCode = "201", description = "Livro adicionado, ou resposta reproduzida pela mesma chave.")
  @ApiResponse(responseCode = "200", description = "O livro já estava na lista; item existente.")
  public ResponseEntity<ItemDeListaResposta> adicionar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody AdicionarLivroNaListaRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("listaId", listaId.toString());
    payload.put("livroId", requisicao.livroId().toString());
    RespostaIdempotente<ItemDeListaResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.ADICIONAR_LIVRO_NA_LISTA,
            chave,
            payload,
            ItemDeListaResposta.class,
            () -> {
              ServicoDeListas.Inclusao inclusao =
                  servico.adicionar(eu, listaId, requisicao.livroId());
              HttpStatus status = inclusao.novo() ? HttpStatus.CREATED : HttpStatus.OK;
              return new RespostaIdempotente<>(status.value(), inclusao.item());
            });
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @DeleteMapping("/listas/{listaId}/livros/{livroId}")
  @Operation(
      operationId = "removerLivroDaLista",
      summary = "Remove um livro da própria lista (RF-LST-02)",
      description =
          "Owner-only. Os itens seguintes sobem uma posição na mesma transação. Livro ausente "
              + "mantém o 204.")
  @ApiResponse(responseCode = "204", description = "Livro ausente da lista após a operação.")
  public ResponseEntity<Void> remover(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @PathVariable UUID livroId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    UUID eu = autenticado(token);
    return semCorpo(
        eu,
        OperacaoIdempotente.REMOVER_LIVRO_DA_LISTA,
        chave,
        Map.of("listaId", listaId.toString(), "livroId", livroId.toString()),
        () -> servico.remover(eu, listaId, livroId));
  }

  @PutMapping("/listas/{listaId}/livros/{itemId}/posicao")
  @Operation(
      operationId = "moverLivroNaLista",
      summary = "Move um livro para outra posição da própria lista (RF-LST-02)",
      description =
          "Owner-only. Os itens do intervalo se deslocam uma casa em uma transação. Posição fora "
              + "de 1 até a quantidade de livros responde 400; item de outra lista, 404.")
  @ApiResponse(responseCode = "200", description = "Item na nova posição.")
  public ResponseEntity<ItemDeListaResposta> mover(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID listaId,
      @PathVariable UUID itemId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave,
      @Valid @RequestBody MoverLivroNaListaRequisicao requisicao) {
    UUID eu = autenticado(token);
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("listaId", listaId.toString());
    payload.put("itemId", itemId.toString());
    payload.put("posicao", requisicao.posicao());
    RespostaIdempotente<ItemDeListaResposta> resposta =
        executar(
            eu,
            OperacaoIdempotente.MOVER_LIVRO_NA_LISTA,
            chave,
            payload,
            ItemDeListaResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.OK.value(),
                    servico.mover(eu, listaId, itemId, requisicao.posicao())));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @GetMapping("/perfis/{usuarioId}/listas")
  @Operation(
      operationId = "listarListasDoPerfil",
      summary = "Lista as listas de um leitor (RF-LST-04, RF-SOC-02)",
      description =
          "Listas ativas, da alterada mais recentemente para a mais antiga, com contagem e até "
              + "três capas. RN-08: perfil privado sem seguimento aceito responde 403.")
  @ApiResponse(responseCode = "200", description = "Página de listas do leitor.")
  public PaginaListasResposta listarDoPerfil(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID usuarioId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + Paginacao.TAMANHO_PADRAO) int size) {
    return servico.listarDoPerfil(autenticado(token), usuarioId, page, size);
  }

  @GetMapping("/me/listas")
  @Operation(
      operationId = "listarMinhasListas",
      summary = "Lista as listas do próprio leitor, marcando as que contêm um livro",
      description = "Com livroId, cada lista traz contemLivro; sem ele, o campo é omitido.")
  @ApiResponse(responseCode = "200", description = "Página de listas do leitor autenticado.")
  public PaginaListasResposta listarMinhas(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(required = false) UUID livroId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "" + Paginacao.TAMANHO_PADRAO) int size) {
    return servico.listarMinhas(autenticado(token), livroId, page, size);
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

  private static String texto(UUID id) {
    return id == null ? null : id.toString();
  }
}

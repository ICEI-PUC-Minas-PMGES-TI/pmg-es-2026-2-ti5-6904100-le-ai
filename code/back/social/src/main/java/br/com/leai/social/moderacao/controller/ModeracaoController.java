package br.com.leai.social.moderacao.controller;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.Paginacao;
import br.com.leai.social.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.moderacao.dto.PaginaDenunciasResposta;
import br.com.leai.social.moderacao.dto.PaginaRegistrosResposta;
import br.com.leai.social.moderacao.dto.ResultadoModeracaoResposta;
import br.com.leai.social.moderacao.service.ServicoDeModeracao;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Painel de moderação (F-MOD, RF-MOD-02/03/05). Toda rota de {@code /admin} exige o papel de
 * administrador no {@code SecurityConfig} (RNF-SEC-04); o leitor recebe 403.
 */
@RestController
@RequestMapping("/admin")
@Tag(name = "moderacao", description = "Denúncias e moderação de conteúdo")
@SecurityRequirement(name = "bearerAuth")
public class ModeracaoController {

  private final ServicoDeModeracao servico;

  public ModeracaoController(ServicoDeModeracao servico) {
    this.servico = servico;
  }

  @GetMapping("/denuncias")
  @Operation(
      operationId = "listarDenunciasPendentes",
      summary = "Denúncias pendentes, da mais antiga para a mais recente (RF-MOD-02)")
  public PaginaDenunciasResposta pendentes(
      @AuthenticationPrincipal Jwt token,
      @RequestParam(required = false) String cursor,
      @RequestParam(defaultValue = "20") int limite) {
    return servico.pendentes(admin(token), cursor, limiteValido(limite));
  }

  @PostMapping("/denuncias/{denunciaId}/arquivar")
  @Operation(
      operationId = "arquivarDenuncia",
      summary = "Arquiva a denúncia como improcedente (RF-MOD-03)")
  public ResponseEntity<ResultadoModeracaoResposta> arquivar(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID denunciaId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    return responder(servico.arquivar(admin(token), denunciaId, ChaveDeIdempotencia.exigir(chave)));
  }

  @PostMapping("/denuncias/{denunciaId}/remover")
  @Operation(
      operationId = "removerConteudoDenunciado",
      summary = "Remove o conteúdo denunciado e fecha as denúncias dele (RF-MOD-03)")
  public ResponseEntity<ResultadoModeracaoResposta> remover(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID denunciaId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    return responder(servico.remover(admin(token), denunciaId, ChaveDeIdempotencia.exigir(chave)));
  }

  @DeleteMapping("/frases/{fraseId}")
  @Operation(
      operationId = "removerFrasePeloAdmin",
      summary = "Remove uma frase direto, sem denúncia (RN-11), com auditoria")
  public ResponseEntity<Void> removerFrase(
      @AuthenticationPrincipal Jwt token,
      @PathVariable UUID fraseId,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chave) {
    RespostaIdempotente<Void> resposta =
        servico.removerFrase(admin(token), fraseId, ChaveDeIdempotencia.exigir(chave));
    return ResponseEntity.status(resposta.status()).build();
  }

  @GetMapping("/moderacao/logs")
  @Operation(
      operationId = "listarRegistrosDeModeracao",
      summary = "Registro de auditoria, da ação mais recente para a mais antiga (RF-MOD-05)")
  public PaginaRegistrosResposta registros(
      @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "20") int limite) {
    return servico.registros(cursor, limiteValido(limite));
  }

  private static ResponseEntity<ResultadoModeracaoResposta> responder(
      RespostaIdempotente<ResultadoModeracaoResposta> resposta) {
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  private static int limiteValido(int limite) {
    if (limite < 1 || limite > Paginacao.TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Limite de 1 a " + Paginacao.TAMANHO_MAXIMO + ".");
    }
    return limite;
  }

  private static UUID admin(Jwt token) {
    return UUID.fromString(token.getSubject());
  }
}

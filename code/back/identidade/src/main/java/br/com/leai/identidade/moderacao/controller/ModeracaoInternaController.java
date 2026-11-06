package br.com.leai.identidade.moderacao.controller;

import br.com.leai.identidade.auth.model.Papel;
import br.com.leai.identidade.auth.service.ContaAdministradora;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.moderacao.dto.EstadoDaSuspensaoResposta;
import br.com.leai.identidade.moderacao.service.ServicoDeSuspensao;
import br.com.leai.identidade.moderacao.service.TokenDeModeracao;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Comandos de suspensão e reativação de conta, chamados só pelo painel de moderação do {@code
 * social} (F-MOD-OPC). Ficam fora das rotas públicas: a cadeia do Spring já exige um JWT válido
 * (401) antes de chegar aqui. Depois vêm o segredo compartilhado (503 sem configuração, 401
 * errado), o papel de admin (403) e o alvo (404 ou 422). Conhecer a rota e o segredo não basta.
 *
 * <p>Cada comando traz em {@value #CABECALHO_COMANDO} o id da intenção do administrador; a
 * resolução conclui ou cancela um comando cujo resultado se perdeu (revisão do PR #61).
 */
@RestController
@Tag(name = "interno", description = "Comandos internos entre serviços")
public class ModeracaoInternaController {

  static final String CABECALHO_COMANDO = "X-Comando-Id";

  private static final Logger log = LoggerFactory.getLogger(ModeracaoInternaController.class);

  private final ServicoDeSuspensao servico;
  private final TokenDeModeracao tokenDeModeracao;
  private final ContaAdministradora contaAdministradora;

  public ModeracaoInternaController(
      ServicoDeSuspensao servico,
      TokenDeModeracao tokenDeModeracao,
      ContaAdministradora contaAdministradora) {
    this.servico = servico;
    this.tokenDeModeracao = tokenDeModeracao;
    this.contaAdministradora = contaAdministradora;
  }

  @PostMapping("/internal/moderacao/usuarios/{id}/suspensao")
  @SecurityRequirement(name = "bearerAuth")
  @SecurityRequirement(name = "moderacaoToken")
  @Operation(
      operationId = "suspenderContaInterno",
      summary = "Suspende a conta e revoga as renovações (RF-MOD-04)")
  public EstadoDaSuspensaoResposta suspender(
      @PathVariable UUID id,
      @RequestHeader(name = TokenDeModeracao.CABECALHO, required = false) String token,
      @Parameter(description = "Id da intenção, gerado pelo social; repetir devolve o resultado")
          @RequestHeader(name = CABECALHO_COMANDO)
          UUID comandoId,
      @AuthenticationPrincipal Jwt jwt) {
    return servico.suspender(id, exigirAdmin(token, jwt, id), comandoId);
  }

  @PostMapping("/internal/moderacao/usuarios/{id}/reativacao")
  @SecurityRequirement(name = "bearerAuth")
  @SecurityRequirement(name = "moderacaoToken")
  @Operation(operationId = "reativarContaInterno", summary = "Reativa a conta suspensa (RF-MOD-04)")
  public EstadoDaSuspensaoResposta reativar(
      @PathVariable UUID id,
      @RequestHeader(name = TokenDeModeracao.CABECALHO, required = false) String token,
      @Parameter(description = "Id da intenção, gerado pelo social; repetir devolve o resultado")
          @RequestHeader(name = CABECALHO_COMANDO)
          UUID comandoId,
      @AuthenticationPrincipal Jwt jwt) {
    return servico.reativar(id, exigirAdmin(token, jwt, id), comandoId);
  }

  @PostMapping("/internal/moderacao/usuarios/{id}/comandos/{comandoId}/resolucao")
  @SecurityRequirement(name = "bearerAuth")
  @SecurityRequirement(name = "moderacaoToken")
  @Operation(
      operationId = "resolverComandoDeContaInterno",
      summary =
          "Conclui ou cancela um comando de suspensão ou reativação sem resposta: o resultado"
              + " gravado, ou 409 COMANDO_CANCELADO se ele não tinha rodado (e não roda mais)")
  public EstadoDaSuspensaoResposta resolver(
      @PathVariable UUID id,
      @PathVariable UUID comandoId,
      @RequestHeader(name = TokenDeModeracao.CABECALHO, required = false) String token,
      @AuthenticationPrincipal Jwt jwt) {
    return servico
        .resolver(id, exigirAdmin(token, jwt, id), comandoId)
        .orElseThrow(
            () ->
                new ErroDeNegocioException(
                    CodigoErro.COMANDO_CANCELADO, CodigoErro.COMANDO_CANCELADO.mensagem()));
  }

  /** Revalida a autorização no serviço dono (RNF-SEC-04). Devolve o id do admin. */
  private UUID exigirAdmin(String token, Jwt jwt, UUID alvo) {
    tokenDeModeracao.exigir(token);
    UUID sujeito = sujeito(jwt);
    boolean papelAdmin = Papel.ADMIN.valor().equals(jwt.getClaimAsString(Papel.CLAIM));
    // Com o admin provisionado, só ele; sem ADMIN_* (dev), vale o papel do token assinado.
    boolean adminDoAmbiente = !contaAdministradora.definida() || contaAdministradora.eh(sujeito);
    if (!papelAdmin || !adminDoAmbiente) {
      log.warn(
          "Comando de moderação de conta recusado: sujeito {} sem papel de admin (alvo {})",
          jwt.getSubject(),
          alvo);
      throw new ErroDeNegocioException(
          CodigoErro.ACESSO_NEGADO, CodigoErro.ACESSO_NEGADO.mensagem());
    }
    return sujeito;
  }

  private static UUID sujeito(Jwt jwt) {
    String sub = jwt.getSubject();
    if (sub == null) {
      return null;
    }
    try {
      return UUID.fromString(sub);
    } catch (IllegalArgumentException invalido) {
      return null;
    }
  }
}

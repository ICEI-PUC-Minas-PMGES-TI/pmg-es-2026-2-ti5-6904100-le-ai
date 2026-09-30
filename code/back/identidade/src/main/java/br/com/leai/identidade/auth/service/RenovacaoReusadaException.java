package br.com.leai.identidade.auth.service;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.util.UUID;

/**
 * Token de renovação já revogado foi reapresentado.
 *
 * <p>Para o cliente é o mesmo 401 de qualquer token inválido. A diferença existe só no servidor:
 * carrega o dono para que as renovações dele sejam revogadas <b>depois</b> que a idempotência
 * descartar a hipótese de ser a repetição da mesma requisição (ver {@link GestorDeRenovacao}).
 */
public class RenovacaoReusadaException extends ErroDeNegocioException {

  private final transient UUID usuarioId;

  RenovacaoReusadaException(UUID usuarioId) {
    super(CodigoErro.NAO_AUTENTICADO, GestorDeRenovacao.SESSAO_EXPIRADA);
    this.usuarioId = usuarioId;
  }

  public UUID usuarioId() {
    return usuarioId;
  }
}

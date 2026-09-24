package br.com.leai.identidade.seguimento;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema `ResultadoSeguir`: `seguindo` para perfil público, pedido pendente para privado. */
@Schema(name = "ResultadoSeguir")
public record ResultadoSeguir(String estado, String solicitacaoId) {

  static ResultadoSeguir seguindo() {
    return new ResultadoSeguir("seguindo", null);
  }

  static ResultadoSeguir pendente(String solicitacaoId) {
    return new ResultadoSeguir("solicitacao_pendente", solicitacaoId);
  }
}

package br.com.leai.social.common.idempotencia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@code docs/api/social.yaml} define {@code Idempotency-Key} como {@code format: uuid} — ao
 * contrário de {@code identidade}, que aceita texto opaco. Recusar antes de tocar o banco evita
 * gravar recibo com chave inútil.
 */
class ChaveDeIdempotenciaTest {

  @Test
  @DisplayName("UUID válido é aceito sem alteração")
  void aceitaUuidValido() {
    String chave = "5b1f3c2a-6e3b-4f3a-8f1a-2f0a1b2c3d4e";

    assertThat(ChaveDeIdempotencia.exigir(chave)).isEqualTo(chave);
  }

  @Test
  @DisplayName("espaços nas pontas de um UUID válido são removidos")
  void removeEspacosNasPontas() {
    String chave = "5b1f3c2a-6e3b-4f3a-8f1a-2f0a1b2c3d4e";

    assertThat(ChaveDeIdempotencia.exigir("  " + chave + "  ")).isEqualTo(chave);
  }

  @Test
  @DisplayName("chave ausente é 400 REQUISICAO_INVALIDA")
  void chaveAusenteRecusa() {
    assertThatThrownBy(() -> ChaveDeIdempotencia.exigir(null))
        .isInstanceOf(ErroDeNegocioException.class)
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.REQUISICAO_INVALIDA);
  }

  @Test
  @DisplayName("chave em branco é 400 REQUISICAO_INVALIDA")
  void chaveEmBrancoRecusa() {
    assertThatThrownBy(() -> ChaveDeIdempotencia.exigir("   "))
        .isInstanceOf(ErroDeNegocioException.class);
  }

  @Test
  @DisplayName("texto opaco (não-UUID) é 400, diferente do contrato de identidade")
  void textoOpacoRecusa() {
    assertThatThrownBy(() -> ChaveDeIdempotencia.exigir("chave-de-cliente-123"))
        .isInstanceOf(ErroDeNegocioException.class)
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.REQUISICAO_INVALIDA);
  }

  @Test
  @DisplayName("UUID sem hifens não é aceito: o formato precisa ser o canônico")
  void uuidSemHifensRecusa() {
    assertThatThrownBy(() -> ChaveDeIdempotencia.exigir("5b1f3c2a6e3b4f3a8f1a2f0a1b2c3d4e"))
        .isInstanceOf(ErroDeNegocioException.class);
  }
}

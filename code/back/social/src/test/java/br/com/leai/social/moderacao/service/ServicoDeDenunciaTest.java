package br.com.leai.social.moderacao.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ServicoDeDenunciaTest {

  @Test
  @DisplayName("O motivo perde os espaços das pontas e mantém o miolo")
  void motivoAparado() {
    assertThat(ServicoDeDenuncia.normalizarMotivo("  Conta o final.\nSem aviso.  "))
        .isEqualTo("Conta o final.\nSem aviso.");
  }

  @Test
  @DisplayName("Motivo ausente ou só com espaços é 400 com a frase do design")
  void motivoVazio() {
    for (String bruto : new String[] {null, "", "  \n\t "}) {
      assertThatThrownBy(() -> ServicoDeDenuncia.normalizarMotivo(bruto))
          .isInstanceOf(ErroDeNegocioException.class)
          .hasMessage("Escreva o motivo da denúncia para continuar.")
          .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
          .isEqualTo(CodigoErro.REQUISICAO_INVALIDA);
    }
  }

  @Test
  @DisplayName("O limite de 500 conta code points: 500 emojis passam, 501 não")
  void limiteEmCodePoints() {
    assertThat(ServicoDeDenuncia.normalizarMotivo("😀".repeat(500))).hasSize(1000);
    assertThatThrownBy(() -> ServicoDeDenuncia.normalizarMotivo("😀".repeat(501)))
        .hasMessage("O motivo passou do limite de 500 caracteres.");
  }
}

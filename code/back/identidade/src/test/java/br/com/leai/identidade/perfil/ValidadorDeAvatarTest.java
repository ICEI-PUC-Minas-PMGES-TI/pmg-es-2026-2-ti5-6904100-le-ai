package br.com.leai.identidade.perfil;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Origem do avatar (RNF-SEC-20/38): só a URL, nunca a imagem. */
class ValidadorDeAvatarTest {

  private static final String VALIDA =
      "https://res.cloudinary.com/leai/image/upload/v1727200000/avatares/k3j2h1g0.png";
  private static final String PUBLIC_ID = "avatares/k3j2h1g0";

  private final ValidadorDeAvatar validador = new ValidadorDeAvatar("leai");

  @Test
  @DisplayName("aceita a URL do upload no cloud e na pasta do projeto, com publicId coerente")
  void aceitaUrlDoProjeto() {
    assertThat(validador.validar(VALIDA, PUBLIC_ID)).isEqualTo(VALIDA);
    assertThat(
            validador.validar(
                "https://res.cloudinary.com/leai/image/upload/avatares/k3j2h1g0.webp", PUBLIC_ID))
        .isNotBlank();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "http://res.cloudinary.com/leai/image/upload/v1/avatares/k3j2h1g0.png",
        "https://res.cloudinary.com.invasor.com/leai/image/upload/v1/avatares/k3j2h1g0.png",
        "https://outro.com/leai/image/upload/v1/avatares/k3j2h1g0.png",
        "https://res.cloudinary.com/outro-cloud/image/upload/v1/avatares/k3j2h1g0.png",
        "https://res.cloudinary.com/leai/image/upload/v1/capas/k3j2h1g0.png",
        "https://res.cloudinary.com/leai/image/upload/v1/avatares/k3j2h1g0.gif",
        "https://res.cloudinary.com/leai/image/upload/v1/avatares/k3j2h1g0.png?x=1",
        "https://res.cloudinary.com/leai/image/upload/v1/avatares/k3j2h1g0.png#frag",
        "https://user:senha@res.cloudinary.com/leai/image/upload/v1/avatares/k3j2h1g0.png",
        "https://res.cloudinary.com:8443/leai/image/upload/v1/avatares/k3j2h1g0.png",
        "não é url",
      })
  @DisplayName("recusa com 422 o que não é o upload do projeto")
  void recusaOrigemForaDoProjeto(String url) {
    String publicId = url.contains("/capas/") ? "capas/k3j2h1g0" : PUBLIC_ID;
    assertThatThrownBy(() -> validador.validar(url, publicId))
        .isInstanceOf(ErroDeNegocioException.class)
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.ENTIDADE_NAO_PROCESSAVEL);
  }

  @Test
  @DisplayName("publicId que não bate com a URL é recusado: não dá para apontar o de outra pessoa")
  void publicIdIncoerente() {
    assertThatThrownBy(() -> validador.validar(VALIDA, "avatares/outro-asset"))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(ValidadorDeAvatar.IMAGEM_RECUSADA);
  }

  @Test
  @DisplayName("sem CLOUDINARY_CLOUD_NAME todo avatar é recusado")
  void semCloudRecusa() {
    ValidadorDeAvatar semCloud = new ValidadorDeAvatar("");

    assertThatThrownBy(() -> semCloud.validar(VALIDA, PUBLIC_ID))
        .isInstanceOf(ErroDeNegocioException.class);
  }
}

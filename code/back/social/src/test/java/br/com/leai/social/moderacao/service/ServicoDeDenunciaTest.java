package br.com.leai.social.moderacao.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.lista.model.PerfilDoDono;
import br.com.leai.social.moderacao.service.ServicoDeDenuncia.AcessoAResenha;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BooleanSupplier;
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

  // RN-08 sobre a resenha denunciada (L-01): a decisão pura, sem banco.

  private static final BooleanSupplier SIM = () -> true;
  private static final BooleanSupplier NAO = () -> false;

  /** Falha o teste se a decisão consultar o que não precisava. */
  private static final BooleanSupplier NAO_CONSULTAR =
      () -> {
        throw new AssertionError("a decisão não deveria consultar isto");
      };

  private static Optional<PerfilDoDono> autora(String privacidade) {
    return Optional.of(
        new PerfilDoDono(UUID.randomUUID(), "autora", "Autora", null, privacidade));
  }

  @Test
  @DisplayName("RN-08: resenha de autora pública pode ser denunciada por qualquer leitor")
  void autoraPublica() {
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                autora("publico"), true, false, NAO_CONSULTAR, NAO_CONSULTAR))
        .isEqualTo(AcessoAResenha.LIBERADO);
  }

  @Test
  @DisplayName("RN-08: autora privada exige seguimento aceito")
  void autoraPrivadaExigeSeguir() {
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                autora("privado"), true, false, NAO, NAO_CONSULTAR))
        .isEqualTo(AcessoAResenha.NAO_ENCONTRADO);
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                autora("privado"), true, false, SIM, NAO_CONSULTAR))
        .isEqualTo(AcessoAResenha.LIBERADO);
  }

  @Test
  @DisplayName("Autora suspensa ou em exclusão é 404, igual a resenha inexistente")
  void autoraForaDaView() {
    for (boolean pessoal : new boolean[] {false, true}) {
      assertThat(
              ServicoDeDenuncia.decidirAcessoAResenha(
                  Optional.empty(), true, pessoal, NAO_CONSULTAR, NAO_CONSULTAR))
          .isEqualTo(AcessoAResenha.NAO_ENCONTRADO);
    }
    // O 404 da autora vem antes do 403 de quem denuncia: não revela que a resenha existe.
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                Optional.empty(), false, false, NAO_CONSULTAR, NAO_CONSULTAR))
        .isEqualTo(AcessoAResenha.NAO_ENCONTRADO);
  }

  @Test
  @DisplayName("Leitor fora da VIEW de perfis recebe 403")
  void leitorForaDaView() {
    for (String privacidade : new String[] {"publico", "privado"}) {
      assertThat(
              ServicoDeDenuncia.decidirAcessoAResenha(
                  autora(privacidade), false, false, NAO_CONSULTAR, NAO_CONSULTAR))
          .isEqualTo(AcessoAResenha.ACESSO_NEGADO);
    }
  }

  @Test
  @DisplayName("Livro pessoal sem via válida é 404, mesmo com autora pública (RN-15.4)")
  void livroPessoalExigeVia() {
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                autora("publico"), true, true, NAO_CONSULTAR, NAO))
        .isEqualTo(AcessoAResenha.NAO_ENCONTRADO);
    assertThat(
            ServicoDeDenuncia.decidirAcessoAResenha(
                autora("privado"), true, true, NAO_CONSULTAR, SIM))
        .isEqualTo(AcessoAResenha.LIBERADO);
  }
}

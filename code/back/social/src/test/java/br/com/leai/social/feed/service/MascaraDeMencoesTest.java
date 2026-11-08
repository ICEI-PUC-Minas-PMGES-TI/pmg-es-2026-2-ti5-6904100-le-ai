package br.com.leai.social.feed.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.feed.repository.MencaoDeComentarioRepository.Mencao;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** O texto mascarado que o autor edita volta a ter o {@code @username} gravado (PR #61). */
class MascaraDeMencoesTest {

  private static final UUID OCULTA = UUID.randomUUID();
  private static final UUID VISIVEL = UUID.randomUUID();
  private static final Map<UUID, AutorSnapshotResposta> PERFIS =
      Map.of(VISIVEL, new AutorSnapshotResposta(VISIVEL.toString(), "terceira", "Terceira", null));

  /** Edita o texto como o cliente faz: parte do que a listagem mostra. */
  private static String editar(String gravado, List<Mencao> mencoes, String editado) {
    ServicoDeInteracao.TextoVisivel exibido =
        ServicoDeInteracao.textoVisivel(gravado, mencoes, PERFIS);
    return MascaraDeMencoes.desmascarar(exibido.texto(), exibido.ocultas(), editado);
  }

  private static Mencao mencao(UUID id, int posicao) {
    return new Mencao(UUID.randomUUID(), id, posicao);
  }

  @Test
  @DisplayName("Acrescentar texto mantém a menção oculta no lugar")
  void acrescentar() {
    String gravado = "Oi @suspensa";
    List<Mencao> mencoes = List.of(mencao(OCULTA, 3));
    assertThat(ServicoDeInteracao.textoVisivel(gravado, mencoes, PERFIS).texto())
        .isEqualTo("Oi um leitor");

    assertThat(editar(gravado, mencoes, "Oi um leitor!")).isEqualTo("Oi @suspensa!");
    assertThat(editar(gravado, mencoes, "Olá, Oi um leitor")).isEqualTo("Olá, Oi @suspensa");
  }

  @Test
  @DisplayName("Comentário só com a menção casa pelo começo e pelo fim do texto")
  void soAMencao() {
    List<Mencao> mencoes = List.of(mencao(OCULTA, 0));
    assertThat(editar("@suspensa", mencoes, "um leitor")).isEqualTo("@suspensa");
    assertThat(editar("@suspensa", mencoes, "um leitor :)")).isEqualTo("@suspensa :)");
  }

  @Test
  @DisplayName("Várias menções, ocultas e visíveis: cada trecho volta ao seu username")
  void varias() {
    String gravado = "@ana viu @terceira e @Bia";
    List<Mencao> mencoes =
        List.of(mencao(OCULTA, 0), mencao(VISIVEL, 9), mencao(UUID.randomUUID(), 21));
    assertThat(ServicoDeInteracao.textoVisivel(gravado, mencoes, PERFIS).texto())
        .isEqualTo("um leitor viu @terceira e um leitor");

    assertThat(editar(gravado, mencoes, "Ontem um leitor viu @terceira e um leitor também."))
        .isEqualTo("Ontem @ana viu @terceira e @Bia também.");
  }

  @Test
  @DisplayName("Trecho apagado sai; o que sobrou é casado pela vizinhança, não pela ordem")
  void apagado() {
    String gravado = "Oi @ana, até @bia!";
    List<Mencao> mencoes = List.of(mencao(OCULTA, 3), mencao(UUID.randomUUID(), 13));

    assertThat(editar(gravado, mencoes, "Oi, até um leitor!")).isEqualTo("Oi, até @bia!");
    assertThat(editar(gravado, mencoes, "Oi um leitor!")).isEqualTo("Oi @ana!");
    assertThat(editar(gravado, mencoes, "Tchau.")).isEqualTo("Tchau.");
  }

  @Test
  @DisplayName("A versão muda com a apresentação: menção oculta e 'um leitor' literal não coincidem")
  void versao() {
    List<Mencao> mencoes = List.of(mencao(OCULTA, 3));
    ServicoDeInteracao.TextoVisivel oculta =
        ServicoDeInteracao.textoVisivel("Oi @suspensa", mencoes, PERFIS);
    ServicoDeInteracao.TextoVisivel literal =
        ServicoDeInteracao.textoVisivel("Oi um leitor", List.of(), PERFIS);
    ServicoDeInteracao.TextoVisivel reativada =
        ServicoDeInteracao.textoVisivel(
            "Oi @suspensa",
            mencoes,
            Map.of(OCULTA, new AutorSnapshotResposta(OCULTA.toString(), "suspensa", "S", null)));

    assertThat(oculta.texto()).isEqualTo(literal.texto());
    assertThat(oculta.versao()).isNotEqualTo(literal.versao());
    assertThat(oculta.versao()).isNotEqualTo(reativada.versao());
    assertThat(oculta.versao())
        .isEqualTo(ServicoDeInteracao.textoVisivel("Oi @suspensa", mencoes, PERFIS).versao())
        .hasSize(22)
        .doesNotContain("suspensa");
  }

  @Test
  @DisplayName("Sem menção oculta, o texto editado passa intacto, inclusive um 'um leitor' digitado")
  void semOculta() {
    List<Mencao> mencoes = List.of(mencao(VISIVEL, 3));
    assertThat(editar("Oi @terceira", mencoes, "Oi @terceira, um leitor como eu"))
        .isEqualTo("Oi @terceira, um leitor como eu");
  }
}

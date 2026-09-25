package br.com.leai.social.feed.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * Garante que cada valor de {@link TipoAtividade} vira exatamente o literal aceito pelo CHECK
 * {@code atividade_tipo_valido} da migration, e volta sem perda.
 */
class TipoAtividadeConverterTest {

  private final TipoAtividadeConverter conversor = new TipoAtividadeConverter();

  @ParameterizedTest
  @EnumSource(TipoAtividade.class)
  void converteParaOBancoEDeVoltaSemPerda(TipoAtividade tipo) {
    String coluna = conversor.convertToDatabaseColumn(tipo);

    assertThat(coluna).isEqualTo(tipo.literal());
    assertThat(conversor.convertToEntityAttribute(coluna)).isEqualTo(tipo);
  }

  @Test
  void literaisBatemExatamenteComOCheckDaMigration() {
    assertThat(TipoAtividade.LEITURA_INICIADA.literal()).isEqualTo("leitura_iniciada");
    assertThat(TipoAtividade.LEITURA_RETOMADA.literal()).isEqualTo("leitura_retomada");
    assertThat(TipoAtividade.LEITURA_FINALIZADA.literal()).isEqualTo("leitura_concluida");
    assertThat(TipoAtividade.LEITURA_ABANDONADA.literal()).isEqualTo("leitura_abandonada");
    assertThat(TipoAtividade.RESENHA_PUBLICADA.literal()).isEqualTo("resenha_publicada");
  }

  @Test
  void nuloVaiENuloVolta() {
    assertThat(conversor.convertToDatabaseColumn(null)).isNull();
    assertThat(conversor.convertToEntityAttribute(null)).isNull();
  }

  @Test
  void literalDesconhecidoLancaExcecao() {
    assertThatThrownBy(() -> TipoAtividade.deLiteral("nao_existe"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}

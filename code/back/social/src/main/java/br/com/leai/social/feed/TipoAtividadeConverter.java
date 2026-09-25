package br.com.leai.social.feed;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Traduz {@link TipoAtividade} para o literal exato de {@code atividade.tipo} (coluna {@code text}
 * com CHECK) e vice-versa. Não há precedente de enum mapeado a coluna {@code text} em
 * `identidade`/`acervo` (lá, colunas equivalentes como {@code usuario.privacidade} ficam como
 * {@code String} cru); por isso a task 2 adota este conversor, conforme a orientação do brief.
 */
@Converter(autoApply = true)
public class TipoAtividadeConverter implements AttributeConverter<TipoAtividade, String> {

  @Override
  public String convertToDatabaseColumn(TipoAtividade atributo) {
    return atributo == null ? null : atributo.literal();
  }

  @Override
  public TipoAtividade convertToEntityAttribute(String coluna) {
    return coluna == null ? null : TipoAtividade.deLiteral(coluna);
  }
}

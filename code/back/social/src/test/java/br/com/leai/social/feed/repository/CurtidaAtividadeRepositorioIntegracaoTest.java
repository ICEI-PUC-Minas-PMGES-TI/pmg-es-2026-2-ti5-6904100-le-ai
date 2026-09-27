package br.com.leai.social.feed.repository;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.CurtidaAtividade;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

/** {@link CurtidaAtividadeRepository} contra Postgres real: existência, contagem e unicidade. */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class CurtidaAtividadeRepositorioIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private AtividadeRepository atividadeRepository;
  @Autowired private CurtidaAtividadeRepository curtidaAtividadeRepository;

  private UUID novaAtividade(String chaveFato) {
    return atividadeRepository
        .save(
            Atividade.nova(
                UUID.randomUUID(),
                TipoAtividade.LEITURA_INICIADA,
                UUID.randomUUID(),
                UUID.randomUUID(),
                chaveFato,
                "leitura",
                UUID.randomUUID(),
                "Autora",
                "autora",
                null,
                "Livro",
                "Fulano",
                null))
        .id();
  }

  @Test
  @DisplayName("existsBy e countBy refletem as curtidas gravadas")
  void existeEContaCurtidas() {
    UUID atividadeId = novaAtividade("chave-curtida-1");
    UUID usuario1 = UUID.randomUUID();
    UUID usuario2 = UUID.randomUUID();

    curtidaAtividadeRepository.save(CurtidaAtividade.nova(atividadeId, usuario1));
    curtidaAtividadeRepository.save(CurtidaAtividade.nova(atividadeId, usuario2));

    assertThat(curtidaAtividadeRepository.existsByAtividadeIdAndUsuarioId(atividadeId, usuario1)).isTrue();
    assertThat(curtidaAtividadeRepository.existsByAtividadeIdAndUsuarioId(atividadeId, UUID.randomUUID()))
        .isFalse();
    assertThat(curtidaAtividadeRepository.countByAtividadeId(atividadeId)).isEqualTo(2);
    assertThat(curtidaAtividadeRepository.findByAtividadeIdAndUsuarioId(atividadeId, usuario1)).isPresent();
  }

  @Test
  @DisplayName("curtir a mesma atividade duas vezes com o mesmo usuario viola a unicidade do banco")
  void curtidaDuplicadaViolaConstraint() {
    UUID atividadeId = novaAtividade("chave-curtida-2");
    UUID usuario = UUID.randomUUID();
    curtidaAtividadeRepository.saveAndFlush(CurtidaAtividade.nova(atividadeId, usuario));

    org.junit.jupiter.api.Assertions.assertThrows(
        DataIntegrityViolationException.class,
        () -> curtidaAtividadeRepository.saveAndFlush(CurtidaAtividade.nova(atividadeId, usuario)));
  }
}

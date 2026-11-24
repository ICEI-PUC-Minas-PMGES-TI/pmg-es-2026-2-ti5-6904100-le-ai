package br.com.leai.social.notificacao.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.notificacao.model.DadosDeNotificacao;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Copy do lembrete de sequência (F-GAM-OPC, {@code notificacoes.md} §8 do Período 3). */
class RedacaoDeNotificacaoTest {

  @Test
  @DisplayName("lembrete de sequencia usa singular em 1 dia e plural nos demais")
  void lembreteSingularEPlural() {
    UUID eu = UUID.randomUUID();
    assertThat(
            RedacaoDeNotificacao.mensagem(
                TipoNotificacao.LEMBRETE_SEQUENCIA,
                Map.of(DadosDeNotificacao.SEQUENCIA_ATUAL, 1),
                RedacaoDeNotificacao.ATOR_OCULTO,
                eu))
        .isEqualTo("Sua sequência está em 1 dia e hoje ainda não tem leitura registrada.");
    assertThat(
            RedacaoDeNotificacao.mensagem(
                TipoNotificacao.LEMBRETE_SEQUENCIA,
                Map.of(DadosDeNotificacao.SEQUENCIA_ATUAL, 31),
                RedacaoDeNotificacao.ATOR_OCULTO,
                eu))
        .isEqualTo("Sua sequência está em 31 dias e hoje ainda não tem leitura registrada.");
  }
}

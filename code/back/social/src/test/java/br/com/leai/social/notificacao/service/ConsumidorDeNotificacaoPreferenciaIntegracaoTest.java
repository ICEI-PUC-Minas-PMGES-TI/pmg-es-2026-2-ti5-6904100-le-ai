package br.com.leai.social.notificacao.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.model.NotificacaoGravada;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@RecordApplicationEvents
class ConsumidorDeNotificacaoPreferenciaIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private ApplicationEvents eventos;

  @ParameterizedTest(name = "{0}")
  @EnumSource(EventoDeNotificacao.class)
  @DisplayName("tipo desabilitado nao grava, nao publica NotificacaoGravada e o evento e reconhecido")
  void tipoDesabilitadoNaoGeraNotificacao(EventoDeNotificacao evento) {
    UUID destinatario = UUID.randomUUID();
    definir(destinatario, evento, false);
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(evento, Fato.para(destinatario));

    assertThatCode(() -> consumidor.handle(envelope)).doesNotThrowAnyException();

    assertThat(total(destinatario)).isZero();
    assertThat(eventos.stream(NotificacaoGravada.class)).isEmpty();
  }

  @Test
  @DisplayName("sem linha de preferencia o tipo segue habilitado e publica NotificacaoGravada")
  void semPreferenciaGrava() {
    UUID destinatario = UUID.randomUUID();

    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(destinatario)));

    assertThat(total(destinatario)).isEqualTo(1);
    assertThat(eventos.stream(NotificacaoGravada.class))
        .singleElement()
        .satisfies(gravada -> assertThat(gravada.destinatarioId()).isEqualTo(destinatario));
  }

  @Test
  @DisplayName("desabilitar um tipo nao atinge os outros tipos nem outro destinatario")
  void desabilitarNaoAtingeOutrosTiposNemOutrosDestinatarios() {
    UUID quemDesabilitou = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    definir(quemDesabilitou, EventoDeNotificacao.SEGUIDOR_NOVO, false);

    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(quemDesabilitou)));
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(quemDesabilitou)));
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(outro)));

    assertThat(total(quemDesabilitou)).isEqualTo(1);
    assertThat(jdbc.queryForObject(
            "SELECT tipo FROM notificacao WHERE destinatario_id = ?", String.class, quemDesabilitou))
        .isEqualTo(EventoDeNotificacao.ATIVIDADE_CURTIDA.tipo().literal());
    assertThat(total(outro)).isEqualTo(1);
    assertThat(eventos.stream(NotificacaoGravada.class)).hasSize(2);
  }

  @Test
  @DisplayName("preferencia explicitamente habilitada grava como o padrao")
  void preferenciaHabilitadaGrava() {
    UUID destinatario = UUID.randomUUID();
    definir(destinatario, EventoDeNotificacao.SEGUIDOR_NOVO, true);

    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(destinatario)));

    assertThat(total(destinatario)).isEqualTo(1);
  }

  @Test
  @DisplayName("desabilitar preserva o historico e reabilitar nao recupera o que foi suprimido")
  void historicoPreservadoEReabilitarNaoRecupera() {
    UUID destinatario = UUID.randomUUID();
    EventoDeNotificacao evento = EventoDeNotificacao.ATIVIDADE_CURTIDA;
    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(evento, Fato.para(destinatario)));

    definir(destinatario, evento, false);
    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(evento, Fato.para(destinatario)));
    assertThat(total(destinatario)).isEqualTo(1);

    definir(destinatario, evento, true);
    assertThat(total(destinatario)).isEqualTo(1);

    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(evento, Fato.para(destinatario)));
    assertThat(total(destinatario)).isEqualTo(2);
  }

  private void definir(UUID usuario, EventoDeNotificacao evento, boolean habilitada) {
    jdbc.update(
        """
        INSERT INTO preferencia_notificacao (usuario_id, tipo, habilitada)
        VALUES (?, ?, ?)
        ON CONFLICT (usuario_id, tipo) DO UPDATE SET habilitada = EXCLUDED.habilitada
        """,
        usuario,
        evento.tipo().literal(),
        habilitada);
  }

  private int total(UUID destinatario) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ?", Integer.class, destinatario);
  }
}

package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.service.ConsumidorDeNotificacao;
import br.com.leai.social.push.service.EnviadorDePush;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PushDesativadoIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private EnviadorDePush enviador;
  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private JdbcTemplate jdbc;

  @Test
  @DisplayName("sem credencial do Firebase o servico sobe, a notificacao e gravada e nenhum push e reservado")
  void semCredencialOEnvioEhNoop() {
    UUID eu = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO dispositivo_push (usuario_id, fcm_token, plataforma) VALUES (?, 'token-x', 'android')", eu);
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    consumidor.handle(envelope);

    assertThat(enviador.ativo()).isFalse();
    assertThat(jdbc.queryForObject("SELECT count(*) FROM notificacao WHERE destinatario_id = ?", Integer.class, eu))
        .isEqualTo(1);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM envio_push", Integer.class)).isZero();
  }
}

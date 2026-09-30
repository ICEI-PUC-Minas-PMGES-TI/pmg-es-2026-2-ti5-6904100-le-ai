package br.com.leai.social.notificacao.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ConsumidorDeNotificacao} contra Postgres real (RNF-TST-03): cada evento de F-NOT grava uma
 * notificação para o destinatário certo, e nem a reentrega do mesmo {@code eventId} nem a
 * republicação do mesmo fato com outro {@code eventId} duplicam (RNF-ERR-06). O envelope é
 * entregue direto ao handler; schema e DLQ estão em {@link ConsumidorDeNotificacaoBrokerTest}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ConsumidorDeNotificacaoIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private JdbcTemplate jdbc;

  @ParameterizedTest(name = "{0}")
  @EnumSource(EventoDeNotificacao.class)
  @DisplayName("cada evento gera uma notificacao do tipo certo para o destinatario do evento")
  void cadaEventoGeraUmaNotificacao(EventoDeNotificacao evento) {
    UUID destinatario = UUID.randomUUID();
    MessageEnvelope envelope = EventosDeNotificacaoDeTeste.envelope(evento, Fato.para(destinatario));

    consumidor.handle(envelope);

    List<Map<String, Object>> linhas =
        jdbc.queryForList(
            "SELECT tipo, event_id, chave_negocio, leitura_ref, lida_em FROM notificacao"
                + " WHERE destinatario_id = ?",
            destinatario);
    assertThat(linhas).hasSize(1);
    Map<String, Object> linha = linhas.get(0);
    assertThat(linha.get("tipo")).isEqualTo(evento.tipo().literal());
    assertThat(linha.get("event_id")).isEqualTo(envelope.eventId());
    assertThat(linha.get("chave_negocio")).isEqualTo(envelope.businessKey());
    assertThat(linha.get("lida_em")).isNull();
    if (evento.tipo().referenciaLeitura()) {
      assertThat(linha.get("leitura_ref").toString()).isEqualTo(envelope.data().get("leituraId"));
    } else {
      assertThat(linha.get("leitura_ref")).isNull();
    }
  }

  @Test
  @DisplayName("reentrega do mesmo eventId nao duplica")
  void reentregaNaoDuplica() {
    UUID destinatario = UUID.randomUUID();
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(destinatario));

    consumidor.handle(envelope);
    consumidor.handle(envelope);

    assertThat(total(destinatario)).isEqualTo(1);
  }

  @Test
  @DisplayName("nova execucao do job com outro eventId para o mesmo ciclo e limiar nao duplica")
  void mesmoFatoComOutroEventIdNaoDuplica() {
    UUID destinatario = UUID.randomUUID();
    Fato fato = Fato.para(destinatario).comCiclo(3, 30);

    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.LEITURA_EM_RISCO, fato));
    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.LEITURA_EM_RISCO, fato));

    assertThat(total(destinatario)).isEqualTo(1);
  }

  @Test
  @DisplayName("novo limiar e novo ciclo de inatividade da mesma leitura notificam de novo")
  void novoLimiarENovoCicloNotificam() {
    UUID destinatario = UUID.randomUUID();
    Fato dia20 = Fato.para(destinatario).comCiclo(1, 20);

    consumidor.handle(EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.LEITURA_EM_RISCO, dia20));
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.LEITURA_EM_RISCO, dia20.comCiclo(1, 30)));
    // Houve progresso: o job abre o ciclo 2, e o dia 20 volta a valer.
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.LEITURA_EM_RISCO, dia20.comCiclo(2, 20)));

    assertThat(total(destinatario)).isEqualTo(3);
  }

  @Test
  @DisplayName("curtida guarda o contexto da atividade alvo para a frase da notificacao")
  void curtidaGuardaContextoDaAtividade() {
    UUID destinatario = UUID.randomUUID();
    UUID atividadeId =
        jdbc.queryForObject(
            """
            INSERT INTO atividade
              (id, autor_id, tipo, livro_id, event_id, chave_fato, origem_tipo, origem_id,
               snap_usuario_nome, snap_usuario_username, snap_livro_titulo, snap_livro_autor)
            VALUES (gen_random_uuid(), ?, 'resenha_publicada', gen_random_uuid(), gen_random_uuid(),
                    ?, 'resenha', gen_random_uuid(), 'Dona', 'dona', 'Vidas Secas', 'Graciliano')
            RETURNING id
            """,
            UUID.class,
            destinatario,
            "consumidor-notificacao-" + UUID.randomUUID());

    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(destinatario).comAtividade(atividadeId)));

    String contexto =
        jdbc.queryForObject(
            "SELECT dados->'atividade'->>'livroTitulo' FROM notificacao WHERE destinatario_id = ?",
            String.class,
            destinatario);
    assertThat(contexto).isEqualTo("Vidas Secas");
  }

  private int total(UUID destinatario) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ?", Integer.class, destinatario);
  }
}

package br.com.leai.social.feed.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.messaging.MessageEnvelope;
import java.time.OffsetDateTime;
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
 * {@link ConsumidorDeAtividade} contra Postgres real (RF-SOC-10, RNF-TST-02): os 6 eventos de
 * {@code leitura}/{@code resenha} projetados em {@code atividade}, replay sem duplicar e
 * {@code resenha.excluida} removendo a atividade com cascade de curtidas/comentários.
 *
 * <p>Sem publicador de {@code leitura} disponível, o envelope é construído manualmente a partir
 * dos schemas em {@code docs/mensageria/schemas} e entregue direto ao handler — o caminho de
 * validação de schema/headers já é coberto por {@code MessageValidatorTest}, e o
 * retry/DLQ/recibo de {@link br.com.leai.social.messaging.AmqpConsumerService} não depende de
 * lógica deste consumidor específico.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ConsumidorDeAtividadeIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private ConsumidorDeAtividade consumidor;
  @Autowired private AtividadeRepository atividades;
  @Autowired private JdbcTemplate jdbc;

  @ParameterizedTest(name = "{0} cria a atividade com o snapshot do payload")
  @EnumSource(EventoDeCriacao.class)
  @DisplayName("os 5 eventos de publicacao criam a Atividade com o snapshot correto")
  void criaAtividadeParaCadaEvento(EventoDeCriacao evento) {
    UUID eventId = UUID.randomUUID();
    UUID autorId = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    UUID origemId = UUID.randomUUID();
    MessageEnvelope envelope =
        envelope(evento.tipoEvento, eventId, dados(evento, autorId, livroId, origemId));

    consumidor.handle(envelope);

    Atividade atividade =
        atividades.findAll().stream()
            .filter(a -> a.eventId().equals(eventId))
            .findFirst()
            .orElseThrow();
    assertThat(atividade.tipo()).isEqualTo(evento.tipoAtividade);
    assertThat(atividade.autorId()).isEqualTo(autorId);
    assertThat(atividade.livroId()).isEqualTo(livroId);
    assertThat(atividade.origemId()).isEqualTo(origemId);
    assertThat(atividade.origemTipo()).isEqualTo(evento.origemTipo);
    assertThat(atividade.chaveFato()).isEqualTo(envelope.businessKey());
    assertThat(atividade.snapUsuarioNome()).isEqualTo("Autora Um");
    assertThat(atividade.snapUsuarioUsername()).isEqualTo("autora1");
    assertThat(atividade.snapLivroTitulo()).isEqualTo("Livro Um");
    assertThat(atividade.snapLivroAutor()).isEqualTo("Escritor Um");
    assertThat(atividade.ativo()).isTrue();
  }

  @Test
  @DisplayName("reentrega do mesmo eventId nao duplica a atividade")
  void reentregaNaoDuplica() {
    UUID eventId = UUID.randomUUID();
    UUID leituraId = UUID.randomUUID();
    MessageEnvelope envelope =
        envelope(
            "leitura.iniciada",
            eventId,
            dados(EventoDeCriacao.LEITURA_INICIADA, UUID.randomUUID(), UUID.randomUUID(), leituraId));

    consumidor.handle(envelope);
    consumidor.handle(envelope);

    long total = atividades.findAll().stream().filter(a -> a.eventId().equals(eventId)).count();
    assertThat(total).isEqualTo(1);
  }

  @Test
  @DisplayName("resenha.excluida remove a atividade e, via cascade, curtidas e comentarios")
  void resenhaExcluidaRemoveComCascade() {
    UUID resenhaId = UUID.randomUUID();
    UUID autorId = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    MessageEnvelope publicada =
        envelope(
            "resenha.publicada",
            UUID.randomUUID(),
            dados(EventoDeCriacao.RESENHA_PUBLICADA, autorId, livroId, resenhaId));
    consumidor.handle(publicada);
    Atividade atividade =
        atividades.findByTipoAndOrigemId(TipoAtividade.RESENHA_PUBLICADA, resenhaId).orElseThrow();
    jdbc.update(
        "INSERT INTO curtida_atividade (id, atividade_id, usuario_id) VALUES (?, ?, ?)",
        UUID.randomUUID(),
        atividade.id(),
        UUID.randomUUID());
    jdbc.update(
        "INSERT INTO comentario (id, atividade_id, autor_id, texto) VALUES (?, ?, ?, 'oi')",
        UUID.randomUUID(),
        atividade.id(),
        UUID.randomUUID());

    MessageEnvelope excluida =
        envelope("resenha.excluida", UUID.randomUUID(), Map.of("usuarioId", autorId.toString(), "resenhaId", resenhaId.toString(), "livroId", livroId.toString()));
    consumidor.handle(excluida);

    assertThat(atividades.findByTipoAndOrigemId(TipoAtividade.RESENHA_PUBLICADA, resenhaId)).isEmpty();
    Integer curtidas =
        jdbc.queryForObject(
            "SELECT count(*) FROM curtida_atividade WHERE atividade_id = ?", Integer.class, atividade.id());
    Integer comentarios =
        jdbc.queryForObject(
            "SELECT count(*) FROM comentario WHERE atividade_id = ?", Integer.class, atividade.id());
    assertThat(curtidas).isZero();
    assertThat(comentarios).isZero();
  }

  @Test
  @DisplayName("resenha.excluida para uma resenha ja removida (replay) e um no-op silencioso")
  void resenhaExcluidaReplayNaoFalha() {
    MessageEnvelope excluida =
        envelope(
            "resenha.excluida",
            UUID.randomUUID(),
            Map.of(
                "usuarioId", UUID.randomUUID().toString(),
                "resenhaId", UUID.randomUUID().toString(),
                "livroId", UUID.randomUUID().toString()));

    consumidor.handle(excluida);
  }

  enum EventoDeCriacao {
    LEITURA_INICIADA("leitura.iniciada", TipoAtividade.LEITURA_INICIADA, "leitura", "leituraId"),
    LEITURA_RETOMADA("leitura.retomada", TipoAtividade.LEITURA_RETOMADA, "leitura", "leituraId"),
    LEITURA_FINALIZADA("leitura.finalizada", TipoAtividade.LEITURA_FINALIZADA, "leitura", "leituraId"),
    LEITURA_ABANDONADA("leitura.abandonada", TipoAtividade.LEITURA_ABANDONADA, "leitura", "leituraId"),
    RESENHA_PUBLICADA("resenha.publicada", TipoAtividade.RESENHA_PUBLICADA, "resenha", "resenhaId");

    final String tipoEvento;
    final TipoAtividade tipoAtividade;
    final String origemTipo;
    final String campoOrigemId;

    EventoDeCriacao(String tipoEvento, TipoAtividade tipoAtividade, String origemTipo, String campoOrigemId) {
      this.tipoEvento = tipoEvento;
      this.tipoAtividade = tipoAtividade;
      this.origemTipo = origemTipo;
      this.campoOrigemId = campoOrigemId;
    }
  }

  private static Map<String, Object> dados(
      EventoDeCriacao evento, UUID autorId, UUID livroId, UUID origemId) {
    Map<String, Object> usuario =
        Map.of(
            "id", autorId.toString(),
            "username", "autora1",
            "displayName", "Autora Um",
            "avatarUrl", "https://cdn.leai.app/a.png");
    Map<String, Object> livro =
        Map.of(
            "id", livroId.toString(),
            "tipo", "oficial",
            "titulo", "Livro Um",
            "autor", "Escritor Um",
            "capaUrl", "https://cdn.leai.app/l.png");

    return switch (evento) {
      case LEITURA_INICIADA ->
          Map.of(
              "usuarioId", autorId.toString(),
              "leituraId", origemId.toString(),
              "livroId", livroId.toString(),
              "releitura", false,
              "usuario", usuario,
              "livro", livro);
      case LEITURA_RETOMADA ->
          Map.of(
              "usuarioId", autorId.toString(),
              "leituraId", origemId.toString(),
              "livroId", livroId.toString(),
              "paginaRetomada", 42,
              "usuario", usuario,
              "livro", livro);
      case LEITURA_FINALIZADA ->
          Map.of(
              "usuarioId", autorId.toString(),
              "leituraId", origemId.toString(),
              "livroId", livroId.toString(),
              "releitura", false,
              "dataFim", "2026-09-20",
              "finalizadaEm", "2026-09-20T12:00:00Z",
              "finalizacaoFusoHorario", "America/Sao_Paulo",
              "finalizacaoDataLocal", "2026-09-20",
              "usuario", usuario,
              "livro", livro);
      case LEITURA_ABANDONADA ->
          Map.of(
              "usuarioId", autorId.toString(),
              "leituraId", origemId.toString(),
              "livroId", livroId.toString(),
              "releitura", false,
              "incompleta", true,
              "paginaParada", 10,
              "usuario", usuario,
              "livro", livro);
      case RESENHA_PUBLICADA ->
          Map.of(
              "usuarioId", autorId.toString(),
              "resenhaId", origemId.toString(),
              "livroId", livroId.toString(),
              "atualizacao", false,
              "usuario", usuario,
              "livro", livro);
    };
  }

  private static MessageEnvelope envelope(String tipo, UUID eventId, Map<String, Object> dados) {
    String businessKey = "teste:" + tipo + ":" + eventId;
    return new MessageEnvelope(
        eventId, tipo, 1, OffsetDateTime.parse("2026-09-20T12:00:00Z"), UUID.randomUUID(), businessKey, dados);
  }
}

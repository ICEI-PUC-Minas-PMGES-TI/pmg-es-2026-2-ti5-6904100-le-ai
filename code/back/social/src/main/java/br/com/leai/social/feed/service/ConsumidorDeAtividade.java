package br.com.leai.social.feed.service;

import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.ConsumerDefinition;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessageHandler;
import br.com.leai.social.messaging.MessagingConstants;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Projeta {@code leitura.iniciada/retomada/finalizada/abandonada} e {@code resenha.publicada} em
 * uma nova {@link Atividade} do feed (RF-SOC-10), e remove a atividade correspondente quando chega
 * {@code resenha.excluida}. Registrado como consumidor de domínio na fila {@code
 * leai.social.feed}, amarrada ao exchange {@code leai.events.leitura} — a topologia (retry
 * 1/5/15s, DLQ, recibo em {@code mensagem_processada}) já vem de {@link AmqpConsumerService}.
 *
 * <p>Idempotente em duas camadas: {@link AmqpConsumerService} nunca chama {@link #handle} de novo
 * para um {@code eventId} já confirmado, e mesmo assim a violação de {@code
 * atividade_event_id_unico} (ou de {@code atividade_fato_unico}, para o caso raro de dois eventos
 * distintos com a mesma {@code chave_fato}) é tratada aqui como sucesso silencioso — o mesmo
 * efeito de um replay.
 */
@Component
public class ConsumidorDeAtividade implements MessageHandler {

  private static final String CAMPO_USUARIO_ID = "usuarioId";
  private static final String CAMPO_LIVRO_ID = "livroId";
  private static final String CAMPO_LEITURA_ID = "leituraId";
  private static final String CAMPO_RESENHA_ID = "resenhaId";
  private static final String CAMPO_USUARIO = "usuario";
  private static final String CAMPO_LIVRO = "livro";
  private static final String CAMPO_USERNAME = "username";
  private static final String CAMPO_DISPLAY_NAME = "displayName";
  private static final String CAMPO_AVATAR_URL = "avatarUrl";
  private static final String CAMPO_TITULO = "titulo";
  private static final String CAMPO_AUTOR = "autor";
  private static final String CAMPO_CAPA_URL = "capaUrl";
  private static final String ORIGEM_LEITURA = "leitura";
  private static final String ORIGEM_RESENHA = "resenha";

  private final AtividadeRepository atividades;

  public ConsumidorDeAtividade(AmqpConsumerService consumidor, AtividadeRepository atividades) {
    this.atividades = atividades;
    consumidor.register(
        new ConsumerDefinition(
            MessagingConstants.FEED_CONSUMER_NAME,
            MessagingConstants.FEED_QUEUE,
            MessagingConstants.LEITURA_EXCHANGE,
            MessagingConstants.FEED_ROUTING_KEYS),
        this);
  }

  @Override
  public void handle(MessageEnvelope envelope) {
    switch (envelope.type()) {
      case MessagingConstants.EVENTO_LEITURA_INICIADA ->
          criarAtividade(envelope, TipoAtividade.LEITURA_INICIADA, CAMPO_LEITURA_ID, ORIGEM_LEITURA);
      case MessagingConstants.EVENTO_LEITURA_RETOMADA ->
          criarAtividade(envelope, TipoAtividade.LEITURA_RETOMADA, CAMPO_LEITURA_ID, ORIGEM_LEITURA);
      case MessagingConstants.EVENTO_LEITURA_FINALIZADA ->
          criarAtividade(envelope, TipoAtividade.LEITURA_FINALIZADA, CAMPO_LEITURA_ID, ORIGEM_LEITURA);
      case MessagingConstants.EVENTO_LEITURA_ABANDONADA ->
          criarAtividade(envelope, TipoAtividade.LEITURA_ABANDONADA, CAMPO_LEITURA_ID, ORIGEM_LEITURA);
      case MessagingConstants.EVENTO_RESENHA_PUBLICADA ->
          criarAtividade(envelope, TipoAtividade.RESENHA_PUBLICADA, CAMPO_RESENHA_ID, ORIGEM_RESENHA);
      case MessagingConstants.EVENTO_RESENHA_EXCLUIDA -> excluirAtividade(envelope);
      default ->
          throw new IllegalArgumentException(
              "Evento nao suportado pelo consumidor de feed: " + envelope.type());
    }
  }

  private void criarAtividade(
      MessageEnvelope envelope, TipoAtividade tipo, String campoOrigemId, String origemTipo) {
    Map<String, Object> dados = envelope.data();
    Map<String, Object> usuario = mapa(dados, CAMPO_USUARIO);
    Map<String, Object> livro = mapa(dados, CAMPO_LIVRO);

    Atividade atividade =
        Atividade.nova(
            uuid(dados, CAMPO_USUARIO_ID),
            tipo,
            uuid(dados, CAMPO_LIVRO_ID),
            envelope.eventId(),
            envelope.businessKey(),
            origemTipo,
            uuid(dados, campoOrigemId),
            texto(usuario, CAMPO_DISPLAY_NAME),
            texto(usuario, CAMPO_USERNAME),
            texto(usuario, CAMPO_AVATAR_URL),
            texto(livro, CAMPO_TITULO),
            texto(livro, CAMPO_AUTOR),
            texto(livro, CAMPO_CAPA_URL));

    try {
      atividades.saveAndFlush(atividade);
    } catch (DataIntegrityViolationException replay) {
      // atividade_event_id_unico ou atividade_fato_unico: mesmo efeito de uma entrega repetida.
    }
  }

  private void excluirAtividade(MessageEnvelope envelope) {
    UUID resenhaId = uuid(envelope.data(), CAMPO_RESENHA_ID);
    atividades
        .findByTipoAndOrigemId(TipoAtividade.RESENHA_PUBLICADA, resenhaId)
        .ifPresent(atividades::delete);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mapa(Map<String, Object> dados, String campo) {
    return (Map<String, Object>) dados.get(campo);
  }

  private static UUID uuid(Map<String, Object> dados, String campo) {
    return UUID.fromString((String) dados.get(campo));
  }

  private static String texto(Map<String, Object> objeto, String campo) {
    return (String) objeto.get(campo);
  }
}

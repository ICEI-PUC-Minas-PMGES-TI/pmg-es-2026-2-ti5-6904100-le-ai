package br.com.leai.social.notificacao.service;

import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.ConsumerDefinition;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessageHandler;
import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.notificacao.model.DadosDeNotificacao;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.model.NotificacaoGravada;
import br.com.leai.social.notificacao.model.NovaNotificacao;
import br.com.leai.social.notificacao.repository.NotificacaoRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * Consumidor dos eventos de notificação de F-NOT (RF-NOT-01): cada evento de {@link
 * EventoDeNotificacao} vira uma {@code notificacao} para {@code data.destinatarioId}. Uma fila só,
 * {@code leai.social.notificacoes}, amarrada aos exchanges de {@code identidade}, {@code leitura}
 * e do próprio {@code social}; validação por schema, retry 1/5/15s e DLQ vêm de {@link
 * AmqpConsumerService} (RNF-SEC-32, RNF-ERR-07).
 *
 * <p>Idempotente em duas camadas (RNF-ERR-06): o recibo de {@code eventId} em {@code
 * mensagem_processada}, e a unicidade {@code (destinatario, tipo, chave de negócio)} da tabela —
 * uma nova execução do job de inatividade com outro {@code eventId} para o mesmo {@code (leitura,
 * inatividadeVersao, limiar)} traz a mesma chave de negócio e não duplica o alerta.
 */
@Component
public class ConsumidorDeNotificacao implements MessageHandler {

  private final NotificacaoRepository notificacoes;
  private final ApplicationEventPublisher eventos;

  public ConsumidorDeNotificacao(
      AmqpConsumerService consumidor,
      NotificacaoRepository notificacoes,
      ApplicationEventPublisher eventos) {
    this.notificacoes = notificacoes;
    this.eventos = eventos;
    consumidor.register(
        new ConsumerDefinition(
            MessagingConstants.NOTIFICACOES_CONSUMER_NAME,
            MessagingConstants.NOTIFICACOES_QUEUE,
            EventoDeNotificacao.routingKeysPorExchange()),
        this);
  }

  @Override
  public void handle(MessageEnvelope envelope) {
    EventoDeNotificacao evento =
        EventoDeNotificacao.deEvento(envelope.type())
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "Evento nao suportado pelo consumidor de notificacoes: "
                            + envelope.type()));
    Map<String, Object> dados = evento.snapshot(envelope.data());
    if (dados.get(DadosDeNotificacao.ATIVIDADE_ID) instanceof String atividadeId) {
      notificacoes
          .contextoDaAtividade(UUID.fromString(atividadeId))
          .ifPresent(contexto -> dados.put(DadosDeNotificacao.ATIVIDADE, contexto));
    }
    UUID leituraRef =
        evento.tipo().referenciaLeitura()
            ? UUID.fromString((String) dados.get(DadosDeNotificacao.LEITURA_ID))
            : null;

    UUID destinatarioId = UUID.fromString(evento.destinatarioId(envelope.data()));

    notificacoes
        .inserir(
            new NovaNotificacao(
                destinatarioId,
                evento.tipo(),
                leituraRef,
                dados,
                envelope.eventId(),
                envelope.businessKey()))
        .ifPresent(id -> eventos.publishEvent(new NotificacaoGravada(id, destinatarioId)));
  }
}

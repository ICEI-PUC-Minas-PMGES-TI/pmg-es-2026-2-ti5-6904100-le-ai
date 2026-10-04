package br.com.leai.social.recomendacao.service;

import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.ConsumerDefinition;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessageHandler;
import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Consome {@code livro.adicionado_a_estante} e remove todas as recomendações daquele livro
 * recebidas pelo leitor (RF-REC-16, RN-22.10), sem avisar os remetentes. Fila {@code
 * leai.social.recomendacoes} no exchange de {@code leitura}; retentativa, DLQ e recibo em {@code
 * mensagem_processada} vêm do {@link AmqpConsumerService}.
 *
 * <p>Idempotente também no efeito: reentregar o fato apaga zero linhas. Falha de banco sobe e
 * segue o caminho de retentativa e DLQ; nada é engolido aqui.
 *
 * <p>Backfill antes do binding (AGENTS §10): {@link LimpezaDeRecomendacoes} reconcilia com a
 * estante as recomendações que este consumidor não viu.
 */
@Component
public class ConsumidorDeLivroNaEstante implements MessageHandler {

  private final RecomendacaoRepository repositorio;

  public ConsumidorDeLivroNaEstante(
      AmqpConsumerService consumidor, RecomendacaoRepository repositorio) {
    this.repositorio = repositorio;
    consumidor.register(
        new ConsumerDefinition(
            MessagingConstants.RECOMENDACOES_CONSUMER_NAME,
            MessagingConstants.RECOMENDACOES_QUEUE,
            MessagingConstants.LEITURA_EXCHANGE,
            MessagingConstants.RECOMENDACOES_ROUTING_KEYS),
        this);
  }

  @Override
  public void handle(MessageEnvelope envelope) {
    if (!MessagingConstants.EVENTO_LIVRO_ADICIONADO_A_ESTANTE.equals(envelope.type())) {
      throw new IllegalArgumentException(
          "Evento nao suportado pelo consumidor de recomendacoes: " + envelope.type());
    }
    repositorio.removerDoLivroNaEstante(
        UUID.fromString((String) envelope.data().get("usuarioId")),
        UUID.fromString((String) envelope.data().get("livroId")));
  }
}

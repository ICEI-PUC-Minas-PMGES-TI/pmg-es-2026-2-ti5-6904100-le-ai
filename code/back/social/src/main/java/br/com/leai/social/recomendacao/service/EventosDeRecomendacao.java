package br.com.leai.social.recomendacao.service;

import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.messaging.OutboxSocial;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository.LivroDeReferencia;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * {@code recomendacao.recebida} (schema {@code recomendacao.recebida.v1}), gravado na outbox na
 * transação que cria a recomendação. A chave de negócio é a identidade da recomendação: reentrega
 * do mesmo fato não duplica a notificação, e um novo envio depois de descarte ou expiração tem
 * outro id e notifica de novo.
 */
@Component
class EventosDeRecomendacao {

  private final OutboxSocial outbox;

  EventosDeRecomendacao(OutboxSocial outbox) {
    this.outbox = outbox;
  }

  /** Snapshot de quem recomenda, montado uma vez por envio e repetido em cada destinatário. */
  Map<String, Object> remetente(UUID remetenteId) {
    return outbox.usuarioSnapshot(remetenteId);
  }

  /** Grava o evento e devolve o {@code eventId}, guardado na recomendação para rastreio. */
  UUID recomendacaoRecebida(
      UUID recomendacaoId,
      UUID destinatarioId,
      LivroDeReferencia livro,
      Map<String, Object> remetente,
      String mensagem) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("recomendacaoId", recomendacaoId.toString());
    data.put("destinatarioId", destinatarioId.toString());
    data.put("livroId", livro.id().toString());
    data.put("autorAcao", remetente);
    data.put("livro", livroSnapshot(livro));
    data.put("mensagem", mensagem);
    return outbox.gravar(
        MessagingConstants.EVENTO_RECOMENDACAO_RECEBIDA, "recomendacao:" + recomendacaoId, data);
  }

  /** {@code LivroSnapshot} de {@code common-v1.schema.json}. */
  private static Map<String, Object> livroSnapshot(LivroDeReferencia livro) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("id", livro.id().toString());
    snapshot.put("tipo", livro.tipo());
    snapshot.put("titulo", livro.titulo());
    snapshot.put("autor", livro.autor());
    snapshot.put("capaUrl", livro.capaUrl());
    return snapshot;
  }
}

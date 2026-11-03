package br.com.leai.social.recomendacao.service;

import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.messaging.OutboxSocial;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository.LivroDeReferencia;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class EventosDeRecomendacao {

  private final OutboxSocial outbox;

  EventosDeRecomendacao(OutboxSocial outbox) {
    this.outbox = outbox;
  }

  Map<String, Object> remetente(UUID remetenteId) {
    return outbox.usuarioSnapshot(remetenteId);
  }

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

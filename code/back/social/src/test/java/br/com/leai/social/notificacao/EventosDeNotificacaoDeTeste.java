package br.com.leai.social.notificacao;

import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Envelopes dos 8 eventos de notificação, montados a partir de {@code docs/mensageria/schemas}:
 * mesmo formato que {@code identidade}, {@code leitura} e o próprio {@code social} publicam.
 */
public final class EventosDeNotificacaoDeTeste {

  public static final String NOME_ATOR = "Caio Ferraz";
  public static final String TITULO_LIVRO = "O Avesso da Pele";

  private EventosDeNotificacaoDeTeste() {}

  /** Parâmetros variáveis de um evento; o resto do {@code data} é fixo. */
  public record Fato(
      UUID destinatarioId,
      UUID atorId,
      UUID atividadeId,
      UUID recursoId,
      UUID leituraId,
      int inatividadeVersao,
      int limiarDias) {

    public static Fato para(UUID destinatarioId) {
      return new Fato(
          destinatarioId,
          UUID.randomUUID(),
          UUID.randomUUID(),
          UUID.randomUUID(),
          UUID.randomUUID(),
          1,
          20);
    }

    public Fato comAtor(UUID atorId) {
      return new Fato(
          destinatarioId, atorId, atividadeId, recursoId, leituraId, inatividadeVersao, limiarDias);
    }

    public Fato comAtividade(UUID atividadeId) {
      return new Fato(
          destinatarioId, atorId, atividadeId, recursoId, leituraId, inatividadeVersao, limiarDias);
    }

    public Fato comCiclo(int versao, int limiar) {
      return new Fato(destinatarioId, atorId, atividadeId, recursoId, leituraId, versao, limiar);
    }
  }

  public static MessageEnvelope envelope(EventoDeNotificacao evento, Fato fato) {
    return envelope(evento, fato, UUID.randomUUID());
  }

  public static MessageEnvelope envelope(EventoDeNotificacao evento, Fato fato, UUID eventId) {
    return new MessageEnvelope(
        eventId,
        evento.evento(),
        1,
        OffsetDateTime.parse("2026-09-20T12:00:00Z"),
        UUID.randomUUID(),
        chaveDeNegocio(evento, fato),
        dados(evento, fato));
  }

  /** Chaves de negócio do {@code docs/mensageria/catalogo.md}. */
  public static String chaveDeNegocio(EventoDeNotificacao evento, Fato fato) {
    return switch (evento) {
      case SEGUIDOR_NOVO -> "seguimento:" + fato.recursoId();
      case SOLICITACAO_CRIADA, SOLICITACAO_ACEITA -> "solicitacao:" + fato.recursoId();
      case ATIVIDADE_CURTIDA -> "atividade:" + fato.atividadeId() + ":curtida:" + fato.atorId();
      case ATIVIDADE_COMENTADA, COMENTARIO_RESPONDIDO -> "comentario:" + fato.recursoId();
      case LEITURA_EM_RISCO, LEITURA_EXPIRADA ->
          "leitura:"
              + fato.leituraId()
              + ":inatividade:"
              + fato.inatividadeVersao()
              + ":"
              + fato.limiarDias();
    };
  }

  public static Map<String, Object> dados(EventoDeNotificacao evento, Fato fato) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("destinatarioId", fato.destinatarioId().toString());
    String recurso = fato.recursoId().toString();
    switch (evento) {
      case SEGUIDOR_NOVO -> {
        dados.put("seguimentoId", recurso);
        dados.put("seguidor", usuario(fato.atorId()));
      }
      case SOLICITACAO_CRIADA -> {
        dados.put("solicitacaoId", recurso);
        dados.put("solicitante", usuario(fato.atorId()));
      }
      case SOLICITACAO_ACEITA -> {
        dados.put("solicitacaoId", recurso);
        dados.put("seguimentoId", UUID.randomUUID().toString());
        dados.put("perfilAceitante", usuario(fato.atorId()));
      }
      case ATIVIDADE_CURTIDA -> {
        dados.put("atividadeId", fato.atividadeId().toString());
        dados.put("autorAcao", usuario(fato.atorId()));
      }
      case ATIVIDADE_COMENTADA -> {
        dados.put("atividadeId", fato.atividadeId().toString());
        dados.put("comentarioId", recurso);
        dados.put("autorAcao", usuario(fato.atorId()));
      }
      case COMENTARIO_RESPONDIDO -> {
        dados.put("atividadeId", fato.atividadeId().toString());
        dados.put("comentarioId", recurso);
        dados.put("comentarioAlvoId", UUID.randomUUID().toString());
        dados.put("autorAcao", usuario(fato.atorId()));
      }
      case LEITURA_EM_RISCO, LEITURA_EXPIRADA -> {
        dados.put("leituraId", fato.leituraId().toString());
        dados.put("inatividadeVersao", fato.inatividadeVersao());
        dados.put("limiarDias", evento == EventoDeNotificacao.LEITURA_EXPIRADA ? 40 : fato.limiarDias());
        dados.put("livro", livro());
      }
    }
    return dados;
  }

  private static Map<String, Object> usuario(UUID id) {
    Map<String, Object> usuario = new HashMap<>();
    usuario.put("id", id.toString());
    usuario.put("username", "caioferraz");
    usuario.put("displayName", NOME_ATOR);
    usuario.put("avatarUrl", null);
    return usuario;
  }

  private static Map<String, Object> livro() {
    Map<String, Object> livro = new HashMap<>();
    livro.put("id", UUID.randomUUID().toString());
    livro.put("tipo", "oficial");
    livro.put("titulo", TITULO_LIVRO);
    livro.put("autor", "Jeferson Tenório");
    livro.put("capaUrl", null);
    return livro;
  }
}

package br.com.leai.social.notificacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.notificacao.dto.AtualizarPreferenciasRequisicao;
import br.com.leai.social.notificacao.dto.PreferenciaDeNotificacaoResposta;
import br.com.leai.social.notificacao.dto.PreferenciasDeNotificacaoResposta;
import br.com.leai.social.notificacao.model.TipoPreferenciaNotificacao;
import br.com.leai.social.notificacao.repository.PreferenciaNotificacaoRepository;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicoDePreferenciaDeNotificacao {

  private static final boolean HABILITADA_POR_PADRAO = true;

  private final PreferenciaNotificacaoRepository preferencias;

  public ServicoDePreferenciaDeNotificacao(PreferenciaNotificacaoRepository preferencias) {
    this.preferencias = preferencias;
  }

  @Transactional(readOnly = true)
  public PreferenciasDeNotificacaoResposta listar(UUID usuarioId) {
    return completas(usuarioId);
  }

  @Transactional
  public PreferenciasDeNotificacaoResposta atualizar(
      UUID usuarioId, AtualizarPreferenciasRequisicao requisicao) {
    preferencias.gravar(usuarioId, alteracoes(requisicao));
    return completas(usuarioId);
  }

  private PreferenciasDeNotificacaoResposta completas(UUID usuarioId) {
    Map<TipoPreferenciaNotificacao, Boolean> gravadas = preferencias.gravadas(usuarioId);
    return new PreferenciasDeNotificacaoResposta(
        Arrays.stream(TipoPreferenciaNotificacao.values())
            .map(
                tipo ->
                    new PreferenciaDeNotificacaoResposta(
                        tipo, gravadas.getOrDefault(tipo, HABILITADA_POR_PADRAO)))
            .toList());
  }

  private static Map<TipoPreferenciaNotificacao, Boolean> alteracoes(
      AtualizarPreferenciasRequisicao requisicao) {
    Map<TipoPreferenciaNotificacao, Boolean> alteracoes =
        new EnumMap<>(TipoPreferenciaNotificacao.class);
    for (AtualizarPreferenciasRequisicao.Item item : requisicao.preferencias()) {
      TipoPreferenciaNotificacao tipo =
          TipoPreferenciaNotificacao.deNome(item.tipo())
              .orElseThrow(() -> invalida("Tipo de notificação desconhecido."));
      if (alteracoes.put(tipo, item.habilitada()) != null) {
        throw invalida("Não repita tipos de notificação na mesma atualização.");
      }
    }
    return alteracoes;
  }

  private static ErroDeNegocioException invalida(String mensagem) {
    return new ErroDeNegocioException(CodigoErro.REQUISICAO_INVALIDA, mensagem);
  }
}

package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * A conta vista pelo administrador no perfil (F-MOD-OPC, perfil-de-outro-leitor.md §5.0), pela
 * VIEW {@code v_conta_moderacao_v1}: também a suspensa, que as VIEWs públicas omitem. {@code motivo}
 * é o da suspensão vigente, do registro de auditoria; nulo com a conta ativa.
 */
@Schema(name = "ContaDaModeracao")
public record ContaDaModeracaoResposta(
    String id,
    String username,
    String nomeExibicao,
    String avatarUrl,
    String privacidade,
    boolean suspensa,
    Instant suspensaEm,
    String motivo) {}

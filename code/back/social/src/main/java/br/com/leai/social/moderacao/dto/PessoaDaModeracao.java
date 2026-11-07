package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Pessoa citada no painel, pela VIEW {@code v_conta_moderacao_v1} (F-MOD-OPC): a conta suspensa
 * continua aparecendo, com {@code suspensa} e a data. Nula quando a conta está em exclusão ou já
 * foi excluída: o painel mostra "conta excluída", sem username (RN-23.7).
 */
@Schema(name = "PessoaDaModeracao")
public record PessoaDaModeracao(
    String id,
    String username,
    String nomeExibicao,
    String avatarUrl,
    boolean suspensa,
    Instant suspensaEm) {}

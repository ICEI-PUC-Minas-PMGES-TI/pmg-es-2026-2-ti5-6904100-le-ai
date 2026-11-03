package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Pessoa citada no painel, pela VIEW de perfil. Nula quando a conta saiu da VIEW (em exclusão ou
 * suspensa): o painel mostra "conta excluída", sem username (RN-23.7).
 */
@Schema(name = "PessoaDaModeracao")
public record PessoaDaModeracao(String id, String username, String nomeExibicao, String avatarUrl) {}

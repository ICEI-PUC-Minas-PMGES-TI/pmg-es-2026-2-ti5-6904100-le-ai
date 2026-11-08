package br.com.leai.social.notificacao.dto;

import br.com.leai.social.notificacao.model.TipoPreferenciaNotificacao;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "PreferenciaDeNotificacao")
public record PreferenciaDeNotificacaoResposta(
    TipoPreferenciaNotificacao tipo, boolean habilitada) {}

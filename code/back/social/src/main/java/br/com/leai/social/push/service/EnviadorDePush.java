package br.com.leai.social.push.service;

import br.com.leai.social.push.model.MensagemDePush;

public interface EnviadorDePush {

  boolean ativo();

  void enviar(MensagemDePush mensagem);
}

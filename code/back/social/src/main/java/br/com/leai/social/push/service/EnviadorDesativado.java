package br.com.leai.social.push.service;

import br.com.leai.social.push.model.MensagemDePush;

public class EnviadorDesativado implements EnviadorDePush {

  @Override
  public boolean ativo() {
    return false;
  }

  @Override
  public void enviar(MensagemDePush mensagem) {}
}

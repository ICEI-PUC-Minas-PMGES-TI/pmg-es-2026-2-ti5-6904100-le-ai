package br.com.leai.social.push.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.push.model.RegistroDeDispositivo;
import br.com.leai.social.push.repository.DispositivoPushRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ServicoDeDispositivoPush {

  private static final String NAO_ENCONTRADO = "Não encontramos o dispositivo.";

  private final DispositivoPushRepository dispositivos;

  public ServicoDeDispositivoPush(DispositivoPushRepository dispositivos) {
    this.dispositivos = dispositivos;
  }

  public RegistroDeDispositivo registrar(UUID usuarioId, String token) {
    return dispositivos.registrar(usuarioId, token);
  }

  public void revogar(UUID usuarioId, UUID id) {
    if (!dispositivos.revogar(usuarioId, id)) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO);
    }
  }
}

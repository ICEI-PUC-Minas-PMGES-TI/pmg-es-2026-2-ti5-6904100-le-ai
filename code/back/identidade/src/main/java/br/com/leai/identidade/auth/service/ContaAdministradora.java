package br.com.leai.identidade.auth.service;

import br.com.leai.identidade.auth.model.Papel;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Qual linha de {@code usuario} é a conta administradora (RF-AUT-08). Preenchido pelo {@link
 * ProvisionamentoDoAdmin} no arranque; vazio quando o ambiente não define o admin.
 *
 * <p>O papel vem daqui, e não de coluna na tabela: {@code usuario} não tem papel e F-AUT não cria
 * migration para isso. Como só existe um admin e ele é definido pelo ambiente, basta saber o id.
 */
@Component
public class ContaAdministradora {

  private volatile UUID id;

  void definir(UUID id) {
    this.id = id;
  }

  public boolean eh(UUID usuarioId) {
    return usuarioId != null && usuarioId.equals(id);
  }

  public Papel papelDe(UUID usuarioId) {
    return eh(usuarioId) ? Papel.ADMIN : Papel.LEITOR;
  }
}

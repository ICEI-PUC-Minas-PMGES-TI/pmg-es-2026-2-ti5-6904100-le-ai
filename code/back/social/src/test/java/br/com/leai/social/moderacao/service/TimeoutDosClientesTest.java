package br.com.leai.social.moderacao.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

/**
 * Validação da F-MOD-OPC (06/11/2026): o timeout de conexão é subclasse do de leitura, mas nele o
 * pedido não saiu; precisa cair na retentativa (falha de conexão), não no 504.
 */
class TimeoutDosClientesTest {

  private static ResourceAccessException envolvendo(IOException causa) {
    return new ResourceAccessException("falhou", causa);
  }

  @Test
  @DisplayName("Timeout de leitura é timeout; o de conexão não é, nos dois clientes")
  void separaLeituraDeConexao() {
    ResourceAccessException leitura = envolvendo(new HttpTimeoutException("leitura"));
    ResourceAccessException conexao = envolvendo(new HttpConnectTimeoutException("conexão"));
    ResourceAccessException recusada = envolvendo(new IOException("recusada"));

    assertThat(ClienteDeIdentidade.causaDeTimeout(leitura)).isTrue();
    assertThat(ClienteDeIdentidade.causaDeTimeout(conexao)).isFalse();
    assertThat(ClienteDeIdentidade.causaDeTimeout(recusada)).isFalse();
    assertThat(ClienteDeLeitura.causaDeTimeout(leitura)).isTrue();
    assertThat(ClienteDeLeitura.causaDeTimeout(conexao)).isFalse();
  }
}

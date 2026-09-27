package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@code ServicoDeIdempotencia} contra Postgres real (RNF-ERR-04, RNF-TST-02): replay, conflito e
 * corrida entre duas execuções com a mesma chave, sobre {@code idempotencia_social}. Sem
 * controller de domínio ainda, o efeito é simulado por um contador em memória — o que importa
 * aqui é a mecânica de recibo/replay/conflito, não uma regra de negócio do feed.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ServicoDeIdempotenciaIntegracaoTest extends IntegracaoComPostgres {

  record Corpo(String valor) {}

  @Autowired private ServicoDeIdempotencia servico;
  @Autowired private JdbcTemplate jdbc;

  private RespostaIdempotente<Corpo> executar(UUID sujeito, String chave, String payload, int[] execucoes) {
    return servico.executar(
        sujeito,
        OperacaoIdempotente.CURTIR_ATIVIDADE,
        chave,
        Map.of("valor", payload),
        Corpo.class,
        () -> {
          execucoes[0]++;
          return new RespostaIdempotente<>(201, new Corpo(payload));
        });
  }

  @Test
  @DisplayName("primeira execução roda o efeito; replay com mesma chave e payload não roda de novo")
  void replayNaoReexecuta() {
    UUID sujeito = UUID.randomUUID();
    String chave = UUID.randomUUID().toString();
    int[] execucoes = {0};

    RespostaIdempotente<Corpo> primeira = executar(sujeito, chave, "a", execucoes);
    RespostaIdempotente<Corpo> replay = executar(sujeito, chave, "a", execucoes);

    assertThat(execucoes[0]).isEqualTo(1);
    assertThat(replay.status()).isEqualTo(primeira.status());
    assertThat(replay.corpo()).isEqualTo(primeira.corpo());
  }

  @Test
  @DisplayName("mesma chave com payload diferente é 409 e não reexecuta o efeito")
  void payloadDiferenteVira409() {
    UUID sujeito = UUID.randomUUID();
    String chave = UUID.randomUUID().toString();
    int[] execucoes = {0};

    executar(sujeito, chave, "a", execucoes);

    assertThatThrownBy(() -> executar(sujeito, chave, "b", execucoes))
        .isInstanceOf(ErroDeNegocioException.class);
    assertThat(execucoes[0]).isEqualTo(1);
  }

  @Test
  @DisplayName("chaves diferentes, ou sujeitos diferentes, executam o efeito de novo")
  void chaveOuSujeitoDiferenteReexecuta() {
    UUID sujeito = UUID.randomUUID();
    int[] execucoes = {0};

    executar(sujeito, UUID.randomUUID().toString(), "a", execucoes);
    executar(sujeito, UUID.randomUUID().toString(), "a", execucoes);
    executar(UUID.randomUUID(), UUID.randomUUID().toString(), "a", execucoes);

    assertThat(execucoes[0]).isEqualTo(3);
  }

  @Test
  @DisplayName("o recibo grava operationId, hash HMAC do payload e o status HTTP")
  void reciboGravaCamposEsperados() {
    UUID sujeito = UUID.randomUUID();
    String chave = UUID.randomUUID().toString();
    int[] execucoes = {0};

    executar(sujeito, chave, "a", execucoes);

    Map<String, Object> recibo =
        jdbc.queryForMap(
            "SELECT operacao, payload_hash, status_http FROM idempotencia_social"
                + " WHERE subject_ref = ? AND chave = ?",
            sujeito,
            chave);
    assertThat(recibo.get("operacao")).isEqualTo("curtirAtividade");
    assertThat(recibo.get("status_http")).isEqualTo(201);
    assertThat((String) recibo.get("payload_hash")).startsWith("hmac-sha256:");
  }

  @Test
  @DisplayName("execuções concorrentes com a mesma chave rodam o efeito uma única vez")
  void corridaComMesmaChaveExecutaUmaVez() throws Exception {
    UUID sujeito = UUID.randomUUID();
    String chave = UUID.randomUUID().toString();
    int concorrentes = 6;
    CountDownLatch largada = new CountDownLatch(1);
    int[] execucoes = {0};

    List<Future<RespostaIdempotente<Corpo>>> futuros = new ArrayList<>();
    try (ExecutorService executor = Executors.newFixedThreadPool(concorrentes)) {
      for (int i = 0; i < concorrentes; i++) {
        futuros.add(
            executor.submit(
                () -> {
                  largada.await();
                  return executar(sujeito, chave, "a", execucoes);
                }));
      }
      largada.countDown();

      List<RespostaIdempotente<Corpo>> respostas = new ArrayList<>();
      for (Future<RespostaIdempotente<Corpo>> futuro : futuros) {
        respostas.add(futuro.get());
      }

      assertThat(respostas).allSatisfy(r -> assertThat(r.corpo()).isEqualTo(new Corpo("a")));
    }
    assertThat(execucoes[0]).isEqualTo(1);
  }
}

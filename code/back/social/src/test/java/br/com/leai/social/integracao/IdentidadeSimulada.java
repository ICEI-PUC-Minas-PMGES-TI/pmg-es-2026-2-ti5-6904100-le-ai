package br.com.leai.social.integracao;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.BiConsumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Os comandos internos de suspensão e reativação do {@code identidade} (F-MOD-OPC), simulados num
 * {@code HttpServer} do JDK, como o {@link LeituraSimulada}. Guarda o estado de cada conta e é
 * idempotente pelo estado, como o serviço real: repetir devolve o mesmo instante com {@code
 * alterado: false}. {@link #aoAplicar} reflete a mudança na VIEW falsa do teste.
 */
public final class IdentidadeSimulada implements AutoCloseable {

  /** O que a próxima chamada faz. */
  public enum Modo {
    APLICA,
    APLICA_E_DEMORA,
    INDISPONIVEL,
    NAO_ENCONTRADA,
    CONTA_ADMIN,
    RECUSA
  }

  public record Chamada(String acao, UUID id, String token, String authorization) {}

  private record Estado(boolean suspenso, Instant suspensoEm, Instant reativadoEm) {}

  private static final Pattern CAMINHO =
      Pattern.compile("/internal/moderacao/usuarios/([0-9a-f-]{36})/(suspensao|reativacao)");

  private final HttpServer servidor;
  private final ExecutorService threads = Executors.newCachedThreadPool();
  private final Map<UUID, Estado> contas = new ConcurrentHashMap<>();
  private final List<Chamada> chamadas = new ArrayList<>();
  private volatile Modo modo = Modo.APLICA;
  private volatile long demoraMs = 0;
  private volatile BiConsumer<UUID, Boolean> aoAplicar = (id, suspenso) -> {};

  public IdentidadeSimulada() {
    try {
      servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    } catch (IOException erro) {
      throw new IllegalStateException(erro);
    }
    servidor.createContext("/", this::atender);
    servidor.setExecutor(threads);
    servidor.start();
  }

  public String url() {
    return "http://127.0.0.1:" + servidor.getAddress().getPort();
  }

  public void reiniciar() {
    contas.clear();
    synchronized (chamadas) {
      chamadas.clear();
    }
    modo = Modo.APLICA;
    demoraMs = 0;
    aoAplicar = (id, suspenso) -> {};
  }

  public void modo(Modo novo) {
    modo = novo;
  }

  public void demora(long ms) {
    demoraMs = ms;
  }

  /** Chamado quando o estado muda de verdade: {@code true} suspendeu, {@code false} reativou. */
  public void aoAplicar(BiConsumer<UUID, Boolean> efeito) {
    aoAplicar = efeito;
  }

  public List<Chamada> chamadas() {
    synchronized (chamadas) {
      return List.copyOf(chamadas);
    }
  }

  private void atender(HttpExchange troca) throws IOException {
    Matcher caminho = CAMINHO.matcher(troca.getRequestURI().getPath());
    if (!caminho.matches() || !"POST".equals(troca.getRequestMethod())) {
      responder(troca, 404, "{}");
      return;
    }
    UUID id = UUID.fromString(caminho.group(1));
    boolean suspender = "suspensao".equals(caminho.group(2));
    String token = troca.getRequestHeaders().getFirst("X-Moderacao-Token");
    String authorization = troca.getRequestHeaders().getFirst("Authorization");
    synchronized (chamadas) {
      chamadas.add(new Chamada(caminho.group(2), id, token, authorization));
    }
    if (!LeituraSimulada.TOKEN.equals(token)) {
      responder(troca, 401, "{}");
      return;
    }
    switch (modo) {
      case INDISPONIVEL -> responder(troca, 503, "{}");
      case NAO_ENCONTRADA -> responder(troca, 404, "{}");
      case CONTA_ADMIN -> responder(troca, 422, "{}");
      case RECUSA -> responder(troca, 403, "{}");
      case APLICA, APLICA_E_DEMORA -> {
        String corpo = aplicar(id, suspender);
        if (modo == Modo.APLICA_E_DEMORA) {
          // Aplicou e a resposta se perde: o social estoura o timeout antes de ler.
          modo = Modo.APLICA;
          dormir(demoraMs);
        }
        responder(troca, 200, corpo);
      }
    }
  }

  private synchronized String aplicar(UUID id, boolean suspender) {
    Estado atual = contas.getOrDefault(id, new Estado(false, null, null));
    boolean alterado = atual.suspenso() != suspender;
    Estado novo = atual;
    if (alterado) {
      // Microssegundos, como o timestamptz do Postgres.
      Instant agora = Instant.now().truncatedTo(ChronoUnit.MICROS);
      novo =
          suspender
              ? new Estado(true, agora, atual.reativadoEm())
              : new Estado(false, null, agora);
      contas.put(id, novo);
      aoAplicar.accept(id, suspender);
    }
    return "{\"usuarioId\":\"%s\",\"suspenso\":%s,\"suspensoEm\":%s,\"reativadoEm\":%s,\"alterado\":%s}"
        .formatted(id, novo.suspenso(), texto(novo.suspensoEm()), texto(novo.reativadoEm()), alterado);
  }

  /** Instante da suspensão vigente, para o teste montar a VIEW falsa igual. */
  public Instant suspensoEm(UUID id) {
    Estado estado = contas.get(id);
    return estado == null ? null : estado.suspensoEm();
  }

  private static String texto(Instant valor) {
    return valor == null ? "null" : "\"" + valor + "\"";
  }

  private static void dormir(long ms) {
    try {
      Thread.sleep(ms);
    } catch (InterruptedException erro) {
      Thread.currentThread().interrupt();
    }
  }

  private static void responder(HttpExchange troca, int status, String corpo) throws IOException {
    byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
    troca.getResponseHeaders().add("Content-Type", "application/json");
    try {
      troca.sendResponseHeaders(status, bytes.length);
      try (OutputStream saida = troca.getResponseBody()) {
        saida.write(bytes);
      }
    } catch (IOException conexaoFechada) {
      // O social desistiu pelo timeout; nada a fazer.
    } finally {
      troca.close();
    }
  }

  @Override
  public void close() {
    servidor.stop(0);
    threads.shutdownNow();
  }
}

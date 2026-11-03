package br.com.leai.social.integracao;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * O comando interno de remoção do {@code leitura} (F-MOD), simulado num {@code HttpServer} do JDK
 * para testar o timeout de verdade. Como o {@code leitura}, guarda a resposta pela
 * {@code Idempotency-Key} e repete a mesma resposta para a mesma chave.
 *
 * <p>Ao remover, chama {@link #aoRemover}, que no teste apaga a linha da VIEW falsa e faz o que o
 * consumidor de {@code resenha.excluida} faria; sem isso o teste do reenvio passaria com o erro
 * presente.
 */
public final class LeituraSimulada implements AutoCloseable {

  public static final String TOKEN = "token-da-moderacao-de-integracao-com-32-chars";

  /** O que a próxima chamada nova faz. */
  public enum Modo {
    REMOVE,
    REMOVE_E_DEMORA,
    JA_REMOVIDA,
    INDISPONIVEL,
    CONFLITO
  }

  public record Chamada(String colecao, UUID id, String token, String chave) {}

  private static final Pattern CAMINHO =
      Pattern.compile("/internal/moderacao/(resenhas|frases)/([0-9a-f-]{36})/remocao");

  private final HttpServer servidor;
  // Várias threads: o reenvio chega enquanto a primeira chamada ainda dorme no timeout.
  private final ExecutorService threads = Executors.newCachedThreadPool();
  private final Map<String, String> respostas = new ConcurrentHashMap<>();
  private final List<Chamada> chamadas = new ArrayList<>();
  private volatile Modo modo = Modo.REMOVE;
  private volatile long demoraMs = 0;
  private volatile Consumer<UUID> aoRemover = id -> {};
  private volatile UUID autorDaRemocao;
  private volatile UUID livroDaRemocao;

  public LeituraSimulada() {
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
    respostas.clear();
    synchronized (chamadas) {
      chamadas.clear();
    }
    modo = Modo.REMOVE;
    demoraMs = 0;
    aoRemover = id -> {};
  }

  public void modo(Modo novo) {
    modo = novo;
  }

  public void demora(long ms) {
    demoraMs = ms;
  }

  public void aoRemover(Consumer<UUID> efeito) {
    aoRemover = efeito;
  }

  public void autoria(UUID autor, UUID livro) {
    autorDaRemocao = autor;
    livroDaRemocao = livro;
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
    UUID id = UUID.fromString(caminho.group(2));
    String token = troca.getRequestHeaders().getFirst("X-Moderacao-Token");
    String chave = troca.getRequestHeaders().getFirst("Idempotency-Key");
    synchronized (chamadas) {
      chamadas.add(new Chamada(caminho.group(1), id, token, chave));
    }
    if (!TOKEN.equals(token)) {
      responder(troca, 401, "{}");
      return;
    }
    String anterior = respostas.get(chave);
    if (anterior != null) {
      responder(troca, 200, anterior);
      return;
    }
    switch (modo) {
      case INDISPONIVEL -> responder(troca, 503, "{}");
      case CONFLITO -> responder(troca, 409, "{}");
      case JA_REMOVIDA -> {
        String corpo = "{\"removida\":false,\"autorId\":null,\"livroId\":null}";
        respostas.put(chave, corpo);
        responder(troca, 200, corpo);
      }
      case REMOVE, REMOVE_E_DEMORA -> {
        aoRemover.accept(id);
        String corpo =
            "{\"removida\":true,\"autorId\":"
                + texto(autorDaRemocao)
                + ",\"livroId\":"
                + texto(livroDaRemocao)
                + "}";
        respostas.put(chave, corpo);
        if (modo == Modo.REMOVE_E_DEMORA) {
          // Apagou e a resposta se perde: o social estoura o timeout antes de ler.
          modo = Modo.REMOVE;
          dormir(demoraMs);
        }
        responder(troca, 200, corpo);
      }
    }
  }

  private static String texto(UUID valor) {
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

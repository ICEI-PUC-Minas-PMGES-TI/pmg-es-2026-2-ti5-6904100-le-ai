package br.com.leai.social.feed.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
class ResolvedorDeMencoes {

  // Username de identidade sem ponto final; o lookbehind descarta e-mails.
  private static final Pattern MENCAO =
      Pattern.compile("(?<![A-Za-z0-9._@])@([A-Za-z0-9._]{2,29}[A-Za-z0-9_])");

  private final PerfisDeReferencia perfis;

  ResolvedorDeMencoes(PerfisDeReferencia perfis) {
    this.perfis = perfis;
  }

  record MencaoResolvida(int posicao, UUID mencionadoId) {}

  List<MencaoResolvida> resolver(String texto) {
    List<Candidata> candidatas = candidatas(texto);
    if (candidatas.isEmpty()) {
      return List.of();
    }
    Map<String, UUID> existentes =
        perfis.idsPorUsername(candidatas.stream().map(Candidata::username).toList());
    List<MencaoResolvida> resolvidas = new ArrayList<>();
    for (Candidata candidata : candidatas) {
      UUID id = existentes.get(PerfisDeReferencia.chave(candidata.username()));
      if (id != null) {
        resolvidas.add(new MencaoResolvida(candidata.posicao(), id));
      }
    }
    return resolvidas;
  }

  static int comprimentoEm(String texto, int posicao) {
    Matcher matcher = MENCAO.matcher(texto);
    if (posicao < 0 || posicao >= texto.length() || !matcher.find(posicao)) {
      return -1;
    }
    return matcher.start() == posicao ? matcher.end() - posicao : -1;
  }

  static Set<UUID> destinatarios(List<MencaoResolvida> mencoes) {
    Set<UUID> ids = new LinkedHashSet<>();
    mencoes.forEach(m -> ids.add(m.mencionadoId()));
    return ids;
  }

  private record Candidata(int posicao, String username) {}

  private static List<Candidata> candidatas(String texto) {
    List<Candidata> candidatas = new ArrayList<>();
    Matcher matcher = MENCAO.matcher(texto);
    while (matcher.find()) {
      candidatas.add(new Candidata(matcher.start(), matcher.group(1)));
    }
    return candidatas;
  }
}

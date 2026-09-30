package br.com.leai.social.feed.repository;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.Comentario;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

/**
 * {@link ComentarioRepository} contra Postgres real: paginação de comentários-raiz e cursor de
 * respostas (RF-SOC-15/18). Só usa o schema `social`, já migrado pelo {@code
 * IntegracaoComPostgres} desta classe — sem precisar recriar views de outro serviço.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ComentarioRepositorioIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private AtividadeRepository atividadeRepository;
  @Autowired private ComentarioRepository comentarioRepository;

  private UUID novaAtividade(String chaveFato) {
    Atividade atividade =
        Atividade.nova(
            UUID.randomUUID(),
            TipoAtividade.LEITURA_INICIADA,
            UUID.randomUUID(),
            UUID.randomUUID(),
            chaveFato,
            "leitura",
            UUID.randomUUID(),
            "Autora",
            "autora",
            null,
            "Livro",
            "Fulano",
            null);
    return atividadeRepository.save(atividade).id();
  }

  private void espacarRelogio() {
    try {
      Thread.sleep(5);
    } catch (InterruptedException erro) {
      Thread.currentThread().interrupt();
    }
  }

  @Test
  @DisplayName("comentarios-raiz de uma atividade vem paginados, mais antigos primeiro")
  void buscarRaizesPorAtividadePaginaCorretamente() {
    UUID atividadeId = novaAtividade("chave-raizes-1");
    UUID autor = UUID.randomUUID();
    Comentario raiz1 = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "primeiro"));
    espacarRelogio();
    Comentario raiz2 = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "segundo"));
    espacarRelogio();
    Comentario raiz3 = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "terceiro"));

    Page<Comentario> primeiraPagina =
        comentarioRepository.buscarRaizesPorAtividade(atividadeId, PageRequest.of(0, 2));
    Page<Comentario> segundaPagina =
        comentarioRepository.buscarRaizesPorAtividade(atividadeId, PageRequest.of(1, 2));

    assertThat(primeiraPagina.getTotalElements()).isEqualTo(3);
    assertThat(primeiraPagina.getContent())
        .extracting(Comentario::id)
        .containsExactly(raiz1.id(), raiz2.id());
    assertThat(segundaPagina.getContent()).extracting(Comentario::id).containsExactly(raiz3.id());
  }

  @Test
  @DisplayName("comentarios-raiz nao incluem respostas de outros comentarios")
  void buscarRaizesPorAtividadeIgnoraRespostas() {
    UUID atividadeId = novaAtividade("chave-raizes-2");
    UUID autor = UUID.randomUUID();
    Comentario raiz = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "raiz"));
    comentarioRepository.save(Comentario.novo(atividadeId, autor, raiz.id(), autor, null, "resposta"));

    Page<Comentario> pagina = comentarioRepository.buscarRaizesPorAtividade(atividadeId, PageRequest.of(0, 10));

    assertThat(pagina.getContent()).extracting(Comentario::id).containsExactly(raiz.id());
    assertThat(pagina.getTotalElements()).isEqualTo(1);
  }

  @Test
  @DisplayName("findByAtividadeIdAndComentarioRaizIdIsNull devolve so as raizes")
  void findByAtividadeIdAndComentarioRaizIdIsNullDevolveSoRaizes() {
    UUID atividadeId = novaAtividade("chave-raizes-3");
    UUID autor = UUID.randomUUID();
    Comentario raiz = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "raiz"));
    comentarioRepository.save(Comentario.novo(atividadeId, autor, raiz.id(), autor, null, "resposta"));

    List<Comentario> raizes = comentarioRepository.findByAtividadeIdAndComentarioRaizIdIsNull(atividadeId);

    assertThat(raizes).extracting(Comentario::id).containsExactly(raiz.id());
  }

  @Test
  @DisplayName("cursor de respostas avanca corretamente: sem repetir, sem pular, ate acabar")
  void buscarRespostasPorRaizAvancaComCursor() {
    UUID atividadeId = novaAtividade("chave-cursor-1");
    UUID autor = UUID.randomUUID();
    Comentario raiz = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "raiz"));
    List<UUID> respostasIds = new ArrayList<>();
    for (int i = 0; i < 5; i++) {
      Comentario resposta =
          comentarioRepository.save(Comentario.novo(atividadeId, autor, raiz.id(), autor, null, "resposta " + i));
      respostasIds.add(resposta.id());
      espacarRelogio();
    }

    List<Comentario> primeiraPagina = comentarioRepository.buscarRespostasPorRaiz(raiz.id(), null, 2);
    assertThat(primeiraPagina)
        .extracting(Comentario::id)
        .containsExactly(respostasIds.get(0), respostasIds.get(1));

    String cursor1 =
        new CursorComentario(primeiraPagina.get(1).criadoEm(), primeiraPagina.get(1).id()).codificar();
    List<Comentario> segundaPagina = comentarioRepository.buscarRespostasPorRaiz(raiz.id(), cursor1, 2);
    assertThat(segundaPagina)
        .extracting(Comentario::id)
        .containsExactly(respostasIds.get(2), respostasIds.get(3));

    String cursor2 =
        new CursorComentario(segundaPagina.get(1).criadoEm(), segundaPagina.get(1).id()).codificar();
    List<Comentario> terceiraPagina = comentarioRepository.buscarRespostasPorRaiz(raiz.id(), cursor2, 2);
    assertThat(terceiraPagina).extracting(Comentario::id).containsExactly(respostasIds.get(4));

    String cursor3 =
        new CursorComentario(terceiraPagina.get(0).criadoEm(), terceiraPagina.get(0).id()).codificar();
    List<Comentario> quartaPagina = comentarioRepository.buscarRespostasPorRaiz(raiz.id(), cursor3, 2);
    assertThat(quartaPagina).isEmpty();
  }

  @Test
  @DisplayName("countByComentarioRaizId conta so as respostas daquela raiz")
  void countByComentarioRaizIdContaRespostas() {
    UUID atividadeId = novaAtividade("chave-cursor-2");
    UUID autor = UUID.randomUUID();
    Comentario raiz = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "raiz"));
    Comentario outraRaiz = comentarioRepository.save(Comentario.novo(atividadeId, autor, null, null, null, "outra raiz"));
    comentarioRepository.save(Comentario.novo(atividadeId, autor, raiz.id(), autor, null, "r1"));
    comentarioRepository.save(Comentario.novo(atividadeId, autor, raiz.id(), autor, null, "r2"));
    comentarioRepository.save(Comentario.novo(atividadeId, autor, outraRaiz.id(), autor, null, "r-outra"));

    assertThat(comentarioRepository.countByComentarioRaizId(raiz.id())).isEqualTo(2);
    assertThat(comentarioRepository.countByComentarioRaizId(outraRaiz.id())).isEqualTo(1);
  }
}

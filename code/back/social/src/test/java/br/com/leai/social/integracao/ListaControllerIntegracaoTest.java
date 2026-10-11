package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code ListaController} contra Postgres real, HTTP de ponta a ponta (F-LST): propriedade,
 * limites, RN-15.1 (livro pessoal), ordem contínua ao mover e remover, cursor, RN-08 e
 * idempotência.
 *
 * <p>Recria o mínimo de {@code identidade} e {@code acervo}, com as mesmas definições de VIEW de
 * {@link InteracaoControllerIntegracaoTest}: as classes compartilham o contexto, e {@code CREATE
 * OR REPLACE VIEW} não remove coluna.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ListaControllerIntegracaoTest extends IntegracaoComPostgres {

  private static final ObjectMapper JSON = new ObjectMapper();

  @Autowired private JdbcTemplate jdbc;

  @BeforeEach
  void preparaSchemaCrossServico() {
    jdbc.execute("CREATE SCHEMA IF NOT EXISTS identidade");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.usuario (
          id uuid PRIMARY KEY,
          suspenso boolean NOT NULL DEFAULT false,
          exclusao_solicitada_em timestamptz
        )
        """);
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS username text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS nome_exibicao text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS avatar_url text");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS privacidade text NOT NULL DEFAULT 'publico'");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS opt_out_recomendacao boolean NOT NULL DEFAULT false");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.seguidor (
          seguidor_id uuid NOT NULL,
          seguido_id uuid NOT NULL,
          PRIMARY KEY (seguidor_id, seguido_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_seguimento_aceito_v1 AS
        SELECT s.seguidor_id, s.seguido_id
          FROM identidade.seguidor s
          JOIN identidade.usuario u_seguidor ON u_seguidor.id = s.seguidor_id
          JOIN identidade.usuario u_seguido ON u_seguido.id = s.seguido_id
         WHERE u_seguidor.suspenso = false AND u_seguidor.exclusao_solicitada_em IS NULL
           AND u_seguido.suspenso = false AND u_seguido.exclusao_solicitada_em IS NULL
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_perfil_referencia_v1 AS
        SELECT id, username, nome_exibicao, avatar_url, privacidade, opt_out_recomendacao
          FROM identidade.usuario
         WHERE suspenso = false AND exclusao_solicitada_em IS NULL
        """);

    jdbc.execute("CREATE SCHEMA IF NOT EXISTS acervo");
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.autor (id uuid PRIMARY KEY, nome text NOT NULL)");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS acervo.livro (
          id uuid PRIMARY KEY,
          tipo text NOT NULL,
          dono_id uuid,
          paginas integer,
          titulo text NOT NULL,
          autor_informado text,
          capa_url_propria text,
          capa_url_externa text,
          ativo boolean NOT NULL DEFAULT true
        )
        """);
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.livro_autor (livro_id uuid NOT NULL, autor_id uuid NOT NULL)");
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW acervo.v_livro_referencia_v1 AS (
          SELECT
            l.id AS livro_id,
            l.tipo,
            l.dono_id,
            l.paginas,
            l.titulo,
            CASE
              WHEN l.tipo = 'pessoal' THEN l.autor_informado
              ELSE (
                SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
                FROM acervo.livro_autor la
                JOIN acervo.autor a ON a.id = la.autor_id
                WHERE la.livro_id = l.id
              )
            END AS autor_exibicao,
            coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
            l.ativo
          FROM acervo.livro l
        )
        """);

    jdbc.execute("TRUNCATE lista CASCADE");
    jdbc.execute("TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro CASCADE");
  }

  @Nested
  @DisplayName("criar e editar")
  class CriarEEditar {

    @Test
    @DisplayName("cria lista do próprio leitor, que aparece para ele com pertenceAoSolicitante")
    void criaEObtem() throws Exception {
      UUID marina = leitor("marina", "publico");

      HttpResponse<String> criada = criar(marina, "{\"titulo\":\"  Romances do sertão \"}");

      assertThat(criada.statusCode()).isEqualTo(201);
      JsonNode corpo = json(criada);
      assertThat(corpo.get("titulo").asString()).isEqualTo("Romances do sertão");
      assertThat(corpo.get("descricao").isNull()).isTrue();
      assertThat(corpo.get("quantidadeLivros").asInt()).isZero();
      assertThat(corpo.get("pertenceAoSolicitante").asBoolean()).isTrue();
      assertThat(corpo.get("dono").get("username").asString()).isEqualTo("marina");

      HttpResponse<String> obtida = get(marina, "/listas/" + corpo.get("id").asString());
      assertThat(obtida.statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("recusa título vazio, título acima de 80 e descrição acima de 300")
    void limitesDeTexto() throws Exception {
      UUID marina = leitor("marina", "publico");

      assertThat(criar(marina, "{\"titulo\":\"   \"}").statusCode()).isEqualTo(400);
      assertThat(criar(marina, "{\"titulo\":\"" + "a".repeat(81) + "\"}").statusCode())
          .isEqualTo(400);
      assertThat(
              criar(marina, "{\"titulo\":\"ok\",\"descricao\":\"" + "d".repeat(301) + "\"}")
                  .statusCode())
          .isEqualTo(400);
      assertThat(criar(marina, "{\"titulo\":\"" + "a".repeat(80) + "\",\"descricao\":\""
                  + "d".repeat(300) + "\"}").statusCode())
          .isEqualTo(201);
      assertThat(contar("SELECT count(*) FROM lista")).isEqualTo(1);
    }

    @Test
    @DisplayName("com livroId, a lista nasce com o livro na posição 1")
    void criaComLivro() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID livro = livroOficial("Grande Sertão");

      JsonNode lista = json(criar(marina, "{\"titulo\":\"Sertão\",\"livroId\":\"" + livro + "\"}"));

      assertThat(lista.get("quantidadeLivros").asInt()).isEqualTo(1);
      JsonNode itens = json(get(marina, "/listas/" + lista.get("id").asString() + "/livros"));
      assertThat(itens.get("itens").get(0).get("posicao").asInt()).isEqualTo(1);
      assertThat(itens.get("itens").get(0).get("livro").get("link").get("via").asString())
          .isEqualTo("catalogo");
    }

    @Test
    @DisplayName("criar com livro pessoal de outro leitor responde 422 e não grava a lista")
    void criaComLivroPessoalAlheio() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID outro = leitor("outro", "publico");
      UUID livroDoOutro = livroPessoal(outro, "Diário do outro");

      HttpResponse<String> resposta =
          criar(marina, "{\"titulo\":\"x\",\"livroId\":\"" + livroDoOutro + "\"}");

      assertThat(resposta.statusCode()).isEqualTo(422);
      assertThat(contar("SELECT count(*) FROM lista")).isZero();
    }

    @Test
    @DisplayName("PATCH: omitido mantém, descrição nula apaga, corpo vazio é 400")
    void editaCampos() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Antes\",\"descricao\":\"Desc\"}"));

      JsonNode soTitulo = json(patch(marina, "/listas/" + id, "{\"titulo\":\"Depois\"}"));
      assertThat(soTitulo.get("titulo").asString()).isEqualTo("Depois");
      assertThat(soTitulo.get("descricao").asString()).isEqualTo("Desc");

      JsonNode semDescricao = json(patch(marina, "/listas/" + id, "{\"descricao\":null}"));
      assertThat(semDescricao.get("titulo").asString()).isEqualTo("Depois");
      assertThat(semDescricao.get("descricao").isNull()).isTrue();

      assertThat(patch(marina, "/listas/" + id, "{}").statusCode()).isEqualTo(400);
      assertThat(patch(marina, "/listas/" + id, "{\"titulo\":null}").statusCode()).isEqualTo(400);
    }
  }

  @Nested
  @DisplayName("propriedade")
  class Propriedade {

    @Test
    @DisplayName("escrita em lista alheia responde 404 e não altera nada")
    void listaAlheia() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID intruso = leitor("intruso", "publico");
      UUID livro = livroOficial("Livro");
      String id = idDe(criar(marina, "{\"titulo\":\"Minha\",\"livroId\":\"" + livro + "\"}"));
      String itemId = primeiroItem(marina, id);

      assertThat(patch(intruso, "/listas/" + id, "{\"titulo\":\"Hackeada\"}").statusCode())
          .isEqualTo(404);
      assertThat(delete(intruso, "/listas/" + id).statusCode()).isEqualTo(404);
      assertThat(adicionar(intruso, id, livroOficial("Outro")).statusCode()).isEqualTo(404);
      assertThat(delete(intruso, "/listas/" + id + "/livros/" + livro).statusCode())
          .isEqualTo(404);
      assertThat(mover(intruso, id, itemId, 1).statusCode()).isEqualTo(404);

      JsonNode lista = json(get(marina, "/listas/" + id));
      assertThat(lista.get("titulo").asString()).isEqualTo("Minha");
      assertThat(lista.get("quantidadeLivros").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("lista de outro leitor que vejo traz pertenceAoSolicitante falso")
    void listaVistaPorTerceiro() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID bia = leitor("bia", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Pública\"}"));

      JsonNode lista = json(get(bia, "/listas/" + id));

      assertThat(lista.get("pertenceAoSolicitante").asBoolean()).isFalse();
    }
  }

  @Nested
  @DisplayName("livros da lista")
  class Livros {

    @Test
    @DisplayName("adicionar de novo o mesmo livro responde 200 com o item, sem duplicar")
    void livroRepetido() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID livro = livroOficial("Livro");
      String id = idDe(criar(marina, "{\"titulo\":\"L\"}"));

      HttpResponse<String> primeira = adicionar(marina, id, livro);
      HttpResponse<String> segunda = adicionar(marina, id, livro);

      assertThat(primeira.statusCode()).isEqualTo(201);
      assertThat(segunda.statusCode()).isEqualTo(200);
      assertThat(json(segunda).get("id").asString()).isEqualTo(json(primeira).get("id").asString());
      assertThat(contar("SELECT count(*) FROM lista_item")).isEqualTo(1);
    }

    @Test
    @DisplayName("livro pessoal próprio entra com via=lista; o de outro leitor responde 422")
    void viaListaDoLivroPessoal() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID outro = leitor("outro", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Pessoais\"}"));

      HttpResponse<String> proprio = adicionar(marina, id, livroPessoal(marina, "Meu caderno"));
      HttpResponse<String> alheio = adicionar(marina, id, livroPessoal(outro, "Caderno do outro"));
      HttpResponse<String> inexistente = adicionar(marina, id, UUID.randomUUID());

      assertThat(proprio.statusCode()).isEqualTo(201);
      JsonNode link = json(proprio).get("livro").get("link");
      assertThat(link.get("via").asString()).isEqualTo("lista");
      assertThat(link.get("referenciaId").asString()).isEqualTo(id);
      assertThat(json(proprio).get("livro").get("tipo").asString()).isEqualTo("PESSOAL");
      assertThat(alheio.statusCode()).isEqualTo(422);
      assertThat(inexistente.statusCode()).isEqualTo(422);
    }

    @Test
    @DisplayName("livro inativo não aparece nos itens nem na contagem, e não pode ser adicionado")
    void livroQueFicouInativo() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID ativo = livroOficial("Ativo");
      UUID desativado = livroOficial("Some depois");
      String id = idDe(criar(marina, "{\"titulo\":\"L\"}"));
      adicionar(marina, id, ativo);
      adicionar(marina, id, desativado);
      jdbc.update("UPDATE acervo.livro SET ativo = false WHERE id = ?", desativado);

      assertThat(json(get(marina, "/listas/" + id)).get("quantidadeLivros").asInt()).isEqualTo(1);
      assertThat(json(get(marina, "/listas/" + id + "/livros")).get("itens").size()).isEqualTo(1);
      assertThat(adicionar(marina, id, livroOficial("Inativo", false)).statusCode())
          .isEqualTo(422);
    }

    @Test
    @DisplayName("mover para o início, o meio e o fim mantém as posições contínuas")
    void moverMantemOrdem() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Ordem\"}"));
      List<String> titulos = List.of("A", "B", "C", "D");
      for (String titulo : titulos) {
        adicionar(marina, id, livroOficial(titulo));
      }

      // D para o início: D A B C
      assertThat(mover(marina, id, itemDe(marina, id, "D"), 1).statusCode()).isEqualTo(200);
      assertThat(ordem(marina, id)).containsExactly("D", "A", "B", "C");

      // D para o fim: A B C D
      JsonNode movido = json(mover(marina, id, itemDe(marina, id, "D"), 4));
      assertThat(movido.get("posicao").asInt()).isEqualTo(4);
      assertThat(ordem(marina, id)).containsExactly("A", "B", "C", "D");

      // A para o meio: B C A D
      mover(marina, id, itemDe(marina, id, "A"), 3);
      assertThat(ordem(marina, id)).containsExactly("B", "C", "A", "D");
      assertThat(posicoes(id)).containsExactly(1, 2, 3, 4);

      // Mesma posição mantém o resultado.
      assertThat(mover(marina, id, itemDe(marina, id, "A"), 3).statusCode()).isEqualTo(200);
      assertThat(ordem(marina, id)).containsExactly("B", "C", "A", "D");
    }

    @Test
    @DisplayName("livro pessoal excluído no meio: posições visíveis seguem contínuas e mover acerta o lugar")
    void livroExcluidoNoMeio() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Favoritos\"}"));
      adicionar(marina, id, livroOficial("Dom Casmurro"));
      UUID diario = livroPessoal(marina, "Meu diário");
      adicionar(marina, id, diario);
      adicionar(marina, id, livroOficial("Grande Sertão"));
      adicionar(marina, id, livroOficial("Vidas Secas"));
      String itemDoDiario = itemDe(marina, id, "Meu diário");
      jdbc.update("UPDATE acervo.livro SET ativo = false WHERE id = ?", diario);

      JsonNode itens = json(get(marina, "/listas/" + id + "/livros?limit=50")).get("itens");
      assertThat(itens.size()).isEqualTo(3);
      for (int i = 0; i < itens.size(); i++) {
        assertThat(itens.get(i).get("posicao").asInt()).isEqualTo(i + 1);
      }

      // Arrastar "Vidas Secas" para o segundo lugar da tela.
      JsonNode movido = json(mover(marina, id, itemDe(marina, id, "Vidas Secas"), 2));
      assertThat(movido.get("posicao").asInt()).isEqualTo(2);
      assertThat(ordem(marina, id)).containsExactly("Dom Casmurro", "Vidas Secas", "Grande Sertão");

      // E de volta para o fim: o limite é a quantidade visível, não o total gravado.
      mover(marina, id, itemDe(marina, id, "Vidas Secas"), 3);
      assertThat(ordem(marina, id)).containsExactly("Dom Casmurro", "Grande Sertão", "Vidas Secas");
      assertThat(mover(marina, id, itemDe(marina, id, "Vidas Secas"), 4).statusCode())
          .isEqualTo(400);

      // O item do livro inativo não é visível, então não pode ser movido.
      assertThat(mover(marina, id, itemDoDiario, 1).statusCode()).isEqualTo(404);
      assertThat(posicoes(id)).containsExactly(1, 2, 3, 4);
    }

    @Test
    @DisplayName("posição fora de 1..n responde 400 e não deixa ordem parcial")
    void moverForaDoIntervalo() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Ordem\"}"));
      adicionar(marina, id, livroOficial("A"));
      adicionar(marina, id, livroOficial("B"));

      assertThat(mover(marina, id, itemDe(marina, id, "A"), 0).statusCode()).isEqualTo(400);
      assertThat(mover(marina, id, itemDe(marina, id, "A"), 3).statusCode()).isEqualTo(400);
      assertThat(mover(marina, id, UUID.randomUUID().toString(), 1).statusCode()).isEqualTo(404);
      assertThat(ordem(marina, id)).containsExactly("A", "B");
      assertThat(posicoes(id)).containsExactly(1, 2);
    }

    @Test
    @DisplayName("remover fecha o buraco; remover livro ausente responde 204")
    void removerCompacta() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Ordem\"}"));
      UUID b = null;
      for (String titulo : List.of("A", "B", "C", "D")) {
        UUID livro = livroOficial(titulo);
        if (titulo.equals("B")) {
          b = livro;
        }
        adicionar(marina, id, livro);
      }

      assertThat(delete(marina, "/listas/" + id + "/livros/" + b).statusCode()).isEqualTo(204);
      assertThat(ordem(marina, id)).containsExactly("A", "C", "D");
      assertThat(posicoes(id)).containsExactly(1, 2, 3);

      assertThat(delete(marina, "/listas/" + id + "/livros/" + b).statusCode()).isEqualTo(204);
      assertThat(posicoes(id)).containsExactly(1, 2, 3);
    }

    @Test
    @DisplayName("itens paginam por cursor; cursor adulterado e limite acima de 50 são 400")
    void cursor() throws Exception {
      UUID marina = leitor("marina", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Cursor\"}"));
      for (String titulo : List.of("A", "B", "C")) {
        adicionar(marina, id, livroOficial(titulo));
      }

      JsonNode primeira = json(get(marina, "/listas/" + id + "/livros?limit=2"));
      assertThat(primeira.get("itens").size()).isEqualTo(2);
      assertThat(primeira.get("temMais").asBoolean()).isTrue();

      String cursor = primeira.get("proximoCursor").asString();
      JsonNode segunda = json(get(marina, "/listas/" + id + "/livros?limit=2&cursor=" + cursor));
      assertThat(segunda.get("itens").size()).isEqualTo(1);
      assertThat(segunda.get("itens").get(0).get("livro").get("titulo").asString()).isEqualTo("C");
      assertThat(segunda.get("temMais").asBoolean()).isFalse();

      assertThat(get(marina, "/listas/" + id + "/livros?cursor=lixo").statusCode()).isEqualTo(400);
      assertThat(get(marina, "/listas/" + id + "/livros?limit=51").statusCode()).isEqualTo(400);
    }
  }

  @Nested
  @DisplayName("privacidade (RN-08)")
  class Privacidade {

    @Test
    @DisplayName("perfil público: qualquer leitor vê a lista, os itens e o índice, sem seguir")
    void publico() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID bia = leitor("bia", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Pública\"}"));

      assertThat(get(bia, "/listas/" + id).statusCode()).isEqualTo(200);
      assertThat(get(bia, "/listas/" + id + "/livros").statusCode()).isEqualTo(200);
      assertThat(get(bia, "/perfis/" + marina + "/listas").statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("perfil privado: seguidor aceito vê; quem não segue recebe 403 de perfil privado")
    void privado() throws Exception {
      UUID marina = leitor("marina", "privado");
      UUID seguidora = leitor("seguidora", "publico");
      UUID estranho = leitor("estranho", "publico");
      seguir(seguidora, marina);
      String id = idDe(criar(marina, "{\"titulo\":\"Privada\"}"));

      assertThat(get(marina, "/listas/" + id).statusCode()).isEqualTo(200);
      assertThat(get(seguidora, "/listas/" + id).statusCode()).isEqualTo(200);
      assertThat(get(seguidora, "/perfis/" + marina + "/listas").statusCode()).isEqualTo(200);

      for (String caminho :
          List.of("/listas/" + id, "/listas/" + id + "/livros", "/perfis/" + marina + "/listas")) {
        HttpResponse<String> negada = get(estranho, caminho);
        assertThat(negada.statusCode()).as(caminho).isEqualTo(403);
        assertThat(json(negada).get("codigo").asString()).isEqualTo("ACESSO_NEGADO");
        assertThat(json(negada).get("mensagem").asString())
            .isEqualTo("Este perfil é privado. Siga para ver as listas.");
      }
    }

    @Test
    @DisplayName("conta suspensa some: lista e índice respondem 404")
    void contaSuspensa() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID bia = leitor("bia", "publico");
      String id = idDe(criar(marina, "{\"titulo\":\"Some\"}"));
      jdbc.update("UPDATE identidade.usuario SET suspenso = true WHERE id = ?", marina);

      assertThat(get(bia, "/listas/" + id).statusCode()).isEqualTo(404);
      assertThat(get(bia, "/perfis/" + marina + "/listas").statusCode()).isEqualTo(404);
      assertThat(get(bia, "/perfis/" + UUID.randomUUID() + "/listas").statusCode()).isEqualTo(404);
    }
  }

  @Nested
  @DisplayName("excluir e índice")
  class ExcluirEIndice {

    @Test
    @DisplayName("excluir tira a lista das rotas e da VIEW de via lista; repetir responde 204")
    void excluir() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID pessoal = livroPessoal(marina, "Meu");
      String id = idDe(criar(marina, "{\"titulo\":\"Vai sumir\",\"livroId\":\"" + pessoal + "\"}"));
      assertThat(contar("SELECT count(*) FROM v_lista_livro_pessoal_v1")).isEqualTo(1);

      assertThat(delete(marina, "/listas/" + id).statusCode()).isEqualTo(204);

      assertThat(get(marina, "/listas/" + id).statusCode()).isEqualTo(404);
      assertThat(contar("SELECT count(*) FROM v_lista_livro_pessoal_v1")).isZero();
      assertThat(json(get(marina, "/me/listas")).get("totalItens").asInt()).isZero();
      assertThat(delete(marina, "/listas/" + id).statusCode()).isEqualTo(204);
      assertThat(adicionar(marina, id, livroOficial("X")).statusCode()).isEqualTo(404);
    }

    @Test
    @DisplayName("índice: alterada mais recente primeiro, três capas e contagem")
    void indice() throws Exception {
      UUID marina = leitor("marina", "publico");
      String antiga = idDe(criar(marina, "{\"titulo\":\"Antiga\"}"));
      String nova = idDe(criar(marina, "{\"titulo\":\"Nova\"}"));
      for (String titulo : List.of("A", "B", "C", "D")) {
        adicionar(marina, antiga, livroOficial(titulo));
      }

      JsonNode pagina = json(get(marina, "/perfis/" + marina + "/listas"));

      assertThat(pagina.get("totalItens").asInt()).isEqualTo(2);
      assertThat(pagina.get("ultima").asBoolean()).isTrue();
      JsonNode primeira = pagina.get("itens").get(0);
      assertThat(primeira.get("id").asString()).isEqualTo(antiga);
      assertThat(primeira.get("quantidadeLivros").asInt()).isEqualTo(4);
      assertThat(primeira.get("capas").size()).isEqualTo(3);
      assertThat(primeira.get("capas").get(0).get("titulo").asString()).isEqualTo("A");
      assertThat(primeira.has("contemLivro")).isFalse();
      assertThat(pagina.get("itens").get(1).get("id").asString()).isEqualTo(nova);
    }

    @Test
    @DisplayName("/me/listas com livroId marca contemLivro em cada lista")
    void contemLivro() throws Exception {
      UUID marina = leitor("marina", "publico");
      UUID livro = livroOficial("Alvo");
      String com = idDe(criar(marina, "{\"titulo\":\"Com\",\"livroId\":\"" + livro + "\"}"));
      idDe(criar(marina, "{\"titulo\":\"Sem\"}"));

      JsonNode pagina = json(get(marina, "/me/listas?livroId=" + livro));

      for (JsonNode lista : pagina.get("itens")) {
        assertThat(lista.get("contemLivro").asBoolean())
            .as(lista.get("titulo").asString())
            .isEqualTo(lista.get("id").asString().equals(com));
      }
      assertThat(get(marina, "/me/listas?size=51").statusCode()).isEqualTo(400);
    }
  }

  @Nested
  @DisplayName("idempotência")
  class Idempotencia {

    @Test
    @DisplayName("mesma chave e payload reproduz a resposta sem criar duas listas")
    void replay() throws Exception {
      UUID marina = leitor("marina", "publico");
      String chave = UUID.randomUUID().toString();

      HttpResponse<String> primeira = criar(marina, "{\"titulo\":\"Uma só\"}", chave);
      HttpResponse<String> segunda = criar(marina, "{\"titulo\":\"Uma só\"}", chave);

      assertThat(segunda.statusCode()).isEqualTo(201);
      assertThat(idDe(segunda)).isEqualTo(idDe(primeira));
      assertThat(contar("SELECT count(*) FROM lista")).isEqualTo(1);
    }

    @Test
    @DisplayName("mesma chave com outro payload responde 409")
    void conflito() throws Exception {
      UUID marina = leitor("marina", "publico");
      String chave = UUID.randomUUID().toString();

      criar(marina, "{\"titulo\":\"Primeira\"}", chave);
      HttpResponse<String> outra = criar(marina, "{\"titulo\":\"Outra\"}", chave);

      assertThat(outra.statusCode()).isEqualTo(409);
      assertThat(contar("SELECT count(*) FROM lista")).isEqualTo(1);
    }

    @Test
    @DisplayName("escrita sem Idempotency-Key responde 400")
    void semChave() throws Exception {
      UUID marina = leitor("marina", "publico");

      HttpResponse<String> resposta =
          enviar(
              HttpRequest.newBuilder(uri("/listas"))
                  .header("Authorization", "Bearer " + token(marina))
                  .header("Content-Type", "application/json")
                  .POST(HttpRequest.BodyPublishers.ofString("{\"titulo\":\"x\"}"))
                  .build());

      assertThat(resposta.statusCode()).isEqualTo(400);
    }
  }

  // ---------------------------------------------------------------- dados

  private UUID leitor(String username, String privacidade) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO identidade.usuario (id, username, nome_exibicao, privacidade) VALUES (?, ?, ?, ?)",
        id,
        username,
        "Leitor " + username,
        privacidade);
    return id;
  }

  private void seguir(UUID seguidor, UUID seguido) {
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id) VALUES (?, ?)", seguidor, seguido);
  }

  private UUID livroOficial(String titulo) {
    return livroOficial(titulo, true);
  }

  private UUID livroOficial(String titulo, boolean ativo) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, ativo) VALUES (?, 'oficial', ?, ?)",
        id,
        titulo,
        ativo);
    return id;
  }

  private UUID livroPessoal(UUID dono, String titulo) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, dono_id, titulo, autor_informado)"
            + " VALUES (?, 'pessoal', ?, ?, 'Eu mesma')",
        id,
        dono,
        titulo);
    return id;
  }

  private long contar(String sql) {
    return jdbc.queryForObject(sql, Long.class);
  }

  private List<Integer> posicoes(String listaId) {
    return jdbc.queryForList(
        "SELECT ordem FROM lista_item WHERE lista_id = ?::uuid ORDER BY ordem",
        Integer.class,
        listaId);
  }

  // ---------------------------------------------------------------- HTTP

  private HttpResponse<String> criar(UUID eu, String corpo) throws Exception {
    return criar(eu, corpo, UUID.randomUUID().toString());
  }

  private HttpResponse<String> criar(UUID eu, String corpo, String chave) throws Exception {
    return escrever(eu, "POST", "/listas", corpo, chave);
  }

  private HttpResponse<String> adicionar(UUID eu, String listaId, UUID livroId) throws Exception {
    return escrever(
        eu, "POST", "/listas/" + listaId + "/livros", "{\"livroId\":\"" + livroId + "\"}",
        UUID.randomUUID().toString());
  }

  private HttpResponse<String> mover(UUID eu, String listaId, String itemId, int posicao)
      throws Exception {
    return escrever(
        eu,
        "PUT",
        "/listas/" + listaId + "/livros/" + itemId + "/posicao",
        "{\"posicao\":" + posicao + "}",
        UUID.randomUUID().toString());
  }

  private HttpResponse<String> patch(UUID eu, String caminho, String corpo) throws Exception {
    return escrever(eu, "PATCH", caminho, corpo, UUID.randomUUID().toString());
  }

  private HttpResponse<String> delete(UUID eu, String caminho) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token(eu))
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .DELETE()
            .build());
  }

  private HttpResponse<String> escrever(
      UUID eu, String metodo, String caminho, String corpo, String chave) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token(eu))
            .header("Idempotency-Key", chave)
            .header("Content-Type", "application/json")
            .method(metodo, HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private HttpResponse<String> get(UUID eu, String caminho) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token(eu))
            .GET()
            .build());
  }

  private static JsonNode json(HttpResponse<String> resposta) {
    return JSON.readTree(resposta.body());
  }

  private static String idDe(HttpResponse<String> resposta) {
    assertThat(resposta.statusCode()).as(resposta.body()).isIn(200, 201);
    return json(resposta).get("id").asString();
  }

  private String primeiroItem(UUID eu, String listaId) throws Exception {
    return json(get(eu, "/listas/" + listaId + "/livros")).get("itens").get(0).get("id").asString();
  }

  private String itemDe(UUID eu, String listaId, String titulo) throws Exception {
    for (JsonNode item : json(get(eu, "/listas/" + listaId + "/livros?limit=50")).get("itens")) {
      if (item.get("livro").get("titulo").asString().equals(titulo)) {
        return item.get("id").asString();
      }
    }
    throw new AssertionError("livro " + titulo + " fora da lista");
  }

  private List<String> ordem(UUID eu, String listaId) throws Exception {
    List<String> titulos = new ArrayList<>();
    for (JsonNode item : json(get(eu, "/listas/" + listaId + "/livros?limit=50")).get("itens")) {
      titulos.add(item.get("livro").get("titulo").asString());
    }
    return titulos;
  }
}

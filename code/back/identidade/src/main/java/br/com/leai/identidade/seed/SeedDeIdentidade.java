package br.com.leai.identidade.seed;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Massa reproduzível de `identidade` para RNF-TST-08: perfil público e privado, seguidor aceito
 * dos dois, solicitação pendente e um não-seguidor.
 *
 * <p>Os três primeiros ids são os de `SEED_ACERVO` (`code/back/acervo/src/db/seed.ts`), que já
 * espera o seguimento `seguidor → dono` do lado de cá. Os ids são fixos e públicos para os seeds
 * de outros serviços apontarem para eles.
 *
 * <p><b>Reproduzível, não só idempotente.</b> Rodar de novo devolve as quatro contas e as
 * relações entre elas ao estado descrito aqui, mesmo que alguém tenha editado o perfil, seguido
 * ou aceito o pedido pela API. Relações com contas de fora do seed ficam intactas, e os
 * contadores das quatro são recalculados da tabela. Não grava na outbox: semear não notifica.
 */
public class SeedDeIdentidade {

  public static final UUID DONO = UUID.fromString("5eed0000-0000-4000-8000-000000000001");
  public static final UUID SEGUIDOR = UUID.fromString("5eed0000-0000-4000-8000-000000000002");
  public static final UUID NAO_SEGUIDOR = UUID.fromString("5eed0000-0000-4000-8000-000000000003");
  public static final UUID PRIVADO = UUID.fromString("5eed0000-0000-4000-8000-000000000004");

  public static final UUID SEGUIMENTO_DO_DONO =
      UUID.fromString("5eed0000-0000-4000-8000-00000000c001");
  public static final UUID SEGUIMENTO_DO_PRIVADO =
      UUID.fromString("5eed0000-0000-4000-8000-00000000c002");
  public static final UUID SOLICITACAO_PENDENTE =
      UUID.fromString("5eed0000-0000-4000-8000-00000000d001");

  private record Conta(UUID id, String username, String nome, String biografia, String privacidade) {}

  private static final List<Conta> CONTAS =
      List.of(
          new Conta(DONO, "seed.ana", "Ana Leitora", "Leio de tudo um pouco.", "publico"),
          new Conta(SEGUIDOR, "seed.bruno", "Bruno Seguidor", null, "publico"),
          new Conta(NAO_SEGUIDOR, "seed.caio", "Caio Visitante", null, "publico"),
          new Conta(
              PRIVADO, "seed.duda", "Duda Reservada", "Minha estante é só para amigos.", "privado"));

  private static final String IDS = "(?, ?, ?, ?)";

  private static final LocalDate NASCIMENTO = LocalDate.of(1998, 3, 14);

  private final JdbcTemplate jdbc;
  private final TransactionTemplate transacao;
  private final PasswordEncoder codificadorDeSenha;

  public SeedDeIdentidade(
      JdbcTemplate jdbc, TransactionTemplate transacao, PasswordEncoder codificadorDeSenha) {
    this.jdbc = jdbc;
    this.transacao = transacao;
    this.codificadorDeSenha = codificadorDeSenha;
  }

  /** Grava tudo numa transação só. A senha vale para as quatro contas e nunca é versionada. */
  public void semear(String senha) {
    String hash = codificadorDeSenha.encode(senha);
    Object[] ids = CONTAS.stream().map(Conta::id).toArray();
    transacao.executeWithoutResult(
        status -> {
          for (Conta conta : CONTAS) {
            gravar(conta, hash);
          }
          jdbc.update(
              "DELETE FROM seguidor WHERE seguidor_id IN " + IDS + " AND seguido_id IN " + IDS,
              duas(ids));
          jdbc.update(
              "DELETE FROM solicitacao_seguir WHERE solicitante_id IN "
                  + IDS
                  + " AND alvo_id IN "
                  + IDS,
              duas(ids));
          seguir(SEGUIMENTO_DO_DONO, SEGUIDOR, DONO);
          seguir(SEGUIMENTO_DO_PRIVADO, SEGUIDOR, PRIVADO);
          jdbc.update(
              "INSERT INTO solicitacao_seguir (id, solicitante_id, alvo_id) VALUES (?, ?, ?)",
              SOLICITACAO_PENDENTE,
              NAO_SEGUIDOR,
              PRIVADO);
          jdbc.update(
              "UPDATE usuario u SET"
                  + " qtd_seguidores = (SELECT count(*) FROM seguidor WHERE seguido_id = u.id),"
                  + " qtd_seguidos = (SELECT count(*) FROM seguidor WHERE seguidor_id = u.id)"
                  + " WHERE u.id IN "
                  + IDS,
              ids);
        });
  }

  private void gravar(Conta conta, String hash) {
    jdbc.update(
        "INSERT INTO usuario (id, email, username, nome_exibicao, data_nascimento, senha_hash,"
            + " biografia, privacidade)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            + " ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,"
            + " username = EXCLUDED.username, nome_exibicao = EXCLUDED.nome_exibicao,"
            + " senha_hash = EXCLUDED.senha_hash, biografia = EXCLUDED.biografia,"
            + " avatar_url = NULL, avatar_asset_id = NULL, privacidade = EXCLUDED.privacidade,"
            + " suspenso = false, exclusao_solicitada_em = NULL, exclusao_prevista_em = NULL,"
            + " atualizado_em = now()",
        conta.id(),
        conta.username() + "@seed.leai.invalid",
        conta.username(),
        conta.nome(),
        NASCIMENTO,
        hash,
        conta.biografia(),
        conta.privacidade());
  }

  private void seguir(UUID id, UUID seguidor, UUID seguido) {
    jdbc.update(
        "INSERT INTO seguidor (id, seguidor_id, seguido_id) VALUES (?, ?, ?)", id, seguidor, seguido);
  }

  private static Object[] duas(Object[] ids) {
    Object[] dobrado = new Object[ids.length * 2];
    System.arraycopy(ids, 0, dobrado, 0, ids.length);
    System.arraycopy(ids, 0, dobrado, ids.length, ids.length);
    return dobrado;
  }
}

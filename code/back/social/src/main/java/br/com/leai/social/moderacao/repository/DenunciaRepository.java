package br.com.leai.social.moderacao.repository;

import br.com.leai.social.moderacao.dto.DenunciaResposta;
import br.com.leai.social.moderacao.model.AlvoDaDenuncia;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class DenunciaRepository {

  private static final RowMapper<DenunciaResposta> RESUMO = DenunciaRepository::resumo;

  private final JdbcTemplate jdbc;

  public DenunciaRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * Cria a denúncia se o leitor ainda não tem uma pendente sobre o alvo. {@code ON CONFLICT DO
   * NOTHING} no índice único parcial serializa duas denúncias simultâneas: a segunda espera a
   * primeira e não insere, sem o 23505 que abortaria a transação do recibo. Vazio quando já havia.
   */
  public Optional<DenunciaResposta> criarSeNaoExiste(
      UUID denuncianteId, AlvoDaDenuncia alvo, String motivo) {
    return jdbc
        .query(
            """
            INSERT INTO denuncia
              (denunciante_id, alvo_tipo, alvo_id, motivo, alvo_autor_id, alvo_livro_id,
               atividade_id, atividade_autor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (denunciante_id, alvo_tipo, alvo_id) WHERE estado = 'pendente' DO NOTHING
            RETURNING id, estado, criado_em
            """,
            RESUMO,
            denuncianteId,
            alvo.tipo(),
            alvo.id(),
            motivo,
            alvo.autorId(),
            alvo.livroId(),
            alvo.atividadeId(),
            alvo.atividadeAutorId())
        .stream()
        .findFirst();
  }

  public Optional<DenunciaResposta> pendenteDe(UUID denuncianteId, String alvoTipo, UUID alvoId) {
    return jdbc
        .query(
            "SELECT id, estado, criado_em FROM denuncia"
                + " WHERE denunciante_id = ? AND alvo_tipo = ? AND alvo_id = ? AND estado = 'pendente'",
            RESUMO,
            denuncianteId,
            alvoTipo,
            alvoId)
        .stream()
        .findFirst();
  }

  private static DenunciaResposta resumo(ResultSet rs, int linha) throws SQLException {
    return new DenunciaResposta(
        rs.getObject("id", UUID.class).toString(),
        rs.getString("estado"),
        rs.getTimestamp("criado_em").toInstant());
  }
}

package br.com.leai.identidade.usuario;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Acesso à tabela {@code usuario}. Consultas derivadas, nunca SQL concatenado (RNF-SEC-12).
 *
 * <p>Todas as buscas ignoram caixa, espelhando os índices funcionais {@code lower(email)} e
 * {@code lower(username)} criados pela migration. Divergir disso deixaria o login rejeitando uma
 * conta que o cadastro considera duplicada.
 */
public interface UsuarioRepositorio extends JpaRepository<Usuario, UUID> {

  /**
   * F-MOD-OPC: seguidores sem conta suspensa ou com exclusão pendente do outro lado, o mesmo
   * filtro das listas de seguidores e seguidos ({@code ServicoDeSeguimento.relacionados}). Só o
   * outro lado é filtrado: o perfil de terceiro já só existe se a conta está visível, e o dono
   * suspenso vê os próprios números enquanto o token de acesso vale. Os contadores gravados
   * continuam contando todos, e a reativação devolve a conta à contagem sem nenhuma escrita.
   */
  @Query(
      value =
          "SELECT count(*) FROM seguidor s JOIN usuario u ON u.id = s.seguidor_id"
              + " WHERE s.seguido_id = :id AND u.suspenso = false"
              + " AND u.exclusao_solicitada_em IS NULL",
      nativeQuery = true)
  long contarSeguidoresVisiveis(@Param("id") UUID id);

  @Query(
      value =
          "SELECT count(*) FROM seguidor s JOIN usuario u ON u.id = s.seguido_id"
              + " WHERE s.seguidor_id = :id AND u.suspenso = false"
              + " AND u.exclusao_solicitada_em IS NULL",
      nativeQuery = true)
  long contarSeguidosVisiveis(@Param("id") UUID id);

  /**
   * F-MOD-OPC: lê a flag de suspensão com {@code FOR SHARE}, antes de emitir sessão. A suspensão
   * faz {@code UPDATE} na mesma linha e só depois revoga as renovações: com a trava, o login ou a
   * renovação que corre junto espera a suspensão commitar e a vê, ou a suspensão espera a sessão
   * nova commitar e a revoga. Sem ela, a renovação inserida no meio sobrevivia à suspensão.
   */
  @Query(value = "SELECT suspenso FROM usuario WHERE id = :id FOR SHARE", nativeQuery = true)
  Optional<Boolean> suspensoComTrava(@Param("id") UUID id);

  /**
   * Resolve o identificador do login, que pode ser e-mail <b>ou</b> username (RF-AUT-02), numa
   * consulta só. O chamador passa o mesmo valor nos dois parâmetros.
   */
  Optional<Usuario> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);

  boolean existsByEmailIgnoreCase(String email);

  /** Recuperação de senha: só por e-mail, porque o link vai para ele (RF-AUT-04). */
  Optional<Usuario> findByEmailIgnoreCase(String email);

  boolean existsByUsernameIgnoreCase(String username);

  /**
   * Perfil de outro leitor pelo username completo, ignorando caixa, e só se a conta estiver
   * visível: suspensa ou com exclusão pendente não existe para os outros (mesmo filtro das VIEWs).
   * Igualdade, nunca prefixo: não há busca parcial (RNF-SEC-19/44).
   */
  @Query(
      "SELECT u FROM Usuario u WHERE lower(u.username) = lower(:username)"
          + " AND u.suspenso = false AND u.exclusaoSolicitadaEm IS NULL")
  Optional<Usuario> buscarVisivelPorUsername(@Param("username") String username);

  /**
   * Lê a conta com {@code SELECT ... FOR UPDATE}, para a troca de senha. Duas trocas simultâneas
   * com a mesma senha atual não podem as duas passar: a segunda espera a primeira commitar e
   * compara com o hash novo.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT u FROM Usuario u WHERE u.id = :id")
  Optional<Usuario> buscarParaAtualizar(@Param("id") UUID id);
}

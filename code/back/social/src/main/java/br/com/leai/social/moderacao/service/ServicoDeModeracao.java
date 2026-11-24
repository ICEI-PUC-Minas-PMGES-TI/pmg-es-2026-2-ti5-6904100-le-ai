package br.com.leai.social.moderacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.idempotencia.OperacaoIdempotente;
import br.com.leai.social.common.idempotencia.RespostaIdempotente;
import br.com.leai.social.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.feed.repository.CursorComentario;
import br.com.leai.social.feed.repository.CursorInvalidoException;
import br.com.leai.social.moderacao.dto.AtividadeDaDenuncia;
import br.com.leai.social.moderacao.dto.ContaDaModeracaoResposta;
import br.com.leai.social.moderacao.dto.ContaModeradaResposta;
import br.com.leai.social.moderacao.dto.ConteudoDenunciado;
import br.com.leai.social.moderacao.dto.DenunciaPendenteResposta;
import br.com.leai.social.moderacao.dto.LivroDaDenuncia;
import br.com.leai.social.moderacao.dto.MotivoDaContaRequisicao;
import br.com.leai.social.moderacao.dto.PaginaDenunciasResposta;
import br.com.leai.social.moderacao.dto.PaginaRegistrosResposta;
import br.com.leai.social.moderacao.dto.PessoaDaModeracao;
import br.com.leai.social.moderacao.dto.RegistroDeModeracaoResposta;
import br.com.leai.social.moderacao.dto.ResultadoModeracaoResposta;
import br.com.leai.social.moderacao.repository.ModeracaoRepository;
import br.com.leai.social.moderacao.repository.ModeracaoRepository.ComandoDeConta;
import br.com.leai.social.moderacao.repository.ModeracaoRepository.Denuncia;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Painel de moderação (RF-MOD-02, 03 e 05), restrito ao administrador pelo {@code SecurityConfig}.
 *
 * <p><b>Remover resenha</b> chama o {@code leitura} fora da transação do recibo (a partida a frio
 * dele pode passar de um minuto) e, depois de ele confirmar, nunca recusa: fecha as pendentes do
 * alvo e grava um único log, mesmo que outra requisição tenha chegado antes. Enquanto a
 * confirmação não chega, a marca {@code remocao_solicitada_em} segura o arquivamento.
 */
@Service
public class ServicoDeModeracao {

  static final String REMOVER = "remover_conteudo";
  static final String ARQUIVAR = "arquivar_denuncia";
  static final String SUSPENDER = "suspender_conta";
  static final String REATIVAR = "reativar_conta";

  private static final int STATUS_OK = HttpStatus.OK.value();

  private final ModeracaoRepository repositorio;
  private final AtividadeRepository atividades;
  private final ServicoDeIdempotencia idempotencia;
  private final ClienteDeLeitura leitura;
  private final ClienteDeIdentidade identidade;

  public ServicoDeModeracao(
      ModeracaoRepository repositorio,
      AtividadeRepository atividades,
      ServicoDeIdempotencia idempotencia,
      ClienteDeLeitura leitura,
      ClienteDeIdentidade identidade) {
    this.repositorio = repositorio;
    this.atividades = atividades;
    this.idempotencia = idempotencia;
    this.leitura = leitura;
    this.identidade = identidade;
  }

  // ------------------------------------------------------------------ fila

  public PaginaDenunciasResposta pendentes(UUID admin, String cursor, int limite) {
    List<Denuncia> linhas =
        repositorio.pendentes(cursor(cursor), limite);
    boolean temMais = linhas.size() > limite;
    List<Denuncia> pagina = temMais ? linhas.subList(0, limite) : linhas;

    Set<UUID> pessoas = new HashSet<>();
    Set<UUID> livros = new HashSet<>();
    Set<UUID> comentarios = new HashSet<>();
    Set<UUID> resenhas = new HashSet<>();
    Set<UUID> idsDeAtividade = new HashSet<>();
    for (Denuncia d : pagina) {
      Stream.of(d.denuncianteId(), d.alvoAutorId(), d.atividadeAutorId())
          .filter(Objects::nonNull)
          .forEach(pessoas::add);
      if (d.alvoLivroId() != null) livros.add(d.alvoLivroId());
      if (d.atividadeId() != null) idsDeAtividade.add(d.atividadeId());
      ("comentario".equals(d.alvoTipo()) ? comentarios : resenhas).add(d.alvoId());
    }
    Map<UUID, PessoaDaModeracao> perfis = repositorio.perfis(pessoas);
    Map<UUID, LivroDaDenuncia> porLivro = repositorio.livros(livros);
    Map<UUID, ModeracaoRepository.Comentario> porComentario = repositorio.comentarios(comentarios);
    Map<UUID, ModeracaoRepository.Resenha> porResenha = repositorio.resenhas(resenhas);
    Map<UUID, ModeracaoRepository.Atividade> porAtividade = repositorio.atividades(idsDeAtividade);

    List<DenunciaPendenteResposta> itens = new ArrayList<>();
    for (Denuncia d : pagina) {
      ConteudoDenunciado conteudo = conteudo(d, porComentario, porResenha);
      itens.add(
          new DenunciaPendenteResposta(
              d.id().toString(),
              d.alvoTipo(),
              d.criadoEm(),
              d.motivo(),
              perfis.get(d.denuncianteId()),
              perfis.get(d.alvoAutorId()),
              d.alvoLivroId() == null ? null : porLivro.get(d.alvoLivroId()),
              atividade(admin, d, porAtividade),
              conteudo,
              d.remocaoSolicitada()));
    }
    Denuncia ultima = pagina.isEmpty() ? null : pagina.getLast();
    String proximo =
        temMais && ultima != null ? new CursorComentario(ultima.criadoEm(), ultima.id()).codificar() : null;
    return new PaginaDenunciasResposta(itens, proximo, temMais);
  }

  private ConteudoDenunciado conteudo(
      Denuncia d,
      Map<UUID, ModeracaoRepository.Comentario> comentarios,
      Map<UUID, ModeracaoRepository.Resenha> resenhas) {
    if ("comentario".equals(d.alvoTipo())) {
      ModeracaoRepository.Comentario c = comentarios.get(d.alvoId());
      return c == null ? null : new ConteudoDenunciado(c.texto(), false, null, c.criadoEm(), c.respostas());
    }
    ModeracaoRepository.Resenha r = resenhas.get(d.alvoId());
    if (r == null) {
      return null;
    }
    return new ConteudoDenunciado(
        r.texto(), r.spoiler(), repositorio.nota(r.autorId(), r.livroId()).orElse(null), r.publicadoEm(), 0);
  }

  private AtividadeDaDenuncia atividade(
      UUID admin, Denuncia d, Map<UUID, ModeracaoRepository.Atividade> atividades) {
    if (!"comentario".equals(d.alvoTipo()) || d.atividadeId() == null) {
      return null;
    }
    ModeracaoRepository.Atividade a = atividades.get(d.atividadeId());
    if (a == null) {
      return null;
    }
    return new AtividadeDaDenuncia(
        a.id().toString(),
        a.tipo(),
        a.autorNome(),
        a.livroTitulo(),
        this.atividades.visivelPara(admin, a.id()));
  }

  // ------------------------------------------------------------------ arquivar

  /** Arquiva só a denúncia escolhida (decisão do dono, 16/10/2026): cada motivo é julgado à parte. */
  public RespostaIdempotente<ResultadoModeracaoResposta> arquivar(
      UUID admin, UUID denunciaId, String chave) {
    return idempotencia.executar(
        admin,
        OperacaoIdempotente.ARQUIVAR_DENUNCIA,
        chave,
        Map.of("denunciaId", denunciaId.toString()),
        ResultadoModeracaoResposta.class,
        () -> {
          Denuncia d = repositorio.travar(denunciaId).orElseThrow(ServicoDeModeracao::naoEncontrada);
          exigirPendente(d);
          if (d.remocaoSolicitada()) {
            throw new ErroDeNegocioException(
                CodigoErro.REMOCAO_EM_ANDAMENTO,
                "A remoção deste conteúdo ainda não foi confirmada. Tente remover de novo.");
          }
          List<String> fechadas = repositorio.arquivar(denunciaId);
          repositorio.registrar(
              admin.toString(),
              ARQUIVAR,
              d.alvoTipo(),
              d.alvoId(),
              d.id(),
              d.alvoAutorId(),
              d.alvoLivroId(),
              d.atividadeAutorId());
          return new RespostaIdempotente<>(STATUS_OK, new ResultadoModeracaoResposta(fechadas));
        });
  }

  // ------------------------------------------------------------------ remover

  public RespostaIdempotente<ResultadoModeracaoResposta> remover(
      UUID admin, UUID denunciaId, String chave) {
    Map<String, Object> payload = Map.of("denunciaId", denunciaId.toString());
    var anterior =
        idempotencia.consultar(
            admin,
            OperacaoIdempotente.REMOVER_CONTEUDO_DENUNCIADO,
            chave,
            payload,
            ResultadoModeracaoResposta.class);
    if (anterior.isPresent()) {
      return anterior.get();
    }
    Denuncia d = repositorio.denuncia(denunciaId).orElseThrow(ServicoDeModeracao::naoEncontrada);
    exigirPendente(d);
    return "comentario".equals(d.alvoTipo())
        ? removerComentario(admin, d, chave, payload)
        : removerResenha(admin, d, chave, payload);
  }

  /** Comentário é local: tudo numa transação, e as respostas saem pelo CASCADE (RN-10.5). */
  private RespostaIdempotente<ResultadoModeracaoResposta> removerComentario(
      UUID admin, Denuncia escolhida, String chave, Map<String, Object> payload) {
    return idempotencia.executar(
        admin,
        OperacaoIdempotente.REMOVER_CONTEUDO_DENUNCIADO,
        chave,
        payload,
        ResultadoModeracaoResposta.class,
        () -> {
          Denuncia d = repositorio.travar(escolhida.id()).orElseThrow(ServicoDeModeracao::naoEncontrada);
          exigirPendente(d);
          if (!repositorio.comentarioExiste(d.alvoId())) {
            throw jaExcluido();
          }
          List<UUID> alvos = new ArrayList<>(repositorio.respostas(d.alvoId()));
          alvos.add(d.alvoId());
          repositorio.apagarComentario(d.alvoId());
          List<String> fechadas = repositorio.fecharPendentes("comentario", alvos);
          repositorio.registrar(
              admin.toString(),
              REMOVER,
              "comentario",
              d.alvoId(),
              d.id(),
              d.alvoAutorId(),
              d.alvoLivroId(),
              d.atividadeAutorId());
          return new RespostaIdempotente<>(STATUS_OK, new ResultadoModeracaoResposta(fechadas));
        });
  }

  private RespostaIdempotente<ResultadoModeracaoResposta> removerResenha(
      UUID admin, Denuncia d, String chave, Map<String, Object> payload) {
    repositorio.marcarRemocao("resenha", d.alvoId());
    ClienteDeLeitura.Remocao remocao = leitura.removerResenha(d.alvoId());
    if (!remocao.removida()) {
      // Só chega aqui com o conteúdo já ausente: a chave fixa faz a repetição de uma remoção
      // que deu certo voltar `removida: true`. O 409 do recibo vencido cai no mesmo caso.
      repositorio.limparMarca("resenha", d.alvoId());
      throw jaExcluido();
    }
    return idempotencia.executar(
        admin,
        OperacaoIdempotente.REMOVER_CONTEUDO_DENUNCIADO,
        chave,
        payload,
        ResultadoModeracaoResposta.class,
        () -> {
          Set<UUID> atividadesDaResenha = new HashSet<>(repositorio.atividadesDaResenha(d.alvoId()));
          if (d.atividadeId() != null) {
            atividadesDaResenha.add(d.atividadeId());
          }
          List<String> fechadas = new ArrayList<>(repositorio.fecharPendentes("resenha", List.of(d.alvoId())));
          fechadas.addAll(repositorio.fecharPendentesDeComentariosDasAtividades(atividadesDaResenha));
          repositorio.apagarAtividadesDaResenha(d.alvoId());
          repositorio.registrar(
              admin.toString(),
              REMOVER,
              "resenha",
              d.alvoId(),
              d.id(),
              remocao.autorId() == null ? d.alvoAutorId() : remocao.autorId(),
              remocao.livroId() == null ? d.alvoLivroId() : remocao.livroId(),
              d.atividadeAutorId());
          return new RespostaIdempotente<>(STATUS_OK, new ResultadoModeracaoResposta(fechadas));
        });
  }

  // ------------------------------------------------------------------ frase

  /**
   * Remoção direta de frase (RN-11): sem denúncia, mas sempre com auditoria. Mesmo fluxo da
   * resenha: o {@code leitura} fora da transação, e depois de ele confirmar, nunca recusa.
   */
  public RespostaIdempotente<Void> removerFrase(UUID admin, UUID fraseId, String chave) {
    Map<String, Object> payload = Map.of("fraseId", fraseId.toString());
    var anterior =
        idempotencia.consultar(admin, OperacaoIdempotente.REMOVER_FRASE, chave, payload, Void.class);
    if (anterior.isPresent()) {
      return anterior.get();
    }
    ClienteDeLeitura.Remocao remocao = leitura.removerFrase(fraseId);
    if (!remocao.removida()) {
      throw new ErroDeNegocioException(
          CodigoErro.CONTEUDO_JA_EXCLUIDO, "Esta frase já não existe.");
    }
    return idempotencia.executar(
        admin,
        OperacaoIdempotente.REMOVER_FRASE,
        chave,
        payload,
        Void.class,
        () -> {
          repositorio.registrar(
              admin.toString(),
              REMOVER,
              "frase",
              fraseId,
              null,
              remocao.autorId(),
              remocao.livroId(),
              null);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
  }

  // ------------------------------------------------------------------ conta

  /**
   * Suspende a conta (F-MOD-OPC, RF-MOD-04). Mesmo fluxo da remoção de resenha: o recibo é
   * consultado antes, o {@code identidade} é chamado fora de transação, e só depois de ele
   * confirmar o log é gravado, com o instante que ele devolveu. Não resolve as denúncias do autor
   * (decisão 5).
   *
   * <p><b>Intenção durável</b> (revisão do PR #61): antes da chamada, a intenção fica gravada em
   * {@code comando_de_conta} com um id derivado do admin, da ação e da chave, e o {@code
   * identidade} guarda o resultado pelo mesmo id. Falha ou timeout não grava log nem recibo, mas a
   * intenção fica. A repetição com a mesma chave recebe do {@code identidade} o resultado gravado,
   * sem executar de novo. Uma ação nova sobre a mesma conta primeiro resolve as intenções
   * pendentes reservadas antes dela (nunca as mais novas): grava a auditoria do episódio
   * original, com o motivo original, ou cancela no {@code identidade} a que nunca rodou. Assim, suspender (504), reativar e repetir a suspensão
   * não perde a linha da suspensão nem suspende de novo.
   */
  public RespostaIdempotente<ContaModeradaResposta> suspender(
      UUID admin, String jwtDoAdmin, UUID usuarioId, String motivoBruto, String chave) {
    return moderarConta(admin, jwtDoAdmin, usuarioId, motivoBruto, chave, true);
  }

  /** Reativa a conta. Sem reativação real ({@code reativadoEm} nulo), não há log. */
  public RespostaIdempotente<ContaModeradaResposta> reativar(
      UUID admin, String jwtDoAdmin, UUID usuarioId, String motivoBruto, String chave) {
    return moderarConta(admin, jwtDoAdmin, usuarioId, motivoBruto, chave, false);
  }

  private RespostaIdempotente<ContaModeradaResposta> moderarConta(
      UUID admin,
      String jwtDoAdmin,
      UUID usuarioId,
      String motivoBruto,
      String chave,
      boolean suspender) {
    String acao = suspender ? SUSPENDER : REATIVAR;
    ComandoDeConta pedido =
        new ComandoDeConta(
            idDoComando(admin, acao, chave),
            admin,
            acao,
            chave,
            usuarioId,
            motivoDaConta(motivoBruto));
    var anterior =
        idempotencia.consultar(
            admin, operacao(acao), chave, payload(pedido), ContaModeradaResposta.class);
    if (anterior.isPresent()) {
      return anterior.get();
    }
    ComandoDeConta reservado = repositorio.reservarComando(pedido);
    if (!reservado.usuarioId().equals(usuarioId) || !reservado.motivo().equals(pedido.motivo())) {
      // A mesma chave, numa tentativa sem resposta, foi usada com outra conta ou outro motivo.
      throw new ErroDeNegocioException(
          CodigoErro.CONFLITO, "Essa chave de idempotência já foi usada com outros dados.");
    }
    resolverPendentes(usuarioId, jwtDoAdmin, pedido.id());

    ClienteDeIdentidade.EstadoDaConta estado;
    try {
      estado =
          suspender
              ? identidade.suspender(usuarioId, jwtDoAdmin, pedido.id())
              : identidade.reativar(usuarioId, jwtDoAdmin, pedido.id());
    } catch (ClienteDeIdentidade.ComandoCancelado cancelado) {
      // Uma ação mais nova sobre a conta resolveu esta intenção antes de ela rodar.
      repositorio.descartarComando(pedido.id());
      throw new ErroDeNegocioException(
          CodigoErro.ACAO_SUPERADA, CodigoErro.ACAO_SUPERADA.mensagem());
    } catch (ErroDeNegocioException erro) {
      descartarSeNaoRodou(pedido.id(), erro);
      throw erro;
    }
    return concluir(pedido, estado);
  }

  /**
   * Conclui as intenções da conta reservadas antes desta e ainda sem resposta, da mais antiga para
   * a mais nova: o {@code identidade} devolve o resultado gravado de cada uma (e aqui saem o log,
   * com o admin e o motivo dela, e o recibo da chave dela), ou a cancela, se ela nunca rodou. As
   * mais novas ficam com quem as reservou: a precedência é a ordem de reserva.
   */
  private void resolverPendentes(UUID usuarioId, String jwtDoAdmin, UUID atual) {
    for (ComandoDeConta pendente : repositorio.comandosAnteriores(usuarioId, atual)) {
      ClienteDeIdentidade.EstadoDaConta estado;
      try {
        estado = identidade.resolver(usuarioId, jwtDoAdmin, pendente.id());
      } catch (ClienteDeIdentidade.ComandoCancelado cancelado) {
        repositorio.descartarComando(pendente.id());
        continue;
      } catch (ErroDeNegocioException erro) {
        descartarSeNaoRodou(pendente.id(), erro);
        throw erro;
      }
      try {
        concluir(pendente, estado);
      } catch (ErroDeNegocioException recibo) {
        if (recibo.codigo() != CodigoErro.CONFLITO) {
          throw recibo;
        }
        // Recibo vencido da mesma chave: ele e o log foram gravados juntos, e só a intenção ficou.
        repositorio.descartarComando(pendente.id());
      }
    }
  }

  /** Log, recibo e o fim da intenção na mesma transação. */
  private RespostaIdempotente<ContaModeradaResposta> concluir(
      ComandoDeConta comando, ClienteDeIdentidade.EstadoDaConta estado) {
    boolean suspender = SUSPENDER.equals(comando.acao());
    RespostaIdempotente<ContaModeradaResposta> resposta =
        idempotencia.executar(
            comando.admin(),
            operacao(comando.acao()),
            comando.chave(),
            payload(comando),
            ContaModeradaResposta.class,
            () -> {
              Instant instante = suspender ? estado.suspensoEm() : estado.reativadoEm();
              if (instante != null) {
                repositorio.registrarConta(
                    comando.admin().toString(),
                    comando.acao(),
                    comando.usuarioId(),
                    comando.motivo(),
                    instante);
              }
              repositorio.descartarComando(comando.id());
              return new RespostaIdempotente<>(
                  STATUS_OK,
                  new ContaModeradaResposta(
                      comando.usuarioId().toString(),
                      estado.suspenso(),
                      estado.suspensoEm(),
                      estado.reativadoEm()));
            });
    // O recibo já existia (outra requisição concluiu antes): a intenção sai do mesmo jeito.
    repositorio.descartarComando(comando.id());
    return resposta;
  }

  /** 404 e 422 do {@code identidade} são recusas: o comando não rodou e não vai rodar. */
  private void descartarSeNaoRodou(UUID comandoId, ErroDeNegocioException erro) {
    if (erro.codigo() == CodigoErro.RECURSO_NAO_ENCONTRADO
        || erro.codigo() == CodigoErro.ENTIDADE_NAO_PROCESSAVEL) {
      repositorio.descartarComando(comandoId);
    }
  }

  /** Um id por intenção: o mesmo admin, a mesma ação e a mesma chave de idempotência. */
  public static UUID idDoComando(UUID admin, String acao, String chave) {
    return UUID.nameUUIDFromBytes(
        ("moderacao:conta:" + admin + ":" + acao + ":" + chave).getBytes(StandardCharsets.UTF_8));
  }

  private static OperacaoIdempotente operacao(String acao) {
    return SUSPENDER.equals(acao)
        ? OperacaoIdempotente.SUSPENDER_CONTA
        : OperacaoIdempotente.REATIVAR_CONTA;
  }

  private static Map<String, Object> payload(ComandoDeConta comando) {
    return Map.of("usuarioId", comando.usuarioId().toString(), "motivo", comando.motivo());
  }

  /** Obrigatório nas duas ações (decisão 5), até 500 code points sem os espaços das pontas. */
  static String motivoDaConta(String bruto) {
    String motivo = bruto == null ? "" : bruto.strip();
    if (motivo.isEmpty()) {
      throw new ErroDeNegocioException(
          CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "Escreva o motivo para continuar.");
    }
    if (motivo.codePointCount(0, motivo.length()) > MotivoDaContaRequisicao.MOTIVO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "O motivo passou do limite de 500 caracteres.");
    }
    // O Postgres recusa U+0000 em text: sem esta barreira, o identidade suspenderia e o log
    // falharia depois, deixando a ação sem auditoria (validação da F-MOD-OPC, 06/11/2026).
    if (motivo.indexOf(0) >= 0) {
      throw new ErroDeNegocioException(
          CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "O motivo tem um caractere inválido.");
    }
    return motivo;
  }

  /**
   * A conta para o perfil do administrador (F-MOD-OPC). Inexistente ou em exclusão pendente é o
   * mesmo 404 do perfil: o administrador também não lê conta em exclusão.
   */
  public ContaDaModeracaoResposta contaPorUsername(String username) {
    return repositorio
        .contaPorUsername(username)
        .orElseThrow(
            () ->
                new ErroDeNegocioException(
                    CodigoErro.RECURSO_NAO_ENCONTRADO, "Não encontramos esta conta."));
  }

  // ------------------------------------------------------------------ registro

  public PaginaRegistrosResposta registros(String cursor, int limite) {
    List<ModeracaoRepository.Registro> linhas =
        repositorio.registros(cursor(cursor), limite);
    boolean temMais = linhas.size() > limite;
    List<ModeracaoRepository.Registro> pagina = temMais ? linhas.subList(0, limite) : linhas;

    Set<UUID> pessoas = new HashSet<>();
    Set<UUID> livros = new HashSet<>();
    for (ModeracaoRepository.Registro r : pagina) {
      Stream.of(r.alvoAutorId(), r.atividadeAutorId()).filter(Objects::nonNull).forEach(pessoas::add);
      if (ehDeConta(r) && r.alvoId() != null) pessoas.add(r.alvoId());
      if (r.alvoLivroId() != null) livros.add(r.alvoLivroId());
    }
    Map<UUID, PessoaDaModeracao> perfis = repositorio.perfis(pessoas);
    Map<UUID, LivroDaDenuncia> porLivro = repositorio.livros(livros);

    List<RegistroDeModeracaoResposta> itens =
        pagina.stream()
            .map(
                r ->
                    new RegistroDeModeracaoResposta(
                        r.id().toString(),
                        r.criadoEm(),
                        r.acao(),
                        r.alvoTipo(),
                        r.comDenuncia(),
                        username(perfis.get(r.alvoAutorId())),
                        username(perfis.get(r.atividadeAutorId())),
                        r.alvoLivroId() == null || !porLivro.containsKey(r.alvoLivroId())
                            ? null
                            : porLivro.get(r.alvoLivroId()).titulo(),
                        r.anonimizado(),
                        ehDeConta(r) && r.alvoId() != null ? r.alvoId().toString() : null,
                        ehDeConta(r) ? username(perfis.get(r.alvoId())) : null,
                        ehDeConta(r) ? r.detalhe() : null,
                        suspensaoVigente(r, perfis)))
            .toList();
    ModeracaoRepository.Registro ultimo = pagina.isEmpty() ? null : pagina.getLast();
    String proximo =
        temMais && ultimo != null ? new CursorComentario(ultimo.criadoEm(), ultimo.id()).codificar() : null;
    return new PaginaRegistrosResposta(itens, proximo, temMais);
  }

  private static CursorComentario cursor(String bruto) {
    if (bruto == null || bruto.isBlank()) {
      return null;
    }
    try {
      return CursorComentario.decodificar(bruto);
    } catch (CursorInvalidoException erro) {
      throw new ErroDeNegocioException(CodigoErro.REQUISICAO_INVALIDA, "Cursor de paginação inválido.");
    }
  }

  private static boolean ehDeConta(ModeracaoRepository.Registro r) {
    return "usuario".equals(r.alvoTipo());
  }

  /** A linha da suspensão em vigor: o instante dela é o {@code suspenso_em} atual da conta. */
  private static boolean suspensaoVigente(
      ModeracaoRepository.Registro r, Map<UUID, PessoaDaModeracao> perfis) {
    if (!SUSPENDER.equals(r.acao()) || r.alvoId() == null) {
      return false;
    }
    PessoaDaModeracao conta = perfis.get(r.alvoId());
    return conta != null
        && conta.suspensa()
        && conta.suspensaEm() != null
        && conta.suspensaEm().equals(r.criadoEm());
  }

  private static String username(PessoaDaModeracao pessoa) {
    return pessoa == null ? null : pessoa.username();
  }

  private static void exigirPendente(Denuncia d) {
    if (!"pendente".equals(d.estado())) {
      throw new ErroDeNegocioException(
          CodigoErro.DENUNCIA_JA_RESOLVIDA, "Esta denúncia já foi resolvida.");
    }
  }

  private static ErroDeNegocioException naoEncontrada() {
    return new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, "Denúncia não encontrada.");
  }

  private static ErroDeNegocioException jaExcluido() {
    return new ErroDeNegocioException(
        CodigoErro.CONTEUDO_JA_EXCLUIDO,
        "Quem escreveu já excluiu este conteúdo. Arquive a denúncia.");
  }
}

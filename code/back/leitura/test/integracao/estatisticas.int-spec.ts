import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { DesafiosService } from '../../src/desafios/aplicacao/desafios.service';
import { EstatisticasService } from '../../src/estatisticas/aplicacao/estatisticas.service';
import { MetricasConsumer } from '../../src/metricas/metricas.consumer';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { dataLocal } from '../../src/progresso/dominio/progresso';
import { SequenciaService } from '../../src/sequencia/sequencia.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { inserirLivro, inserirPerfil, seguir } from './massa';

const FILA = 'leai.leitura.metricas';
const SP = 'America/Sao_Paulo';

/** Anos fixos no passado: datas de início e fim nunca caem no futuro. */
const ANO_CORRENTE = Number(dataLocal(new Date(), SP).slice(0, 4));
const RETRASADO = ANO_CORRENTE - 2;
const PASSADO = ANO_CORRENTE - 1;

interface Estatisticas {
  ano: number | null;
  anos: { ano: number; livrosConcluidos: number }[];
  primeiroRegistro: string | null;
  totais: {
    livrosConcluidos: number;
    paginasLidas: number;
    minutosLidos: number;
  };
  medias: {
    paginasPorDia: {
      valor: number | null;
      paginasLidas: number;
      diasComLeitura: number;
    };
    diasPorLivro: {
      valor: number | null;
      dias: number;
      leiturasConcluidas: number;
    };
    notaMedia: { valor: number | null; quantidade: number };
  };
}

interface Graficos {
  ano: number | null;
  granularidade: 'mes' | 'ano';
  pontos: {
    ano: number;
    mes: number | null;
    paginasLidas: number;
    livrosConcluidos: number;
  }[];
}

/**
 * Estatísticas do leitor (F-STA) contra Postgres real, pelo caminho de
 * produção: escrita pela API → outbox → despachante → broker → consumidor de
 * métricas → `GET /me/estatisticas`. Exclusão de trecho e nota recompõem na
 * própria transação, sem evento.
 */
describe('estatísticas (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;
  let despachante: OutboxDispatcherService;
  let falhasForcadas: number;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await limpar(pool);
    falhasForcadas = 0;
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = app.get(MessageValidator);
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    const estatisticas = app.get(EstatisticasService);
    // Falha sob demanda no efeito de F-STA, para provar o retry e a DLQ.
    const instavel = {
      recalcular: async (
        ...args: Parameters<EstatisticasService['recalcular']>
      ) => {
        if (falhasForcadas > 0) {
          falhasForcadas--;
          throw new Error('banco indisponível por um instante');
        }
        return estatisticas.recalcular(...args);
      },
    } as unknown as EstatisticasService;
    new MetricasConsumer(
      consumidor,
      validador,
      app.get(SequenciaService),
      app.get(DesafiosService),
      instavel,
    ).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    despachante = new OutboxDispatcherService(
      app.get<DrizzleDB>(DRIZZLE),
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    );
  });

  const http = () => request(app.getHttpServer());
  const comToken = (req: request.Test, usuario: string) =>
    req.set('Authorization', `Bearer ${tokenDe(usuario)}`);
  const escrita = (req: request.Test, usuario: string) =>
    comToken(req, usuario).set('Idempotency-Key', randomUUID());

  async function leitor(
    privacidade: 'publico' | 'privado' = 'publico',
  ): Promise<string> {
    const usuario = novoUsuario();
    await inserirPerfil(pool, { id: usuario, privacidade });
    return usuario;
  }

  async function iniciar(
    usuario: string,
    dataInicio: string,
    livroId?: string,
  ): Promise<{ leituraId: string; livroId: string }> {
    const livro = livroId ?? (await inserirLivro(pool, { paginas: 1000 }));
    const res = await escrita(
      http().post(livroId ? '/releituras' : '/leituras'),
      usuario,
    )
      .send({ livroId: livro, dataInicio })
      .expect(201);
    return { leituraId: (res.body as { id: string }).id, livroId: livro };
  }

  /** Progresso capturado ao meio-dia de São Paulo do dia informado. */
  async function progresso(
    usuario: string,
    leituraId: string,
    pagina: number,
    dia: string,
    minutos = 0,
    instante = `${dia}T15:00:00.000Z`,
    fuso = SP,
  ): Promise<string> {
    const res = await escrita(
      http().post(`/leituras/${leituraId}/progresso`),
      usuario,
    )
      .send({
        pagina,
        minutos,
        registradoEmDispositivo: instante,
        fusoHorarioDispositivo: fuso,
      })
      .expect(201);
    return (res.body as { progresso: { id: string } }).progresso.id;
  }

  async function finalizar(
    usuario: string,
    leituraId: string,
    dataFim: string,
  ): Promise<void> {
    await escrita(http().post(`/leituras/${leituraId}/finalizar`), usuario)
      .send({ dataFim, fusoHorarioDispositivo: SP })
      .expect(200);
  }

  async function transicao(
    usuario: string,
    leituraId: string,
    acao: 'abandonar' | 'retomar',
  ): Promise<void> {
    await escrita(
      http().post(`/leituras/${leituraId}/${acao}`),
      usuario,
    ).expect(200);
  }

  async function darNota(
    usuario: string,
    livroId: string,
    valor: number,
  ): Promise<void> {
    await escrita(http().put(`/livros/${livroId}/nota`), usuario)
      .send({ valor })
      .expect(200);
  }

  async function tirarNota(usuario: string, livroId: string): Promise<void> {
    await escrita(http().delete(`/livros/${livroId}/nota`), usuario).expect(
      204,
    );
  }

  /** Despacha a outbox e entrega ao consumidor de métricas. */
  async function processar(): Promise<void> {
    await despachante.dispatchOnce();
    await broker.entregar(FILA);
  }

  async function estatisticas(
    usuario: string,
    periodo?: string | number,
  ): Promise<Estatisticas> {
    const consulta = periodo === undefined ? '' : `?periodo=${periodo}`;
    const res = await comToken(
      http().get(`/me/estatisticas${consulta}`),
      usuario,
    ).expect(200);
    return res.body as Estatisticas;
  }

  async function graficos(
    usuario: string,
    periodo: string | number,
  ): Promise<Graficos> {
    const res = await comToken(
      http().get(`/me/estatisticas/graficos?periodo=${periodo}`),
      usuario,
    ).expect(200);
    return res.body as Graficos;
  }

  describe('GET /me/estatisticas', () => {
    it('sem token é 401', async () => {
      await http().get('/me/estatisticas').expect(401);
      await http().get('/me/estatisticas/graficos').expect(401);
    });

    it('sem leitura, o ano corrente zerado e médias ausentes', async () => {
      expect(await estatisticas(await leitor())).toEqual({
        ano: ANO_CORRENTE,
        anos: [],
        primeiroRegistro: null,
        totais: { livrosConcluidos: 0, paginasLidas: 0, minutosLidos: 0 },
        medias: {
          paginasPorDia: { valor: null, paginasLidas: 0, diasComLeitura: 0 },
          diasPorLivro: { valor: null, dias: 0, leiturasConcluidas: 0 },
          notaMedia: { valor: null, quantidade: 0 },
        },
      });
    });

    it.each(['26', 'todos', `${ANO_CORRENTE}x`, '0999'])(
      'periodo=%s responde 400 no campo periodo',
      async (periodo) => {
        const res = await comToken(
          http().get(`/me/estatisticas?periodo=${periodo}`),
          await leitor(),
        ).expect(400);
        expect(res.body.campos).toEqual([
          expect.objectContaining({ campo: 'periodo' }),
        ]);
      },
    );

    it('totais por ano, acumulado e anos do seletor (RF-STA-01/02)', async () => {
      const usuario = await leitor();
      const primeira = await iniciar(usuario, `${RETRASADO}-03-01`);
      await progresso(
        usuario,
        primeira.leituraId,
        50,
        `${RETRASADO}-03-02`,
        30,
      );
      await progresso(
        usuario,
        primeira.leituraId,
        120,
        `${RETRASADO}-03-05`,
        45,
      );
      await finalizar(usuario, primeira.leituraId, `${RETRASADO}-03-10`);
      const segunda = await iniciar(usuario, `${PASSADO}-06-01`);
      await progresso(usuario, segunda.leituraId, 80, `${PASSADO}-06-01`, 60);
      // Começou e terminou no mesmo dia: conta um dia.
      await finalizar(usuario, segunda.leituraId, `${PASSADO}-06-01`);
      await processar();

      expect(await estatisticas(usuario, RETRASADO)).toMatchObject({
        ano: RETRASADO,
        totais: { livrosConcluidos: 1, paginasLidas: 120, minutosLidos: 75 },
        medias: {
          paginasPorDia: { valor: 60, paginasLidas: 120, diasComLeitura: 2 },
          diasPorLivro: { valor: 10, dias: 10, leiturasConcluidas: 1 },
        },
      });
      expect(await estatisticas(usuario, PASSADO)).toMatchObject({
        totais: { livrosConcluidos: 1, paginasLidas: 80, minutosLidos: 60 },
        medias: {
          paginasPorDia: { valor: 80 },
          diasPorLivro: { valor: 1, dias: 1, leiturasConcluidas: 1 },
        },
      });
      expect(await estatisticas(usuario, 'acumulado')).toEqual({
        ano: null,
        anos: [
          { ano: PASSADO, livrosConcluidos: 1 },
          { ano: RETRASADO, livrosConcluidos: 1 },
        ],
        primeiroRegistro: `${RETRASADO}-03-02`,
        totais: { livrosConcluidos: 2, paginasLidas: 200, minutosLidos: 135 },
        medias: {
          paginasPorDia: { valor: 66.7, paginasLidas: 200, diasComLeitura: 3 },
          diasPorLivro: { valor: 5.5, dias: 11, leiturasConcluidas: 2 },
          notaMedia: { valor: null, quantidade: 0 },
        },
      });
      // O ano corrente fica zerado, mas o seletor mostra os anos com registro.
      expect(await estatisticas(usuario)).toMatchObject({
        ano: ANO_CORRENTE,
        totais: { livrosConcluidos: 0, paginasLidas: 0, minutosLidos: 0 },
        anos: [{ ano: PASSADO }, { ano: RETRASADO }],
      });
    });

    it('só mostra os dados do próprio leitor (SEC-02)', async () => {
      const ana = await leitor();
      const bia = await leitor();
      const { leituraId } = await iniciar(ana, `${PASSADO}-02-01`);
      await progresso(ana, leituraId, 40, `${PASSADO}-02-02`);
      await processar();

      expect((await estatisticas(ana, PASSADO)).totais.paginasLidas).toBe(40);
      expect((await estatisticas(bia, PASSADO)).totais.paginasLidas).toBe(0);
    });

    it('um dia com vários progressos e livros conta uma vez; páginas de leitura abandonada contam (RN-04)', async () => {
      const usuario = await leitor();
      const umLivro = await iniciar(usuario, `${PASSADO}-04-01`);
      const outroLivro = await iniciar(usuario, `${PASSADO}-04-01`);
      await progresso(usuario, umLivro.leituraId, 10, `${PASSADO}-04-02`);
      await progresso(usuario, umLivro.leituraId, 30, `${PASSADO}-04-02`);
      await progresso(usuario, outroLivro.leituraId, 25, `${PASSADO}-04-02`);
      await progresso(usuario, outroLivro.leituraId, 40, `${PASSADO}-04-03`);
      await transicao(usuario, outroLivro.leituraId, 'abandonar');
      await processar();

      expect((await estatisticas(usuario, PASSADO)).medias).toMatchObject({
        paginasPorDia: { valor: 35, paginasLidas: 70, diasComLeitura: 2 },
        diasPorLivro: { valor: null, leiturasConcluidas: 0 },
      });
    });

    it('progresso conta na data local do dispositivo, mesmo sincronizado depois (RN-18.2)', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-01-01`);
      await progresso(usuario, leituraId, 20, `${PASSADO}-09-20`);
      await processar();
      // Estava na fila offline desde fevereiro e só chega agora.
      await progresso(usuario, leituraId, 50, `${PASSADO}-02-15`);
      // 31/03 às 21h em São Paulo já é 1º/04 em Tóquio.
      await progresso(
        usuario,
        leituraId,
        60,
        `${PASSADO}-03-31`,
        0,
        `${PASSADO}-04-01T00:00:00.000Z`,
        'Asia/Tokyo',
      );
      await processar();

      const porMes = Object.fromEntries(
        (await graficos(usuario, PASSADO)).pontos.map((p) => [
          p.mes,
          p.paginasLidas,
        ]),
      );
      expect(porMes).toMatchObject({ 2: 30, 3: 0, 4: 10, 9: 20 });
    });

    it('dias por livro: duração inclusiva, com o intervalo abandonado e releituras à parte', async () => {
      const usuario = await leitor();
      const primeira = await iniciar(usuario, `${PASSADO}-05-01`);
      await transicao(usuario, primeira.leituraId, 'abandonar');
      await transicao(usuario, primeira.leituraId, 'retomar');
      await finalizar(usuario, primeira.leituraId, `${PASSADO}-05-20`);
      const releitura = await iniciar(
        usuario,
        `${PASSADO}-07-01`,
        primeira.livroId,
      );
      await finalizar(usuario, releitura.leituraId, `${PASSADO}-07-04`);
      await processar();

      expect(await estatisticas(usuario, PASSADO)).toMatchObject({
        totais: { livrosConcluidos: 2 },
        medias: {
          diasPorLivro: { valor: 12, dias: 24, leiturasConcluidas: 2 },
        },
      });
    });

    it('excluir trecho de progresso corrige páginas, tempo e dias na mesma transação', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-08-01`);
      await progresso(usuario, leituraId, 40, `${PASSADO}-08-02`, 20);
      const ultimo = await progresso(
        usuario,
        leituraId,
        90,
        `${PASSADO}-08-05`,
        30,
      );
      await processar();
      expect((await estatisticas(usuario, PASSADO)).totais).toMatchObject({
        paginasLidas: 90,
        minutosLidos: 50,
      });

      await escrita(http().delete(`/progresso/${ultimo}`), usuario)
        .send({ ultimoProgressoIdConfirmado: ultimo })
        .expect(200);

      expect(await estatisticas(usuario, PASSADO)).toMatchObject({
        totais: { paginasLidas: 40, minutosLidos: 20 },
        medias: {
          paginasPorDia: { valor: 40, paginasLidas: 40, diasComLeitura: 1 },
        },
      });
    });

    it('criar, editar e remover nota corrigem a média e a quantidade', async () => {
      const usuario = await leitor();
      const umLivro = await inserirLivro(pool);
      const outroLivro = await inserirLivro(pool);

      await darNota(usuario, umLivro, 4);
      await darNota(usuario, outroLivro, 3.5);
      // 7,5 / 2 = 3,75, arredondado a uma casa.
      expect((await estatisticas(usuario)).medias.notaMedia).toEqual({
        valor: 3.8,
        quantidade: 2,
      });

      await darNota(usuario, umLivro, 4.5);
      expect((await estatisticas(usuario)).medias.notaMedia).toEqual({
        valor: 4,
        quantidade: 2,
      });

      await tirarNota(usuario, outroLivro);
      expect((await estatisticas(usuario)).medias.notaMedia).toEqual({
        valor: 4.5,
        quantidade: 1,
      });

      await tirarNota(usuario, umLivro);
      const semNota = await estatisticas(usuario);
      expect(semNota.medias.notaMedia).toEqual({ valor: null, quantidade: 0 });
      // Nota sozinha não abre ano no seletor.
      expect(semNota.anos).toEqual([]);
    });

    it('backfill recompõe o histórico e limpa quem ficou sem nada', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-10-01`);
      await progresso(usuario, leituraId, 70, `${PASSADO}-10-02`, 15);
      await finalizar(usuario, leituraId, `${PASSADO}-10-03`);
      // Nenhuma entrega: o histórico anterior ao consumidor de F-STA.
      expect((await estatisticas(usuario, PASSADO)).totais.paginasLidas).toBe(
        0,
      );
      // Balde antigo de quem não tem mais leitura nenhuma.
      const semLeitura = novoUsuario();
      await pool.query(
        `INSERT INTO leitura.estatistica_mensal
           (usuario_id, ano, mes, paginas_lidas, dias_com_leitura)
         VALUES ($1, $2, 1, 10, 1)`,
        [semLeitura, PASSADO],
      );

      const servico = app.get(EstatisticasService);
      expect(await servico.recalcularTodos()).toBe(2);
      const depois = await estatisticas(usuario, PASSADO);
      expect(depois.totais).toEqual({
        livrosConcluidos: 1,
        paginasLidas: 70,
        minutosLidos: 15,
      });
      expect(
        await contar(pool, 'leitura.estatistica_mensal', 'usuario_id = $1', [
          semLeitura,
        ]),
      ).toBe(0);

      // Rodar de novo não muda nada.
      await servico.recalcularTodos();
      expect(await estatisticas(usuario, PASSADO)).toEqual(depois);
    });
  });

  describe('GET /me/estatisticas/graficos (RF-STA-03)', () => {
    it('no ano, um ponto por mês desde o primeiro com registro; no acumulado, um por ano', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-03-01`);
      await progresso(usuario, leituraId, 50, `${PASSADO}-03-10`);
      await finalizar(usuario, leituraId, `${PASSADO}-05-02`);
      await processar();

      const doAno = await graficos(usuario, PASSADO);
      expect(doAno.ano).toBe(PASSADO);
      expect(doAno.granularidade).toBe('mes');
      expect(doAno.pontos.map((p) => p.mes)).toEqual([
        3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(doAno.pontos[0]).toEqual({
        ano: PASSADO,
        mes: 3,
        paginasLidas: 50,
        livrosConcluidos: 0,
      });
      expect(doAno.pontos[2]).toMatchObject({ mes: 5, livrosConcluidos: 1 });

      expect(await graficos(usuario, 'acumulado')).toEqual({
        ano: null,
        granularidade: 'ano',
        pontos: [
          { ano: PASSADO, mes: null, paginasLidas: 50, livrosConcluidos: 1 },
          {
            ano: ANO_CORRENTE,
            mes: null,
            paginasLidas: 0,
            livrosConcluidos: 0,
          },
        ],
      });
    });
  });

  describe('GET /perfis/{usuarioId}/estatisticas (RN-08)', () => {
    let autora: string;

    async function comLeituras(privacidade: 'publico' | 'privado') {
      autora = await leitor(privacidade);
      const { leituraId } = await iniciar(autora, `${PASSADO}-06-01`);
      await progresso(autora, leituraId, 120, `${PASSADO}-06-02`, 90);
      await finalizar(autora, leituraId, `${PASSADO}-06-03`);
      await processar();
    }

    const doPerfil = (usuarioId: string, quem: string, consulta = '') =>
      comToken(
        http().get(`/perfis/${usuarioId}/estatisticas${consulta}`),
        quem,
      );

    const TOTAIS = { livrosConcluidos: 1, paginasLidas: 120, minutosLidos: 90 };

    it('o próprio leitor vê o perfil privado dele', async () => {
      await comLeituras('privado');
      const res = await doPerfil(autora, autora, `?ano=${PASSADO}`).expect(200);
      expect(res.body).toEqual({ ano: PASSADO, ...TOTAIS });
    });

    it('perfil público: qualquer leitor vê só os totais do ano', async () => {
      await comLeituras('publico');
      const res = await doPerfil(
        autora,
        await leitor(),
        `?ano=${PASSADO}`,
      ).expect(200);
      expect(res.body).toEqual({ ano: PASSADO, ...TOTAIS });
    });

    it('sem ano, o ano corrente', async () => {
      await comLeituras('publico');
      const res = await doPerfil(autora, await leitor()).expect(200);
      expect(res.body).toEqual({
        ano: ANO_CORRENTE,
        livrosConcluidos: 0,
        paginasLidas: 0,
        minutosLidos: 0,
      });
    });

    it('perfil privado sem seguimento aceito responde 403', async () => {
      await comLeituras('privado');
      const res = await doPerfil(autora, await leitor()).expect(403);
      expect(res.body.codigo).toBe('ACESSO_NEGADO');
    });

    it('perfil privado com seguimento aceito vê os totais', async () => {
      await comLeituras('privado');
      const seguidora = await leitor();
      await seguir(pool, seguidora, autora);
      const res = await doPerfil(autora, seguidora, `?ano=${PASSADO}`).expect(
        200,
      );
      expect(res.body).toEqual({ ano: PASSADO, ...TOTAIS });
    });

    // Conta inexistente, suspensa ou em exclusão: sem linha na VIEW de perfil.
    it('perfil ausente da VIEW responde 404', async () => {
      await doPerfil(novoUsuario(), await leitor()).expect(404);
    });

    it('usuarioId em maiúsculas é o mesmo perfil', async () => {
      await comLeituras('publico');
      const res = await doPerfil(
        autora.toUpperCase(),
        await leitor(),
        `?ano=${PASSADO}`,
      ).expect(200);
      expect(res.body).toEqual({ ano: PASSADO, ...TOTAIS });
    });

    it('usuarioId malformado responde 400 no campo usuarioId', async () => {
      const res = await doPerfil('nao-e-uuid', await leitor()).expect(400);
      expect(res.body.campos).toEqual([
        expect.objectContaining({ campo: 'usuarioId' }),
      ]);
    });

    it.each(['?ano=abc', '?ano=999', '?ano=10000', '?ano=2026.5'])(
      '%s responde 400',
      async (consulta) => {
        await doPerfil(await leitor(), await leitor(), consulta).expect(400);
      },
    );
  });

  describe('consumo (RNF-ERR-06/07, RNF-TST-03)', () => {
    it('reentrega do mesmo eventId não repete efeito', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-02-01`);
      await progresso(usuario, leituraId, 30, `${PASSADO}-02-02`);
      await despachante.dispatchOnce();
      const [mensagem] = broker.filas.get(FILA) ?? [];

      await broker.entregar(FILA);
      await broker.reentregar(FILA, mensagem);

      expect(broker.acks).toHaveLength(2);
      expect(
        await contar(pool, 'leitura.mensagem_processada', 'consumidor = $1', [
          'leitura.metricas',
        ]),
      ).toBe(1);
      expect((await estatisticas(usuario, PASSADO)).totais.paginasLidas).toBe(
        30,
      );
    });

    it('falha transitória é retentada e o efeito acontece uma vez', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-02-01`);
      await progresso(usuario, leituraId, 30, `${PASSADO}-02-02`);
      falhasForcadas = 2;

      await processar();

      expect(broker.acks).toHaveLength(1);
      expect(broker.nacks).toHaveLength(0);
      expect((await estatisticas(usuario, PASSADO)).totais.paginasLidas).toBe(
        30,
      );
    });

    it('falha persistente vai para a DLQ sem recibo e sem baldes', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-02-01`);
      await progresso(usuario, leituraId, 30, `${PASSADO}-02-02`);
      falhasForcadas = 99;

      await processar();

      expect(broker.nacks).toHaveLength(1);
      expect(await contar(pool, 'leitura.mensagem_processada')).toBe(0);
      expect(
        await contar(pool, 'leitura.estatistica_mensal', 'usuario_id = $1', [
          usuario,
        ]),
      ).toBe(0);
    });

    it('mensagem atrasada de progresso já excluído não o ressuscita', async () => {
      const usuario = await leitor();
      const { leituraId } = await iniciar(usuario, `${PASSADO}-02-01`);
      const unico = await progresso(usuario, leituraId, 30, `${PASSADO}-02-02`);
      await escrita(http().delete(`/progresso/${unico}`), usuario)
        .send({ ultimoProgressoIdConfirmado: unico })
        .expect(200);

      await processar();

      expect(broker.acks).toHaveLength(1);
      expect((await estatisticas(usuario, PASSADO)).totais.paginasLidas).toBe(
        0,
      );
    });
  });
});

import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { DesafiosService } from '../../src/desafios/aplicacao/desafios.service';
import { janelaQueContem } from '../../src/desafios/dominio/janelas';
import { MetricasConsumer } from '../../src/metricas/metricas.consumer';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { dataLocal } from '../../src/progresso/dominio/progresso';
import { SequenciaService } from '../../src/sequencia/sequencia.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { inserirLivro, inserirPerfil } from './massa';

const FILA = 'leai.leitura.metricas';
const SP = 'America/Sao_Paulo';
const DIA_MS = 86_400_000;

interface Janela {
  inicio: string;
  fim: string;
  acumulado: number;
  cumprida: boolean;
}

interface Desafio {
  id: string;
  unidade: string;
  janela: string;
  valorAlvo: number;
  fusoHorario: string;
  pausado: boolean;
  pausadoDesde: string | null;
  criadoEm: string;
  janelaCorrente: Janela;
}

interface PaginaDesafios {
  itens: Desafio[];
  paginacao: {
    page: number;
    limite: number;
    totalItens: number;
    totalPaginas: number;
  };
}

interface JanelaGravada {
  inicio: string;
  fim: string;
  unidade: string;
  periodicidade: string;
  valor_alvo: number;
  acumulado: number;
  cumprida: boolean;
  encerrada: boolean;
}

/**
 * Desafios (F-DSF) contra Postgres real, pelo caminho de produção: progresso e
 * finalização pela API → outbox → despachante → broker em memória →
 * consumidor de métricas → `GET /desafios`.
 */
describe('desafios (integração)', () => {
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
    const desafios = app.get(DesafiosService);
    // Falha transitória sob demanda, para provar o retry do runtime.
    const instavel = {
      recalcular: async (
        ...args: Parameters<DesafiosService['recalcular']>
      ) => {
        if (falhasForcadas > 0) {
          falhasForcadas--;
          throw new Error('banco indisponível por um instante');
        }
        return desafios.recalcular(...args);
      },
    } as unknown as DesafiosService;
    new MetricasConsumer(
      consumidor,
      validador,
      app.get(SequenciaService),
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

  /** Instante `dias` atrás, ao meio-dia de São Paulo (longe da virada). */
  function diasAtras(dias: number): Date {
    const hoje = dataLocal(new Date(), SP);
    return new Date(Date.parse(`${hoje}T15:00:00.000Z`) - dias * DIA_MS);
  }

  const esperar = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  async function leitor(): Promise<string> {
    const usuario = novoUsuario();
    await inserirPerfil(pool, { id: usuario });
    return usuario;
  }

  function post(
    usuario: string,
    caminho: string,
    corpo?: object,
    chave = randomUUID(),
  ) {
    const req = http()
      .post(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', chave);
    return corpo ? req.send(corpo) : req;
  }

  async function iniciarLeitura(
    usuario: string,
    livroId?: string,
  ): Promise<string> {
    const livro = livroId ?? (await inserirLivro(pool, { paginas: 1000 }));
    const res = await post(usuario, '/leituras', { livroId: livro }).expect(
      201,
    );
    return (res.body as { id: string }).id;
  }

  async function progresso(
    usuario: string,
    leituraId: string,
    pagina: number,
    instante: Date,
    minutos?: number,
  ): Promise<string> {
    const res = await post(usuario, `/leituras/${leituraId}/progresso`, {
      pagina,
      ...(minutos === undefined ? {} : { minutos }),
      registradoEmDispositivo: instante.toISOString(),
      fusoHorarioDispositivo: SP,
    }).expect(201);
    return (res.body as { progresso: { id: string } }).progresso.id;
  }

  async function finalizar(
    usuario: string,
    leituraId: string,
    dataFim?: string,
  ): Promise<void> {
    await post(usuario, `/leituras/${leituraId}/finalizar`, {
      fusoHorarioDispositivo: SP,
      ...(dataFim ? { dataFim } : {}),
    }).expect(200);
  }

  async function criar(
    usuario: string,
    corpo: Partial<{
      unidade: string;
      janela: string;
      valorAlvo: number;
      fusoHorario: string;
    }> = {},
  ): Promise<Desafio> {
    const res = await post(usuario, '/desafios', {
      unidade: 'paginas',
      janela: 'diaria',
      valorAlvo: 20,
      fusoHorario: SP,
      ...corpo,
    }).expect(201);
    return res.body as Desafio;
  }

  /**
   * Desafio criado há `dias`: grava a linha direto, como se a API a tivesse
   * criado naquele dia; a primeira consulta materializa as janelas.
   */
  async function criadoHa(
    usuario: string,
    dias: number,
    janela: string,
    unidade = 'paginas',
    valorAlvo = 10,
    fusoHorario = SP,
  ): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO leitura.desafio
         (id, usuario_id, unidade, janela, valor_alvo, fuso_horario,
          criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [id, usuario, unidade, janela, valorAlvo, fusoHorario, diasAtras(dias)],
    );
    return id;
  }

  async function listar(
    usuario: string,
    consulta = '',
  ): Promise<PaginaDesafios> {
    const res = await http()
      .get(`/desafios${consulta}`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .expect(200);
    return res.body as PaginaDesafios;
  }

  async function desafio(usuario: string, id: string): Promise<Desafio> {
    const encontrado = (await listar(usuario, '?limite=50')).itens.find(
      (item) => item.id === id,
    );
    if (!encontrado) throw new Error(`desafio ${id} não listado`);
    return encontrado;
  }

  async function janelas(desafioId: string): Promise<JanelaGravada[]> {
    const { rows } = await pool.query<JanelaGravada>(
      `SELECT to_char(inicio, 'YYYY-MM-DD') AS inicio,
              to_char(fim, 'YYYY-MM-DD') AS fim,
              unidade, periodicidade, valor_alvo, acumulado, cumprida,
              encerrada_em IS NOT NULL AS encerrada
         FROM leitura.janela_desafio
        WHERE desafio_id = $1
        ORDER BY inicio, fim`,
      [desafioId],
    );
    return rows;
  }

  /** Despacha a outbox e entrega ao consumidor de métricas. */
  async function processar(): Promise<void> {
    await despachante.dispatchOnce();
    await broker.entregar(FILA);
  }

  const hojeSp = () => dataLocal(new Date(), SP);

  describe('CRUD (RF-DSF-01/04)', () => {
    it('sem token é 401', async () => {
      await http().get('/desafios').expect(401);
      await http().post('/desafios').send({}).expect(401);
    });

    it('cria com a janela corrente zerada', async () => {
      const usuario = await leitor();
      const criado = await criar(usuario, { janela: 'semanal', valorAlvo: 50 });

      expect(criado).toMatchObject({
        unidade: 'paginas',
        janela: 'semanal',
        valorAlvo: 50,
        fusoHorario: SP,
        pausado: false,
        pausadoDesde: null,
        janelaCorrente: {
          ...janelaQueContem(hojeSp(), 'semanal'),
          acumulado: 0,
          cumprida: false,
        },
      });
    });

    it('qualquer unidade combina com qualquer janela, vários ao mesmo tempo (RN-20)', async () => {
      const usuario = await leitor();
      for (const unidade of ['paginas', 'minutos', 'livros']) {
        for (const janela of ['diaria', 'semanal', 'mensal', 'anual']) {
          await criar(usuario, { unidade, janela, valorAlvo: 5 });
        }
      }
      expect((await listar(usuario, '?limite=50')).paginacao.totalItens).toBe(
        12,
      );
    });

    it('corpo malformado é 400 e alvo acima do teto da unidade é 422', async () => {
      const usuario = await leitor();
      const base = {
        unidade: 'paginas',
        janela: 'diaria',
        valorAlvo: 10,
        fusoHorario: SP,
      };
      for (const corpo of [
        { ...base, unidade: 'capitulos' },
        { ...base, janela: 'quinzenal' },
        { ...base, valorAlvo: 0 },
        { ...base, valorAlvo: 2.5 },
        { ...base, fusoHorario: 'Lua/Base' },
        { ...base, extra: true },
      ]) {
        await post(usuario, '/desafios', corpo).expect(400);
      }
      const res = await post(usuario, '/desafios', {
        ...base,
        unidade: 'livros',
        valorAlvo: 1001,
      }).expect(422);
      expect(res.body.campos).toEqual([
        {
          campo: 'valorAlvo',
          mensagem: 'Para livros, o alvo vai de 1 a 1.000.',
        },
      ]);
      await post(usuario, '/desafios', { ...base, valorAlvo: 100_000 }).expect(
        201,
      );
      expect(await contar(pool, 'leitura.desafio')).toBe(1);
    });

    it('repetir a chave devolve o mesmo desafio; outra carga com a chave é 409 (RNF-ERR-04)', async () => {
      const usuario = await leitor();
      const chave = randomUUID();
      const corpo = {
        unidade: 'minutos',
        janela: 'mensal',
        valorAlvo: 600,
        fusoHorario: SP,
      };
      const primeiro = await post(usuario, '/desafios', corpo, chave).expect(
        201,
      );
      const repetido = await post(usuario, '/desafios', corpo, chave).expect(
        201,
      );

      expect(repetido.body.id).toBe(primeiro.body.id);
      expect(await contar(pool, 'leitura.desafio')).toBe(1);
      await post(
        usuario,
        '/desafios',
        { ...corpo, valorAlvo: 601 },
        chave,
      ).expect(409);
    });

    it('desafio de outra pessoa não existe para quem pede (SEC-02)', async () => {
      const ana = await leitor();
      const bia = await leitor();
      const daAna = await criar(ana);

      await post(bia, `/desafios/${daAna.id}/pausar`).expect(404);
      await http()
        .patch(`/desafios/${daAna.id}`)
        .set('Authorization', `Bearer ${tokenDe(bia)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ valorAlvo: 1, fusoHorario: SP })
        .expect(404);
      await http()
        .delete(`/desafios/${daAna.id}`)
        .set('Authorization', `Bearer ${tokenDe(bia)}`)
        .set('Idempotency-Key', randomUUID())
        .expect(404);
      expect((await listar(bia)).itens).toEqual([]);
      expect((await listar(ana)).itens).toHaveLength(1);
    });

    it('id malformado no caminho é 400', async () => {
      const usuario = await leitor();
      await post(usuario, '/desafios/nao-e-uuid/pausar').expect(400);
    });

    it('excluir leva janelas, contribuições e pausas; repetir a chave é 204', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const criado = await criar(usuario);
      await post(usuario, `/desafios/${criado.id}/pausar`).expect(200);
      await post(usuario, `/desafios/${criado.id}/retomar`).expect(200);
      await progresso(usuario, leituraId, 10, new Date());
      await processar();
      expect(await contar(pool, 'leitura.contribuicao_desafio')).toBe(1);

      const chave = randomUUID();
      const excluir = () =>
        http()
          .delete(`/desafios/${criado.id}`)
          .set('Authorization', `Bearer ${tokenDe(usuario)}`)
          .set('Idempotency-Key', chave);
      await excluir().expect(204);
      await excluir().expect(204);

      expect((await listar(usuario)).itens).toEqual([]);
      for (const tabela of [
        'janela_desafio',
        'contribuicao_desafio',
        'pausa_desafio',
      ]) {
        expect(await contar(pool, `leitura.${tabela}`)).toBe(0);
      }
    });
  });

  describe('listagem (RF-DSF-03, RNF-DES-02)', () => {
    it('ativos por janela mais curta e mais novos primeiro; pausados no fim; paginada', async () => {
      const usuario = await leitor();
      const anual = await criar(usuario, { janela: 'anual' });
      const diaria = await criar(usuario, { janela: 'diaria' });
      const semanal = await criar(usuario, { janela: 'semanal' });
      const mensal = await criar(usuario, { janela: 'mensal' });
      const outraDiaria = await criar(usuario, { janela: 'diaria' });
      await post(usuario, `/desafios/${semanal.id}/pausar`).expect(200);

      const tudo = await listar(usuario);
      expect(tudo.itens.map((item) => item.id)).toEqual([
        outraDiaria.id,
        diaria.id,
        mensal.id,
        anual.id,
        semanal.id,
      ]);

      const pagina = await listar(usuario, '?page=2&limite=2');
      expect(pagina.itens.map((item) => item.id)).toEqual([
        mensal.id,
        anual.id,
      ]);
      expect(pagina.paginacao).toEqual({
        page: 2,
        limite: 2,
        totalItens: 5,
        totalPaginas: 3,
      });
    });

    it('limite acima do máximo é reduzido a 50', async () => {
      const usuario = await leitor();
      expect((await listar(usuario, '?limite=500')).paginacao.limite).toBe(50);
    });

    it('materializa os períodos decorridos, inclusive vazios, desde a criação (RN-20.9)', async () => {
      const usuario = await leitor();
      const id = await criadoHa(usuario, 3, 'diaria');

      const corrente = await desafio(usuario, id);
      expect(corrente.janelaCorrente).toMatchObject({
        inicio: hojeSp(),
        fim: hojeSp(),
        acumulado: 0,
      });
      const gravadas = await janelas(id);
      expect(gravadas.map((janela) => janela.inicio)).toEqual([
        dataLocal(diasAtras(3), SP),
        dataLocal(diasAtras(2), SP),
        dataLocal(diasAtras(1), SP),
        hojeSp(),
      ]);
      expect(gravadas.map((janela) => janela.encerrada)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });
  });

  describe('progresso e finalização (RF-DSF-02/06)', () => {
    it('um progresso alimenta todos os desafios compatíveis (RN-20.5)', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const diaria = await criar(usuario, { janela: 'diaria', valorAlvo: 20 });
      const semanal = await criar(usuario, {
        janela: 'semanal',
        valorAlvo: 100,
      });
      const minutos = await criar(usuario, {
        unidade: 'minutos',
        janela: 'diaria',
        valorAlvo: 30,
      });
      const livros = await criar(usuario, { unidade: 'livros', valorAlvo: 1 });

      await progresso(usuario, leituraId, 25, new Date(), 40);
      await processar();

      expect((await desafio(usuario, diaria.id)).janelaCorrente).toMatchObject({
        acumulado: 25,
        cumprida: true,
      });
      expect((await desafio(usuario, semanal.id)).janelaCorrente).toMatchObject(
        {
          acumulado: 25,
          cumprida: false,
        },
      );
      expect((await desafio(usuario, minutos.id)).janelaCorrente).toMatchObject(
        {
          acumulado: 40,
          cumprida: true,
        },
      );
      expect((await desafio(usuario, livros.id)).janelaCorrente.acumulado).toBe(
        0,
      );
    });

    it('minutos não informados não contam nem geram contribuição', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const minutos = await criar(usuario, { unidade: 'minutos' });

      await progresso(usuario, leituraId, 25, new Date());
      await processar();

      expect(
        (await desafio(usuario, minutos.id)).janelaCorrente.acumulado,
      ).toBe(0);
      expect(await contar(pool, 'leitura.contribuicao_desafio')).toBe(0);
    });

    it('criado no meio da janela, considera o já registrado nela (RN-20.2)', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const ano = hojeSp().slice(0, 4);
      // 1º de janeiro ao meio-dia de São Paulo: sempre no ano corrente.
      await progresso(
        usuario,
        leituraId,
        30,
        new Date(`${ano}-01-01T15:00:00.000Z`),
      );
      await progresso(usuario, leituraId, 50, new Date());
      await processar();

      const anual = await criar(usuario, { janela: 'anual', valorAlvo: 40 });
      expect(anual.janelaCorrente).toMatchObject({
        inicio: `${ano}-01-01`,
        fim: `${ano}-12-31`,
        acumulado: 50,
        cumprida: true,
      });
    });

    it('livros contam ao finalizar, no dia da ação, inclusive releitura e livro pessoal (RN-20.3/20.4)', async () => {
      const usuario = await leitor();
      const livros = await criar(usuario, {
        unidade: 'livros',
        janela: 'diaria',
        valorAlvo: 3,
      });

      const oficial = await inserirLivro(pool);
      const iniciada = await post(usuario, '/leituras', {
        livroId: oficial,
        dataInicio: dataLocal(diasAtras(5), SP),
      }).expect(201);
      // Data de fim editada para ontem: conta hoje, o dia da ação.
      await finalizar(
        usuario,
        (iniciada.body as { id: string }).id,
        dataLocal(diasAtras(1), SP),
      );
      const releitura = await post(usuario, '/releituras', {
        livroId: oficial,
      }).expect(201);
      await finalizar(usuario, (releitura.body as { id: string }).id);
      const pessoal = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
      });
      await finalizar(usuario, await iniciarLeitura(usuario, pessoal));
      await processar();

      expect((await desafio(usuario, livros.id)).janelaCorrente).toMatchObject({
        acumulado: 3,
        cumprida: true,
      });
    });

    it('abandonada e releitura incompleta não contam como livro (RN-04)', async () => {
      const usuario = await leitor();
      const livros = await criar(usuario, { unidade: 'livros' });

      const abandonada = await iniciarLeitura(usuario);
      await post(usuario, `/leituras/${abandonada}/abandonar`).expect(200);

      const lido = await inserirLivro(pool);
      await finalizar(usuario, await iniciarLeitura(usuario, lido));
      const releitura = await post(usuario, '/releituras', {
        livroId: lido,
      }).expect(201);
      await post(
        usuario,
        `/leituras/${(releitura.body as { id: string }).id}/abandonar`,
      ).expect(200);
      await processar();

      expect((await desafio(usuario, livros.id)).janelaCorrente.acumulado).toBe(
        1,
      );
    });

    it('excluir trecho de progresso recalcula na mesma transação', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const diaria = await criar(usuario);
      await progresso(usuario, leituraId, 10, new Date());
      const ultimo = await progresso(usuario, leituraId, 30, new Date());
      await processar();
      expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
        30,
      );

      await http()
        .delete(`/progresso/${ultimo}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ ultimoProgressoIdConfirmado: ultimo })
        .expect(200);

      expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
        10,
      );
    });

    it('captura offline sincronizada depois corrige a janela encerrada com a configuração dela (RN-20.10)', async () => {
      const usuario = await leitor();
      const id = await criadoHa(usuario, 14, 'semanal', 'paginas', 10);
      await listar(usuario);
      // O alvo muda hoje: a semana corrente passa a 50; as encerradas, não.
      await http()
        .patch(`/desafios/${id}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ valorAlvo: 50, fusoHorario: SP })
        .expect(200);

      // Registro de 10 dias atrás (semana encerrada) chega agora.
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 15, diasAtras(10));
      await processar();

      const semanaDoRegistro = janelaQueContem(
        dataLocal(diasAtras(10), SP),
        'semanal',
      );
      const gravada = (await janelas(id)).find(
        (janela) => janela.inicio === semanaDoRegistro.inicio,
      );
      expect(gravada).toMatchObject({
        valor_alvo: 10,
        acumulado: 15,
        cumprida: true,
        encerrada: true,
      });
      const corrente = await desafio(usuario, id);
      expect(corrente.valorAlvo).toBe(50);
      expect(corrente.janelaCorrente.acumulado).toBe(0);
    });

    it('mensagem atrasada de progresso já excluído não o ressuscita', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const diaria = await criar(usuario);
      const unico = await progresso(usuario, leituraId, 10, new Date());
      await http()
        .delete(`/progresso/${unico}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ ultimoProgressoIdConfirmado: unico })
        .expect(200);
      await processar();

      expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
        0,
      );
    });
  });

  describe('pausa (RN-20.6)', () => {
    it('pausar e retomar mostram o estado; repetir o estado é 409', async () => {
      const usuario = await leitor();
      const criado = await criar(usuario);

      const pausado = await post(
        usuario,
        `/desafios/${criado.id}/pausar`,
      ).expect(200);
      expect(pausado.body).toMatchObject({ pausado: true });
      expect(pausado.body.pausadoDesde).toEqual(expect.any(String));
      await post(usuario, `/desafios/${criado.id}/pausar`).expect(409);

      const retomado = await post(
        usuario,
        `/desafios/${criado.id}/retomar`,
      ).expect(200);
      expect(retomado.body).toMatchObject({
        pausado: false,
        pausadoDesde: null,
      });
      await post(usuario, `/desafios/${criado.id}/retomar`).expect(409);
    });

    it('fatos ocorridos durante as pausas não contam, mesmo sincronizados depois; o resto conta', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const criado = await criar(usuario, { valorAlvo: 1000 });
      const outro = await criar(usuario, { valorAlvo: 1000 });

      await progresso(usuario, leituraId, 10, new Date()); // conta: 10
      await esperar(15);
      await post(usuario, `/desafios/${criado.id}/pausar`).expect(200);
      await esperar(15);
      const naPrimeiraPausa = new Date();
      await esperar(15);
      await post(usuario, `/desafios/${criado.id}/retomar`).expect(200);
      await esperar(15);
      await progresso(usuario, leituraId, 15, new Date()); // conta: 5
      await esperar(15);
      await post(usuario, `/desafios/${criado.id}/pausar`).expect(200);
      await esperar(15);
      await progresso(usuario, leituraId, 115, new Date()); // pausado: 100
      await esperar(15);
      await post(usuario, `/desafios/${criado.id}/retomar`).expect(200);
      // Capturado offline na primeira pausa, chega depois da retomada.
      const outraLeitura = await iniciarLeitura(usuario);
      await progresso(usuario, outraLeitura, 7, naPrimeiraPausa);
      await processar();

      expect((await desafio(usuario, criado.id)).janelaCorrente.acumulado).toBe(
        15,
      );
      // Desafio nunca pausado recebe tudo.
      expect((await desafio(usuario, outro.id)).janelaCorrente.acumulado).toBe(
        122,
      );
      expect(
        await contar(pool, 'leitura.pausa_desafio', 'desafio_id = $1', [
          criado.id,
        ]),
      ).toBe(2);
    });

    it('livro finalizado durante a pausa não conta', async () => {
      const usuario = await leitor();
      const livros = await criar(usuario, { unidade: 'livros' });
      await post(usuario, `/desafios/${livros.id}/pausar`).expect(200);
      await finalizar(usuario, await iniciarLeitura(usuario));
      await processar();

      expect((await desafio(usuario, livros.id)).janelaCorrente.acumulado).toBe(
        0,
      );
    });
  });

  describe('edição (RN-20.7)', () => {
    function editar(usuario: string, id: string, corpo: object) {
      return http()
        .patch(`/desafios/${id}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ fusoHorario: SP, ...corpo });
    }

    it('semanal para mensal preserva as semanas encerradas e recalcula o mês', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const id = await criadoHa(usuario, 20, 'semanal', 'paginas', 10);
      const instantes = [diasAtras(16), diasAtras(9), diasAtras(0)];
      let pagina = 0;
      for (const instante of instantes) {
        pagina += 12;
        await progresso(usuario, leituraId, pagina, instante);
      }
      await processar();
      const antes = (await janelas(id)).filter((janela) => janela.encerrada);

      const res = await editar(usuario, id, {
        janela: 'mensal',
        valorAlvo: 30,
      }).expect(200);

      const mes = janelaQueContem(hojeSp(), 'mensal');
      const noMes = instantes.filter(
        (instante) => dataLocal(instante, SP) >= mes.inicio,
      ).length;
      expect(res.body).toMatchObject({
        janela: 'mensal',
        valorAlvo: 30,
        janelaCorrente: {
          ...mes,
          acumulado: 12 * noMes,
          cumprida: 12 * noMes >= 30,
        },
      });
      const depois = await janelas(id);
      expect(depois.filter((janela) => janela.encerrada)).toEqual(antes);
      expect(
        depois.filter((janela) => janela.periodicidade === 'semanal'),
      ).toEqual(antes);
      expect(antes.every((janela) => janela.valor_alvo === 10)).toBe(true);
      // Um fato na semana encerrada e no mês contribui às duas janelas.
      expect(await contar(pool, 'leitura.contribuicao_desafio')).toBe(
        antes.filter((janela) => janela.acumulado > 0).length + noMes,
      );
    });

    it('trocar a unidade só vale da janela corrente em diante', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      const id = await criadoHa(usuario, 1, 'diaria', 'paginas', 10);
      await progresso(usuario, leituraId, 20, diasAtras(1), 30);
      await progresso(usuario, leituraId, 40, new Date(), 45);
      await processar();

      const res = await editar(usuario, id, { unidade: 'minutos' }).expect(200);

      expect(res.body.janelaCorrente).toMatchObject({
        acumulado: 45,
        cumprida: true,
      });
      const [ontem] = await janelas(id);
      expect(ontem).toMatchObject({ unidade: 'paginas', acumulado: 20 });
    });

    it('teto do alvo segue a unidade nova; sem mudança, nada muda', async () => {
      const usuario = await leitor();
      const criado = await criar(usuario, { valorAlvo: 5000 });

      await editar(usuario, criado.id, { unidade: 'livros' }).expect(422);
      const igual = await editar(usuario, criado.id, {}).expect(200);
      expect(igual.body).toEqual(criado);
    });

    it('editar desafio pausado mantém a pausa', async () => {
      const usuario = await leitor();
      const criado = await criar(usuario);
      await post(usuario, `/desafios/${criado.id}/pausar`).expect(200);

      const res = await editar(usuario, criado.id, { valorAlvo: 99 }).expect(
        200,
      );
      expect(res.body).toMatchObject({ pausado: true, valorAlvo: 99 });
    });

    // UTC+14 e UTC−11: sempre em dias diferentes, seja qual for a hora.
    const ADIANTADO = 'Pacific/Kiritimati';
    const ATRASADO = 'Pacific/Pago_Pago';

    it('fuso para trás: a corrente é o hoje do fuso novo, com o alvo novo', async () => {
      const usuario = await leitor();
      const id = await criadoHa(usuario, 3, 'diaria', 'paginas', 20, ADIANTADO);
      // Materializa no fuso antigo: o hoje do fuso atrasado já está encerrado.
      await listar(usuario);

      const res = await editar(usuario, id, {
        fusoHorario: ATRASADO,
        valorAlvo: 30,
      }).expect(200);

      const hojeAtrasado = dataLocal(new Date(), ATRASADO);
      expect(res.body).toMatchObject({
        fusoHorario: ATRASADO,
        valorAlvo: 30,
        janelaCorrente: { inicio: hojeAtrasado, fim: hojeAtrasado },
      });
      const depois = await janelas(id);
      expect(depois.at(-1)).toMatchObject({
        inicio: hojeAtrasado,
        valor_alvo: 30,
        encerrada: false,
      });
      const anteriores = depois.slice(0, -1);
      expect(anteriores.length).toBeGreaterThan(0);
      expect(
        anteriores.every(
          (janela) => janela.encerrada && janela.valor_alvo === 20,
        ),
      ).toBe(true);
    });

    it('fuso para a frente: o dia do fuso antigo fica com o alvo antigo', async () => {
      const usuario = await leitor();
      const criado = await criar(usuario, { fusoHorario: ATRASADO });
      const hojeAtrasado = dataLocal(new Date(), ATRASADO);

      const res = await editar(usuario, criado.id, {
        fusoHorario: ADIANTADO,
        valorAlvo: 30,
      }).expect(200);

      const hojeAdiantado = dataLocal(new Date(), ADIANTADO);
      expect(res.body.janelaCorrente).toMatchObject({
        inicio: hojeAdiantado,
        fim: hojeAdiantado,
      });
      expect(await janelas(criado.id)).toEqual([
        expect.objectContaining({
          inicio: hojeAtrasado,
          valor_alvo: 20,
          encerrada: true,
        }),
        expect.objectContaining({
          inicio: hojeAdiantado,
          valor_alvo: 30,
          encerrada: false,
        }),
      ]);
    });
  });

  it('backfill recompõe quem tinha fatos antes do consumidor', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    const diaria = await criar(usuario);
    const livros = await criar(usuario, { unidade: 'livros' });
    await progresso(usuario, leituraId, 10, new Date());
    await finalizar(usuario, leituraId);
    // Nenhuma entrega: os eventos se perderam sem fila acumuladora.
    expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
      0,
    );

    const servico = app.get(DesafiosService);
    expect(await servico.recalcularTodos()).toBe(1);
    expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
      10,
    );
    expect((await desafio(usuario, livros.id)).janelaCorrente.acumulado).toBe(
      1,
    );
    await servico.recalcularTodos();
    expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
      10,
    );
    expect(await contar(pool, 'leitura.contribuicao_desafio')).toBe(2);
  });

  describe('consumo (RNF-ERR-06/07, RNF-TST-03)', () => {
    function publicar(tipo: string, data: Record<string, unknown>) {
      const envelope = {
        eventId: randomUUID(),
        type: tipo,
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: randomUUID(),
        businessKey: `teste:${randomUUID()}`,
        data,
      };
      broker.canal.publish(
        EXCHANGES.leitura,
        tipo,
        Buffer.from(JSON.stringify(envelope), 'utf8'),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: envelope.eventId,
          correlationId: envelope.correlationId,
          type: envelope.type,
          headers: {
            'x-event-version': 1,
            'x-business-key': envelope.businessKey,
          },
        },
        () => undefined,
      );
    }

    it('leitura.finalizada chega pela fila de métricas', async () => {
      const usuario = await leitor();
      const livros = await criar(usuario, { unidade: 'livros' });
      await finalizar(usuario, await iniciarLeitura(usuario));
      await despachante.dispatchOnce();

      expect(
        (broker.filas.get(FILA) ?? []).map((m) => m.fields.routingKey),
      ).toContain('leitura.finalizada');
      await broker.entregar(FILA);
      expect(broker.nacks).toHaveLength(0);
      expect((await desafio(usuario, livros.id)).janelaCorrente.acumulado).toBe(
        1,
      );
    });

    it('reentrega do mesmo eventId não repete efeito', async () => {
      const usuario = await leitor();
      const diaria = await criar(usuario);
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, new Date());
      await despachante.dispatchOnce();
      const [mensagem] = broker.filas.get(FILA) ?? [];

      await broker.entregar(FILA);
      await broker.reentregar(FILA, mensagem);

      expect(
        await contar(pool, 'leitura.mensagem_processada', 'consumidor = $1', [
          'leitura.metricas',
        ]),
      ).toBe(1);
      expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
        10,
      );
    });

    it('falha transitória é retentada e o efeito acontece uma vez', async () => {
      const usuario = await leitor();
      const diaria = await criar(usuario);
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, new Date());
      falhasForcadas = 2;

      await processar();

      expect(broker.acks).toHaveLength(1);
      expect(broker.nacks).toHaveLength(0);
      expect((await desafio(usuario, diaria.id)).janelaCorrente.acumulado).toBe(
        10,
      );
    });

    it('falha persistente vai para a DLQ sem recibo', async () => {
      const usuario = await leitor();
      await criar(usuario);
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, new Date());
      falhasForcadas = 99;

      await processar();

      expect(broker.nacks).toHaveLength(1);
      expect(await contar(pool, 'leitura.mensagem_processada')).toBe(0);
      expect(await contar(pool, 'leitura.contribuicao_desafio')).toBe(0);
    });

    it('leitura.finalizada fora do schema vai para a DLQ sem efeito', async () => {
      const usuario = await leitor();
      await criar(usuario, { unidade: 'livros' });
      publicar('leitura.finalizada', { usuarioId: usuario });

      await broker.entregar(FILA);

      expect(broker.nacks).toHaveLength(1);
      expect(await contar(pool, 'leitura.mensagem_processada')).toBe(0);
    });
  });
});

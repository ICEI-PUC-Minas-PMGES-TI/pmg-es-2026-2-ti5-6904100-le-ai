import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import {
  incluirEmLista,
  inserirLivro,
  inserirPerfil,
  publicarNoFeed,
  seguir,
} from './massa';

interface LinhaDaOutbox {
  chave_negocio: string;
  payload: Record<string, unknown>;
}

/**
 * Curtir e descurtir resenha (F-AVA-2, RF-AVA-05/08): `PUT`/`DELETE /resenhas/{id}/reacao`
 * contra Postgres real. Uma reação por leitor e resenha, acesso revalidado (RN-08 no livro
 * oficial, as duas vias de RN-15 no pessoal) e `resenha.curtida` só na primeira curtida.
 */
describe('reações à resenha (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let autora: string;
  let leitora: string;

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
    autora = novoUsuario();
    leitora = novoUsuario();
    await inserirPerfil(pool, {
      id: autora,
      username: 'autora',
      nomeExibicao: 'Autora da Resenha',
    });
    await inserirPerfil(pool, {
      id: leitora,
      username: 'leitora',
      nomeExibicao: 'Leitora que Reage',
      avatarUrl: 'https://res.cloudinary.com/leai/image/upload/avatares/b.jpg',
    });
  });

  const http = (servidor = app) => request(servidor.getHttpServer());

  const reagir = (
    resenhaId: string,
    corpo: Record<string, unknown>,
    opcoes: {
      chave?: string;
      quem?: string;
      servidor?: NestExpressApplication;
    } = {},
  ) =>
    http(opcoes.servidor)
      .put(`/resenhas/${resenhaId}/reacao`)
      .set('Authorization', `Bearer ${tokenDe(opcoes.quem ?? leitora)}`)
      .set('Idempotency-Key', opcoes.chave ?? randomUUID())
      .send(corpo);

  const retirar = (
    resenhaId: string,
    query = '',
    opcoes: { chave?: string; quem?: string } = {},
  ) =>
    http()
      .delete(`/resenhas/${resenhaId}/reacao${query}`)
      .set('Authorization', `Bearer ${tokenDe(opcoes.quem ?? leitora)}`)
      .set('Idempotency-Key', opcoes.chave ?? randomUUID());

  async function resenhar(livroId: string, quem = autora): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.resenha (usuario_id, livro_id, texto)
       VALUES ($1, $2, 'Um livro que fica.') RETURNING id`,
      [quem, livroId],
    );
    return rows[0].id;
  }

  const curtidasPublicadas = async (): Promise<LinhaDaOutbox[]> => {
    const { rows } = await pool.query<LinhaDaOutbox>(
      `SELECT chave_negocio, payload FROM leitura.outbox_leitura
        WHERE tipo = 'resenha.curtida' ORDER BY criado_em, event_id`,
    );
    return rows;
  };

  describe('reagir em livro oficial', () => {
    it('curtir responde o estado e publica resenha.curtida para a autora', async () => {
      const livroId = await inserirLivro(pool, { autor: null });
      const resenhaId = await resenhar(livroId);

      const resposta = await reagir(resenhaId, { tipo: 'curtida' });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        minhaReacao: 'curtida',
        curtidas: 1,
        descurtidas: 0,
      });
      expect(await curtidasPublicadas()).toEqual([
        {
          chave_negocio: `resenha:${resenhaId}:curtida:${leitora}`,
          payload: {
            destinatarioId: autora,
            resenhaId,
            autorAcao: {
              id: leitora,
              username: 'leitora',
              displayName: 'Leitora que Reage',
              avatarUrl:
                'https://res.cloudinary.com/leai/image/upload/avatares/b.jpg',
            },
            livro: {
              id: livroId,
              tipo: 'oficial',
              titulo: 'Torto Arado',
              autor: null,
              capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
            },
          },
        },
      ]);
    });

    it('alternar e retirar não publicam, e as contagens só veem reações ativas', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));
      const outra = novoUsuario();
      await inserirPerfil(pool, { id: outra });
      await reagir(resenhaId, { tipo: 'curtida' }, { quem: outra });
      await reagir(resenhaId, { tipo: 'curtida' });

      const descurtida = await reagir(resenhaId, { tipo: 'descurtida' });
      expect(descurtida.body).toEqual({
        minhaReacao: 'descurtida',
        curtidas: 1,
        descurtidas: 1,
      });

      const retirada = await retirar(resenhaId);
      expect(retirada.status).toBe(200);
      expect(retirada.body).toEqual({
        minhaReacao: null,
        curtidas: 1,
        descurtidas: 0,
      });
      expect(await curtidasPublicadas()).toHaveLength(2);
      expect(
        await contar(pool, 'leitura.reacao_resenha', 'resenha_id = $1', [
          resenhaId,
        ]),
      ).toBe(2);
    });

    it('retirar e recurtir não notifica de novo', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      await reagir(resenhaId, { tipo: 'curtida' });
      await retirar(resenhaId);
      const recurtida = await reagir(resenhaId, { tipo: 'curtida' });

      expect(recurtida.body.minhaReacao).toBe('curtida');
      expect(await curtidasPublicadas()).toHaveLength(1);
      const { rows } = await pool.query<{ primeira: Date | null }>(
        `SELECT primeira_curtida_em AS primeira FROM leitura.reacao_resenha
          WHERE resenha_id = $1`,
        [resenhaId],
      );
      expect(rows[0].primeira).not.toBeNull();
    });

    it('descurtir antes e curtir depois notifica uma vez, na primeira curtida', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      await reagir(resenhaId, { tipo: 'descurtida' });
      expect(await curtidasPublicadas()).toHaveLength(0);
      await reagir(resenhaId, { tipo: 'curtida' });
      await reagir(resenhaId, { tipo: 'descurtida' });
      await reagir(resenhaId, { tipo: 'curtida' });

      expect(await curtidasPublicadas()).toHaveLength(1);
    });

    it('repetir a mesma reação não grava nada novo', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      await reagir(resenhaId, { tipo: 'curtida' });
      const repetida = await reagir(resenhaId, { tipo: 'curtida' });

      expect(repetida.body).toEqual({
        minhaReacao: 'curtida',
        curtidas: 1,
        descurtidas: 0,
      });
      expect(await curtidasPublicadas()).toHaveLength(1);
    });

    it('duas curtidas simultâneas da mesma leitora, com chaves diferentes, notificam uma vez', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      const respostas = await Promise.all([
        reagir(resenhaId, { tipo: 'curtida' }),
        reagir(resenhaId, { tipo: 'curtida' }),
        reagir(resenhaId, { tipo: 'curtida' }),
      ]);

      expect(respostas.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(await curtidasPublicadas()).toHaveLength(1);
      expect(await contar(pool, 'leitura.reacao_resenha')).toBe(1);
    });

    it('tipo fora do contrato é 400', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      const resposta = await reagir(resenhaId, { tipo: 'amei' });

      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
    });
  });

  describe('quem pode reagir', () => {
    it('reagir à própria resenha é 422 REACAO_PROPRIA', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));

      const resposta = await reagir(
        resenhaId,
        { tipo: 'curtida' },
        { quem: autora },
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body.codigo).toBe('REACAO_PROPRIA');
      expect(await contar(pool, 'leitura.reacao_resenha')).toBe(0);
    });

    it('leitora fora da VIEW de perfil (suspensa ou em exclusão) recebe 403', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));
      const semPerfil = novoUsuario();

      const resposta = await reagir(
        resenhaId,
        { tipo: 'curtida' },
        { quem: semPerfil },
      );

      expect(resposta.status).toBe(403);
      expect(await contar(pool, 'leitura.reacao_resenha')).toBe(0);
    });

    it('resenha inexistente, livro inativo e autora fora da VIEW de perfil são 404', async () => {
      const inativo = await resenhar(
        await inserirLivro(pool, { ativo: false }),
      );
      const semAutora = novoUsuario();
      const daSumida = await resenhar(await inserirLivro(pool), semAutora);

      for (const resenhaId of [randomUUID(), inativo, daSumida]) {
        const resposta = await reagir(resenhaId, { tipo: 'curtida' });
        expect(resposta.status).toBe(404);
      }
    });

    it('autora privada: sem seguimento é 404 no PUT e no DELETE; com seguimento, reage', async () => {
      await pool.query(
        `UPDATE identidade.v_perfil_referencia_v1 SET privacidade = 'privado' WHERE id = $1`,
        [autora],
      );
      const resenhaId = await resenhar(await inserirLivro(pool));

      expect((await reagir(resenhaId, { tipo: 'curtida' })).status).toBe(404);
      expect((await retirar(resenhaId)).status).toBe(404);

      await seguir(pool, leitora, autora);
      expect((await reagir(resenhaId, { tipo: 'curtida' })).status).toBe(200);
    });

    it('quem perdeu o acesso não retira a reação, que continua contada', async () => {
      await pool.query(
        `UPDATE identidade.v_perfil_referencia_v1 SET privacidade = 'privado' WHERE id = $1`,
        [autora],
      );
      await seguir(pool, leitora, autora);
      const resenhaId = await resenhar(await inserirLivro(pool));
      await reagir(resenhaId, { tipo: 'curtida' });
      await pool.query('TRUNCATE identidade.v_seguimento_aceito_v1');

      const resposta = await retirar(resenhaId);

      expect(resposta.status).toBe(404);
      expect(await contar(pool, 'leitura.reacao_resenha', 'ativa')).toBe(1);
    });
  });

  describe('livro pessoal (RN-15)', () => {
    let livroPessoal: string;
    let resenhaId: string;

    beforeEach(async () => {
      livroPessoal = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: autora,
        titulo: 'Diário de Leituras',
        autor: 'Autora da Resenha',
      });
      resenhaId = await resenhar(livroPessoal);
    });

    it('sem via é 404, mesmo com o perfil público', async () => {
      const resposta = await reagir(resenhaId, { tipo: 'curtida' });

      expect(resposta.status).toBe(404);
    });

    it('pelo feed, quem segue reage e a notificação leva o livro pessoal', async () => {
      const atividadeId = await publicarNoFeed(pool, autora, livroPessoal);
      await seguir(pool, leitora, autora);

      const resposta = await reagir(resenhaId, {
        tipo: 'curtida',
        via: 'feed',
        referenciaId: atividadeId,
      });

      expect(resposta.status).toBe(200);
      const [evento] = await curtidasPublicadas();
      expect(evento.payload.livro).toMatchObject({
        id: livroPessoal,
        tipo: 'pessoal',
        titulo: 'Diário de Leituras',
      });
    });

    it('pelo feed, sem seguimento é 404 mesmo com o perfil público', async () => {
      const atividadeId = await publicarNoFeed(pool, autora, livroPessoal);

      const resposta = await reagir(resenhaId, {
        tipo: 'curtida',
        via: 'feed',
        referenciaId: atividadeId,
      });

      expect(resposta.status).toBe(404);
    });

    it('pelo feed, atividade de outro livro ou forjada é 404', async () => {
      await seguir(pool, leitora, autora);
      const outroLivro = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: autora,
      });
      const deOutroLivro = await publicarNoFeed(pool, autora, outroLivro);

      for (const referenciaId of [deOutroLivro, randomUUID()]) {
        const resposta = await reagir(resenhaId, {
          tipo: 'curtida',
          via: 'feed',
          referenciaId,
        });
        expect(resposta.status).toBe(404);
      }
    });

    it('pela lista, perfil público libera sem seguir', async () => {
      const listaId = await incluirEmLista(pool, autora, livroPessoal);

      const resposta = await reagir(resenhaId, {
        tipo: 'descurtida',
        via: 'lista',
        referenciaId: listaId,
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body.descurtidas).toBe(1);
    });

    it('pela lista, perfil privado exige seguimento', async () => {
      await pool.query(
        `UPDATE identidade.v_perfil_referencia_v1 SET privacidade = 'privado' WHERE id = $1`,
        [autora],
      );
      const listaId = await incluirEmLista(pool, autora, livroPessoal);
      const corpo = { tipo: 'curtida', via: 'lista', referenciaId: listaId };

      expect((await reagir(resenhaId, corpo)).status).toBe(404);
      await seguir(pool, leitora, autora);
      expect((await reagir(resenhaId, corpo)).status).toBe(200);
    });

    it('pela lista, lista de outro livro, excluída ou forjada é 404', async () => {
      const outroLivro = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: autora,
      });
      const deOutroLivro = await incluirEmLista(pool, autora, outroLivro);
      const excluida = await incluirEmLista(pool, autora, livroPessoal);
      await pool.query(
        'DELETE FROM social.v_lista_livro_pessoal_v1 WHERE lista_id = $1',
        [excluida],
      );

      for (const referenciaId of [deOutroLivro, excluida, randomUUID()]) {
        const resposta = await reagir(resenhaId, {
          tipo: 'curtida',
          via: 'lista',
          referenciaId,
        });
        expect(resposta.status).toBe(404);
      }
    });

    it('o DELETE também exige a via', async () => {
      const listaId = await incluirEmLista(pool, autora, livroPessoal);
      await reagir(resenhaId, {
        tipo: 'curtida',
        via: 'lista',
        referenciaId: listaId,
      });

      expect((await retirar(resenhaId)).status).toBe(404);
      const resposta = await retirar(
        resenhaId,
        `?via=lista&referenciaId=${listaId}`,
      );
      expect(resposta.status).toBe(200);
      expect(resposta.body.minhaReacao).toBeNull();
    });
  });

  describe('idempotência', () => {
    it('mesma chave e corpo reproduzem a resposta sem novo efeito', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));
      const chave = randomUUID();

      const primeira = await reagir(resenhaId, { tipo: 'curtida' }, { chave });
      const segunda = await reagir(resenhaId, { tipo: 'curtida' }, { chave });

      expect(segunda.status).toBe(200);
      expect(segunda.body).toEqual(primeira.body);
      expect(await curtidasPublicadas()).toHaveLength(1);
    });

    it('mesma chave com outro tipo é 409', async () => {
      const resenhaId = await resenhar(await inserirLivro(pool));
      const chave = randomUUID();

      await reagir(resenhaId, { tipo: 'curtida' }, { chave });
      const resposta = await reagir(
        resenhaId,
        { tipo: 'descurtida' },
        { chave },
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
    });
  });

  it('acima do limite por identidade responde 429 com Retry-After', async () => {
    // App próprio: o contador por IP é do guard da instância, e os outros testes o dividiriam.
    const isolado = await criarApp();
    try {
      const resenhaId = await resenhar(await inserirLivro(pool));
      let ultima: request.Response | undefined;
      for (let i = 0; i < 61; i += 1) {
        ultima = await reagir(
          resenhaId,
          { tipo: i % 2 === 0 ? 'curtida' : 'descurtida' },
          { servidor: isolado },
        );
      }

      expect(ultima?.status).toBe(429);
      expect(ultima?.headers['retry-after']).toBeDefined();
    } finally {
      await isolado.close();
    }
  });

  it('as contagens chegam ao perfil e à minha-avaliacao da autora', async () => {
    const livroId = await inserirLivro(pool);
    const resenhaId = await resenhar(livroId);
    await reagir(resenhaId, { tipo: 'descurtida' });

    const perfil = await http()
      .get(`/perfis/${autora}/resenhas`)
      .set('Authorization', `Bearer ${tokenDe(leitora)}`);
    expect(perfil.body.itens[0]).toMatchObject({
      id: resenhaId,
      curtidas: 0,
      descurtidas: 1,
      minhaReacao: 'descurtida',
    });

    const minha = await http()
      .get(`/livros/${livroId}/minha-avaliacao`)
      .set('Authorization', `Bearer ${tokenDe(autora)}`);
    expect(minha.body.resenha).toMatchObject({
      id: resenhaId,
      curtidas: 0,
      descurtidas: 1,
    });
  });

  // RNF-TST-03 até o envelope: o consumidor é a fila de notificações do `social`.
  it('resenha.curtida sai do despachante como envelope válido', async () => {
    const resenhaId = await resenhar(await inserirLivro(pool));
    await reagir(resenhaId, { tipo: 'curtida' });

    const broker = new BrokerEmMemoria();
    await broker.canal.assertQueue('fila.notificacoes');
    await broker.canal.bindQueue(
      'fila.notificacoes',
      EXCHANGES.leitura,
      'resenha.curtida',
    );
    const validador = app.get(MessageValidator);
    await new OutboxDispatcherService(
      app.get<DrizzleDB>(DRIZZLE),
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    ).dispatchOnce();

    const [mensagem] = broker.filas.get('fila.notificacoes') ?? [];
    const envelope = validador.parse(mensagem);
    expect(envelope.type).toBe('resenha.curtida');
    expect(envelope.businessKey).toBe(
      `resenha:${resenhaId}:curtida:${leitora}`,
    );
    expect(() =>
      validador.validarDados(envelope.type, envelope.version, envelope.data),
    ).not.toThrow();
  });
});

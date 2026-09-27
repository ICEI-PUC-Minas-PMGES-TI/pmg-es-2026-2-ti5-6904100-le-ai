import { drizzle } from 'drizzle-orm/node-postgres';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { SEED_LEITURA, semear } from '../../src/db/seed';
import { criarApp, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

const { usuarios, livros, leituras } = SEED_LEITURA;

describe('seed de leitura (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  async function semearContratosExternos(): Promise<void> {
    const paginas: Record<string, number> = {
      [livros.memoriasPostumas]: 288,
      [livros.domCasmurro]: 256,
      [livros.tortoArado]: 264,
      [livros.cadernoDeViagem]: 96,
      [livros.apostilaDeCalculo]: 140,
    };
    for (const [id, total] of Object.entries(paginas)) {
      const pessoal =
        id === livros.cadernoDeViagem || id === livros.apostilaDeCalculo;
      await inserirLivro(pool, {
        id,
        paginas: total,
        tipo: pessoal ? 'pessoal' : 'oficial',
        donoId: pessoal ? usuarios.dono : null,
      });
    }
    await inserirPerfil(pool, { id: usuarios.dono });
    await inserirPerfil(pool, { id: usuarios.seguidor });
  }

  const consultar = (usuarioId: string, caminho: string) =>
    request(app.getHttpServer())
      .get(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`);

  it('rodar duas vezes não duplica nada', async () => {
    await semear(drizzle(pool));
    await semear(drizzle(pool));

    expect(await contar(pool, 'leitura.estante')).toBe(6);
    expect(await contar(pool, 'leitura.leitura')).toBe(7);
    expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
  });

  it('a estante do dono tem um livro em cada estado', async () => {
    await semearContratosExternos();
    await semear(drizzle(pool));

    const resposta = await consultar(usuarios.dono, '/estante');

    expect(resposta.status).toBe(200);
    expect(resposta.body.totaisPorStatus).toEqual({
      QUERO_LER: 1,
      LENDO: 1,
      LIDO: 1,
      RELENDO: 1,
      ABANDONADO: 1,
    });
    const relendo = resposta.body.itens.find(
      (item: { livroId: string }) => item.livroId === livros.domCasmurro,
    );
    expect(relendo).toMatchObject({
      status: 'RELENDO',
      vezesLido: 1,
      leituraEmAndamentoId: leituras.relendoEmAndamento,
    });
  });

  it('primeira leitura abandonada é retomável; releitura incompleta não', async () => {
    await semearContratosExternos();
    await semear(drizzle(pool));

    const abandonada = await consultar(
      usuarios.dono,
      `/leituras/${leituras.abandonada}`,
    );
    expect(abandonada.status).toBe(200);
    expect(abandonada.body).toMatchObject({
      status: 'ABANDONADO',
      retomavel: true,
    });

    const incompleta = await consultar(
      usuarios.seguidor,
      `/leituras/${leituras.incompletaReleitura}`,
    );
    expect(incompleta.status).toBe(200);
    expect(incompleta.body).toMatchObject({
      status: 'LIDO',
      releitura: true,
      incompleta: true,
      retomavel: false,
      vezesLido: 1,
    });

    const conclusoes = await consultar(
      usuarios.seguidor,
      `/livros/${livros.memoriasPostumas}/conclusoes`,
    );
    expect(conclusoes.body).toEqual({
      livroId: livros.memoriasPostumas,
      vezesLido: 1,
    });
  });
});

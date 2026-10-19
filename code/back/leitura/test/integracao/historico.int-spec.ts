import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

const FUSO = 'America/Sao_Paulo';

interface Ocorrencia {
  leituraId: string;
  livro: { id: string; titulo: string; autor: string | null };
  dataInicio: string;
  dataFim: string;
  releitura: boolean;
  duracaoDias: number;
}

interface PaginaHistorico {
  itens: Ocorrencia[];
  paginacao: {
    page: number;
    limite: number;
    totalItens: number;
    totalPaginas: number;
  };
  anos: { ano: number; total: number }[];
  totais: { livros: number; leituras: number };
}

describe('histórico de leituras (integração)', () => {
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

  async function leitora(): Promise<string> {
    const id = novoUsuario();
    await inserirPerfil(pool, { id });
    return id;
  }

  function post(usuarioId: string, caminho: string, corpo?: object) {
    const req = request(app.getHttpServer())
      .post(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`)
      .set('Idempotency-Key', randomUUID());
    return corpo ? req.send(corpo) : req;
  }

  function get(usuarioId: string, caminho: string) {
    return request(app.getHttpServer())
      .get(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`);
  }

  async function concluir(
    usuarioId: string,
    livroId: string,
    dataInicio: string,
    dataFim: string,
    caminho: '/leituras' | '/releituras' = '/leituras',
  ): Promise<string> {
    const iniciada = await post(usuarioId, caminho, {
      livroId,
      dataInicio,
    }).expect(201);
    const leituraId = (iniciada.body as { id: string }).id;
    await post(usuarioId, `/leituras/${leituraId}/finalizar`, {
      dataFim,
      fusoHorarioDispositivo: FUSO,
    }).expect(200);
    return leituraId;
  }

  async function historico(
    usuarioId: string,
    consulta = '',
  ): Promise<PaginaHistorico> {
    const res = await get(usuarioId, `/me/historico${consulta}`).expect(200);
    return res.body as PaginaHistorico;
  }

  it('conta só leituras finalizadas, uma ocorrência por conclusão, da mais recente', async () => {
    const usuario = await leitora();
    const torto = await inserirLivro(pool, { titulo: 'Torto Arado' });
    const abandonado = await inserirLivro(pool, { titulo: 'Abandonado' });

    const primeira = await concluir(usuario, torto, '2026-01-02', '2026-01-10');
    const segunda = await concluir(
      usuario,
      torto,
      '2026-02-01',
      '2026-02-05',
      '/releituras',
    );
    const incompleta = await post(usuario, '/releituras', {
      livroId: torto,
      dataInicio: '2026-03-01',
    }).expect(201);
    await post(
      usuario,
      `/leituras/${(incompleta.body as { id: string }).id}/abandonar`,
    ).expect(200);
    const parada = await post(usuario, '/leituras', {
      livroId: abandonado,
    }).expect(201);
    await post(
      usuario,
      `/leituras/${(parada.body as { id: string }).id}/abandonar`,
    ).expect(200);

    const pagina = await historico(usuario);

    expect(pagina.itens.map((item) => item.leituraId)).toEqual([
      segunda,
      primeira,
    ]);
    expect(pagina.itens[0]).toMatchObject({
      livro: { id: torto, titulo: 'Torto Arado' },
      dataInicio: '2026-02-01',
      dataFim: '2026-02-05',
      releitura: true,
      duracaoDias: 5,
    });
    expect(pagina.itens[1].releitura).toBe(false);
    expect(pagina.anos).toEqual([{ ano: 2026, total: 2 }]);
    expect(pagina.totais).toEqual({ livros: 1, leituras: 2 });
  });

  it('agrupa por ano da data de fim e filtra por ano', async () => {
    const usuario = await leitora();
    const livro = await inserirLivro(pool);
    const outro = await inserirLivro(pool, { titulo: 'Outro Livro' });
    await concluir(usuario, livro, '2024-12-20', '2025-01-03');
    await concluir(usuario, outro, '2026-05-01', '2026-05-02');

    const todos = await historico(usuario);
    expect(todos.anos).toEqual([
      { ano: 2026, total: 1 },
      { ano: 2025, total: 1 },
    ]);

    const de2025 = await historico(usuario, '?ano=2025');
    expect(de2025.itens).toHaveLength(1);
    expect(de2025.itens[0]).toMatchObject({
      livro: { id: livro },
      duracaoDias: 15,
    });
    expect(de2025.anos).toEqual(todos.anos);
    expect(de2025.totais).toEqual({ livros: 1, leituras: 1 });
  });

  it('pesquisa título ou autor em todos os anos e combina com o ano', async () => {
    const usuario = await leitora();
    const torto = await inserirLivro(pool, {
      titulo: 'Torto Arado',
      autor: 'Itamar Vieira Junior',
    });
    const outro = await inserirLivro(pool, {
      titulo: 'Olhos d’água',
      autor: 'Conceição Evaristo',
    });
    await concluir(usuario, torto, '2024-01-01', '2024-01-20');
    await concluir(usuario, torto, '2026-01-01', '2026-01-20', '/releituras');
    await concluir(usuario, outro, '2026-02-01', '2026-02-10');

    const porTitulo = await historico(usuario, '?q=torto');
    expect(porTitulo.itens.map((item) => item.dataFim)).toEqual([
      '2026-01-20',
      '2024-01-20',
    ]);
    expect(porTitulo.totais).toEqual({ livros: 1, leituras: 2 });

    const porAutor = await historico(usuario, '?q=EVARISTO');
    expect(porAutor.itens.map((item) => item.livro.id)).toEqual([outro]);

    const comAno = await historico(usuario, '?q=torto&ano=2024');
    expect(comAno.itens.map((item) => item.dataFim)).toEqual(['2024-01-20']);

    const curinga = await historico(usuario, '?q=%25');
    expect(curinga.itens).toEqual([]);
  });

  it('pagina com teto do servidor', async () => {
    const usuario = await leitora();
    for (let dia = 1; dia <= 3; dia++) {
      const livro = await inserirLivro(pool, { titulo: `Livro ${dia}` });
      await concluir(usuario, livro, `2026-03-0${dia}`, `2026-03-0${dia}`);
    }

    const primeira = await historico(usuario, '?limite=2');
    expect(primeira.itens).toHaveLength(2);
    expect(primeira.paginacao).toEqual({
      page: 1,
      limite: 2,
      totalItens: 3,
      totalPaginas: 2,
    });
    const segunda = await historico(usuario, '?limite=2&page=2');
    expect(segunda.itens).toHaveLength(1);

    await get(usuario, '/me/historico?limite=51').expect(400);
  });

  it('não mostra leituras de outra pessoa', async () => {
    const dona = await leitora();
    const outra = await leitora();
    const livro = await inserirLivro(pool);
    await concluir(dona, livro, '2026-01-01', '2026-01-02');

    const pagina = await historico(outra);
    expect(pagina.itens).toEqual([]);
    expect(pagina.anos).toEqual([]);
    expect(pagina.totais).toEqual({ livros: 0, leituras: 0 });
  });

  describe('atualizações de uma ocorrência finalizada', () => {
    it('o dono consulta em modo somente leitura e não registra nem exclui', async () => {
      const usuario = await leitora();
      const livro = await inserirLivro(pool, { paginas: 100 });
      const iniciada = await post(usuario, '/leituras', {
        livroId: livro,
        dataInicio: '2026-01-01',
      }).expect(201);
      const leituraId = (iniciada.body as { id: string }).id;
      const registro = await post(usuario, `/leituras/${leituraId}/progresso`, {
        pagina: 40,
        minutos: 20,
        registradoEmDispositivo: '2026-01-02T12:00:00.000Z',
        fusoHorarioDispositivo: FUSO,
      }).expect(201);
      const progressoId = (registro.body as { progresso: { id: string } })
        .progresso.id;
      await post(usuario, `/leituras/${leituraId}/finalizar`, {
        dataFim: '2026-01-05',
        fusoHorarioDispositivo: FUSO,
      }).expect(200);

      const consulta = await get(
        usuario,
        `/leituras/${leituraId}/progresso`,
      ).expect(200);
      expect(consulta.body).toMatchObject({ somenteLeitura: true });
      expect((consulta.body as { itens: unknown[] }).itens).toHaveLength(1);

      await post(usuario, `/leituras/${leituraId}/progresso`, {
        pagina: 60,
        minutos: 10,
        registradoEmDispositivo: '2026-01-06T12:00:00.000Z',
        fusoHorarioDispositivo: FUSO,
      }).expect(409);
      await request(app.getHttpServer())
        .delete(`/progresso/${progressoId}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ ultimoProgressoIdConfirmado: progressoId })
        .expect(409);
    });

    it('nega a ocorrência finalizada de outra pessoa', async () => {
      const dona = await leitora();
      const outra = await leitora();
      const livro = await inserirLivro(pool);
      const leituraId = await concluir(dona, livro, '2026-01-01', '2026-01-02');

      await get(outra, `/leituras/${leituraId}/progresso`).expect(404);
    });
  });
});

import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { als } from '../../src/common/als';
import {
  ChaveIdempotenciaConflitante,
  LivroNaoEncontrado,
  LivroPessoalDeTerceiro,
  ServicoIndisponivel,
} from '../../src/common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../src/common/idempotencia/idempotencia.constantes';
import { IdempotenciaService } from '../../src/common/idempotencia/idempotencia.service';
import { estante } from '../../src/db/schema';
import type { Tx } from '../../src/db/tipos';
import {
  EVENTO_VERSAO_V1,
  type EventoOutbox,
  TIPO_EVENTO,
} from '../../src/leituras/dominio/eventos';
import { OutboxRepository } from '../../src/outbox/outbox.repository';
import { ReferenciasExternas } from '../../src/referencias/referencias-externas.service';
import { criarApp, novoUsuario } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil, seguir } from './massa';

describe('fundação de F-EST (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let idempotencia: IdempotenciaService;
  let outbox: OutboxRepository;
  let referencias: ReferenciasExternas;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
    idempotencia = app.get(IdempotenciaService);
    outbox = app.get(OutboxRepository);
    referencias = app.get(ReferenciasExternas);
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  function adicionarNaEstante(usuarioId: string, livroId: string) {
    return async (tx: Tx) => {
      const [linha] = await tx
        .insert(estante)
        .values({ usuarioId, livroId, status: 'quero_ler' })
        .returning({ id: estante.id });
      return { status: 201, corpo: { estanteId: linha.id } };
    };
  }

  describe('IdempotenciaService', () => {
    const operacao = operacaoNoCaminho(OPERACOES.ADICIONAR_LIVRO_ESTANTE);

    it('mesma chave e mesmo payload reproduzem status e corpo sem repetir o efeito', async () => {
      const usuario = novoUsuario();
      const livroId = randomUUID();
      const contexto = {
        subjectRef: usuario,
        operacao,
        chave: randomUUID(),
        payload: { livroId },
      };

      const primeira = await idempotencia.executar(
        contexto,
        adicionarNaEstante(usuario, livroId),
      );
      const repeticao = await idempotencia.executar(
        contexto,
        adicionarNaEstante(usuario, livroId),
      );

      expect(repeticao).toEqual(primeira);
      expect(primeira.status).toBe(201);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(1);
    });

    it('mesma chave com payload diferente responde 409 sem efeito', async () => {
      const usuario = novoUsuario();
      const chave = randomUUID();
      const livroA = randomUUID();
      await idempotencia.executar(
        { subjectRef: usuario, operacao, chave, payload: { livroId: livroA } },
        adicionarNaEstante(usuario, livroA),
      );

      const livroB = randomUUID();
      await expect(
        idempotencia.executar(
          {
            subjectRef: usuario,
            operacao,
            chave,
            payload: { livroId: livroB },
          },
          adicionarNaEstante(usuario, livroB),
        ),
      ).rejects.toBeInstanceOf(ChaveIdempotenciaConflitante);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });

    it('isola a chave por ator e por caminho canônico', async () => {
      const chave = randomUUID();
      const livroId = randomUUID();
      const [ana, bia] = [novoUsuario(), novoUsuario()];

      await idempotencia.executar(
        { subjectRef: ana, operacao, chave, payload: { livroId } },
        adicionarNaEstante(ana, livroId),
      );
      await idempotencia.executar(
        { subjectRef: bia, operacao, chave, payload: { livroId } },
        adicionarNaEstante(bia, livroId),
      );
      const outroLivro = randomUUID();
      await idempotencia.executar(
        {
          subjectRef: ana,
          operacao: operacaoNoCaminho(OPERACOES.REMOVER_LIVRO_ESTANTE),
          chave,
          payload: { livroId: outroLivro },
        },
        adicionarNaEstante(ana, outroLivro),
      );

      expect(await contar(pool, 'leitura.estante')).toBe(3);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(3);
    });

    it('requisições concorrentes com a mesma chave produzem um único efeito', async () => {
      const usuario = novoUsuario();
      const livroId = randomUUID();
      const contexto = {
        subjectRef: usuario,
        operacao,
        chave: randomUUID(),
        payload: { livroId },
      };
      const efeito = async (tx: Tx) => {
        const [linha] = await tx
          .insert(estante)
          .values({
            usuarioId: usuario,
            livroId: randomUUID(),
            status: 'quero_ler',
          })
          .returning({ id: estante.id });
        return { status: 201, corpo: { estanteId: linha.id } };
      };

      const [a, b] = await Promise.all([
        idempotencia.executar(contexto, efeito),
        idempotencia.executar(contexto, efeito),
      ]);

      expect(a).toEqual(b);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(1);
    });

    it('falha no efeito não grava recibo, e a repetição executa de novo', async () => {
      const usuario = novoUsuario();
      const livroId = randomUUID();
      const contexto = {
        subjectRef: usuario,
        operacao,
        chave: randomUUID(),
        payload: { livroId },
      };

      await expect(
        idempotencia.executar(contexto, () =>
          Promise.reject(new Error('efeito falhou')),
        ),
      ).rejects.toThrow('efeito falhou');
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(0);

      const resposta = await idempotencia.executar(
        contexto,
        adicionarNaEstante(usuario, livroId),
      );
      expect(resposta.status).toBe(201);
    });
  });

  describe('OutboxRepository', () => {
    const evento = (
      usuarioId: string,
      livroId: string,
    ): EventoOutbox<unknown> => ({
      eventId: randomUUID(),
      tipo: TIPO_EVENTO.LIVRO_ADICIONADO_A_ESTANTE,
      versao: EVENTO_VERSAO_V1,
      chaveNegocio: `estante:${usuarioId}:${livroId}`,
      payload: { usuarioId, livroId },
    });

    it('grava o evento pendente na transação da escrita, com o correlation-id', async () => {
      const correlationId = randomUUID();
      const usuario = novoUsuario();
      const livroId = randomUUID();
      const gravado = evento(usuario, livroId);

      await als.run({ correlationId }, () =>
        idempotencia.executar(
          {
            subjectRef: usuario,
            operacao: operacaoNoCaminho(OPERACOES.ADICIONAR_LIVRO_ESTANTE),
            chave: randomUUID(),
            payload: { livroId },
          },
          async (tx) => {
            await outbox.inserir(tx, gravado);
            return adicionarNaEstante(usuario, livroId)(tx);
          },
        ),
      );

      const { rows } = await pool.query(
        `SELECT tipo, versao, chave_negocio, correlation_id, payload, status
           FROM leitura.outbox_leitura WHERE event_id = $1`,
        [gravado.eventId],
      );
      expect(rows).toEqual([
        {
          tipo: 'livro.adicionado_a_estante',
          versao: 1,
          chave_negocio: `estante:${usuario}:${livroId}`,
          correlation_id: correlationId,
          payload: { usuarioId: usuario, livroId },
          status: 'pendente',
        },
      ]);
    });

    it('rollback da escrita desfaz também o evento', async () => {
      const usuario = novoUsuario();
      const livroId = randomUUID();

      await expect(
        als.run({ correlationId: randomUUID() }, () =>
          idempotencia.executar(
            {
              subjectRef: usuario,
              operacao: operacaoNoCaminho(OPERACOES.ADICIONAR_LIVRO_ESTANTE),
              chave: randomUUID(),
              payload: { livroId },
            },
            async (tx) => {
              await outbox.inserir(tx, evento(usuario, livroId));
              throw new Error('falha depois do evento');
            },
          ),
        ),
      ).rejects.toThrow('falha depois do evento');

      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });
  });

  describe('ReferenciasExternas', () => {
    it('monta o snapshot `livro` dos eventos a partir de v_livro_referencia_v1', async () => {
      const livroId = await inserirLivro(pool, {
        titulo: 'Dom Casmurro',
        autor: 'Machado de Assis',
        paginas: 256,
      });

      const livro = await referencias.buscarLivroAcessivel(
        livroId,
        novoUsuario(),
      );

      expect(livro).toEqual({
        id: livroId,
        tipo: 'oficial',
        donoId: null,
        paginas: 256,
        ativo: true,
        snapshot: {
          id: livroId,
          tipo: 'oficial',
          titulo: 'Dom Casmurro',
          autor: 'Machado de Assis',
          capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
      });
    });

    it('livro pessoal é acessível ao dono', async () => {
      const dono = novoUsuario();
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: dono,
      });

      await expect(
        referencias.buscarLivroAcessivel(livroId, dono),
      ).resolves.toMatchObject({ tipo: 'pessoal', donoId: dono });
    });

    it('recusa livro pessoal de terceiro (SEC-07)', async () => {
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: novoUsuario(),
      });

      await expect(
        referencias.buscarLivroAcessivel(livroId, novoUsuario()),
      ).rejects.toBeInstanceOf(LivroPessoalDeTerceiro);
    });

    it.each([
      ['inexistente', async () => randomUUID()],
      ['inativo', async () => inserirLivro(pool, { ativo: false })],
    ])('livro %s responde como não encontrado', async (_caso, criar) => {
      const livroId = await criar();
      await expect(
        referencias.buscarLivroAcessivel(livroId, novoUsuario()),
      ).rejects.toBeInstanceOf(LivroNaoEncontrado);
    });

    it('monta o snapshot `usuario` e a privacidade a partir de v_perfil_referencia_v1', async () => {
      const usuario = novoUsuario();
      await inserirPerfil(pool, { id: usuario, privacidade: 'privado' });

      expect(await referencias.buscarPerfil(usuario)).toEqual({
        privacidade: 'privado',
        snapshot: {
          id: usuario,
          username: `leitora_${usuario.slice(0, 8)}`,
          displayName: 'Leitora de Teste',
          avatarUrl: null,
        },
      });
    });

    it('perfil fora da VIEW volta null', async () => {
      expect(await referencias.buscarPerfil(novoUsuario())).toBeNull();
    });

    it('seguimento aceito tem direção', async () => {
      const [seguidor, seguido] = [novoUsuario(), novoUsuario()];
      await seguir(pool, seguidor, seguido);

      expect(await referencias.existeSeguimentoAceito(seguidor, seguido)).toBe(
        true,
      );
      expect(await referencias.existeSeguimentoAceito(seguido, seguidor)).toBe(
        false,
      );
    });

    it('VIEW de contrato ausente vira ServicoIndisponivel', async () => {
      await pool.query(
        'ALTER TABLE identidade.v_seguimento_aceito_v1 RENAME TO v_seguimento_fora',
      );
      try {
        await expect(
          referencias.existeSeguimentoAceito(novoUsuario(), novoUsuario()),
        ).rejects.toBeInstanceOf(ServicoIndisponivel);
      } finally {
        await pool.query(
          'ALTER TABLE identidade.v_seguimento_fora RENAME TO v_seguimento_aceito_v1',
        );
      }
    });
  });

  describe('autenticação', () => {
    it('/health continua público, sem token', async () => {
      const resposta = await request(app.getHttpServer()).get('/health');
      expect(resposta.status).toBe(200);
    });
  });
});

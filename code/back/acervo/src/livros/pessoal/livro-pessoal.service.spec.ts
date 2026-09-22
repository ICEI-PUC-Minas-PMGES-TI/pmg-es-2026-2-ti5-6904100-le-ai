import { ConfigService } from '@nestjs/config';
import { AcessoNegado, NaoEncontrado } from '../../common/erros-de-negocio';
import { IdempotenciaService } from '../../common/idempotencia/idempotencia.service';
import { AutorizacaoRn15 } from './autorizacao-rn15.service';
import { LeituraDoDonoRepository } from './leitura-do-dono.repository';
import { LivroPessoalRepository } from './livro-pessoal.repository';
import { LivroPessoalService } from './livro-pessoal.service';

const DONO = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const TERCEIRO = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const LIVRO = 'cccccccc-3333-4333-8333-cccccccccccc';
const ATIVIDADE = 'dddddddd-4444-4444-8444-dddddddddddd';

const REGISTRO = {
  id: LIVRO,
  donoId: DONO,
  titulo: 'Caderno de viagem',
  autor: 'Marina Albuquerque',
  paginas: 180,
  sinopse: null,
  capaUrl: null,
  ativo: true,
};

function montar(
  opcoes: {
    registro?: typeof REGISTRO | null;
    terceiroAutorizado?: boolean;
  } = {},
) {
  const repositorio = {
    buscarPorId: jest
      .fn()
      .mockResolvedValue(
        opcoes.registro === undefined ? REGISTRO : opcoes.registro,
      ),
  } as unknown as LivroPessoalRepository;

  const autorizacao = {
    terceiroPodeVer: jest
      .fn()
      .mockResolvedValue(opcoes.terceiroAutorizado ?? false),
  } as unknown as AutorizacaoRn15;

  const leituraDoDono = {
    nota: jest.fn().mockResolvedValue(null),
    resenha: jest.fn().mockResolvedValue(null),
  } as unknown as LeituraDoDonoRepository;

  // Sem recibo anterior, o serviço real só executa o efeito numa transação; o
  // replay e a corrida são provados contra Postgres em `test/integracao/`.
  const idempotencia = {
    executar: jest.fn(
      (_contexto: unknown, efeito: (tx: unknown) => Promise<unknown>) =>
        efeito({}),
    ),
  } as unknown as IdempotenciaService;
  const config = {
    get: (chave: string) =>
      chave === 'CAPA_HOSTS_PERMITIDOS' ? 'res.cloudinary.com' : 'leai',
  } as unknown as ConfigService;

  const servico = new LivroPessoalService(
    repositorio,
    autorizacao,
    leituraDoDono,
    idempotencia,
    config,
  );

  return { servico, repositorio, autorizacao, leituraDoDono };
}

describe('LivroPessoalService.obter — autorização RN-15', () => {
  it('o dono abre o próprio livro sem informar via', async () => {
    const { servico } = montar();
    const detalhe = await servico.obter(LIVRO, DONO, {});

    expect(detalhe.id).toBe(LIVRO);
    expect(detalhe.modoConsulta).toBe(false);
  });

  it('o dono não precisa passar pela verificação de via', async () => {
    const { servico, autorizacao } = montar();
    await servico.obter(LIVRO, DONO, {});
    expect(autorizacao.terceiroPodeVer).not.toHaveBeenCalled();
  });

  // "Conhecer ou informar diretamente o identificador não concede acesso"
  // (RN-15). Este é o teste que trava a regra.
  it('terceiro sem via nenhuma recebe acesso negado, mesmo sabendo o id', async () => {
    const { servico } = montar();
    await expect(servico.obter(LIVRO, TERCEIRO, {})).rejects.toBeInstanceOf(
      AcessoNegado,
    );
  });

  it('terceiro com via de feed inválida recebe acesso negado', async () => {
    const { servico } = montar({ terceiroAutorizado: false });
    await expect(
      servico.obter(LIVRO, TERCEIRO, { via: 'feed', referenciaId: ATIVIDADE }),
    ).rejects.toBeInstanceOf(AcessoNegado);
  });

  it('terceiro com via de feed válida abre em modo consulta', async () => {
    const { servico } = montar({ terceiroAutorizado: true });
    const detalhe = await servico.obter(LIVRO, TERCEIRO, {
      via: 'feed',
      referenciaId: ATIVIDADE,
    });

    expect(detalhe.modoConsulta).toBe(true);
  });

  it('a verificação recebe o livro e o dono reais, não o que o cliente mandou', async () => {
    const { servico, autorizacao } = montar({ terceiroAutorizado: true });
    await servico.obter(LIVRO, TERCEIRO, {
      via: 'feed',
      referenciaId: ATIVIDADE,
    });

    expect(autorizacao.terceiroPodeVer).toHaveBeenCalledWith({
      livroId: LIVRO,
      donoId: DONO,
      solicitanteId: TERCEIRO,
      via: 'feed',
      referenciaId: ATIVIDADE,
    });
  });

  it('livro inexistente é 404', async () => {
    const { servico } = montar({ registro: null });
    await expect(servico.obter(LIVRO, DONO, {})).rejects.toBeInstanceOf(
      NaoEncontrado,
    );
  });

  // RN-15.6: excluir o livro cessa o acesso imediatamente — inclusive o do dono,
  // porque a página deixa de existir.
  it('livro excluído é 404 para o dono e para terceiro autorizado', async () => {
    const inativo = { ...REGISTRO, ativo: false };

    const paraDono = montar({ registro: inativo });
    await expect(
      paraDono.servico.obter(LIVRO, DONO, {}),
    ).rejects.toBeInstanceOf(NaoEncontrado);

    const paraTerceiro = montar({
      registro: inativo,
      terceiroAutorizado: true,
    });
    await expect(
      paraTerceiro.servico.obter(LIVRO, TERCEIRO, {
        via: 'feed',
        referenciaId: ATIVIDADE,
      }),
    ).rejects.toBeInstanceOf(NaoEncontrado);
  });

  // RN-03: a página mostra a avaliação de quem CADASTROU o livro, não a de quem
  // está olhando.
  it('busca a nota e a resenha do dono, não as do solicitante', async () => {
    const { servico, leituraDoDono } = montar({ terceiroAutorizado: true });
    await servico.obter(LIVRO, TERCEIRO, {
      via: 'feed',
      referenciaId: ATIVIDADE,
    });

    expect(leituraDoDono.nota).toHaveBeenCalledWith(DONO, LIVRO);
    expect(leituraDoDono.resenha).toHaveBeenCalledWith(DONO, LIVRO);
  });

  // Enquanto F-AVA não entrega, as VIEWs de `leitura` retornam vazio. Os campos
  // são `required` e `nullable` no contrato: precisam sair com `null`.
  it('devolve nota e resenha como null, presentes na resposta', async () => {
    const { servico } = montar();
    const detalhe = await servico.obter(LIVRO, DONO, {});

    expect(detalhe).toHaveProperty('notaDoDono', null);
    expect(detalhe).toHaveProperty('resenhaDoDono', null);
  });
});

describe('LivroPessoalService — propriedade nas escritas (RNF-SEC-02)', () => {
  it('terceiro não edita livro de outro, nem com via válida', async () => {
    const { servico } = montar({ terceiroAutorizado: true });
    await expect(
      servico.atualizar(
        LIVRO,
        TERCEIRO,
        'chave',
        { titulo: 'x' },
        new Set(['titulo']),
      ),
    ).rejects.toBeInstanceOf(AcessoNegado);
  });

  it('terceiro não exclui livro de outro', async () => {
    const { servico } = montar({ terceiroAutorizado: true });
    await expect(
      servico.excluir(LIVRO, TERCEIRO, 'chave'),
    ).rejects.toBeInstanceOf(AcessoNegado);
  });

  it('não se edita livro já excluído', async () => {
    const { servico } = montar({ registro: { ...REGISTRO, ativo: false } });
    await expect(
      servico.atualizar(
        LIVRO,
        DONO,
        'chave',
        { titulo: 'x' },
        new Set(['titulo']),
      ),
    ).rejects.toBeInstanceOf(NaoEncontrado);
  });
});

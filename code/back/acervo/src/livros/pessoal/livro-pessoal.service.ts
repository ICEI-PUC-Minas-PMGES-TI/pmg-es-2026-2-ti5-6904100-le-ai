import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcessoNegado, NaoEncontrado } from '../../common/erros-de-negocio';
import { IdempotenciaService } from '../../common/idempotencia/idempotencia.service';
import { OPERACOES } from '../../common/idempotencia/idempotencia.constantes';
import { validarUrlDeCapa } from '../../common/url-capa';
import { AutorizacaoRn15 } from './autorizacao-rn15.service';
import { LeituraDoDonoRepository } from './leitura-do-dono.repository';
import {
  LivroPessoalRegistro,
  LivroPessoalRepository,
} from './livro-pessoal.repository';
import {
  LivroPessoalAtualizacaoDto,
  LivroPessoalDetalheDto,
  LivroPessoalEntradaDto,
} from './dto/livro-pessoal.dto';

export interface ConsultaDeLivroPessoal {
  via?: string;
  referenciaId?: string;
}

@Injectable()
export class LivroPessoalService {
  private readonly hostsDeCapa: string[];
  private readonly cloudName: string;

  constructor(
    private readonly repositorio: LivroPessoalRepository,
    private readonly autorizacao: AutorizacaoRn15,
    private readonly leituraDoDono: LeituraDoDonoRepository,
    private readonly idempotencia: IdempotenciaService,
    config: ConfigService,
  ) {
    this.hostsDeCapa = (config.get<string>('CAPA_HOSTS_PERMITIDOS') ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean);
    this.cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') ?? 'leai';
  }

  async criar(donoId: string, chave: string, entrada: LivroPessoalEntradaDto) {
    const capa = this.validarCapa(entrada.capaUrl);

    return this.idempotencia.executar<LivroPessoalDetalheDto>(
      {
        subjectRef: donoId,
        operacao: OPERACOES.CRIAR_LIVRO_PESSOAL,
        chave,
        payload: { ...entrada },
      },
      async (tx) => {
        const criado = await this.repositorio.criar(tx, {
          donoId,
          titulo: entrada.titulo,
          autor: entrada.autor,
          paginas: entrada.paginas,
          sinopse: entrada.sinopse ?? null,
          capa,
        });

        // Livro recém-criado não tem nota nem resenha: não vale ir ao banco
        // buscar o que necessariamente não existe.
        return {
          status: 201,
          corpo: this.montarDetalhe(criado, {
            modoConsulta: false,
            nota: null,
            resenha: null,
          }),
        };
      },
    );
  }

  /**
   * `GET /livros/pessoal/{id}` com a autorização de RN-15.
   *
   * Ordem das decisões, e o porquê de cada código:
   *
   * 1. livro inexistente, oficial ou **inativo** → `404`. Livro excluído deixa
   *    de existir para todo mundo, inclusive para o dono (RN-15.6). Devolver
   *    `403` aqui confirmaria que o id existe;
   * 2. dono → autorizado, `modoConsulta = false`, e `via` é ignorada sem erro;
   * 3. terceiro sem via válida → `403`. O recurso existe, o acesso é que não é
   *    concedido, e o contrato lista `403` para exatamente este caso. Dá para
   *    devolver `403` sem vazar existência porque os ids são UUID não
   *    sequenciais (RNF-SEC-05): ninguém chega a este ponto por adivinhação.
   */
  async obter(
    id: string,
    solicitanteId: string,
    consulta: ConsultaDeLivroPessoal,
  ): Promise<LivroPessoalDetalheDto> {
    const encontrado = await this.repositorio.buscarPorId(id);
    if (!encontrado || !encontrado.ativo) {
      throw new NaoEncontrado();
    }

    const ehDono = encontrado.donoId === solicitanteId;
    if (!ehDono) {
      const autorizado = await this.autorizacao.terceiroPodeVer({
        livroId: encontrado.id,
        donoId: encontrado.donoId,
        solicitanteId,
        via: consulta.via,
        referenciaId: consulta.referenciaId,
      });
      if (!autorizado) {
        throw new AcessoNegado();
      }
    }

    // A página mostra a avaliação do DONO, inclusive para o terceiro (RN-03).
    const [nota, resenha] = await Promise.all([
      this.leituraDoDono.nota(encontrado.donoId, encontrado.id),
      this.leituraDoDono.resenha(encontrado.donoId, encontrado.id),
    ]);

    return this.montarDetalhe(encontrado, {
      modoConsulta: !ehDono,
      nota,
      resenha,
    });
  }

  async atualizar(
    id: string,
    donoId: string,
    chave: string,
    entrada: LivroPessoalAtualizacaoDto,
    camposPresentes: Set<string>,
  ) {
    // `capaUrl: null` limpa a capa; `capaUrl` ausente preserva. São coisas
    // diferentes, e só o corpo cru distingue as duas.
    const capa = camposPresentes.has('capaUrl')
      ? this.validarCapa(entrada.capaUrl)
      : undefined;

    return this.idempotencia.executar<LivroPessoalDetalheDto>(
      {
        subjectRef: donoId,
        operacao: OPERACOES.ATUALIZAR_LIVRO_PESSOAL,
        chave,
        // O id entra no hash, não na operação: reusar a chave em outro livro
        // precisa dar 409, e é isso que o contrato descreve.
        payload: { id, ...this.somentePresentes(entrada, camposPresentes) },
      },
      async (tx) => {
        // Propriedade verificada DENTRO do efeito, depois da leitura do recibo:
        // o replay de uma chave já processada devolve a resposta original, em
        // vez de reavaliar um estado que a própria operação mudou (RNF-ERR-04).
        const atual = await this.exigirPropriedade(id, donoId);
        const atualizado = await this.repositorio.atualizar(tx, atual.id, {
          titulo: camposPresentes.has('titulo') ? entrada.titulo : undefined,
          autor: camposPresentes.has('autor') ? entrada.autor : undefined,
          paginas: camposPresentes.has('paginas') ? entrada.paginas : undefined,
          sinopse: camposPresentes.has('sinopse')
            ? (entrada.sinopse ?? null)
            : undefined,
          capa,
        });

        const [nota, resenha] = await Promise.all([
          this.leituraDoDono.nota(donoId, atualizado.id),
          this.leituraDoDono.resenha(donoId, atualizado.id),
        ]);

        return {
          status: 200,
          corpo: this.montarDetalhe(atualizado, {
            modoConsulta: false,
            nota,
            resenha,
          }),
        };
      },
    );
  }

  async excluir(id: string, donoId: string, chave: string) {
    return this.idempotencia.executar<Record<string, never>>(
      {
        subjectRef: donoId,
        operacao: OPERACOES.EXCLUIR_LIVRO_PESSOAL,
        chave,
        payload: { id },
      },
      async (tx) => {
        // Dentro do efeito pelo mesmo motivo de `atualizar`: sem isso, o reenvio
        // da exclusão bem-sucedida responderia 404, porque o livro já está
        // inativo, e o cliente trataria como falha uma exclusão que aconteceu.
        const atual = await this.exigirPropriedade(id, donoId);
        await this.repositorio.excluir(tx, atual.id);
        // 204 não tem corpo, mas o CHECK de `idempotencia_acervo` exige
        // `resposta` não nula em linha viva — grava `{}` e o replay responde
        // 204 sem corpo do mesmo jeito.
        return { status: 204, corpo: {} as Record<string, never> };
      },
    );
  }

  /**
   * Editar e excluir são **exclusivos do dono** (RN-03), validado no servidor
   * (RNF-SEC-02). Terceiro autorizado por RN-15 tem acesso somente de leitura, e
   * a via do feed nunca autoriza escrita.
   */
  private async exigirPropriedade(
    id: string,
    donoId: string,
  ): Promise<LivroPessoalRegistro> {
    const encontrado = await this.repositorio.buscarPorId(id);
    if (!encontrado || !encontrado.ativo) {
      throw new NaoEncontrado();
    }
    if (encontrado.donoId !== donoId) {
      throw new AcessoNegado();
    }
    return encontrado;
  }

  private validarCapa(capaUrl: string | null | undefined) {
    if (!capaUrl) {
      return null;
    }
    return validarUrlDeCapa(capaUrl, {
      hostsPermitidos: this.hostsDeCapa,
      cloudName: this.cloudName,
    });
  }

  private somentePresentes(
    entrada: LivroPessoalAtualizacaoDto,
    presentes: Set<string>,
  ): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    for (const campo of presentes) {
      resultado[campo] = (entrada as Record<string, unknown>)[campo] ?? null;
    }
    return resultado;
  }

  private montarDetalhe(
    registro: LivroPessoalRegistro,
    extras: {
      modoConsulta: boolean;
      nota: LivroPessoalDetalheDto['notaDoDono'];
      resenha: LivroPessoalDetalheDto['resenhaDoDono'];
    },
  ): LivroPessoalDetalheDto {
    // Objeto literal e não `plainToInstance`: `notaDoDono` e `resenhaDoDono` são
    // `required` e `nullable` no contrato, então precisam aparecer com `null`,
    // nunca sumir da resposta.
    return {
      id: registro.id,
      tipo: 'pessoal',
      donoId: registro.donoId,
      titulo: registro.titulo,
      autor: registro.autor,
      paginas: registro.paginas,
      sinopse: registro.sinopse,
      capaUrl: registro.capaUrl,
      modoConsulta: extras.modoConsulta,
      notaDoDono: extras.nota,
      resenhaDoDono: extras.resenha,
    };
  }
}

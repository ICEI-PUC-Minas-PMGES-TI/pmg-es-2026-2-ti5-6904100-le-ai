import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  NaoEncontrado,
  ServicoIndisponivel,
} from '../../common/erros-de-negocio';
import {
  codigoDoPostgres,
  ehFalhaDeContratoExterno,
} from '../../common/pg-erros';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { OutboxRepository } from '../outbox/outbox.repository';
import {
  chaveDeNegocioDaSinopse,
  LIVRO_PAGINA_ABERTA,
} from '../outbox/eventos';
import { paraResumo } from './busca.service';
import { decodificarCursor } from './cursor-de-resenhas';
import { LIMITE_PADRAO } from './dto/busca.dto';
import {
  LivroOficialDetalheDto,
  PaginaResenhasDto,
  RESENHAS_NA_PAGINA,
  ResenhasQueryDto,
} from './dto/livro-oficial.dto';
import { LivroOficialRepository } from './livro-oficial.repository';
import { ResenhasRepository } from './resenhas.repository';

/** `lock_not_available`: o `lock_timeout` estourou. */
const TRAVA_OCUPADA = '55P03';

@Injectable()
export class LivroOficialService {
  private readonly logger = new Logger(LivroOficialService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly livros: LivroOficialRepository,
    private readonly resenhas: ResenhasRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  /**
   * Página do livro (RF-ACV-04, RF-ACV-18, RF-ACV-19). A resposta nunca espera a
   * fonte externa (RN-19.5): quando a sinopse deve ser buscada, a abertura só
   * troca o estado para `pendente` e grava a outbox, e quem consulta as fontes é
   * o consumidor.
   */
  async obter(id: string, leitorId: string): Promise<LivroOficialDetalheDto> {
    const livro = await this.livros.obter(id);
    if (!livro) {
      throw new NaoEncontrado('Não encontramos este livro.');
    }

    // Pedida por esta abertura, por uma concorrente ou em andamento no
    // consumidor: nos três casos, o que o cliente deve ver é `pendente`.
    const status = livro.deveBuscarSinopse ? 'pendente' : livro.sinopseStatus;
    if (livro.deveBuscarSinopse) {
      await this.pedirSinopse(id);
    }

    return {
      ...paraResumo(livro),
      isbn: livro.isbn,
      sinopse: {
        status,
        texto: status === 'disponivel' ? livro.sinopse : null,
      },
      resenhas: await this.primeiraPaginaDeResenhas(id, leitorId),
    };
  }

  async listarResenhas(
    id: string,
    leitorId: string,
    query: ResenhasQueryDto,
  ): Promise<PaginaResenhasDto> {
    const depoisDe = query.cursor ? decodificarCursor(query.cursor) : undefined;
    // Livro primeiro: sem isso, a rota listaria resenhas de livro pessoal por
    // fora das vias de RN-15.
    if (!(await this.livros.existe(id))) {
      throw new NaoEncontrado('Não encontramos este livro.');
    }
    const limit = query.limit ?? LIMITE_PADRAO;
    try {
      const pagina = await this.resenhas.pagina({
        livroId: id,
        leitorId,
        limit,
        depoisDe,
      });
      return { ...pagina, limit };
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel(
          'Não foi possível carregar as resenhas agora. Tente de novo em instantes.',
        );
      }
      throw erro;
    }
  }

  /**
   * Estado e outbox na mesma transação (RNF-ERR-10), com o `lock_timeout` curto:
   * no resgate de um `pendente` antigo, o consumidor pode estar com a linha
   * travada enquanto consulta as fontes, e a página não espera por ele. O
   * estouro aborta a transação inteira, então é tratado aqui fora, como no-op.
   */
  private async pedirSinopse(id: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '1s'`);
        if (!(await this.livros.marcarSinopsePendente(tx, id))) {
          return;
        }
        await this.outbox.inserir(tx, {
          tipo: LIVRO_PAGINA_ABERTA.tipo,
          versao: LIVRO_PAGINA_ABERTA.versao,
          chaveNegocio: chaveDeNegocioDaSinopse(id),
          payload: { livroId: id },
        });
      });
    } catch (erro) {
      // Trava ocupada é o consumidor trabalhando: no-op. Qualquer outra falha
      // também não derruba a página (RF-ACV-19): ela abre com `pendente`, e a
      // próxima consulta do polling pede de novo, porque o estado não mudou.
      if (codigoDoPostgres(erro) !== TRAVA_OCUPADA) {
        this.logger.error(
          {
            livroId: id,
            motivo: erro instanceof Error ? erro.message : String(erro),
          },
          'Falha ao pedir a sinopse; a página abre sem ela',
        );
      }
    }
  }

  /** `null` quando as VIEWs de `leitura` ou `identidade` falham: a página abre. */
  private async primeiraPaginaDeResenhas(
    id: string,
    leitorId: string,
  ): Promise<PaginaResenhasDto | null> {
    try {
      const pagina = await this.resenhas.pagina({
        livroId: id,
        leitorId,
        limit: RESENHAS_NA_PAGINA,
      });
      return { ...pagina, limit: RESENHAS_NA_PAGINA };
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        return null;
      }
      throw erro;
    }
  }
}

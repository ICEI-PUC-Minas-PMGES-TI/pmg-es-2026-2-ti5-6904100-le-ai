import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../../db/drizzle.module';
import type { Tx } from '../../../db/tipos';
import {
  LIMIAR_EXPIRACAO_DIAS,
  LIMIARES_RISCO_DIAS,
  type LimiarInatividade,
  avaliarInatividade,
} from '../../../leituras/dominio/maquina-estados';
import {
  type LimiarRiscoDias,
  leituraEmRisco,
  leituraExpirada,
} from '../../../leituras/dominio/eventos';
import { LeiturasService } from '../../../leituras/aplicacao/leituras.service';
import { OutboxRepository } from '../../../outbox/outbox.repository';
import { ReferenciasExternas } from '../../../referencias/referencias-externas.service';
import {
  InatividadeRepository,
  type LeituraEmAndamento,
} from '../infraestrutura/inatividade.repository';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const MENOR_LIMIAR_DIAS = Math.min(...LIMIARES_RISCO_DIAS);

export interface ResultadoJobInatividade {
  dataReferencia: string;
  alertasDia20: number;
  alertasDia30: number;
  abandonosDia40: number;
}

type ChaveContagem = Exclude<keyof ResultadoJobInatividade, 'dataReferencia'>;

const CONTAGEM_POR_LIMIAR: Record<number, ChaveContagem> = {
  20: 'alertasDia20',
  30: 'alertasDia30',
  [LIMIAR_EXPIRACAO_DIAS]: 'abandonosDia40',
};

function inicioDoDia(instante: Date): Date {
  return new Date(
    Date.UTC(
      instante.getUTCFullYear(),
      instante.getUTCMonth(),
      instante.getUTCDate(),
    ),
  );
}

export function dataDeHoje(): string {
  return inicioDoDia(new Date()).toISOString().slice(0, 10);
}

@Injectable()
export class InatividadeService {
  private readonly logger = new Logger(InatividadeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: InatividadeRepository,
    private readonly leituras: LeiturasService,
    private readonly outbox: OutboxRepository,
    private readonly referencias: ReferenciasExternas,
  ) {}

  async processar(dataReferencia: string): Promise<ResultadoJobInatividade> {
    const referencia = new Date(`${dataReferencia}T00:00:00.000Z`);
    const resultado: ResultadoJobInatividade = {
      dataReferencia,
      alertasDia20: 0,
      alertasDia30: 0,
      abandonosDia40: 0,
    };

    const semAtividadeDesde = new Date(
      referencia.getTime() - (MENOR_LIMIAR_DIAS - 1) * MS_POR_DIA,
    );
    const ids = await this.repositorio.idsInativosAntesDe(semAtividadeDesde);

    for (const leituraId of ids) {
      try {
        const limiar = await this.db.transaction((tx) =>
          this.processarLeitura(tx, leituraId, referencia),
        );
        if (limiar) {
          resultado[CONTAGEM_POR_LIMIAR[limiar.dias]] += 1;
        }
      } catch (erro) {
        this.logger.error(
          { err: erro, leituraId },
          'falha ao processar inatividade da leitura',
        );
      }
    }

    return resultado;
  }

  private async processarLeitura(
    tx: Tx,
    leituraId: string,
    referencia: Date,
  ): Promise<LimiarInatividade | null> {
    const atual = await this.repositorio.bloquearEmAndamento(tx, leituraId);
    if (!atual) {
      return null;
    }

    const { limiaresDevidos } = avaliarInatividade({
      dataInicio: new Date(`${atual.dataInicio}T00:00:00.000Z`),
      ultimaAtividadeEm: inicioDoDia(atual.ultimaAtividadeEm),
      dataReferencia: referencia,
    });
    const limiar = limiaresDevidos.at(-1);
    if (!limiar) {
      return null;
    }

    const registrado =
      limiar.tipo === 'expiracao'
        ? await this.expirar(tx, atual)
        : await this.alertar(tx, atual, limiar.dias as LimiarRiscoDias);
    return registrado ? limiar : null;
  }

  private async alertar(
    tx: Tx,
    atual: LeituraEmAndamento,
    limiarDias: LimiarRiscoDias,
  ): Promise<boolean> {
    const livro = await this.snapshotDoLivro(tx, atual.livroId);
    const evento = leituraEmRisco({
      destinatarioId: atual.usuarioId,
      leituraId: atual.id,
      inatividadeVersao: atual.inatividadeVersao,
      limiarDias,
      livro,
    });

    const novo = await this.repositorio.registrarLimiar(tx, {
      leituraId: atual.id,
      inatividadeVersao: atual.inatividadeVersao,
      limiarDias,
      tipo: 'risco',
      eventId: evento.eventId,
    });
    if (novo) {
      await this.outbox.inserir(tx, evento);
    }
    return novo;
  }

  private async expirar(tx: Tx, atual: LeituraEmAndamento): Promise<boolean> {
    const livro = await this.snapshotDoLivro(tx, atual.livroId);
    const evento = leituraExpirada({
      destinatarioId: atual.usuarioId,
      leituraId: atual.id,
      inatividadeVersao: atual.inatividadeVersao,
      limiarDias: LIMIAR_EXPIRACAO_DIAS,
      livro,
    });

    const novo = await this.repositorio.registrarLimiar(tx, {
      leituraId: atual.id,
      inatividadeVersao: atual.inatividadeVersao,
      limiarDias: LIMIAR_EXPIRACAO_DIAS,
      tipo: 'expiracao',
      eventId: evento.eventId,
    });
    if (!novo) {
      return false;
    }

    await this.leituras.abandonarEmTransacao(tx, atual.id, {
      automatico: true,
    });
    await this.outbox.inserir(tx, evento);
    return true;
  }

  private async snapshotDoLivro(tx: Tx, livroId: string) {
    const livro = await this.referencias.buscarLivro(livroId, tx);
    if (!livro) {
      throw new Error(`livro ${livroId} ausente de v_livro_referencia_v1`);
    }
    return livro.snapshot;
  }
}

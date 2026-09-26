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

/** `ResultadoJobInatividade` de `docs/api/leitura.yaml`. */
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

/** Meia-noite UTC do dia do instante: a inatividade conta dias de calendário. */
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

/**
 * Job diário de inatividade (RN-05, RF-EST-11/12).
 *
 * Cada leitura é processada na **própria** transação: a falha de uma não
 * desfaz o que já foi confirmado para as outras, e a reexecução do lote é
 * segura porque a UK de `limiar_inatividade` deduplica o fato.
 *
 * Só o **maior** limiar devido no ciclo é registrado. Uma leitura que chega ao
 * job já no dia 40 (job parado, massa antiga) é abandonada sem receber antes
 * os alertas de risco vencidos, e uma que chega no dia 30 recebe só o segundo
 * alerta: RN-05 descreve avisos com ação de abandonar, e um aviso atrasado
 * sobre um prazo já superado não tem ação possível. Como o maior limiar só
 * cresce dentro do ciclo, um limiar menor pulado nunca é emitido depois.
 */
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

    // Atividade em qualquer instante do dia D conta como dia D: é candidata
    // quem não tem atividade desde o fim do dia `referencia - menor limiar`.
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
        // Isolada por transação: registra e segue com as demais. A próxima
        // execução tenta de novo, porque nada desta leitura foi confirmado.
        this.logger.error(
          { err: erro, leituraId },
          'falha ao processar inatividade da leitura',
        );
      }
    }

    return resultado;
  }

  /** O limiar registrado nesta execução, ou `null` se não havia o que fazer. */
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
      await this.outbox.gravar(tx, evento);
    }
    return novo;
  }

  /**
   * Dia 40: registra o limiar primeiro — se já existia, o ciclo já expirou e
   * nada mais acontece —, aplica o abandono de RN-04 pelo mesmo caminho do
   * abandono manual (`leitura.abandonada` incluso) e só então grava
   * `leitura.expirada`, que descreve o fato já consumado.
   */
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
    await this.outbox.gravar(tx, evento);
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

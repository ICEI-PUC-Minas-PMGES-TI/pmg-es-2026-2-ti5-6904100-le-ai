import { Inject, Injectable, Logger } from '@nestjs/common';
import { somarDias } from '../../../common/datas';
import { DRIZZLE, type DrizzleDB } from '../../../db/drizzle.module';
import type { Tx } from '../../../db/tipos';
import { OutboxRepository } from '../../../outbox/outbox.repository';
import {
  type DadosLembreteSequencia,
  TIPO_LEMBRETE_SEQUENCIA,
  VERSAO_LEMBRETE_SEQUENCIA,
  chaveDeNegocioDoLembrete,
  eventIdDoLembrete,
  lembreteDevido,
} from '../../../sequencia/dominio/lembrete';
import { SequenciaRepository } from '../../../sequencia/sequencia.repository';
import { LembreteSequenciaRepository } from '../infraestrutura/lembrete-sequencia.repository';

export interface ResultadoJobLembreteSequencia {
  instanteReferencia: string;
  elegiveis: number;
  lembretesPublicados: number;
  jaLembrados: number;
}

type Desfecho = 'nao_devido' | 'publicado' | 'ja_lembrado';

/**
 * Job diário do lembrete de sequência (F-GAM-OPC, RF-GAM-05): grava
 * `lembrete.sequencia` na outbox para quem tem sequência ativa e ainda não
 * registrou progresso no dia local corrente. Não altera a sequência (RN-18):
 * só lê o estado que F-GAM mantém.
 */
@Injectable()
export class LembreteSequenciaService {
  private readonly logger = new Logger(LembreteSequenciaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: LembreteSequenciaRepository,
    private readonly sequencias: SequenciaRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async processar(agora = new Date()): Promise<ResultadoJobLembreteSequencia> {
    const resultado: ResultadoJobLembreteSequencia = {
      instanteReferencia: agora.toISOString(),
      elegiveis: 0,
      lembretesPublicados: 0,
      jaLembrados: 0,
    };

    // O dia local de qualquer fuso fica a no máximo um dia da data UTC, então
    // "ontem no fuso do leitor" cai entre UTC − 2 e UTC.
    const hojeUtc = agora.toISOString().slice(0, 10);
    const candidatos = await this.repositorio.candidatos(
      somarDias(hojeUtc, -2),
      hojeUtc,
    );

    for (const usuarioId of candidatos) {
      try {
        const desfecho = await this.db.transaction((tx) =>
          this.lembrar(tx, usuarioId, agora),
        );
        if (desfecho === 'publicado') {
          resultado.elegiveis += 1;
          resultado.lembretesPublicados += 1;
        } else if (desfecho === 'ja_lembrado') {
          resultado.elegiveis += 1;
          resultado.jaLembrados += 1;
        }
      } catch (erro) {
        this.logger.error(
          { err: erro, usuarioId },
          'falha ao gravar o lembrete de sequência',
        );
      }
    }

    return resultado;
  }

  /**
   * Relê o estado sob a mesma trava do recálculo da sequência: um progresso
   * que chegou entre a seleção e aqui tira o leitor do lembrete.
   */
  private async lembrar(
    tx: Tx,
    usuarioId: string,
    agora: Date,
  ): Promise<Desfecho> {
    await this.sequencias.travar(tx, usuarioId);
    const estado = await this.sequencias.obter(usuarioId, tx);
    const devido = estado ? lembreteDevido(estado, agora) : null;
    if (!devido) {
      return 'nao_devido';
    }
    const payload: DadosLembreteSequencia = {
      destinatarioId: usuarioId,
      dataLocal: devido.dataLocal,
      sequenciaAtual: devido.sequenciaAtual,
    };
    const gravado = await this.outbox.inserirSeNovo(tx, {
      eventId: eventIdDoLembrete(usuarioId, devido.dataLocal),
      tipo: TIPO_LEMBRETE_SEQUENCIA,
      versao: VERSAO_LEMBRETE_SEQUENCIA,
      chaveNegocio: chaveDeNegocioDoLembrete(usuarioId, devido.dataLocal),
      payload,
    });
    return gravado ? 'publicado' : 'ja_lembrado';
  }
}

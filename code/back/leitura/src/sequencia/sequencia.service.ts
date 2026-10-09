import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.module';
import type { Tx } from '../db/tipos';
import { SequenciaDto } from './api/sequencia.dto';
import { apurar, sequenciaVigente } from './dominio/sequencia';
import { SequenciaRepository } from './sequencia.repository';

/**
 * Sequência diária de leitura (F-GAM, RF-GAM-01/02/03, RN-18).
 *
 * O estado é sempre recomposto dos progressos atuais do leitor: chegada de
 * `progresso.registrado` (inclusive offline tardio) e exclusão de trecho
 * chamam `recalcular`, que reconstrói os dias e as sequências do zero. O
 * zeramento por dia vazio é derivado na consulta, sem job.
 */
@Injectable()
export class SequenciaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: SequenciaRepository,
  ) {}

  /** Recompõe dias e sequências do leitor dentro do `tx` de quem chama. */
  async recalcular(tx: Tx, usuarioId: string): Promise<void> {
    await this.repositorio.travar(tx, usuarioId);
    const datas = await this.repositorio.datasComLeitura(tx, usuarioId);
    await this.repositorio.substituirDias(tx, usuarioId, datas);

    const apuracao = apurar(datas);
    const fuso = await this.repositorio.ultimoFuso(tx, usuarioId);
    if (!apuracao.ultimoDia || !fuso) {
      await this.repositorio.remover(tx, usuarioId);
      return;
    }
    await this.repositorio.salvar(tx, usuarioId, {
      sequenciaAtual: apuracao.atualAteUltimoDia,
      maiorSequencia: apuracao.maior,
      ultimoDia: apuracao.ultimoDia,
      ultimoFusoHorario: fuso.fusoHorario,
      ultimoFusoRegistradoEm: fuso.registradoEm,
    });
  }

  /** `GET /me/sequencia` (RF-GAM-02): só os dados do próprio leitor. */
  async consultar(
    usuarioId: string,
    agora = new Date(),
  ): Promise<SequenciaDto> {
    const estado = await this.repositorio.obter(usuarioId);
    if (!estado) {
      return {
        sequenciaAtual: 0,
        maiorSequencia: 0,
        ultimoDiaComLeitura: null,
      };
    }
    return {
      sequenciaAtual: sequenciaVigente(estado, agora),
      maiorSequencia: estado.maiorSequencia,
      ultimoDiaComLeitura: estado.ultimoDia,
    };
  }

  /**
   * Backfill (catálogo de mensageria: o consumidor recompõe da fonte antes de
   * ligar o binding). Idempotente: rodar de novo só recalcula o mesmo estado.
   */
  async recalcularTodos(): Promise<number> {
    const usuarios = await this.repositorio.usuariosParaRecalcular();
    for (const usuarioId of usuarios) {
      await this.db.transaction((tx) => this.recalcular(tx, usuarioId));
    }
    return usuarios.length;
  }
}

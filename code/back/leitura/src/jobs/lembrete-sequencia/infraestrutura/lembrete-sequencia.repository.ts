import { Inject, Injectable } from '@nestjs/common';
import { and, asc, between, eq, gt } from 'drizzle-orm';
import { comContratoExterno } from '../../../common/contrato-externo';
import { vPerfilReferencia } from '../../../db/contratos-externos';
import { DRIZZLE, type DrizzleDB } from '../../../db/drizzle.module';
import { sequenciaLeitura } from '../../../db/schema';

/**
 * Seleção grossa dos candidatos ao lembrete de sequência (F-GAM-OPC). O corte
 * fino, no último fuso de cada leitor, é do domínio (`lembreteDevido`).
 */
@Injectable()
export class LembreteSequenciaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Leitores com sequência gravada maior que zero e último dia no intervalo,
   * só os que estão em `identidade.v_perfil_referencia_v1`: conta suspensa ou
   * em exclusão não recebe lembrete. VIEW inacessível é 503.
   */
  async candidatos(de: string, ate: string): Promise<string[]> {
    const linhas = await comContratoExterno(() =>
      this.db
        .select({ usuarioId: sequenciaLeitura.usuarioId })
        .from(sequenciaLeitura)
        .innerJoin(
          vPerfilReferencia,
          eq(vPerfilReferencia.id, sequenciaLeitura.usuarioId),
        )
        .where(
          and(
            gt(sequenciaLeitura.sequenciaAtual, 0),
            between(sequenciaLeitura.ultimoDia, de, ate),
          ),
        )
        .orderBy(asc(sequenciaLeitura.usuarioId)),
    );
    return linhas.map((l) => l.usuarioId);
  }
}

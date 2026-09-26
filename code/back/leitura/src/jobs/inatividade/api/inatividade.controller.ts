import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Publico } from '../../../auth/publico.decorator';
import {
  type EscopoIdempotente,
  Idempotente,
} from '../../../common/idempotencia/escopo-idempotente.decorator';
import { IdempotenciaService } from '../../../common/idempotencia/idempotencia.service';
import { ExecutarJobDto } from './dto/executar-job.dto';
import {
  InatividadeService,
  type ResultadoJobInatividade,
  dataDeHoje,
} from '../aplicacao/inatividade.service';
import { SchedulerTokenGuard } from './scheduler-token.guard';

/**
 * Ator do agendador em `idempotencia_leitura.subject_ref` (coluna `uuid`). Não
 * há usuário por trás do segredo de ambiente; um id fixo e fora do espaço de
 * UUIDs v4 separa o escopo das chaves do job do escopo de qualquer leitor.
 */
export const SUJEITO_AGENDADOR = '00000000-0000-0000-0000-000000000001';

const STATUS_OK = 200;

@Controller('internal/jobs/inatividade')
export class InatividadeController {
  constructor(
    private readonly idempotencia: IdempotenciaService,
    private readonly inatividade: InatividadeService,
  ) {}

  /**
   * `POST /internal/jobs/inatividade` (`processarInatividadeLeituras`).
   *
   * O recibo da `Idempotency-Key` fica na transação do `IdempotenciaService`,
   * mas cada leitura é confirmada na própria transação pelo serviço: um recibo
   * perdido só faz a repetição reprocessar, e a UK de `limiar_inatividade`
   * impede o fato repetido.
   */
  @Post()
  @Publico()
  @UseGuards(SchedulerTokenGuard)
  async executar(
    @Idempotente() escopo: EscopoIdempotente,
    @Body() entrada: ExecutarJobDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResultadoJobInatividade> {
    const dataReferencia = entrada.dataReferencia ?? dataDeHoje();
    const resposta = await this.idempotencia.executar(
      {
        ...escopo,
        subjectRef: SUJEITO_AGENDADOR,
        payload: { dataReferencia: entrada.dataReferencia ?? null },
      },
      async () => ({
        status: STATUS_OK,
        corpo: await this.inatividade.processar(dataReferencia),
      }),
    );
    res.status(resposta.status);
    return resposta.corpo;
  }
}

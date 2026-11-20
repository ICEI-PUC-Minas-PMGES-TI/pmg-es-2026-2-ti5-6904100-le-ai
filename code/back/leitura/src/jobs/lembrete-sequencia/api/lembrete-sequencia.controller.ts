import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Publico } from '../../../auth/publico.decorator';
import { IdempotencyKey } from '../../../common/idempotencia/idempotency-key.decorator';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../../common/idempotencia/idempotencia.constantes';
import { IdempotenciaService } from '../../../common/idempotencia/idempotencia.service';
import { SUJEITO_AGENDADOR } from '../../inatividade/api/inatividade.controller';
import { SchedulerTokenGuard } from '../../inatividade/api/scheduler-token.guard';
import {
  LembreteSequenciaService,
  type ResultadoJobLembreteSequencia,
} from '../aplicacao/lembrete-sequencia.service';

/** Corpo vazio: o instante de referência é sempre o do servidor. */
export class ExecutarLembreteDto {}

const STATUS_OK = 200;

/**
 * `POST /internal/jobs/lembrete-sequencia` (F-GAM-OPC), chamado uma vez por
 * dia pelo agendador (`job-lembrete-sequencia.yml`), com o mesmo
 * `X-Scheduler-Token` e o mesmo sujeito do job de inatividade.
 */
@Controller('internal/jobs/lembrete-sequencia')
export class LembreteSequenciaController {
  constructor(
    private readonly idempotencia: IdempotenciaService,
    private readonly lembretes: LembreteSequenciaService,
  ) {}

  @Post()
  @Publico()
  @UseGuards(SchedulerTokenGuard)
  async executar(
    @IdempotencyKey() chave: string,
    @Body() _entrada: ExecutarLembreteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResultadoJobLembreteSequencia> {
    const resposta = await this.idempotencia.executar(
      {
        operacao: operacaoNoCaminho(OPERACOES.ENVIAR_LEMBRETES_SEQUENCIA),
        chave,
        subjectRef: SUJEITO_AGENDADOR,
        payload: {},
      },
      async () => ({
        status: STATUS_OK,
        corpo: await this.lembretes.processar(),
      }),
    );
    res.status(resposta.status);
    return resposta.corpo;
  }
}

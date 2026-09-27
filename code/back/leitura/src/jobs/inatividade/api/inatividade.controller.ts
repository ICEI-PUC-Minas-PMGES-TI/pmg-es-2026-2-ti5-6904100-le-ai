import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Publico } from '../../../auth/publico.decorator';
import { IdempotencyKey } from '../../../common/idempotencia/idempotency-key.decorator';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../../common/idempotencia/idempotencia.constantes';
import { IdempotenciaService } from '../../../common/idempotencia/idempotencia.service';
import { ExecutarJobDto } from './dto/executar-job.dto';
import {
  InatividadeService,
  type ResultadoJobInatividade,
  dataDeHoje,
} from '../aplicacao/inatividade.service';
import { SchedulerTokenGuard } from './scheduler-token.guard';

export const SUJEITO_AGENDADOR = '00000000-0000-0000-0000-000000000001';

const STATUS_OK = 200;

@Controller('internal/jobs/inatividade')
export class InatividadeController {
  constructor(
    private readonly idempotencia: IdempotenciaService,
    private readonly inatividade: InatividadeService,
  ) {}

  @Post()
  @Publico()
  @UseGuards(SchedulerTokenGuard)
  async executar(
    @IdempotencyKey() chave: string,
    @Body() entrada: ExecutarJobDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResultadoJobInatividade> {
    const dataReferencia = entrada.dataReferencia ?? dataDeHoje();
    const resposta = await this.idempotencia.executar(
      {
        operacao: operacaoNoCaminho(OPERACOES.PROCESSAR_INATIVIDADE_LEITURAS),
        chave,
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

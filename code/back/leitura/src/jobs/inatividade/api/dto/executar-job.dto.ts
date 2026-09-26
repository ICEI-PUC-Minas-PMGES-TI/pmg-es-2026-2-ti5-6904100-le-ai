import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** `ExecutarJobEntrada` de `docs/api/leitura.yaml`. */
export class ExecutarJobDto {
  @IsOptional()
  @Matches(DATA, {
    message: 'dataReferencia deve estar no formato AAAA-MM-DD.',
  })
  @IsISO8601(
    { strict: true },
    { message: 'dataReferencia deve ser uma data válida.' },
  )
  dataReferencia?: string;
}

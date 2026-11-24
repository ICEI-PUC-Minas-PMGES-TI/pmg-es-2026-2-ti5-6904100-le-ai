import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

/** Consulta de `GET /me/sequencia/calendario`. */
export class ConsultaCalendarioDto {
  @ApiPropertyOptional({
    description: 'Mês no formato AAAA-MM. Ausente, o mês corrente.',
    example: '2026-09',
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'mes deve estar no formato AAAA-MM.',
  })
  mes?: string;
}

/** `CalendarioSequencia` do contrato (RF-GAM-04). */
export class CalendarioSequenciaDto {
  @ApiProperty({ example: '2026-09', description: 'Mês devolvido, AAAA-MM.' })
  mes!: string;

  @ApiProperty({
    example: '2026-09',
    description:
      'Mês corrente no último fuso do dispositivo; limite à frente da navegação.',
  })
  mesAtual!: string;

  @ApiProperty({
    example: '2026-04',
    description:
      'Mês mais antigo disponível na janela; limite para trás da navegação.',
  })
  mesMaisAntigo!: string;

  @ApiProperty({
    format: 'date',
    example: '2026-09-24',
    description: 'Dia corrente no mesmo fuso que apura a sequência.',
  })
  hoje!: string;

  @ApiProperty({
    type: [String],
    format: 'date',
    description: 'Dias do mês com leitura, em ordem crescente, sem repetição.',
    example: ['2026-09-01', '2026-09-02', '2026-09-24'],
  })
  dias!: string[];
}

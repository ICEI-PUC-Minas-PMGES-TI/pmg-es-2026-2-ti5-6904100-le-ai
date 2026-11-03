import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const MENSAGEM_PERIODO = 'Informe um ano com quatro dígitos ou "acumulado".';

/** `?periodo=` do painel próprio: um ano ou `acumulado`; ausente é o ano corrente. */
export class ConsultaEstatisticasDto {
  @ApiPropertyOptional({
    description:
      'Ano de calendário (`2026`) ou `acumulado`; ausente, o ano corrente.',
    example: '2026',
    pattern: '^([1-9][0-9]{3}|acumulado)$',
  })
  @IsOptional()
  @Matches(/^([1-9]\d{3}|acumulado)$/, { message: MENSAGEM_PERIODO })
  periodo?: string;
}

/** `?ano=` do recorte de perfil; ausente é o ano corrente. */
export class ConsultaEstatisticasPerfilDto {
  @ApiPropertyOptional({
    minimum: 1000,
    maximum: 9999,
    description: 'Ano de calendário; ausente, o ano corrente.',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Informe um ano inteiro.' })
  @Min(1000, { message: 'Informe um ano com quatro dígitos.' })
  @Max(9999, { message: 'Informe um ano com quatro dígitos.' })
  ano?: number;
}

export class TotaisEstatisticaDto {
  @ApiProperty({
    minimum: 0,
    description:
      'Leituras concluídas no período, pela data de fim; releituras contam como ocorrências próprias.',
    example: 9,
  })
  livrosConcluidos!: number;

  @ApiProperty({
    minimum: 0,
    description:
      'Páginas derivadas das atualizações de progresso (RN-17.1), inclusive de leituras abandonadas (RN-04).',
    example: 3818,
  })
  paginasLidas!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Minutos informados nas atualizações de progresso.',
    example: 5130,
  })
  minutosLidos!: number;
}

export class PaginasPorDiaDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Páginas por dia com leitura, uma casa decimal; nulo sem dia com leitura.',
    example: 20.4,
  })
  valor!: number | null;

  @ApiProperty({ minimum: 0, example: 3818 })
  paginasLidas!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Datas locais distintas com progresso no período.',
    example: 187,
  })
  diasComLeitura!: number;
}

export class DiasPorLivroDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Dias por leitura concluída, uma casa decimal; nulo sem leitura concluída.',
    example: 19.1,
  })
  valor!: number | null;

  @ApiProperty({
    minimum: 0,
    description:
      'Soma de `dataFim − dataInicio + 1` das leituras concluídas no período, com dias sem leitura e intervalos de abandono.',
    example: 172,
  })
  dias!: number;

  @ApiProperty({ minimum: 0, example: 9 })
  leiturasConcluidas!: number;
}

export class NotaMediaDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 5,
    description:
      'Média das notas dadas no período, uma casa decimal; nulo sem nota.',
    example: 4.1,
  })
  valor!: number | null;

  @ApiProperty({
    minimum: 0,
    description:
      'Notas dadas no período, pela data da última vez que foram dadas (fuso America/Sao_Paulo).',
    example: 8,
  })
  quantidade!: number;
}

export class MediasEstatisticaDto {
  @ApiProperty({ type: PaginasPorDiaDto })
  paginasPorDia!: PaginasPorDiaDto;

  @ApiProperty({ type: DiasPorLivroDto })
  diasPorLivro!: DiasPorLivroDto;

  @ApiProperty({ type: NotaMediaDto })
  notaMedia!: NotaMediaDto;
}

export class AnoComRegistroDto {
  @ApiProperty({ example: 2026 })
  ano!: number;

  @ApiProperty({ minimum: 0, example: 9 })
  livrosConcluidos!: number;
}

/** `Estatisticas` do contrato (RF-STA-01/02). */
export class EstatisticasDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Ano do recorte; nulo no acumulado.',
    example: 2026,
  })
  ano!: number | null;

  @ApiProperty({
    type: [AnoComRegistroDto],
    description:
      'Anos com progresso ou leitura concluída, do mais recente ao mais antigo, para o seletor.',
  })
  anos!: AnoComRegistroDto[];

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description:
      'Primeira data com progresso ou fim de leitura concluída; nulo sem registro.',
    example: '2023-11-12',
  })
  primeiroRegistro!: string | null;

  @ApiProperty({ type: TotaisEstatisticaDto })
  totais!: TotaisEstatisticaDto;

  @ApiProperty({ type: MediasEstatisticaDto })
  medias!: MediasEstatisticaDto;
}

export class PontoEstatisticaDto {
  @ApiProperty({ example: 2026 })
  ano!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 12,
    description: 'Mês (1–12) na série mensal; nulo na série anual.',
    example: 9,
  })
  mes!: number | null;

  @ApiProperty({ minimum: 0, example: 412 })
  paginasLidas!: number;

  @ApiProperty({ minimum: 0, example: 1 })
  livrosConcluidos!: number;
}

/** `GraficosEstatisticas` do contrato (RF-STA-03). */
export class GraficosEstatisticasDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Ano do recorte; nulo no acumulado.',
    example: 2026,
  })
  ano!: number | null;

  @ApiProperty({
    enum: ['mes', 'ano'],
    description: 'Um ponto por mês num ano; um ponto por ano no acumulado.',
  })
  granularidade!: 'mes' | 'ano';

  @ApiProperty({ type: [PontoEstatisticaDto] })
  pontos!: PontoEstatisticaDto[];
}

/** `EstatisticasPerfil` do contrato: o recorte do ano no perfil (RN-08). */
export class EstatisticasPerfilDto extends TotaisEstatisticaDto {
  @ApiProperty({ example: 2026 })
  ano!: number;
}

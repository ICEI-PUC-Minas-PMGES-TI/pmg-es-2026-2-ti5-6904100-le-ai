import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsTimeZone,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../../estante/api/dto/estante.dto';
import {
  PAGINA_MAXIMA,
  PaginacaoDto,
} from '../../../perfis/dto/resenhas-do-perfil.dto';
import {
  MINUTOS_MAXIMOS,
  MINUTOS_MINIMOS,
  PERCENTUAL_MAXIMO,
} from '../../dominio/progresso';

const MENSAGEM_PAGINA = 'Informe uma página inteira a partir de 1.';
const MENSAGEM_MINUTOS = `Informe os minutos como inteiro entre ${MINUTOS_MINIMOS} e ${MINUTOS_MAXIMOS}.`;

export class CriarProgressoEntradaDto {
  @ApiProperty({
    minimum: 1,
    description: 'Página absoluta em que o leitor parou.',
  })
  @IsInt({ message: MENSAGEM_PAGINA })
  @Min(1, { message: MENSAGEM_PAGINA })
  pagina!: number;

  @ApiProperty({ minimum: MINUTOS_MINIMOS, maximum: MINUTOS_MAXIMOS })
  @IsInt({ message: MENSAGEM_MINUTOS })
  @Min(MINUTOS_MINIMOS, { message: MENSAGEM_MINUTOS })
  @Max(MINUTOS_MAXIMOS, { message: MENSAGEM_MINUTOS })
  minutos!: number;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601(
    { strict: true },
    { message: 'Informe o instante de registro em ISO 8601.' },
  )
  registradoEmDispositivo!: string;

  @ApiProperty({
    example: 'America/Sao_Paulo',
    description: 'Identificador IANA capturado automaticamente.',
  })
  @IsTimeZone({ message: 'Informe um fuso horário IANA válido.' })
  fusoHorarioDispositivo!: string;
}

export class EditarProgressoEntradaDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt({ message: MENSAGEM_PAGINA })
  @Min(1, { message: MENSAGEM_PAGINA })
  pagina?: number;

  @ApiPropertyOptional({ minimum: MINUTOS_MINIMOS, maximum: MINUTOS_MAXIMOS })
  @IsOptional()
  @IsInt({ message: MENSAGEM_MINUTOS })
  @Min(MINUTOS_MINIMOS, { message: MENSAGEM_MINUTOS })
  @Max(MINUTOS_MAXIMOS, { message: MENSAGEM_MINUTOS })
  minutos?: number;
}

export class ExcluirProgressoEntradaDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Último registro que o usuário viu e confirmou remover.',
  })
  @IsUUID('all', { message: 'Informe um identificador de progresso válido.' })
  ultimoProgressoIdConfirmado!: string;
}

export class ConsultaProgressoDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINA_MAXIMA,
    default: PAGINA_PADRAO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Informe uma página inteira.' })
  @Min(1, { message: 'A página começa em 1.' })
  @Max(PAGINA_MAXIMA, {
    message: `A página deve ser no máximo ${PAGINA_MAXIMA}.`,
  })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LIMITE_MAXIMO,
    default: LIMITE_PADRAO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Informe um limite inteiro.' })
  @Min(1, { message: 'O limite mínimo é 1.' })
  limite?: number;
}

export class ProgressoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  leituraId!: string;

  @ApiProperty({ minimum: 1 })
  posicao!: number;

  @ApiProperty({ minimum: 1 })
  pagina!: number;

  @ApiProperty({ minimum: 0 })
  paginaAnterior!: number;

  @ApiProperty({ minimum: 1 })
  paginasLidas!: number;

  @ApiProperty({ minimum: MINUTOS_MINIMOS, maximum: MINUTOS_MAXIMOS })
  minutos!: number;

  @ApiProperty({ format: 'date-time' })
  registradoEmDispositivo!: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  fusoHorarioDispositivo!: string;

  @ApiProperty({ format: 'date' })
  dataLocal!: string;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  atualizadoEm!: string | null;
}

export class ResumoProgressoDto {
  @ApiProperty({ minimum: 0 })
  paginaAtual!: number;

  @ApiProperty({ minimum: 1 })
  totalPaginas!: number;

  @ApiProperty({ format: 'float', minimum: 0, maximum: PERCENTUAL_MAXIMO })
  percentualConcluido!: number;
}

export class ProgressoComResumoDto {
  @ApiProperty({ type: ProgressoDto })
  progresso!: ProgressoDto;

  @ApiProperty({ type: ResumoProgressoDto })
  resumo!: ResumoProgressoDto;
}

export class PaginaProgressoDto {
  @ApiProperty({ type: [ProgressoDto] })
  itens!: ProgressoDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;

  @ApiProperty({ type: ResumoProgressoDto })
  resumo!: ResumoProgressoDto;

  @ApiProperty({
    description:
      'Verdadeiro para ocorrência finalizada ou historicamente fechada.',
  })
  somenteLeitura!: boolean;
}

export class ExclusaoProgressoResultadoDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1 })
  idsRemovidos!: string[];

  @ApiProperty({ type: ResumoProgressoDto })
  resumo!: ResumoProgressoDto;
}

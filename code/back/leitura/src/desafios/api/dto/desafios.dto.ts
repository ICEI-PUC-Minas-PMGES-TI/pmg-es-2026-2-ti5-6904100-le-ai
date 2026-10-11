import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsTimeZone, Max, Min } from 'class-validator';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../../estante/api/dto/estante.dto';
import {
  PAGINA_MAXIMA,
  PaginacaoDto,
} from '../../../perfis/dto/resenhas-do-perfil.dto';
import { ALVO_MINIMO, UNIDADES, type Unidade } from '../../dominio/desafio';
import { PERIODICIDADES, type Periodicidade } from '../../dominio/janelas';

const MENSAGEM_UNIDADE = 'Escolha a unidade: páginas, minutos ou livros.';
const MENSAGEM_JANELA = 'Escolha a janela: diária, semanal, mensal ou anual.';
const MENSAGEM_ALVO = 'Informe o alvo como número inteiro maior que zero.';
const MENSAGEM_FUSO = 'Informe um fuso horário IANA válido.';
const DESCRICAO_ALVO =
  'Inteiro positivo; o teto depende da unidade: 100.000 páginas, 100.000 minutos ou 1.000 livros (422 acima dele).';
const DESCRICAO_FUSO =
  'Identificador IANA do dispositivo. Define o dia de hoje e, com ele, a janela corrente (RN-20.1).';

export class CriarDesafioEntradaDto {
  @ApiProperty({ enum: UNIDADES })
  @IsIn(UNIDADES, { message: MENSAGEM_UNIDADE })
  unidade!: Unidade;

  @ApiProperty({ enum: PERIODICIDADES })
  @IsIn(PERIODICIDADES, { message: MENSAGEM_JANELA })
  janela!: Periodicidade;

  @ApiProperty({ minimum: ALVO_MINIMO, description: DESCRICAO_ALVO })
  @IsInt({ message: MENSAGEM_ALVO })
  @Min(ALVO_MINIMO, { message: MENSAGEM_ALVO })
  valorAlvo!: number;

  @ApiProperty({ example: 'America/Sao_Paulo', description: DESCRICAO_FUSO })
  @IsTimeZone({ message: MENSAGEM_FUSO })
  fusoHorario!: string;
}

export class EditarDesafioEntradaDto {
  @ApiPropertyOptional({ enum: UNIDADES })
  @IsOptional()
  @IsIn(UNIDADES, { message: MENSAGEM_UNIDADE })
  unidade?: Unidade;

  @ApiPropertyOptional({ enum: PERIODICIDADES })
  @IsOptional()
  @IsIn(PERIODICIDADES, { message: MENSAGEM_JANELA })
  janela?: Periodicidade;

  @ApiPropertyOptional({ minimum: ALVO_MINIMO, description: DESCRICAO_ALVO })
  @IsOptional()
  @IsInt({ message: MENSAGEM_ALVO })
  @Min(ALVO_MINIMO, { message: MENSAGEM_ALVO })
  valorAlvo?: number;

  @ApiProperty({ example: 'America/Sao_Paulo', description: DESCRICAO_FUSO })
  @IsTimeZone({ message: MENSAGEM_FUSO })
  fusoHorario!: string;
}

export class ConsultaDesafiosDto {
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

export class JanelaDesafioDto {
  @ApiProperty({ format: 'date', description: 'Primeiro dia da janela.' })
  inicio!: string;

  @ApiProperty({ format: 'date', description: 'Último dia da janela.' })
  fim!: string;

  @ApiProperty({
    minimum: 0,
    description:
      'Soma na unidade do desafio dos registros da janela, fora das pausas.',
  })
  acumulado!: number;

  @ApiProperty({ description: 'O acumulado atingiu o alvo (RN-20.8).' })
  cumprida!: boolean;
}

export class DesafioDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: UNIDADES })
  unidade!: Unidade;

  @ApiProperty({ enum: PERIODICIDADES })
  janela!: Periodicidade;

  @ApiProperty({ minimum: ALVO_MINIMO })
  valorAlvo!: number;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  fusoHorario!: string;

  @ApiProperty()
  pausado!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Início da pausa em curso; nulo quando ativo.',
  })
  pausadoDesde!: string | null;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: string;

  @ApiProperty({
    type: JanelaDesafioDto,
    description:
      'Janela de calendário corrente. Enquanto pausado, não é avaliada (RN-20.6).',
  })
  janelaCorrente!: JanelaDesafioDto;
}

export class PaginaDesafiosDto {
  @ApiProperty({ type: [DesafioDto] })
  itens!: DesafioDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;
}

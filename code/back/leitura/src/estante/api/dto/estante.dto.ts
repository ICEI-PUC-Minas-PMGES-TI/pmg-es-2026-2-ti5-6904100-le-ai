import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import {
  type LivroItemEstante,
  ORDENACAO_PADRAO,
  ORDENACOES_ESTANTE,
  type OrdenacaoEstante,
} from '../../dominio/estante';
import {
  STATUS_ESTANTE_API,
  type StatusEstanteApi,
} from '../../../common/status-estante-api';

export const PAGINA_PADRAO = 1;
export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 50;

export class AdicionarEstanteEntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Informe um identificador de livro válido.' })
  livroId!: string;
}

export class ConsultaEstanteDto {
  @ApiPropertyOptional({ enum: STATUS_ESTANTE_API })
  @IsOptional()
  @IsIn(STATUS_ESTANTE_API, { message: 'Status de estante inválido.' })
  status?: StatusEstanteApi;

  @ApiPropertyOptional({ enum: ORDENACOES_ESTANTE, default: ORDENACAO_PADRAO })
  @IsOptional()
  @IsIn(ORDENACOES_ESTANTE, { message: 'Ordenação inválida.' })
  ordenacao?: OrdenacaoEstante;

  @ApiPropertyOptional({ minimum: 1, default: PAGINA_PADRAO })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Informe uma página inteira.' })
  @Min(1, { message: 'A página começa em 1.' })
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

export interface ItemEstante {
  livroId: string;
  livro: LivroItemEstante;
  status: StatusEstanteApi;
  vezesLido: number;
  leituraEmAndamentoId: string | null;
  ultimaLeituraId: string | null;
  retomavel: boolean;
  paginaAtual: number | null;
  totalPaginas: number | null;
  percentualConcluido: number | null;
  adicionadoEm: string;
}

export type TotaisEstante = Record<StatusEstanteApi, number>;

export interface Paginacao {
  page: number;
  limite: number;
  totalItens: number;
  totalPaginas: number;
}

export interface PaginaEstante {
  itens: ItemEstante[];
  paginacao: Paginacao;
  totaisPorStatus: TotaisEstante;
}

export interface ConclusoesLivro {
  livroId: string;
  vezesLido: number;
}

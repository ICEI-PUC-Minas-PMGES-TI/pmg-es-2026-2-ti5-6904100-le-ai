import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ResenhaResumoDto } from '../../pessoal/dto/livro-pessoal.dto';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  LivroOficialResumoDto,
} from './busca.dto';

/** Primeira página de resenhas embutida na página do livro. */
export const RESENHAS_NA_PAGINA = 10;

export class ResenhasQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Cursor inválido. Recomece pela primeira página.' })
  @MinLength(1, { message: 'Cursor inválido. Recomece pela primeira página.' })
  @MaxLength(500, {
    message: 'Cursor inválido. Recomece pela primeira página.',
  })
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LIMITE_MAXIMO,
    default: LIMITE_PADRAO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser pelo menos 1.' })
  @Max(LIMITE_MAXIMO, {
    message: `O limite deve ser no máximo ${LIMITE_MAXIMO}.`,
  })
  limit?: number;
}

export class SinopseDto {
  @ApiProperty({
    enum: [
      'nao_consultada',
      'pendente',
      'disponivel',
      'ausente',
      'falha_transitoria',
    ],
  })
  status!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    maxLength: 4000,
    description: 'Só em disponivel.',
  })
  texto!: string | null;
}

export class PaginaResenhasDto {
  @ApiProperty({ type: [ResenhaResumoDto] }) itens!: ResenhaResumoDto[];
  @ApiProperty({ type: 'integer', minimum: 1, maximum: LIMITE_MAXIMO })
  limit!: number;
  @ApiProperty({ type: String, nullable: true })
  proximoCursor!: string | null;
}

/** Série da ficha do livro (F-ACV-DESCOBERTA): link e número de ordem. */
export class SerieDoLivroDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    nullable: true,
    description: 'Número de ordem na série; null quando a fonte não o tem.',
  })
  numero!: number | null;
}

/**
 * Página do livro oficial (RF-ACV-04). `resenhas` é `required` **e** `nullable`:
 * `null` quer dizer que os contratos de `leitura` ou `identidade` estão
 * indisponíveis, e a página abre mesmo assim.
 */
export class LivroOficialDetalheDto extends LivroOficialResumoDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Leva à página da editora; null sem editora.',
  })
  editoraId!: string | null;
  @ApiProperty({
    type: SerieDoLivroDto,
    nullable: true,
    description: 'null quando o livro não pertence a uma série.',
  })
  serie!: SerieDoLivroDto | null;
  @ApiProperty({ pattern: '^97[89][0-9]{10}$' }) isbn!: string;
  @ApiProperty({ type: SinopseDto }) sinopse!: SinopseDto;
  @ApiProperty({ type: PaginaResenhasDto, nullable: true })
  resenhas!: PaginaResenhasDto | null;
}

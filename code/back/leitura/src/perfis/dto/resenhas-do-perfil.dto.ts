import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const LIMITE_MAXIMO = 50;
export const LIMITE_PADRAO = 20;
/** Teto da página: sem ele, `page=1e20` estoura o `OFFSET` do banco e vira 500. */
export const PAGINA_MAXIMA = 10000;

/** `page` e `limite` do contrato: página iniciada em 1, limite imposto pelo servidor (RNF-DES-02). */
export class PaginacaoQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: PAGINA_MAXIMA, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
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
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser pelo menos 1.' })
  @Max(LIMITE_MAXIMO, {
    message: `O limite deve ser no máximo ${LIMITE_MAXIMO}.`,
  })
  limite?: number;
}

/** `LivroDaResenha` do contrato: o que o card do perfil mostra do livro. */
export class LivroDaResenhaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['oficial', 'pessoal'] })
  tipo!: 'oficial' | 'pessoal';

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ type: String, nullable: true })
  autor!: string | null;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  capaUrl!: string | null;
}

/** `ResenhaDoPerfil` do contrato. */
export class ResenhaDoPerfilDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  usuarioId!: string;

  @ApiProperty({ format: 'uuid' })
  livroId!: string;

  @ApiProperty({ maxLength: 5000 })
  texto!: string;

  @ApiProperty()
  spoiler!: boolean;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: string;

  @ApiProperty({ format: 'date-time' })
  atualizadoEm!: string;

  @ApiProperty({ type: LivroDaResenhaDto })
  livro!: LivroDaResenhaDto;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 5,
    multipleOf: 0.5,
  })
  nota!: number | null;
}

export class PaginacaoDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: LIMITE_MAXIMO })
  limite!: number;

  @ApiProperty({ minimum: 0 })
  totalItens!: number;

  @ApiProperty({ minimum: 0 })
  totalPaginas!: number;
}

/** `PaginaResenhasPerfil` do contrato. */
export class PaginaResenhasPerfilDto {
  @ApiProperty({ type: [ResenhaDoPerfilDto] })
  itens!: ResenhaDoPerfilDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;
}

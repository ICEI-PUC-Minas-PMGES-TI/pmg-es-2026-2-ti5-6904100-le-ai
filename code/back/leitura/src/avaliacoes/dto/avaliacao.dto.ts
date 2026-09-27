import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

/**
 * Entrada de `PUT /livros/{livroId}/nota` (`NotaEntrada` no contrato).
 *
 * O DTO só garante que `valor` é número: texto, nulo ou ausente é 400. A faixa
 * e o passo de 0,5 são regra de negócio (RN-06) e dão 422 no serviço — por
 * isso não há `@Min`/`@Max` aqui, que responderiam 400.
 */
export class NotaEntradaDto {
  @ApiProperty({
    type: Number,
    format: 'float',
    minimum: 0,
    maximum: 5,
    multipleOf: 0.5,
    example: 4.5,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'Informe a nota como número.' },
  )
  valor!: number;
}

/** `Nota` do contrato. */
export class NotaDto {
  @ApiProperty({ format: 'uuid' })
  livroId!: string;

  @ApiProperty({
    type: Number,
    format: 'float',
    minimum: 0,
    maximum: 5,
    multipleOf: 0.5,
  })
  valor!: number;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: string;

  @ApiProperty({ format: 'date-time' })
  atualizadoEm!: string;
}

/** `Resenha` do contrato. */
export class ResenhaDto {
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
}

/** `MinhaAvaliacao` do contrato: ausente é `null`, nunca valor inventado. */
export class MinhaAvaliacaoDto {
  @ApiProperty({ format: 'uuid' })
  livroId!: string;

  @ApiProperty({ type: NotaDto, nullable: true })
  nota!: NotaDto | null;

  @ApiProperty({ type: ResenhaDto, nullable: true })
  resenha!: ResenhaDto | null;
}

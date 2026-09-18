import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Entrada de `POST /livros/pessoal` (RF-ACV-08).
 *
 * **Sem ISBN**, e não por esquecimento: RN-02 diz que em livro pessoal o campo
 * é ausente, não vazio, e não participa de nenhuma restrição de unicidade. O
 * CHECK `livro_oficial_pessoal_ck` recusa livro pessoal com `isbn13`.
 *
 * `paginas` é obrigatório porque o progresso por página depende dele (RN-12 usa
 * o mesmo argumento para descartar livro sem total de páginas na ingestão).
 */
export class LivroPessoalEntradaDto {
  @ApiProperty({ minLength: 1, maxLength: 500, example: 'Caderno de viagem' })
  @IsString({ message: 'Informe o título do livro.' })
  @MinLength(1, { message: 'Informe o título do livro.' })
  @MaxLength(500, { message: 'O título deve ter no máximo 500 caracteres.' })
  titulo!: string;

  @ApiProperty({ minLength: 1, maxLength: 200, example: 'Marina Albuquerque' })
  @IsString({ message: 'Informe o autor do livro.' })
  @MinLength(1, { message: 'Informe o autor do livro.' })
  @MaxLength(200, { message: 'O autor deve ter no máximo 200 caracteres.' })
  autor!: string;

  @ApiProperty({ minimum: 1, example: 180 })
  @IsInt({ message: 'Informe o número de páginas.' })
  @Min(1, { message: 'O número de páginas deve ser maior que zero.' })
  paginas!: number;

  @ApiPropertyOptional({ maxLength: 4000, nullable: true })
  @IsOptional()
  @IsString({ message: 'A sinopse deve ser um texto.' })
  @MaxLength(4000, { message: 'A sinopse deve ter no máximo 4000 caracteres.' })
  sinopse?: string | null;

  @ApiPropertyOptional({
    format: 'uri',
    nullable: true,
    description: 'URL do asset já enviado diretamente ao serviço de imagens.',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe uma URL de capa válida.' },
  )
  capaUrl?: string | null;
}

/**
 * Entrada do `PATCH` (RF-ACV-09). Todos os campos opcionais, mas o contrato
 * exige `minProperties: 1` — corpo vazio não é atualização, é erro.
 *
 * Atenção ao que `null` significa aqui: **ausente preserva, `null` limpa**. O
 * service só aplica as chaves que vieram no corpo, e por isso o controller
 * precisa olhar o corpo cru — depois do `ValidationPipe`, `sinopse: null` e
 * `sinopse` ausente ficam indistinguíveis no DTO.
 */
export class LivroPessoalAtualizacaoDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Informe o título do livro.' })
  @MinLength(1, { message: 'Informe o título do livro.' })
  @MaxLength(500, { message: 'O título deve ter no máximo 500 caracteres.' })
  titulo?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'Informe o autor do livro.' })
  @MinLength(1, { message: 'Informe o autor do livro.' })
  @MaxLength(200, { message: 'O autor deve ter no máximo 200 caracteres.' })
  autor?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt({ message: 'Informe o número de páginas.' })
  @Min(1, { message: 'O número de páginas deve ser maior que zero.' })
  paginas?: number;

  @ApiPropertyOptional({ maxLength: 4000, nullable: true })
  @IsOptional()
  @IsString({ message: 'A sinopse deve ser um texto.' })
  @MaxLength(4000, { message: 'A sinopse deve ter no máximo 4000 caracteres.' })
  sinopse?: string | null;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe uma URL de capa válida.' },
  )
  capaUrl?: string | null;
}

/** Nota individual do dono. Nunca média nem contagem (RN-03). */
export class NotaDoDonoDto {
  @ApiProperty({ minimum: 0, maximum: 5, multipleOf: 0.5, example: 4.5 })
  valor!: number;
}

export class ResenhaResumoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) autorId!: string;
  @ApiProperty() autorNome!: string;
  @ApiPropertyOptional({ nullable: true }) autorAvatarUrl!: string | null;
  @ApiProperty() texto!: string;
  @ApiProperty() spoiler!: boolean;
  @ApiProperty({ format: 'date-time' }) criadoEm!: string;
  @ApiProperty({ format: 'date-time' }) atualizadoEm!: string;
}

/**
 * Saída das quatro operações de livro pessoal.
 *
 * `notaDoDono` e `resenhaDoDono` são `required` **e** `nullable` no contrato:
 * precisam estar presentes com valor `null` quando não existem, nunca ausentes.
 * Por isso o service monta o objeto literal em vez de usar `plainToInstance`,
 * que omitiria as chaves indefinidas.
 */
export class LivroPessoalDetalheDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['pessoal'] }) tipo!: 'pessoal';
  @ApiProperty({ format: 'uuid' }) donoId!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() autor!: string;
  @ApiProperty({ minimum: 1 }) paginas!: number;
  @ApiProperty({ nullable: true }) sinopse!: string | null;
  @ApiProperty({ nullable: true, format: 'uri' }) capaUrl!: string | null;

  @ApiProperty({
    description:
      'true para terceiro autorizado por RN-15; false para o dono. Em modo consulta o cliente não oferece estante, favorito, leitura nem progresso.',
  })
  modoConsulta!: boolean;

  @ApiProperty({ type: NotaDoDonoDto, nullable: true })
  notaDoDono!: NotaDoDonoDto | null;

  @ApiProperty({ type: ResenhaResumoDto, nullable: true })
  resenhaDoDono!: ResenhaResumoDto | null;
}

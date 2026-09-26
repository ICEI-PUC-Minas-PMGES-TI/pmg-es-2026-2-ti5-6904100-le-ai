import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 50;

/**
 * Query de `GET /livros` (RF-ACV-01, RF-ACV-02).
 *
 * O `ValidationPipe` global converte com `transform`, mas sem conversão
 * implícita: `page` e `limit` chegam como texto e só viram número pelo
 * `@Type`. O `q` é aparado **antes** de validar, então só espaços vira texto
 * vazio e cai no `MinLength`, com o erro no campo `q`.
 *
 * "Sem `q` e sem `assunto`" não cabe num decorator de campo; quem recusa é o
 * service.
 */
export class BuscaLivrosQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Informe um texto de busca.' })
  @MinLength(1, { message: 'Informe um texto de busca.' })
  @MaxLength(200, {
    message: 'O texto de busca deve ter no máximo 200 caracteres.',
  })
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Informe um assunto válido.' })
  assunto?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
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
  limit?: number;
}

export class AutorResumoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
}

export class AssuntoResumoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
}

export class ListaAssuntosDto {
  @ApiProperty({ type: [AssuntoResumoDto], maxItems: 100 })
  itens!: AssuntoResumoDto[];
}

export class CapaDto {
  @ApiProperty({ format: 'uri', nullable: true }) url!: string | null;
  @ApiProperty({ enum: ['propria', 'externa', 'placeholder'] })
  origem!: 'propria' | 'externa' | 'placeholder';
}

/**
 * Uma edição (RN-01). `editora` e `anoPublicacao` são `required` **e**
 * `nullable`: parte do acervo carregado não os tem, e a chave vem com `null`
 * em vez de sumir. `autores` pode vir vazio pelo mesmo motivo.
 */
export class LivroOficialResumoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty({ type: [AutorResumoDto] }) autores!: AutorResumoDto[];
  @ApiProperty({ nullable: true }) editora!: string | null;
  @ApiProperty({ nullable: true }) anoPublicacao!: number | null;
  @ApiProperty({ minimum: 1 }) paginas!: number;
  @ApiProperty({ type: CapaDto }) capa!: CapaDto;
  @ApiProperty({ type: [AssuntoResumoDto] }) assuntos!: AssuntoResumoDto[];
}

export class PaginaLivrosDto {
  @ApiProperty({ type: [LivroOficialResumoDto] })
  itens!: LivroOficialResumoDto[];
  @ApiProperty({ minimum: 1 }) page!: number;
  @ApiProperty({ minimum: 1, maximum: LIMITE_MAXIMO }) limit!: number;
  @ApiProperty({ minimum: 0 }) totalItens!: number;
  @ApiProperty({ minimum: 0 }) totalPaginas!: number;
}

import { applyDecorators } from '@nestjs/common';
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
export const PAGINA_MAXIMA = 100_000;
export const ANO_MAXIMO = 9999;
export const PAGINAS_MAXIMAS = 100_000;

/**
 * Caractere de controle vira espaço e as pontas são aparadas **antes** de
 * validar: só espaços vira texto vazio e cai no `MinLength` do próprio campo.
 * O NUL o Postgres recusa (500), e os outros só chegam por texto colado, onde
 * valiam como separador. Vale para o `q` e para os filtros de texto.
 */
const aparar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').trim() : value;

/**
 * Filtro de texto de RF-ACV-03 (`autor`, `editora`, `serie`): mesmo tratamento
 * e mesmos limites do `q`, com a mensagem no nome do filtro.
 */
function FiltroDeTexto(
  rotulo: string,
  artigo: 'um' | 'uma',
): PropertyDecorator {
  const mensagem = `Informe ${artigo} ${rotulo} para filtrar.`;
  return applyDecorators(
    ApiPropertyOptional({ minLength: 1, maxLength: 200 }),
    IsOptional(),
    Transform(aparar),
    IsString({ message: mensagem }),
    MinLength(1, { message: mensagem }),
    MaxLength(200, {
      message: `O filtro de ${rotulo} deve ter no máximo 200 caracteres.`,
    }),
  );
}

/** Número de página do livro, nos dois lados da faixa de RF-ACV-03. */
function LimiteDePaginas(lado: 'mínimo' | 'máximo'): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({ minimum: 1, maximum: PAGINAS_MAXIMAS }),
    IsOptional(),
    Type(() => Number),
    IsInt({
      message: `O número ${lado} de páginas deve ser um número inteiro.`,
    }),
    Min(1, { message: `O número ${lado} de páginas deve ser pelo menos 1.` }),
    Max(PAGINAS_MAXIMAS, {
      message: `O número ${lado} de páginas deve ser no máximo ${PAGINAS_MAXIMAS}.`,
    }),
  );
}

/**
 * Query de `GET /livros` (RF-ACV-01, RF-ACV-02).
 *
 * O `ValidationPipe` global converte com `transform`, mas sem conversão
 * implícita: `page` e `limit` chegam como texto e só viram número pelo
 * `@Type`. O `q` é aparado **antes** de validar, então só espaços vira texto
 * vazio e cai no `MinLength`, com o erro no campo `q`.
 *
 * Os filtros de F-ACV-DESCOBERTA (RF-ACV-03) somam-se ao `q` e ao `assunto`.
 * "Nenhum critério" e "`paginasMin` maior que `paginasMax`" não cabem num
 * decorator de campo; quem recusa é o service.
 */
export class BuscaLivrosQueryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  @IsOptional()
  @Transform(aparar)
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

  @FiltroDeTexto('autor', 'um')
  autor?: string;

  @FiltroDeTexto('editora', 'uma')
  editora?: string;

  @FiltroDeTexto('série', 'uma')
  serie?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: ANO_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(1, { message: 'O ano deve ser pelo menos 1.' })
  @Max(ANO_MAXIMO, { message: `O ano deve ser no máximo ${ANO_MAXIMO}.` })
  ano?: number;

  @LimiteDePaginas('mínimo')
  paginasMin?: number;

  @LimiteDePaginas('máximo')
  paginasMax?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: PAGINA_MAXIMA, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
  // Sem teto, o offset de `page=1e18` estoura o bigint do Postgres (500).
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
  @ApiProperty({ type: String, format: 'uri', nullable: true, required: false })
  url!: string | null;
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
  @ApiProperty({ type: String, nullable: true }) editora!: string | null;
  @ApiProperty({ type: 'integer', nullable: true })
  anoPublicacao!: number | null;
  @ApiProperty({ type: 'integer', minimum: 1 }) paginas!: number;
  @ApiProperty({ type: CapaDto }) capa!: CapaDto;
  @ApiProperty({ type: [AssuntoResumoDto] }) assuntos!: AssuntoResumoDto[];
}

export class PaginaLivrosDto {
  @ApiProperty({ type: [LivroOficialResumoDto] })
  itens!: LivroOficialResumoDto[];
  @ApiProperty({ type: 'integer', minimum: 1 }) page!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: LIMITE_MAXIMO })
  limit!: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) totalItens!: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) totalPaginas!: number;
}

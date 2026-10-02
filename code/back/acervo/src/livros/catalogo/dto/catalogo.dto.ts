import { ApiProperty } from '@nestjs/swagger';
import {
  AutorResumoDto,
  LIMITE_MAXIMO,
  LivroOficialResumoDto,
  PaginaLivrosDto,
} from '../../busca/dto/busca.dto';

/** Teto da biografia (CHECK `autor_biografia_ck`, migration `0005`). */
export const LIMITE_DA_BIOGRAFIA = 2_000;

/**
 * Página de autor (RF-ACV-10). `biografia` é `required` **e** `nullable`:
 * `null` quer dizer que a OpenLibrary não tem biografia, e a seção não é
 * exibida. `livros.totalItens` é o "N livros no acervo", contando edições.
 */
export class PaginaDoAutorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    maxLength: LIMITE_DA_BIOGRAFIA,
    description: 'Texto puro da OpenLibrary, no idioma da fonte.',
  })
  biografia!: string | null;
  @ApiProperty({ type: PaginaLivrosDto }) livros!: PaginaLivrosDto;
}

/** Página de editora (RF-ACV-11): nome canônico (RN-12) e os livros. */
export class PaginaDaEditoraDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ type: PaginaLivrosDto }) livros!: PaginaLivrosDto;
}

/** Card da página de série: o resumo da busca mais o número de ordem. */
export class LivroDaSerieResumoDto extends LivroOficialResumoDto {
  @ApiProperty({ type: 'integer', minimum: 1, nullable: true })
  numeroNaSerie!: number | null;
}

export class PaginaLivrosDaSerieDto {
  @ApiProperty({ type: [LivroDaSerieResumoDto] })
  itens!: LivroDaSerieResumoDto[];
  @ApiProperty({ type: 'integer', minimum: 1 }) page!: number;
  @ApiProperty({ type: 'integer', minimum: 1, maximum: LIMITE_MAXIMO })
  limit!: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) totalItens!: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) totalPaginas!: number;
}

/**
 * Página de série (RF-ACV-12). `autores` são os dos livros oficiais ativos da
 * série, para a linha de autoria.
 */
export class PaginaDaSerieDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ type: [AutorResumoDto] }) autores!: AutorResumoDto[];
  @ApiProperty({ type: PaginaLivrosDaSerieDto })
  livros!: PaginaLivrosDaSerieDto;
}

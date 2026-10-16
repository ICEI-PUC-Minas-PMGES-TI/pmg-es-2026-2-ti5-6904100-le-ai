import { ApiProperty } from '@nestjs/swagger';
import {
  STATUS_ESTANTE_API,
  type StatusEstanteApi,
} from '../../../common/status-estante-api';
import { PaginacaoDto } from '../../../perfis/dto/resenhas-do-perfil.dto';
import type { TipoLivro } from '../../../referencias/referencias-externas.service';

export class LivroReferenciadoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['oficial', 'pessoal'] })
  tipo!: TipoLivro;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ type: String, nullable: true })
  autor!: string | null;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  capaUrl!: string | null;
}

export class FavoritoDto {
  @ApiProperty({ format: 'uuid' })
  livroId!: string;

  @ApiProperty()
  favorito!: boolean;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  favoritadoEm!: string | null;
}

export class ItemFavoritoDto {
  @ApiProperty({ type: LivroReferenciadoDto })
  livro!: LivroReferenciadoDto;

  @ApiProperty({
    enum: STATUS_ESTANTE_API,
    nullable: true,
    type: String,
    description: 'Status na estante; nulo quando o livro está fora dela.',
  })
  status!: StatusEstanteApi | null;

  @ApiProperty({ format: 'date-time' })
  favoritadoEm!: string;
}

export class PaginaFavoritosDto {
  @ApiProperty({ type: [ItemFavoritoDto] })
  itens!: ItemFavoritoDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;
}

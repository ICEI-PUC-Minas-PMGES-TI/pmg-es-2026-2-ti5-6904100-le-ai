import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CampoDeBusca } from '../../../common/busca-textual';
import { LivroReferenciadoDto } from '../../../favoritos/api/dto/favorito.dto';
import {
  PaginacaoDto,
  PaginacaoQueryDto,
} from '../../../perfis/dto/resenhas-do-perfil.dto';

const ANO_MINIMO = 1000;
const ANO_MAXIMO = 9999;
const MENSAGEM_ANO = 'Informe um ano com quatro dígitos.';

export class ConsultaHistoricoDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    minimum: ANO_MINIMO,
    maximum: ANO_MAXIMO,
    description:
      'Restringe às leituras concluídas nesse ano, pela data de fim.',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Informe um ano inteiro.' })
  @Min(ANO_MINIMO, { message: MENSAGEM_ANO })
  @Max(ANO_MAXIMO, { message: MENSAGEM_ANO })
  ano?: number;

  @CampoDeBusca(
    'Pesquisa por título ou autor em todo o histórico; combina com `ano`.',
  )
  q?: string;
}

export class OcorrenciaHistoricoDto {
  @ApiProperty({ format: 'uuid' })
  leituraId!: string;

  @ApiProperty({ type: LivroReferenciadoDto })
  livro!: LivroReferenciadoDto;

  @ApiProperty({ format: 'date' })
  dataInicio!: string;

  @ApiProperty({ format: 'date' })
  dataFim!: string;

  @ApiProperty()
  releitura!: boolean;

  @ApiProperty({
    minimum: 1,
    description: 'Dias de `dataInicio` a `dataFim`, contando os dois.',
  })
  duracaoDias!: number;

  @ApiProperty({ minimum: 0, description: 'Página final registrada.' })
  paginaFinal!: number;

  @ApiProperty({ minimum: 1, nullable: true, type: Number })
  totalPaginas!: number | null;
}

export class AnoHistoricoDto {
  @ApiProperty({ example: 2026 })
  ano!: number;

  @ApiProperty({ minimum: 1, description: 'Leituras concluídas no ano.' })
  total!: number;
}

export class TotaisHistoricoDto {
  @ApiProperty({ minimum: 0, description: 'Livros distintos no filtro atual.' })
  livros!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Leituras concluídas no filtro atual.',
  })
  leituras!: number;
}

export class PaginaHistoricoDto {
  @ApiProperty({ type: [OcorrenciaHistoricoDto] })
  itens!: OcorrenciaHistoricoDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;

  @ApiProperty({
    type: [AnoHistoricoDto],
    description:
      'Anos com leitura concluída, do mais recente; ignora `ano` e `q`.',
  })
  anos!: AnoHistoricoDto[];

  @ApiProperty({ type: TotaisHistoricoDto })
  totais!: TotaisHistoricoDto;
}

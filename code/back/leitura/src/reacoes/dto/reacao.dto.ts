import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { TIPOS_DE_REACAO, type TipoDeReacao, VIAS, type Via } from '../regras';

/**
 * Via de acesso de RN-15, obrigatória só quando a resenha é de um livro pessoal: `feed`
 * com o id da atividade, ou `lista` com o id da lista do dono. Em livro oficial é ignorada.
 */
export class ViaDeAcessoDto {
  @ApiPropertyOptional({ enum: VIAS })
  @IsOptional()
  @IsIn(VIAS, { message: 'Use a via feed ou lista.' })
  via?: Via;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Informe uma referência válida.' })
  referenciaId?: string;
}

/** Entrada de `PUT /resenhas/{resenhaId}/reacao` (`ReacaoEntrada` no contrato). */
export class ReacaoEntradaDto extends ViaDeAcessoDto {
  @ApiProperty({ enum: TIPOS_DE_REACAO })
  @IsIn(TIPOS_DE_REACAO, { message: 'Use curtida ou descurtida.' })
  tipo!: TipoDeReacao;
}

/** `Reacoes` do contrato: o estado da resenha depois da escrita. */
export class ReacoesDto {
  @ApiProperty({ enum: TIPOS_DE_REACAO, nullable: true, type: String })
  minhaReacao!: TipoDeReacao | null;

  @ApiProperty({ minimum: 0 })
  curtidas!: number;

  @ApiProperty({ minimum: 0 })
  descurtidas!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { PaginacaoDto } from '../../perfis/dto/resenhas-do-perfil.dto';

/**
 * Entrada de `POST /livros/{livroId}/frases` (`FraseEntrada` no contrato). O DTO só garante os
 * tipos (400); o limite de 500 code points, a página dentro do livro e a cota de 10 são regra de
 * negócio (422), como na resenha.
 */
export class FraseEntradaDto {
  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString({ message: 'Informe o trecho.' })
  texto!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'Informe a página como número inteiro.' })
  pagina!: number;
}

/** Quem guardou a frase, de `v_perfil_referencia_v1`. */
export class AutorDaFraseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  nome!: string;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  avatarUrl!: string | null;
}

/** `Frase` do contrato. */
export class FraseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  livroId!: string;

  @ApiProperty({ maxLength: 500 })
  texto!: string;

  @ApiProperty({ minimum: 1 })
  pagina!: number;

  @ApiProperty({ format: 'date-time' })
  criadoEm!: string;

  @ApiProperty({ type: AutorDaFraseDto })
  autor!: AutorDaFraseDto;

  /** A frase é de quem pediu: só ela pode ser excluída. */
  @ApiProperty()
  minha!: boolean;
}

/** `PaginaFrases` do contrato. */
export class PaginaFrasesDto {
  @ApiProperty({ type: [FraseDto] })
  itens!: FraseDto[];

  @ApiProperty({ type: PaginacaoDto })
  paginacao!: PaginacaoDto;

  /** Quantas frases deste livro são de quem pediu, para a linha da cota. */
  @ApiProperty({ minimum: 0, maximum: 10 })
  minhasFrases!: number;

  @ApiProperty({ example: 10 })
  limitePorLivro!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Entrada de `POST /livros/oficial` (RF-ACV-05).
 *
 * **Apenas o ISBN, nunca uma URL** (RNF-SEC-38). O campo aceita separadores
 * porque é isso que o leitor digita e o que vem impresso no livro; o servidor
 * normaliza e valida o dígito verificador. A URL da fonte externa é construída
 * pelo servidor a partir da allowlist.
 */
export class SolicitarImportacaoDto {
  @ApiProperty({
    minLength: 13,
    maxLength: 17,
    example: '978-85-359-1484-9',
    description: 'ISBN-13; separadores podem ser normalizados pelo servidor.',
  })
  @IsString({ message: 'Informe um ISBN-13 válido.' })
  @MinLength(13, { message: 'Informe um ISBN-13 válido.' })
  @MaxLength(17, { message: 'Informe um ISBN-13 válido.' })
  isbn!: string;
}

export type EstadoImportacao =
  'pendente' | 'concluida' | 'nao_encontrado' | 'falha_transitoria';

export class ImportacaoAceitaDto {
  @ApiProperty({ format: 'uuid' }) importacaoId!: string;
  @ApiProperty({ enum: ['pendente'] }) status!: 'pendente';
}

export class ImportacaoDto {
  @ApiProperty({ format: 'uuid' }) importacaoId!: string;
  @ApiProperty({ pattern: '^97[89][0-9]{10}$' }) isbn!: string;

  @ApiProperty({
    enum: ['pendente', 'concluida', 'nao_encontrado', 'falha_transitoria'],
    description:
      'nao_encontrado significa que todas as fontes responderam sem o ISBN; falha_transitoria significa indisponibilidade após as retentativas. Os dois não se confundem.',
  })
  status!: EstadoImportacao;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Preenchido somente quando status é concluida.',
  })
  livroId!: string | null;

  @ApiProperty({ description: 'true somente quando status é nao_encontrado.' })
  permiteCadastroPessoal!: boolean;

  @ApiProperty({ format: 'date-time' }) criadoEm!: string;
  @ApiProperty({ format: 'date-time' }) atualizadoEm!: string;
}

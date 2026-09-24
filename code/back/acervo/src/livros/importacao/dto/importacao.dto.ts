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

/**
 * O que a tela precisa para confirmar **qual** livro entrou ou já existia
 * (cadastro-por-isbn.md §4.4 e §4.5): capa, título, autor, editora, ano e
 * páginas. É um resumo da edição, não a página do livro, que é de F-ACV-BUSCA.
 */
export class LivroImportadoResumoDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() titulo!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Autores para exibição, separados por vírgula.',
  })
  autores!: string | null;

  @ApiProperty({ nullable: true, type: String }) editora!: string | null;
  @ApiProperty({ nullable: true, type: Number }) anoPublicacao!: number | null;
  @ApiProperty({ minimum: 1 }) paginas!: number;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Capa resolvida: cópia própria, senão URL externa.',
  })
  capaUrl!: string | null;
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

  @ApiProperty({
    type: LivroImportadoResumoDto,
    nullable: true,
    description: 'Resumo do livro, somente quando status é concluida.',
  })
  livro!: LivroImportadoResumoDto | null;

  @ApiProperty({ description: 'true somente quando status é nao_encontrado.' })
  permiteCadastroPessoal!: boolean;

  @ApiProperty({ format: 'date-time' }) criadoEm!: string;
  @ApiProperty({ format: 'date-time' }) atualizadoEm!: string;
}

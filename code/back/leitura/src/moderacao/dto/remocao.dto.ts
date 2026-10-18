import { ApiProperty } from '@nestjs/swagger';

/** Resposta do comando interno de remoção pela moderação (F-MOD). */
export class RemocaoDto {
  @ApiProperty({ description: '`false` quando o conteúdo já não existia.' })
  removida!: boolean;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  autorId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  livroId!: string | null;
}

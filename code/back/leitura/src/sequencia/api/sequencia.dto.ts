import { ApiProperty } from '@nestjs/swagger';

/** `Sequencia` do contrato (RF-GAM-02). */
export class SequenciaDto {
  @ApiProperty({
    minimum: 0,
    description:
      'Dias seguidos com leitura até hoje ou ontem, no último fuso do dispositivo; 0 quando um dia se encerrou sem leitura.',
    example: 12,
  })
  sequenciaAtual!: number;

  @ApiProperty({
    minimum: 0,
    description:
      'Maior sequência já alcançada; preservada quando a atual zera.',
    example: 31,
  })
  maiorSequencia!: number;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description:
      'Último dia de calendário local com progresso; nulo sem nenhum progresso.',
    example: '2026-10-08',
  })
  ultimoDiaComLeitura!: string | null;
}

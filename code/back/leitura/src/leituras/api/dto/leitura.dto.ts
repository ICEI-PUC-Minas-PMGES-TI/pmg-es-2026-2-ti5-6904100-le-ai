import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsTimeZone,
  IsUUID,
  Matches,
} from 'class-validator';
import {
  STATUS_ESTANTE_API,
  type StatusEstanteApi,
} from '../../../common/status-estante-api';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const MENSAGEM_DATA = 'Informe a data no formato AAAA-MM-DD.';

export class IniciarLeituraEntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Informe um identificador de livro válido.' })
  livroId!: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Padrão é a data atual do leitor; pode ser editada.',
  })
  @IsOptional()
  @Matches(DATA_ISO, { message: MENSAGEM_DATA })
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  dataInicio?: string;
}

export class FinalizarLeituraEntradaDto {
  @ApiPropertyOptional({
    format: 'date',
    description: 'Padrão é a data atual do leitor; pode ser editada.',
  })
  @IsOptional()
  @Matches(DATA_ISO, { message: MENSAGEM_DATA })
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  dataFim?: string;

  @ApiProperty({
    example: 'America/Sao_Paulo',
    description: 'Identificador IANA usado para derivar a data local da ação.',
  })
  @IsTimeZone({ message: 'Informe um fuso horário IANA válido.' })
  fusoHorarioDispositivo!: string;
}

export class LeituraDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) livroId!: string;
  @ApiProperty({ enum: STATUS_ESTANTE_API }) status!: StatusEstanteApi;
  @ApiProperty({ format: 'date' }) dataInicio!: string;
  @ApiProperty({ format: 'date', nullable: true, type: String })
  dataFim!: string | null;
  @ApiProperty() releitura!: boolean;
  @ApiProperty() incompleta!: boolean;
  @ApiProperty() retomavel!: boolean;
  @ApiProperty({ minimum: 0 }) paginaAtual!: number;
  @ApiProperty({ minimum: 1, nullable: true, type: Number })
  totalPaginas!: number | null;
  @ApiProperty({ minimum: 0, maximum: 100, nullable: true, type: Number })
  percentualConcluido!: number | null;
  @ApiProperty({ minimum: 0 }) vezesLido!: number;
  @ApiProperty({ format: 'date-time' }) ultimaAtividadeEm!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  finalizadaEm!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'America/Sao_Paulo' })
  finalizacaoFusoHorario!: string | null;
  @ApiProperty({ format: 'date', nullable: true, type: String })
  finalizacaoDataLocal!: string | null;
}

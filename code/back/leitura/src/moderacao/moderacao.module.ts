import { Module } from '@nestjs/common';
import { AvaliacoesRepository } from '../avaliacoes/avaliacoes.repository';
import { ModeracaoController } from './moderacao.controller';
import { ModeracaoService } from './moderacao.service';

/**
 * F-MOD: remoção de resenha e frase pela moderação, por comando HTTP interno do `social`. O
 * schema de `resenha.excluida` já é registrado pelo `AvaliacoesModule`.
 */
@Module({
  controllers: [ModeracaoController],
  providers: [ModeracaoService, AvaliacoesRepository],
})
export class ModeracaoModule {}

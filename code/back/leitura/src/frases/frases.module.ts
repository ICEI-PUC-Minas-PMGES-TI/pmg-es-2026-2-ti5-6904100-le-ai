import { Module } from '@nestjs/common';
import { FrasesController } from './frases.controller';
import { FrasesRepository } from './frases.repository';
import { FrasesService } from './frases.service';

/** F-AVA-2: frases e trechos de um livro (RN-11). Não publica evento. */
@Module({
  controllers: [FrasesController],
  providers: [FrasesService, FrasesRepository],
})
export class FrasesModule {}

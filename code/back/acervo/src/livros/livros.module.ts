import { Module } from '@nestjs/common';
import { ImportacaoController } from './importacao/importacao.controller';
import { ImportacaoRepository } from './importacao/importacao.repository';
import { ImportacaoService } from './importacao/importacao.service';
import { OutboxRepository } from './outbox/outbox.repository';
import { AutorizacaoRn15 } from './pessoal/autorizacao-rn15.service';
import { LeituraDoDonoRepository } from './pessoal/leitura-do-dono.repository';
import { LivroPessoalController } from './pessoal/livro-pessoal.controller';
import { LivroPessoalRepository } from './pessoal/livro-pessoal.repository';
import { LivroPessoalService } from './pessoal/livro-pessoal.service';

/**
 * Domínio de livro de F-ACV-CADASTRO: importação por ISBN e livro pessoal.
 *
 * O consumidor que busca OpenLibrary e Google Books vive em
 * `importacao/dominio/` e **não é registrado aqui de propósito**: ele não tem
 * acionador enquanto o runtime AMQP de P0-MSG não existir. É uma classe de
 * domínio pura, coberta por teste, esperando o dispatcher.
 */
@Module({
  controllers: [ImportacaoController, LivroPessoalController],
  providers: [
    ImportacaoService,
    ImportacaoRepository,
    OutboxRepository,
    LivroPessoalService,
    LivroPessoalRepository,
    AutorizacaoRn15,
    LeituraDoDonoRepository,
  ],
})
export class LivrosModule {}

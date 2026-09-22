import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingModule } from '../messaging/messaging.module';
import { GoogleBooksFonte } from './importacao/dominio/google-books.fonte';
import { HttpExterno } from './importacao/dominio/http-externo';
import { OpenLibraryFonte } from './importacao/dominio/openlibrary.fonte';
import { PoliticaDeResiliencia } from './importacao/dominio/politica-resiliencia';
import {
  FONTES_DE_METADADOS,
  ImportacaoConsumer,
} from './importacao/importacao.consumer';
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
 * `ImportacaoConsumer` registra o consumidor de `livro.importacao_solicitada` no
 * runtime AMQP de P0-MSG. Com `AMQP_ENABLED=false` o registro acontece mas
 * nenhum channel abre, e a importação permanece `pendente`.
 */
@Module({
  imports: [MessagingModule],
  controllers: [ImportacaoController, LivroPessoalController],
  providers: [
    ImportacaoService,
    ImportacaoRepository,
    OutboxRepository,
    LivroPessoalService,
    LivroPessoalRepository,
    AutorizacaoRn15,
    LeituraDoDonoRepository,
    ImportacaoConsumer,
    {
      // Ordem fixa: OpenLibrary primeiro, Google Books só se a primeira não
      // souber. Cada fonte tem o próprio circuit breaker, e as instâncias vivem
      // o processo inteiro para o estado do circuito sobreviver entre mensagens.
      provide: FONTES_DE_METADADOS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const http = new HttpExterno({
          hostsPermitidos: config
            .getOrThrow<string>('FONTES_HOSTS_PERMITIDOS')
            .split(','),
          timeoutMs: config.getOrThrow<number>('FONTES_TIMEOUT_MS'),
          limiteRespostaBytes: config.getOrThrow<number>(
            'FONTES_LIMITE_RESPOSTA_BYTES',
          ),
          userAgent: config.getOrThrow<string>('FONTES_USER_AGENT'),
        });
        return [
          new OpenLibraryFonte(http, new PoliticaDeResiliencia()),
          new GoogleBooksFonte(
            http,
            new PoliticaDeResiliencia(),
            config.get<string>('GOOGLE_BOOKS_API_KEY'),
          ),
        ];
      },
    },
  ],
})
export class LivrosModule {}

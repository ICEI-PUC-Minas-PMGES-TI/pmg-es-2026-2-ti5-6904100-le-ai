import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingModule } from '../messaging/messaging.module';
import { BuscaController } from './busca/busca.controller';
import { BuscaRepository } from './busca/busca.repository';
import { BuscaService } from './busca/busca.service';
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
import { GoogleBooksSinopseFonte } from './sinopse/dominio/google-books-sinopse.fonte';
import { OpenLibrarySinopseFonte } from './sinopse/dominio/openlibrary-sinopse.fonte';
import { FONTES_DE_SINOPSE, SinopseConsumer } from './sinopse/sinopse.consumer';

/** Cliente das fontes externas, com a allowlist e os limites da configuração. */
function criarHttpExterno(config: ConfigService): HttpExterno {
  return new HttpExterno({
    hostsPermitidos: config
      .getOrThrow<string>('FONTES_HOSTS_PERMITIDOS')
      .split(','),
    timeoutMs: config.getOrThrow<number>('FONTES_TIMEOUT_MS'),
    limiteRespostaBytes: config.getOrThrow<number>(
      'FONTES_LIMITE_RESPOSTA_BYTES',
    ),
    userAgent: config.getOrThrow<string>('FONTES_USER_AGENT'),
  });
}

/**
 * Política das fontes de sinopse: uma retentativa só, depois de 1 s, com o
 * mesmo circuit breaker. `falha_transitoria` já é reprocessável na próxima
 * abertura da página, e a fila processa um livro por vez: a política padrão da
 * importação seguraria a fila por até 2 minutos por livro.
 */
const ESPERAS_DA_SINOPSE_MS = [1_000];

/**
 * Domínio de livro: importação por ISBN e livro pessoal (F-ACV-CADASTRO) e
 * busca do acervo oficial (F-ACV-BUSCA).
 *
 * `ImportacaoConsumer` registra o consumidor de `livro.importacao_solicitada` no
 * runtime AMQP de P0-MSG. Com `AMQP_ENABLED=false` o registro acontece mas
 * nenhum channel abre, e a importação permanece `pendente`.
 */
@Module({
  imports: [MessagingModule],
  controllers: [ImportacaoController, LivroPessoalController, BuscaController],
  providers: [
    BuscaService,
    BuscaRepository,
    ImportacaoService,
    ImportacaoRepository,
    OutboxRepository,
    LivroPessoalService,
    LivroPessoalRepository,
    AutorizacaoRn15,
    LeituraDoDonoRepository,
    ImportacaoConsumer,
    SinopseConsumer,
    {
      // Ordem fixa: OpenLibrary primeiro, Google Books só se a primeira não
      // souber. Cada fonte tem o próprio circuit breaker, e as instâncias vivem
      // o processo inteiro para o estado do circuito sobreviver entre mensagens.
      provide: FONTES_DE_METADADOS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const http = criarHttpExterno(config);
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
    {
      // Mesma ordem da RN-19.3: OpenLibrary, depois Google Books. Instâncias
      // próprias, para o circuito da sinopse não se misturar com o da importação.
      provide: FONTES_DE_SINOPSE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const http = criarHttpExterno(config);
        return [
          new OpenLibrarySinopseFonte(
            http,
            new PoliticaDeResiliencia({ esperasMs: ESPERAS_DA_SINOPSE_MS }),
          ),
          new GoogleBooksSinopseFonte(
            http,
            new PoliticaDeResiliencia({ esperasMs: ESPERAS_DA_SINOPSE_MS }),
            config.get<string>('GOOGLE_BOOKS_API_KEY'),
          ),
        ];
      },
    },
  ],
})
export class LivrosModule {}

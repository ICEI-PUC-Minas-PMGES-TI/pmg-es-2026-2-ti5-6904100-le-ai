import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { MessagingModule } from '../messaging/messaging.module';
import { BuscaController } from './busca/busca.controller';
import { CACHE_DE_CAPAS, CapaConsumer } from './capas/capa.consumer';
import { criarCacheDeCapas } from './capas/criar-cache-de-capas';
import { BuscaRepository } from './busca/busca.repository';
import { BuscaService } from './busca/busca.service';
import { LivroOficialController } from './busca/livro-oficial.controller';
import { LivroOficialRepository } from './busca/livro-oficial.repository';
import { LivroOficialService } from './busca/livro-oficial.service';
import { ResenhasRepository } from './busca/resenhas.repository';
import { CatalogoController } from './catalogo/catalogo.controller';
import { CatalogoRepository } from './catalogo/catalogo.repository';
import { CatalogoService } from './catalogo/catalogo.service';
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
import { NotaDosLeitoresConsumer } from './notas/nota-dos-leitores.consumer';
import { NotaDosLeitoresRepository } from './notas/nota-dos-leitores.repository';
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
 * Política do `ratings.json` da importação (F-ACV-NOTA): sem retentativa e com
 * circuito próprio. A nota é acessória; a falha dela não atrasa a importação nem
 * abre o circuito da OpenLibrary, e o livro entra sem nota.
 */
const ESPERAS_DAS_NOTAS_MS: number[] = [];

/**
 * Domínio de livro: importação por ISBN e livro pessoal (F-ACV-CADASTRO),
 * busca do acervo oficial (F-ACV-BUSCA) e filtros e páginas de autor, editora
 * e série (F-ACV-DESCOBERTA). Nota geral e nota dos leitores da página
 * (F-ACV-NOTA), com o consumidor de `nota.alterada`, e o cache de capas
 * oficiais no Cloudinary.
 *
 * `ImportacaoConsumer` registra o consumidor de `livro.importacao_solicitada` no
 * runtime AMQP de P0-MSG. Com `AMQP_ENABLED=false` o registro acontece mas
 * nenhum channel abre, e a importação permanece `pendente`.
 */
@Module({
  imports: [MessagingModule],
  controllers: [
    ImportacaoController,
    LivroPessoalController,
    BuscaController,
    LivroOficialController,
    CatalogoController,
  ],
  providers: [
    BuscaService,
    BuscaRepository,
    LivroOficialService,
    LivroOficialRepository,
    ResenhasRepository,
    CatalogoService,
    CatalogoRepository,
    ImportacaoService,
    ImportacaoRepository,
    OutboxRepository,
    LivroPessoalService,
    LivroPessoalRepository,
    AutorizacaoRn15,
    LeituraDoDonoRepository,
    ImportacaoConsumer,
    SinopseConsumer,
    NotaDosLeitoresRepository,
    NotaDosLeitoresConsumer,
    CapaConsumer,
    {
      // Cache de capas oficiais (F-ACV-NOTA): `null` sem a credencial do
      // Cloudinary, e aí o consumidor não se registra.
      provide: CACHE_DE_CAPAS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        criarCacheDeCapas({
          CLOUDINARY_CLOUD_NAME: config.get('CLOUDINARY_CLOUD_NAME'),
          CLOUDINARY_API_KEY: config.get('CLOUDINARY_API_KEY'),
          CLOUDINARY_API_SECRET: config.get('CLOUDINARY_API_SECRET'),
          CLOUDINARY_PASTA_CAPAS_OFICIAIS: config.get(
            'CLOUDINARY_PASTA_CAPAS_OFICIAIS',
          ),
          CAPA_HOSTS_PERMITIDOS: config.get('CAPA_HOSTS_PERMITIDOS'),
          CAPAS_DOWNLOAD_HOSTS: config.get('CAPAS_DOWNLOAD_HOSTS'),
          CAPAS_DOWNLOAD_TIMEOUT_MS: config.get('CAPAS_DOWNLOAD_TIMEOUT_MS'),
          CAPAS_DOWNLOAD_LIMITE_BYTES: config.get(
            'CAPAS_DOWNLOAD_LIMITE_BYTES',
          ),
          FONTES_USER_AGENT: config.get('FONTES_USER_AGENT'),
        }),
    },
    {
      // Ordem fixa: OpenLibrary primeiro, Google Books só se a primeira não
      // souber. Cada fonte tem o próprio circuit breaker, e as instâncias vivem
      // o processo inteiro para o estado do circuito sobreviver entre mensagens.
      provide: FONTES_DE_METADADOS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const http = criarHttpExterno(config);
        return [
          new OpenLibraryFonte(
            http,
            new PoliticaDeResiliencia(),
            new PoliticaDeResiliencia({ esperasMs: ESPERAS_DAS_NOTAS_MS }),
          ),
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

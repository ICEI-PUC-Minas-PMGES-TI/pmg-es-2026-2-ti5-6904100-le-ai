import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import {
  editora,
  importacaoLivro,
  livro,
  livroReferenciaView,
} from '../../db/schema';
import type { Tx } from '../../db/tipos';
import type {
  EstadoImportacao,
  LivroImportadoResumoDto,
} from './dto/importacao.dto';

export interface ImportacaoRegistro {
  id: string;
  solicitanteId: string;
  isbn13: string;
  estado: EstadoImportacao;
  livroId: string | null;
  erro: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

@Injectable()
export class ImportacaoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Livro oficial com este ISBN-13, se existir (RN-02: chave natural única).
   *
   * Roda dentro da transação do `POST` porque o `409` de RF-ACV-07 precisa ser
   * decidido com o mesmo estado que o INSERT veria.
   */
  async buscarLivroOficialPorIsbn(
    tx: Tx,
    isbn13: string,
  ): Promise<string | null> {
    const [encontrado] = await tx
      .select({ id: livro.id })
      .from(livro)
      .where(and(eq(livro.isbn13, isbn13), eq(livro.tipo, 'oficial')))
      .limit(1);

    return encontrado?.id ?? null;
  }

  async criar(
    tx: Tx,
    solicitanteId: string,
    isbn13: string,
  ): Promise<ImportacaoRegistro> {
    const [criada] = await tx
      .insert(importacaoLivro)
      // `estado` fica no default `pendente`, com `livro_id` e `erro` nulos —
      // é o único trio que o CHECK `importacao_livro_resultado_ck` aceita para
      // uma solicitação recém-criada.
      .values({ solicitanteId, isbn13 })
      .returning();

    return criada as ImportacaoRegistro;
  }

  async buscarPorId(id: string): Promise<ImportacaoRegistro | null> {
    const [encontrada] = await this.db
      .select()
      .from(importacaoLivro)
      .where(eq(importacaoLivro.id, id))
      .limit(1);

    return (encontrada as ImportacaoRegistro) ?? null;
  }

  /**
   * Volta a solicitação para `pendente` no reprocessamento.
   *
   * `erro: null` é obrigatório, não cosmético: o CHECK exige `erro` nulo em
   * `pendente`, e deixar o texto da falha anterior faria o UPDATE ser recusado.
   * O filtro por `estado` garante que só `falha_transitoria` é reenfileirada,
   * sem precisar de outra leitura.
   */
  async reabrir(
    tx: Tx,
    id: string,
    solicitanteId: string,
  ): Promise<ImportacaoRegistro | null> {
    const [atualizada] = await tx
      .update(importacaoLivro)
      .set({ estado: 'pendente', erro: null, atualizadoEm: new Date() })
      .where(
        and(
          eq(importacaoLivro.id, id),
          eq(importacaoLivro.solicitanteId, solicitanteId),
          eq(importacaoLivro.estado, 'falha_transitoria'),
        ),
      )
      .returning();

    return (atualizada as ImportacaoRegistro) ?? null;
  }

  /**
   * Resumo do livro para o card de confirmação (cadastro-por-isbn.md §4.4).
   *
   * Autor e capa vêm de `v_livro_referencia_v1`, que já resolve os autores
   * vinculados e a ordem cópia própria → URL externa; editora e ano vêm da
   * tabela, porque a VIEW de contrato não os expõe. `executor` é o `tx` quando
   * a leitura precisa ver o mesmo estado da transação (o `409` do `POST`).
   */
  async resumoDoLivro(
    livroId: string,
    executor: Tx | DrizzleDB = this.db,
  ): Promise<LivroImportadoResumoDto | null> {
    const [resumo] = await executor
      .select({
        id: livro.id,
        titulo: livro.titulo,
        autores: livroReferenciaView.autorExibicao,
        editora: editora.nome,
        anoPublicacao: livro.anoPublicacao,
        paginas: livro.paginas,
        capaUrl: livroReferenciaView.capaResolvida,
      })
      .from(livro)
      .innerJoin(livroReferenciaView, eq(livroReferenciaView.livroId, livro.id))
      .leftJoin(editora, eq(editora.id, livro.editoraId))
      .where(eq(livro.id, livroId))
      .limit(1);

    return resumo ?? null;
  }
}

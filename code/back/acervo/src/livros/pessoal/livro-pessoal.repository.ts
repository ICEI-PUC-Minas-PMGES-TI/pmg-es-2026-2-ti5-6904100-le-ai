import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { livro } from '../../db/schema';
import type { Tx } from '../../db/tipos';

/**
 * Derivação de `sinopse` e `sinopse_status`, que **sempre** andam juntos.
 *
 * Dois CHECKs do banco se cruzam aqui e é fácil violar um deles:
 *
 * - `livro_sinopse_conteudo_status_ck`: `(status = 'disponivel') = (sinopse IS NOT NULL)`;
 * - `livro_oficial_pessoal_ck`: em livro pessoal, `sinopse_status` só pode ser
 *   `disponivel` ou `ausente`.
 *
 * O default da coluna é `nao_consultada`, que **viola** o segundo. Ou seja: todo
 * INSERT de livro pessoal precisa informar o status explicitamente, e todo
 * UPDATE que mexe na sinopse precisa mexer nos dois campos na mesma instrução.
 * Centralizar aqui é o que impede o erro de reaparecer no create e no update.
 *
 * Livro pessoal não passa pelo fluxo sob demanda de RN-19: a sinopse é a que o
 * dono escreveu, ou não existe.
 */
export function derivarSinopse(sinopse: string | null | undefined): {
  sinopse: string | null;
  sinopseStatus: 'disponivel' | 'ausente';
} {
  const texto = sinopse?.trim() ? sinopse.trim() : null;
  return { sinopse: texto, sinopseStatus: texto ? 'disponivel' : 'ausente' };
}

/** Capa própria e asset id andam juntos (`livro_capa_propria_asset_ck`). */
export function derivarCapa(capa: { url: string; assetId: string } | null): {
  capaUrlPropria: string | null;
  capaAssetId: string | null;
} {
  return {
    capaUrlPropria: capa?.url ?? null,
    capaAssetId: capa?.assetId ?? null,
  };
}

export interface LivroPessoalRegistro {
  id: string;
  donoId: string;
  titulo: string;
  autor: string;
  paginas: number;
  sinopse: string | null;
  capaUrl: string | null;
  ativo: boolean;
}

export interface DadosDeCriacao {
  donoId: string;
  titulo: string;
  autor: string;
  paginas: number;
  sinopse: string | null;
  capa: { url: string; assetId: string } | null;
}

export interface DadosDeAtualizacao {
  titulo?: string;
  autor?: string;
  paginas?: number;
  sinopse?: string | null;
  capa?: { url: string; assetId: string } | null;
}

@Injectable()
export class LivroPessoalRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async criar(tx: Tx, dados: DadosDeCriacao): Promise<LivroPessoalRegistro> {
    const [criado] = await tx
      .insert(livro)
      .values({
        tipo: 'pessoal',
        donoId: dados.donoId,
        titulo: dados.titulo.trim(),
        autorInformado: dados.autor.trim(),
        paginas: dados.paginas,
        ...derivarSinopse(dados.sinopse),
        ...derivarCapa(dados.capa),
        ativo: true,
      })
      .returning();

    return this.paraRegistro(criado);
  }

  /** Busca por id. Só livro pessoal — id de livro oficial não responde aqui. */
  async buscarPorId(id: string): Promise<LivroPessoalRegistro | null> {
    const [encontrado] = await this.db
      .select()
      .from(livro)
      .where(and(eq(livro.id, id), eq(livro.tipo, 'pessoal')))
      .limit(1);

    return encontrado ? this.paraRegistro(encontrado) : null;
  }

  async atualizar(
    tx: Tx,
    id: string,
    dados: DadosDeAtualizacao,
  ): Promise<LivroPessoalRegistro> {
    const valores: Record<string, unknown> = { atualizadoEm: new Date() };

    if (dados.titulo !== undefined) valores.titulo = dados.titulo.trim();
    if (dados.autor !== undefined) valores.autorInformado = dados.autor.trim();
    if (dados.paginas !== undefined) valores.paginas = dados.paginas;
    if (dados.sinopse !== undefined)
      Object.assign(valores, derivarSinopse(dados.sinopse));
    if (dados.capa !== undefined)
      Object.assign(valores, derivarCapa(dados.capa));

    const [atualizado] = await tx
      .update(livro)
      .set(valores)
      .where(and(eq(livro.id, id), eq(livro.tipo, 'pessoal')))
      .returning();

    return this.paraRegistro(atualizado);
  }

  /**
   * Exclusão lógica (RN-15.6): `ativo = false` faz o livro deixar de ser
   * utilizável pelos contratos e **cessa imediatamente o acesso de terceiros**,
   * porque `v_livro_referencia_v1` expõe `ativo` e a consulta do GET recusa
   * livro inativo. Apagar a linha quebraria a FK de `importacao_livro` e
   * apagaria o histórico de quem já referenciou o livro.
   */
  async excluir(tx: Tx, id: string): Promise<void> {
    await tx
      .update(livro)
      .set({ ativo: false, atualizadoEm: new Date() })
      .where(and(eq(livro.id, id), eq(livro.tipo, 'pessoal')));
  }

  private paraRegistro(linha: typeof livro.$inferSelect): LivroPessoalRegistro {
    return {
      id: linha.id,
      donoId: linha.donoId as string,
      titulo: linha.titulo,
      autor: linha.autorInformado as string,
      paginas: linha.paginas,
      sinopse: linha.sinopse,
      capaUrl: linha.capaUrlPropria,
      ativo: linha.ativo,
    };
  }
}

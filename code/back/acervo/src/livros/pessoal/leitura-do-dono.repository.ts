import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import {
  vNotaPublicacao,
  vPerfilReferencia,
  vResenhaPublicacao,
} from '../../db/contratos-externos';
import { ehFalhaDeContratoExterno } from '../../common/pg-erros';
import {
  DonoResumoDto,
  NotaDoDonoDto,
  ResenhaResumoDto,
} from './dto/livro-pessoal.dto';

/**
 * Nota e resenha **do dono** do livro pessoal, para a página em modo consulta
 * (RN-03: "Nota do dono: visível a terceiros, sem média e sem contagem").
 *
 * Os dados vêm das VIEWs de contrato de `leitura`, nunca da tabela crua
 * `leitura.nota` — o `AGENTS.md` do serviço é explícito sobre isso.
 *
 * O filtro é sempre pelo **dono**, não pelo solicitante: a página mostra a
 * avaliação de quem cadastrou o livro, inclusive para um terceiro que chegou
 * pelo feed.
 *
 * F-AVA ainda não está implementada, então hoje estas VIEWs existem e retornam
 * vazio, e os dois campos saem `null`. Ausência é resposta normal, nunca erro:
 * o contrato marca os dois como `required` e `nullable`.
 */
@Injectable()
export class LeituraDoDonoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Nome e avatar do dono, para a linha de atribuição. Sem linha na VIEW (conta
   * suspensa ou em exclusão) sai `null`: a página não inventa um nome.
   */
  async dono(donoId: string): Promise<DonoResumoDto | null> {
    const linhas = await this.executar(() =>
      this.db
        .select({
          nome: vPerfilReferencia.nomeExibicao,
          avatarUrl: vPerfilReferencia.avatarUrl,
        })
        .from(vPerfilReferencia)
        .where(eq(vPerfilReferencia.id, donoId))
        .limit(1),
    );

    const linha = linhas[0];
    if (!linha?.nome) {
      return null;
    }
    return { nome: linha.nome, avatarUrl: linha.avatarUrl ?? null };
  }

  async nota(donoId: string, livroId: string): Promise<NotaDoDonoDto | null> {
    const linhas = await this.executar(() =>
      this.db
        .select({ valor: vNotaPublicacao.valor })
        .from(vNotaPublicacao)
        .where(
          and(
            eq(vNotaPublicacao.usuarioId, donoId),
            eq(vNotaPublicacao.livroId, livroId),
          ),
        )
        .limit(1),
    );

    if (!linhas.length || linhas[0].valor === null) {
      return null;
    }
    // `numeric` volta como string no node-postgres; o contrato pede `number`
    // com `multipleOf: 0.5`.
    return { valor: Number(linhas[0].valor) };
  }

  async resenha(
    donoId: string,
    livroId: string,
  ): Promise<ResenhaResumoDto | null> {
    const linhas = await this.executar(() =>
      this.db
        .select({
          id: vResenhaPublicacao.resenhaId,
          autorId: vResenhaPublicacao.usuarioId,
          texto: vResenhaPublicacao.texto,
          spoiler: vResenhaPublicacao.spoiler,
          criadoEm: vResenhaPublicacao.criadoEm,
          atualizadoEm: vResenhaPublicacao.atualizadoEm,
          autorNome: vPerfilReferencia.nomeExibicao,
          autorAvatarUrl: vPerfilReferencia.avatarUrl,
        })
        .from(vResenhaPublicacao)
        .innerJoin(
          vPerfilReferencia,
          eq(vPerfilReferencia.id, vResenhaPublicacao.usuarioId),
        )
        .where(
          and(
            eq(vResenhaPublicacao.usuarioId, donoId),
            eq(vResenhaPublicacao.livroId, livroId),
          ),
        )
        .limit(1),
    );

    const linha = linhas[0];
    if (!linha?.id || !linha.autorNome) {
      // Resenha sem perfil correspondente não vira resenha anônima: `autorNome`
      // é obrigatório no contrato, e inventar um valor seria pior que omitir.
      return null;
    }

    return {
      id: linha.id,
      autorId: linha.autorId as string,
      autorNome: linha.autorNome,
      autorAvatarUrl: linha.autorAvatarUrl ?? null,
      texto: linha.texto ?? '',
      spoiler: linha.spoiler ?? false,
      criadoEm: (linha.criadoEm as Date).toISOString(),
      atualizadoEm: (linha.atualizadoEm as Date).toISOString(),
    };
  }

  /**
   * As VIEWs pertencem a `leitura` e a `identidade`. Enquanto F-AVA não entrega,
   * e enquanto os GRANTs entre schemas não estiverem no lugar, a falta delas não
   * pode derrubar a página inteira do livro pessoal: nota, resenha e dono
   * degradam para `null`. A autorização de RN-15, que lê as mesmas VIEWs de
   * `identidade`, continua respondendo 503 — lá a falta é falha, não ausência.
   */
  private async executar<T>(consulta: () => Promise<T[]>): Promise<T[]> {
    try {
      return await consulta();
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        return [];
      }
      throw erro;
    }
  }
}

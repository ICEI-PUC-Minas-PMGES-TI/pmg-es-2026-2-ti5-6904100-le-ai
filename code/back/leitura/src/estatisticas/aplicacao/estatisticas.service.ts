import { Inject, Injectable } from '@nestjs/common';
import {
  AcessoNegado,
  ErroDeValidacao,
  NaoEncontrado,
} from '../../common/erros-de-negocio';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import type { Tx } from '../../db/tipos';
import { FUSO_HORARIO_PADRAO } from '../../leituras/aplicacao/leituras.service';
import { dataLocal } from '../../progresso/dominio/progresso';
import { ReferenciasExternas } from '../../referencias/referencias-externas.service';
import {
  EstatisticasDto,
  EstatisticasPerfilDto,
  GraficosEstatisticasDto,
} from '../api/dto/estatisticas.dto';
import {
  anosComRegistro,
  lerPeriodo,
  type MesCorrente,
  type Periodo,
  resumir,
  serie,
  somar,
} from '../dominio/estatisticas';
import { EstatisticasRepository } from '../infraestrutura/estatisticas.repository';

/**
 * Estatísticas do leitor (F-STA, RF-STA-01/02/03/05).
 *
 * Os baldes mensais são sempre recompostos do estado atual: o consumidor de
 * métricas (`progresso.registrado`, `leitura.finalizada`), a exclusão de
 * trecho de progresso e as escritas de nota chamam `recalcular`. As consultas
 * só somam os baldes; `/me` e o recorte de perfil usam a mesma soma.
 */
@Injectable()
export class EstatisticasService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: EstatisticasRepository,
    private readonly referencias: ReferenciasExternas,
  ) {}

  /** Recompõe os baldes do leitor dentro do `tx` de quem chama. */
  async recalcular(tx: Tx, usuarioId: string): Promise<void> {
    await this.repositorio.travar(tx, usuarioId);
    await this.repositorio.recompor(tx, usuarioId);
  }

  /** `GET /me/estatisticas` (RF-STA-01/02): só os dados do próprio leitor. */
  async consultar(
    usuarioId: string,
    periodoTexto?: string,
    agora = new Date(),
  ): Promise<EstatisticasDto> {
    const periodo = periodoDe(periodoTexto, mesCorrente(agora).ano);
    const [baldes, primeiroRegistro] = await Promise.all([
      this.repositorio.baldes(usuarioId),
      this.repositorio.primeiroRegistro(usuarioId),
    ]);
    const resumo = resumir(baldes, periodo);
    return {
      ano: periodo.tipo === 'ano' ? periodo.ano : null,
      anos: anosComRegistro(baldes),
      primeiroRegistro,
      totais: resumo.totais,
      medias: {
        paginasPorDia: {
          valor: resumo.paginasPorDia.valor,
          paginasLidas: resumo.paginasPorDia.numerador,
          diasComLeitura: resumo.paginasPorDia.denominador,
        },
        diasPorLivro: {
          valor: resumo.diasPorLivro.valor,
          dias: resumo.diasPorLivro.numerador,
          leiturasConcluidas: resumo.diasPorLivro.denominador,
        },
        notaMedia: {
          valor: resumo.notaMedia.valor,
          quantidade: resumo.notaMedia.denominador,
        },
      },
    };
  }

  /** `GET /me/estatisticas/graficos` (RF-STA-03). */
  async graficos(
    usuarioId: string,
    periodoTexto?: string,
    agora = new Date(),
  ): Promise<GraficosEstatisticasDto> {
    const corrente = mesCorrente(agora);
    const periodo = periodoDe(periodoTexto, corrente.ano);
    const baldes = await this.repositorio.baldes(usuarioId);
    return {
      ano: periodo.tipo === 'ano' ? periodo.ano : null,
      ...serie(baldes, periodo, corrente),
    };
  }

  /**
   * `GET /perfis/{usuarioId}/estatisticas`: os totais do ano para o perfil,
   * sob RN-08 — o próprio leitor e perfis públicos; perfil privado exige
   * seguimento aceito (403); conta inexistente, suspensa ou em exclusão é 404.
   */
  async doPerfil(
    solicitanteId: string,
    usuarioId: string,
    ano?: number,
    agora = new Date(),
  ): Promise<EstatisticasPerfilDto> {
    if (solicitanteId !== usuarioId) {
      const perfil = await this.referencias.buscarPerfil(usuarioId);
      if (!perfil) {
        throw new NaoEncontrado('Não encontramos este perfil.');
      }
      if (
        perfil.privacidade === 'privado' &&
        !(await this.referencias.existeSeguimentoAceito(
          solicitanteId,
          usuarioId,
        ))
      ) {
        throw new AcessoNegado('Este perfil é privado.');
      }
    }
    const doAno = ano ?? mesCorrente(agora).ano;
    const soma = somar(await this.repositorio.baldes(usuarioId, doAno));
    return {
      ano: doAno,
      livrosConcluidos: soma.livrosConcluidos,
      paginasLidas: soma.paginasLidas,
      minutosLidos: soma.minutosLidos,
    };
  }

  /**
   * Backfill (catálogo de mensageria: o consumidor recompõe da fonte antes de
   * ligar o efeito). Idempotente: rodar de novo só recalcula o mesmo estado.
   */
  async recalcularTodos(): Promise<number> {
    const usuarios = await this.repositorio.usuariosParaRecalcular();
    for (const usuarioId of usuarios) {
      await this.db.transaction((tx) => this.recalcular(tx, usuarioId));
    }
    return usuarios.length;
  }
}

/**
 * Mês corrente no fuso padrão: as consultas não recebem o fuso do
 * dispositivo, e o corte do eixo no presente tolera a diferença (o domínio
 * nunca esconde mês com registro).
 */
function mesCorrente(agora: Date): MesCorrente {
  const [ano, mes] = dataLocal(agora, FUSO_HORARIO_PADRAO).split('-');
  return { ano: Number(ano), mes: Number(mes) };
}

function periodoDe(texto: string | undefined, anoCorrente: number): Periodo {
  const periodo = lerPeriodo(texto, anoCorrente);
  if (!periodo) {
    throw new ErroDeValidacao([
      {
        campo: 'periodo',
        mensagem: 'Informe um ano com quatro dígitos ou "acumulado".',
      },
    ]);
  }
  return periodo;
}

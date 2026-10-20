import { Injectable } from '@nestjs/common';
import { diaJuliano } from '../../common/datas';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../estante/api/dto/estante.dto';
import type {
  ConsultaHistoricoDto,
  OcorrenciaHistoricoDto,
  PaginaHistoricoDto,
} from '../api/dto/historico.dto';
import {
  HistoricoRepository,
  type LinhaHistorico,
} from '../infraestrutura/historico.repository';

@Injectable()
export class HistoricoService {
  constructor(private readonly repositorio: HistoricoRepository) {}

  async listar(
    usuarioId: string,
    consulta: ConsultaHistoricoDto,
  ): Promise<PaginaHistoricoDto> {
    const page = consulta.page ?? PAGINA_PADRAO;
    const limite = Math.min(consulta.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);
    const filtro = { ano: consulta.ano, q: consulta.q };

    const [linhas, totais, anos] = await Promise.all([
      this.repositorio.listar(usuarioId, filtro, (page - 1) * limite, limite),
      this.repositorio.totais(usuarioId, filtro),
      this.repositorio.anos(usuarioId),
    ]);

    return {
      itens: linhas.map(paraOcorrencia),
      paginacao: {
        page,
        limite,
        totalItens: totais.leituras,
        totalPaginas: Math.ceil(totais.leituras / limite),
      },
      anos,
      totais,
    };
  }
}

function paraOcorrencia(linha: LinhaHistorico): OcorrenciaHistoricoDto {
  return {
    leituraId: linha.leituraId,
    livro: {
      id: linha.livroId,
      tipo: linha.tipo,
      titulo: linha.titulo,
      autor: linha.autor,
      capaUrl: linha.capaUrl,
    },
    dataInicio: linha.dataInicio,
    dataFim: linha.dataFim,
    releitura: linha.releitura,
    duracaoDias: diaJuliano(linha.dataFim) - diaJuliano(linha.dataInicio) + 1,
    paginaFinal: linha.paginaFinal,
    totalPaginas: linha.totalPaginas,
  };
}

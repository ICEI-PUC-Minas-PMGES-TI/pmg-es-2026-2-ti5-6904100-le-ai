import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'desafios_service.dart';
import 'textos_do_historico.dart';

/// Por que a carga falhou: sem rede o banner é aviso (`ambar`, `WifiSlash`); servidor fora ou
/// resposta inválida é erro (historico-do-desafio.md §4.6 a §4.8).
enum FalhaDoHistorico { semConexao, servidor }

FalhaDoHistorico _falhaDe(ApiException erro) =>
    erro.kind == ApiFailureKind.network && erro.status == null
    ? FalhaDoHistorico.semConexao
    : FalhaDoHistorico.servidor;

/// Janelas encerradas de um desafio, carregadas por rolagem (RNF-DES-02), no molde de
/// `ListaPaginada`: a primeira página substitui, as seguintes acrescentam sem repetir período, e a
/// falha da página seguinte não apaga as anteriores. Guarda o tipo da falha, que a tela mostra.
class HistoricoDoDesafio extends ChangeNotifier {
  final Future<PaginaJanelas> Function(int pagina) _buscar;

  HistoricoDoDesafio(this._buscar);

  List<JanelaEncerrada> janelas = <JanelaEncerrada>[];
  bool carregando = false;
  bool carregandoMais = false;
  FalhaDoHistorico? falha;
  FalhaDoHistorico? falhaAoCarregarMais;
  int _proxima = 1;
  int _paginas = 0;
  bool _descartado = false;

  bool get temMais => _proxima <= _paginas;

  /// A lista acabou: é aí que entra o rodapé de criação.
  bool get chegouAoFim => !carregando && falha == null && !temMais;

  Future<void> carregar() async {
    carregando = true;
    falha = null;
    falhaAoCarregarMais = null;
    _avisar();
    try {
      final pagina = await _buscar(1);
      janelas = pagina.itens;
      _paginas = pagina.totalPaginas;
      _proxima = 2;
    } on ApiException catch (erro) {
      falha = _falhaDe(erro);
    } finally {
      carregando = false;
      _avisar();
    }
  }

  /// Devolve se trouxe uma página nova, para a tela anunciar `Mais janelas carregadas`.
  Future<bool> carregarMais() async {
    if (!temMais || carregando || carregandoMais) {
      return false;
    }
    carregandoMais = true;
    falhaAoCarregarMais = null;
    _avisar();
    try {
      final pagina = await _buscar(_proxima);
      final vistas = janelas.map((janela) => janela.chave).toSet();
      janelas = <JanelaEncerrada>[
        ...janelas,
        ...pagina.itens.where((janela) => vistas.add(janela.chave)),
      ];
      _paginas = pagina.totalPaginas;
      _proxima++;
      return true;
    } on ApiException catch (erro) {
      falhaAoCarregarMais = _falhaDe(erro);
      return false;
    } finally {
      carregandoMais = false;
      _avisar();
    }
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }
}

/// Um item da lista dentro do grupo: a linha da janela ou a marca de mudança de configuração
/// entre duas janelas vizinhas.
sealed class ItemDoHistorico {
  const ItemDoHistorico();
}

class LinhaDeJanela extends ItemDoHistorico {
  final JanelaEncerrada janela;

  const LinhaDeJanela(this.janela);
}

class MarcaDeMudanca extends ItemDoHistorico {
  final List<String> mudancas;

  const MarcaDeMudanca(this.mudancas);
}

class GrupoDoHistorico {
  /// `Setembro de 2026`, `2026`, ou `null` nas anuais, que não têm grupo.
  final String? titulo;
  final List<ItemDoHistorico> itens;

  const GrupoDoHistorico(this.titulo, this.itens);
}

/// Agrupa as janelas (já da mais recente para a mais antiga) pelo período maior e põe a marca de
/// mudança entre vizinhas de snapshot diferente, derivada aqui, sem evento no contrato. Quando a
/// mudança cai na troca de grupo, a marca fecha o grupo da janela nova, antes do cabeçalho do
/// seguinte. A comparação atravessa páginas, porque recebe a lista acumulada.
List<GrupoDoHistorico> agruparHistorico(List<JanelaEncerrada> janelas) {
  final grupos = <GrupoDoHistorico>[];
  for (final (indice, janela) in janelas.indexed) {
    final titulo = grupoDaJanela(janela);
    if (grupos.isEmpty || grupos.last.titulo != titulo) {
      grupos.add(GrupoDoHistorico(titulo, <ItemDoHistorico>[]));
    }
    if (indice > 0) {
      final mudancas = mudancasEntre(janelas[indice - 1], janela);
      if (mudancas.isNotEmpty) {
        final destino = grupos.length > 1 && grupos.last.itens.isEmpty
            ? grupos[grupos.length - 2]
            : grupos.last;
        destino.itens.add(MarcaDeMudanca(mudancas));
      }
    }
    grupos.last.itens.add(LinhaDeJanela(janela));
  }
  return grupos;
}

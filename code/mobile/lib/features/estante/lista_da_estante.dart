import '../../core/network/api_client.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import 'leitura_service.dart';

const int _proibido = 403;
const int _naoEncontrado = 404;

class ListaDaEstante extends ListaPaginada<ItemEstante> {
  Map<StatusEstante, int>? totais;
  bool restrita = false;
  bool indisponivel = false;

  ListaDaEstante._(Future<Pagina<ItemEstante>> Function(int pagina) buscar)
    : super(buscar, (item) => item.livroId);

  factory ListaDaEstante(Future<PaginaEstante> Function(int pagina) listar) {
    late final ListaDaEstante lista;
    lista = ListaDaEstante._((pagina) async {
      try {
        final resposta = await listar(pagina + 1);
        lista
          ..totais = resposta.totaisPorStatus
          ..restrita = false
          ..indisponivel = false;
        return Pagina<ItemEstante>(
          itens: resposta.itens,
          pagina: pagina,
          totalElementos: resposta.totalItens,
          totalPaginas: resposta.totalPaginas,
        );
      } on ApiException catch (erro) {
        lista
          ..restrita = erro.status == _proibido
          ..indisponivel = erro.status == _naoEncontrado;
        rethrow;
      }
    });
    return lista;
  }

  int? get totalGeral {
    final atuais = totais;
    return atuais?.values.fold<int>(0, (soma, valor) => soma + valor);
  }
}

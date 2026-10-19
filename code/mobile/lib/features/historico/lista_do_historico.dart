import '../estante/estante_service.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';

class ListaDoHistorico extends ListaPaginada<OcorrenciaHistorico> {
  Map<int, int> anos = <int, int>{};
  int livros = 0;
  int leituras = 0;

  ListaDoHistorico._(Future<Pagina<OcorrenciaHistorico>> Function(int pagina) buscar)
    : super(buscar, (item) => item.leituraId);

  factory ListaDoHistorico(Future<PaginaHistorico> Function(int pagina) listar) {
    late final ListaDoHistorico lista;
    lista = ListaDoHistorico._((pagina) async {
      final resposta = await listar(pagina + 1);
      lista
        ..anos = resposta.anos
        ..livros = resposta.livros
        ..leituras = resposta.leituras;
      return resposta.pagina;
    });
    return lista;
  }

  int get totalDoHistorico => anos.values.fold<int>(0, (soma, total) => soma + total);
}

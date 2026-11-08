import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../descobrir/agrupar_edicoes.dart' show semAcento;
import 'acervo_service.dart';
import 'livro_oficial.dart';

/// Acima disto o campo avisa, sem bloquear (RN-21.2, decisão 1 do dono em F-ACV-OPC).
const int assuntosRecomendados = 5;

enum EstadoDaListaDeAssuntos { carregando, pronto, erro }

/// Chave de ordenação dos nomes: sem acento e sem caixa, como o seletor mostra.
String _chaveDoNome(String nome) => semAcento(nome.toLowerCase());

/// Assuntos em ordem alfabética, a mesma do seletor e da ficha (cadastro-pessoal.md §4.1 A).
List<AssuntoResumo> ordenarAssuntos(Iterable<AssuntoResumo> assuntos) {
  return assuntos.toList()..sort((a, b) {
    final porChave = _chaveDoNome(a.nome).compareTo(_chaveDoNome(b.nome));
    return porChave != 0 ? porChave : a.nome.compareTo(b.nome);
  });
}

/// `História e Memórias`, `A, B e C`: a leitura para leitor de tela (livro-pessoal.md §8).
String juntarComE(List<String> nomes) {
  if (nomes.length <= 1) {
    return nomes.join();
  }
  return '${nomes.sublist(0, nomes.length - 1).join(', ')} e ${nomes.last}';
}

/// Estado do seletor de assuntos do livro pessoal (RF-ACV-22, cadastro-pessoal.md §5.1 a §5.5).
///
/// Vive enquanto o formulário vive: a lista do `GET /assuntos` é carregada na primeira abertura e
/// reaproveitada nas seguintes; só uma falha faz a próxima abertura tentar de novo. A seleção é
/// **provisória**: [abrir] copia a do formulário, e ela só vale quando a folha devolve [selecao]
/// no `Concluir`. Fechar de qualquer outro jeito descarta.
class SeletorDeAssuntosController extends ChangeNotifier {
  final AcervoService servico;

  /// Espera até a linha de cold start aparecer (RNF-ERR-09, §5.4).
  final Duration esperaDoColdStart;

  SeletorDeAssuntosController({
    required this.servico,
    this.esperaDoColdStart = const Duration(seconds: 3),
  });

  EstadoDaListaDeAssuntos _estado = EstadoDaListaDeAssuntos.carregando;
  EstadoDaListaDeAssuntos get estado => _estado;

  bool _coldStart = false;
  bool get coldStart => _coldStart;

  List<AssuntoResumo> _todos = const <AssuntoResumo>[];
  bool _carregou = false;
  Future<void>? _carga;
  Timer? _timerDoColdStart;
  bool _descartado = false;

  String _busca = '';
  String get busca => _busca;

  final Map<String, AssuntoResumo> _selecionados = <String, AssuntoResumo>{};

  /// Prepara a folha com a seleção atual do formulário e carrega a lista, se ainda não tem.
  void abrir(List<AssuntoResumo> atuais) {
    _selecionados
      ..clear()
      ..addEntries(atuais.map((a) => MapEntry<String, AssuntoResumo>(a.id, a)));
    _busca = '';
    if (!_carregou) {
      unawaited(carregar());
    }
    notifyListeners();
  }

  /// `GET /assuntos`. Chamadas durante uma carga em curso esperam a mesma.
  Future<void> carregar() {
    return _carga ??= _carregar().whenComplete(() => _carga = null);
  }

  Future<void> _carregar() async {
    _estado = EstadoDaListaDeAssuntos.carregando;
    _coldStart = false;
    _timerDoColdStart?.cancel();
    _timerDoColdStart = Timer(esperaDoColdStart, () {
      if (_estado == EstadoDaListaDeAssuntos.carregando) {
        _coldStart = true;
        _avisar();
      }
    });
    _avisar();
    try {
      final lista = await servico.listarAssuntos();
      _todos = ordenarAssuntos(lista);
      _carregou = true;
      _estado = EstadoDaListaDeAssuntos.pronto;
    } on ApiException {
      _estado = EstadoDaListaDeAssuntos.erro;
    } finally {
      _timerDoColdStart?.cancel();
      _coldStart = false;
      _avisar();
    }
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  /// A busca filtra o que se vê, nunca a seleção (§5.2), sem diferenciar acento nem caixa.
  List<AssuntoResumo> get visiveis {
    final termo = _chaveDoNome(_busca.trim());
    if (termo.isEmpty) {
      return _todos;
    }
    return <AssuntoResumo>[
      for (final assunto in _todos)
        if (_chaveDoNome(assunto.nome).contains(termo)) assunto,
    ];
  }

  void buscar(String texto) {
    if (texto == _busca) {
      return;
    }
    _busca = texto;
    notifyListeners();
  }

  bool marcado(String id) => _selecionados.containsKey(id);

  int get quantidade => _selecionados.length;

  void alternar(AssuntoResumo assunto) {
    if (_selecionados.remove(assunto.id) == null) {
      _selecionados[assunto.id] = assunto;
    }
    notifyListeners();
  }

  void limpar() {
    _selecionados.clear();
    notifyListeners();
  }

  /// A seleção provisória, em ordem alfabética: o que o `Concluir` aplica ao formulário.
  List<AssuntoResumo> get selecao => ordenarAssuntos(_selecionados.values);

  @override
  void dispose() {
    _descartado = true;
    _timerDoColdStart?.cancel();
    super.dispose();
  }
}

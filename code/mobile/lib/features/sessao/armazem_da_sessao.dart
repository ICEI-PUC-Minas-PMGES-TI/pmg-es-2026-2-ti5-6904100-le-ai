import 'package:shared_preferences/shared_preferences.dart';

abstract interface class ArmazemDaSessao {
  Future<String?> ler();

  Future<void> gravar(String? conteudo);
}

class ArmazemDaSessaoEmPreferencias implements ArmazemDaSessao {
  static const String chave = 'sessao_de_leitura';

  final SharedPreferencesAsync preferencias;

  ArmazemDaSessaoEmPreferencias({SharedPreferencesAsync? preferencias})
    : preferencias = preferencias ?? SharedPreferencesAsync();

  @override
  Future<String?> ler() => preferencias.getString(chave);

  @override
  Future<void> gravar(String? conteudo) =>
      conteudo == null ? preferencias.remove(chave) : preferencias.setString(chave, conteudo);
}

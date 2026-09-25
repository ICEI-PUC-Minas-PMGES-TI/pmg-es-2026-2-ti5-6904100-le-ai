import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import 'perfil_service.dart';
import 'widgets_de_perfil.dart';

final RegExp _formato = RegExp(r'^[A-Za-z0-9._]{3,30}$');

enum _Estado { aterrissagem, buscando, encontrado, vazio, erro }

/// Buscar leitor (RF-SOC-03), a partir de docs/design/periodo-1/F-PERFIL/buscar-leitor.md, com
/// a mesma lógica da web (`BuscarLeitorView.vue`): zero ou um resultado, só por username inteiro
/// (RNF-SEC-19/44), buscado no envio e não a cada tecla (o servidor limita a 30 por minuto).
///
/// - O campo fica abaixo do header do app, não no lugar dele.
/// - Sem biografia no card: a busca devolve `PerfilResumo`.
/// - Sem o estado de "consulta parcial": saber que `rafa` é parte de um nome exigiria o servidor
///   revelar que existem nomes começando assim, que é a enumeração proibida.
class BuscarLeitorPage extends StatefulWidget {
  final PerfilService servico;
  final VoidCallback? aoVoltar;
  final void Function(String username) aoAbrirPerfil;

  const BuscarLeitorPage({
    super.key,
    required this.servico,
    this.aoVoltar,
    required this.aoAbrirPerfil,
  });

  @override
  State<BuscarLeitorPage> createState() => _BuscarLeitorPageState();
}

class _BuscarLeitorPageState extends State<BuscarLeitorPage> {
  final _consulta = TextEditingController();
  _Estado _estado = _Estado.aterrissagem;
  PerfilResumo? _resultado;
  String? _erroDeFormato;
  String _mensagemDeErro = 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.';
  bool _coldStart = false;
  Timer? _timer;
  int _buscaAtual = 0;

  @override
  void initState() {
    super.initState();
    _consulta.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _consulta.dispose();
    super.dispose();
  }

  Future<void> _buscar() async {
    final username = _consulta.text.trim().replaceFirst(RegExp('^@'), '');
    if (username.isEmpty) {
      return;
    }
    if (!_formato.hasMatch(username)) {
      setState(
        () => _erroDeFormato =
            'Digite o nome de usuário completo: de 3 a 30 letras, números, ponto ou traço baixo.',
      );
      return;
    }
    final minha = ++_buscaAtual;
    setState(() {
      _erroDeFormato = null;
      _estado = _Estado.buscando;
      _coldStart = false;
    });
    _timer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _coldStart = true);
      }
    });
    try {
      final encontrados = await widget.servico.buscarPorUsername(username);
      if (!mounted || minha != _buscaAtual) {
        return;
      }
      setState(() {
        _resultado = encontrados.isEmpty ? null : encontrados.first;
        _estado = _resultado == null ? _Estado.vazio : _Estado.encontrado;
      });
    } on ApiException catch (erro) {
      if (!mounted || minha != _buscaAtual) {
        return;
      }
      setState(() {
        // 429 é o limite de buscas: a frase do servidor diz o que fazer.
        _mensagemDeErro = erro.status == 429
            ? erro.message
            : 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.';
        _estado = _Estado.erro;
      });
    } finally {
      _timer?.cancel();
      if (mounted) {
        setState(() => _coldStart = false);
      }
    }
  }

  void _limpar() {
    setState(() {
      _buscaAtual++;
      _consulta.clear();
      _erroDeFormato = null;
      _resultado = null;
      _estado = _Estado.aterrissagem;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Buscar leitor', aoVoltar: widget.aoVoltar),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(DesignTokens.space5),
            children: <Widget>[
              TextField(
                controller: _consulta,
                enabled: _estado != _Estado.buscando,
                autocorrect: false,
                enableSuggestions: false,
                textCapitalization: TextCapitalization.none,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _buscar(),
                style: theme.textTheme.bodyMedium,
                decoration: InputDecoration(
                  hintText: 'Nome de usuário exato',
                  errorText: _erroDeFormato,
                  errorMaxLines: 3,
                  prefixIcon: Icon(PhosphorIconsRegular.at, size: 20, color: theme.tertiaryText),
                  suffixIcon: _consulta.text.isEmpty
                      ? null
                      : IconButton(
                          tooltip: 'Limpar',
                          onPressed: _limpar,
                          icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                        ),
                ),
              ),
              const SizedBox(height: DesignTokens.space6),
              Semantics(liveRegion: true, child: _conteudo(theme)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _conteudo(ThemeData theme) {
    switch (_estado) {
      case _Estado.aterrissagem:
        return const EstadoVazio(
          icone: PhosphorIconsRegular.at,
          titulo: 'Busque pelo nome de usuário',
          texto:
              'A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não '
              'existe lista de leitores para explorar.',
        );
      case _Estado.buscando:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const SkeletonDeLinha(),
            if (_coldStart) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Text(
                'O servidor está iniciando. Isso pode levar alguns segundos.',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ],
        );
      case _Estado.encontrado:
        final leitor = _resultado!;
        return Container(
          padding: const EdgeInsets.all(DesignTokens.space4),
          decoration: BoxDecoration(
            color: theme.elevatedSurface,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
          ),
          child: LinhaDeLeitor(
            leitor: leitor,
            aoAbrir: () => widget.aoAbrirPerfil(leitor.username),
            acao: Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.tertiaryText),
          ),
        );
      case _Estado.vazio:
        return const EstadoVazio(
          icone: PhosphorIconsRegular.at,
          titulo: 'Nenhum leitor com esse nome de usuário',
          texto: 'Confira a grafia. A busca precisa do nome de usuário inteiro e exato.',
        );
      case _Estado.erro:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            BannerAviso(variante: VarianteAviso.erro, mensagem: _mensagemDeErro),
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(texto: 'Tentar de novo', onPressed: _buscar),
          ],
        );
    }
  }
}

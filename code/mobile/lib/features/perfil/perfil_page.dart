import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../estante/estante_de_perfil.dart';
import '../estante/estante_service.dart';
import 'conexoes_page.dart';
import 'perfil_service.dart';
import 'textos.dart';
import 'widgets_de_identidade.dart';
import 'widgets_de_perfil.dart';

/// Meu perfil (RF-SOC-01, RF-SOC-04), a partir de docs/design/periodo-1/F-PERFIL/meu-perfil.md
/// §4: identidade centralizada, chip de privacidade, biografia em até três linhas, `Editar
/// perfil` e os contadores numa linha com divisor. O header (título `Perfil` e engrenagem) é do
/// shell.
///
/// **Estante e Resenhas do `leitura`**: a estante ([estante], `listarEstantePerfil`, F-EST) na mesma
/// grade só leitura do perfil de outro leitor, com "Ver tudo"; sem livros, o vazio com o CTA "Buscar
/// livros". As resenhas por [resenhas] (`listarResenhasPerfil`, F-AVA). O contador `livros lidos`
/// vem dos totais da estante (`Lido` + `Relendo`) e só aparece depois que ela carrega.
class PerfilPage extends StatefulWidget {
  final PerfilService servico;

  /// Abre a edição; ao voltar, o perfil é relido.
  final Future<void> Function()? aoEditar;

  /// Os contadores levam à aba correspondente de Conexões (§4 "Contadores").
  final Future<void> Function(AbaDeConexoes aba)? aoAbrirConexoes;

  /// A linha de pedidos pendentes leva à caixa (§4.3).
  final Future<void> Function()? aoAbrirSolicitacoes;

  /// "Buscar livros" do vazio da estante leva a Descobrir. Sem ele, a página vai direto a
  /// `/descobrir` pelo `GoRouter` do contexto, quando houver um.
  final VoidCallback? aoBuscarLivros;

  /// "Ver tudo" da seção Estante leva à aba Estante; mesmo padrão de [aoBuscarLivros].
  final VoidCallback? aoVerEstante;

  /// O contador `livros lidos` leva à estante filtrada por `Lido` (§4 "Contadores"); mesmo padrão de
  /// [aoBuscarLivros].
  final VoidCallback? aoVerLivrosLidos;

  /// Estante do próprio leitor (F-EST). Sem ela, a seção fica no estado vazio.
  final EstanteService? estante;

  /// Lista de resenhas do perfil (F-AVA), montada com o id do leitor.
  final Widget Function(String usuarioId)? resenhas;

  /// Seção "Listas" (F-LST), montada com o id do leitor.
  final Widget Function(String usuarioId)? listas;

  const PerfilPage({
    super.key,
    required this.servico,
    this.aoEditar,
    this.aoAbrirConexoes,
    this.aoAbrirSolicitacoes,
    this.aoBuscarLivros,
    this.aoVerEstante,
    this.aoVerLivrosLidos,
    this.estante,
    this.resenhas,
    this.listas,
  });

  @override
  State<PerfilPage> createState() => _PerfilPageState();
}

class _PerfilPageState extends State<PerfilPage> {
  Perfil? _perfil;
  bool _carregando = true;
  bool _falhou = false;
  int _pedidosPendentes = 0;
  int? _livrosLidos;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  /// A contagem vem de uma página de um item da caixa; falhar nela só esconde a linha.
  Future<void> _contarPedidos() async {
    try {
      final pagina = await widget.servico.listarSolicitacoes(0, tamanho: 1);
      if (mounted) {
        setState(() => _pedidosPendentes = pagina.totalElementos);
      }
    } on ApiException {
      if (mounted) {
        setState(() => _pedidosPendentes = 0);
      }
    }
  }

  /// Volta de qualquer tela empilhada relendo o perfil: contadores e pedidos podem ter mudado.
  Future<void> _abrir(Future<void> Function()? destino) async {
    await destino?.call();
    if (mounted) {
      await _carregar();
    }
  }

  Future<void> _carregar() async {
    unawaited(_contarPedidos());
    setState(() {
      _carregando = true;
      _falhou = false;
    });
    try {
      final perfil = await widget.servico.obterMeuPerfil();
      if (mounted) {
        setState(() {
          _perfil = perfil;
          _carregando = false;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _carregando = false;
          _falhou = true;
        });
      }
    }
  }

  VoidCallback? _conexoes(AbaDeConexoes aba) {
    final abrir = widget.aoAbrirConexoes;
    return abrir == null ? null : () => _abrir(() => abrir(aba));
  }

  /// Destino de um CTA das seções de leitura: o callback de quem monta a página ou, sem ele, a
  /// rota da aba pelo `GoRouter` do contexto.
  VoidCallback? _destino(VoidCallback? callback, String rota) {
    if (callback != null) {
      return callback;
    }
    final router = GoRouter.maybeOf(context);
    return router == null ? null : () => router.go(rota);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final perfil = _perfil;
    final estante = widget.estante;
    final aoBuscarLivros = _destino(widget.aoBuscarLivros, '/descobrir');
    final aoVerEstante = _destino(widget.aoVerEstante, '/estante');
    return SingleChildScrollView(
      // 32 acima do avatar, como no protótipo.
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space8,
        DesignTokens.space5,
        DesignTokens.space10,
      ),
      child: _carregando && perfil == null
          ? const SkeletonDoPerfil()
          : _falhou || perfil == null
          ? BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem: 'Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.',
              acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
            )
          : Column(
              children: <Widget>[
                AvatarLeitor(url: perfil.avatarUrl, tamanho: 96, nome: perfil.displayName),
                const SizedBox(height: DesignTokens.space4),
                Text(perfil.displayName, style: theme.displayTitle, textAlign: TextAlign.center),
                const SizedBox(height: DesignTokens.space1),
                Text(
                  '@${perfil.username}',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                ),
                const SizedBox(height: DesignTokens.space3),
                ChipPrivacidade(privacidade: perfil.privacidade),
                if (perfil.privacidade == Privacidade.privado) ...<Widget>[
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    'Só quem você aceita vê sua estante e suas resenhas.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (perfil.biografia != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space4),
                  Text(
                    perfil.biografia!,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                ],
                const SizedBox(height: DesignTokens.space5),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 240),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      onPressed: widget.aoEditar == null ? null : () => _abrir(widget.aoEditar),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: theme.colorScheme.onSurface,
                        side: BorderSide(color: theme.divider),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(DesignTokens.radius),
                        ),
                        textStyle: theme.textTheme.labelLarge,
                      ),
                      child: const Text('Editar perfil'),
                    ),
                  ),
                ),
                const SizedBox(height: DesignTokens.space6),
                ContadoresDoPerfil(
                  contadores: <DadoDeContador>[
                    if (_livrosLidos case final lidos?)
                      DadoDeContador(
                        valor: lidos,
                        rotulo: lidos == 1 ? 'livro lido' : 'livros lidos',
                        aoTocar: _destino(
                          widget.aoVerLivrosLidos,
                          '/estante?status=${StatusEstante.lido.valor}',
                        ),
                      ),
                    DadoDeContador(
                      valor: perfil.seguidores,
                      rotulo: perfil.seguidores == 1 ? 'seguidor' : 'seguidores',
                      aoTocar: _conexoes(AbaDeConexoes.seguidores),
                    ),
                    DadoDeContador(
                      valor: perfil.seguidos,
                      rotulo: 'seguindo',
                      aoTocar: _conexoes(AbaDeConexoes.seguidos),
                    ),
                  ],
                ),
                if (_pedidosPendentes > 0) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  LinhaDeAcento(
                    icone: PhosphorIconsRegular.userPlus,
                    texto:
                        '${contagem(_pedidosPendentes, 'solicitação', 'solicitações')} para seguir você',
                    aoTocar: () => _abrir(widget.aoAbrirSolicitacoes),
                  ),
                ],
                const SizedBox(height: DesignTokens.space12),
                SecoesDeLeitura(
                  proprio: true,
                  aoBuscarLivros: aoBuscarLivros,
                  aoVerEstante: aoVerEstante,
                  estante: estante == null
                      ? null
                      : EstanteDePerfil(
                          key: ValueKey<String>('estante-de-${perfil.id}'),
                          servico: estante,
                          usuarioId: perfil.id,
                          primeiroNome: primeiroNome(perfil.displayName),
                          aoMudarLivrosLidos: (lidos) => setState(() => _livrosLidos = lidos),
                          acaoDoTitulo: aoVerEstante == null ? null : BotaoVerTudo(onPressed: aoVerEstante),
                          vazio: EstanteVaziaDoPerfil(
                            proprio: true,
                            aoBuscarLivros: aoBuscarLivros,
                            aoVerEstante: aoVerEstante,
                          ),
                        ),
                  resenhas: widget.resenhas?.call(perfil.id),
                  listas: widget.listas?.call(perfil.id),
                ),
              ],
            ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/folha_inferior.dart';
import 'encerrar_sessao.dart';
import 'regras.dart';
import 'sessao_controller.dart';
import 'sessao_de_leitura.dart';
import 'textos.dart';

class SessaoPendentePage extends StatefulWidget {
  final SessaoController sessao;

  const SessaoPendentePage({super.key, required this.sessao});

  @override
  State<SessaoPendentePage> createState() => _SessaoPendentePageState();
}

class _SessaoPendentePageState extends State<SessaoPendentePage>
    with EncerramentoDaSessao<SessaoPendentePage> {
  @override
  SessaoController get sessao => widget.sessao;

  Future<void> _descartar() async {
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: TextosDaSessaoPendente.tituloDoDescarte,
      texto: TextosDaSessaoPendente.textoDoDescarte(rotuloDoTempoDaSessao(sessao.tempoLido)),
      acao: TextosDaSessaoPendente.descartar,
      cancelar: TextosDaSessaoPendente.voltar,
      semMovimento: true,
    );
    if (confirmado) {
      await sessao.descartar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final atual = sessao.sessao;
    final salvando = sessao.salvando;
    final erroDeEnvio = sessao.erroDeEnvio;
    final expirada = sessao.situacao == SituacaoDaSessao.expirada;
    final pausa = atual?.pausa;
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              0,
              DesignTokens.space5,
              DesignTokens.space6,
            ),
            child: atual == null
                ? const SizedBox.shrink()
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: <Widget>[
                              const SizedBox(height: DesignTokens.space12),
                              Semantics(
                                header: true,
                                child: Text(
                                  expirada
                                      ? TextosDaSessaoPendente.tituloDaExpirada
                                      : TextosDaSessaoPendente.tituloDaPausaEsgotada,
                                  style: theme.textTheme.headlineSmall,
                                ),
                              ),
                              const SizedBox(height: DesignTokens.space3),
                              Text(
                                expirada || pausa == null
                                    ? TextosDaSessaoPendente.textoDaExpirada
                                    : TextosDaSessaoPendente.textoDaPausaEsgotada(
                                        pausa.duracao,
                                        minutosDaSessao(sessao.tempoLido),
                                      ),
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.secondaryText,
                                ),
                              ),
                              const SizedBox(height: DesignTokens.space6),
                              Container(
                                padding: const EdgeInsets.all(DesignTokens.space4),
                                decoration: BoxDecoration(
                                  color: theme.elevatedSurface,
                                  borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
                                ),
                                child: CartaoDoLivroDaSessao(
                                  leitura: atual.leitura,
                                  paginaBase: sessao.paginaBase,
                                ),
                              ),
                              const SizedBox(height: DesignTokens.space4),
                              LinhaDoTempoDaSessao(tempo: sessao.tempoRegistravel),
                              const SizedBox(height: DesignTokens.space6),
                              CamposDoEncerramento(
                                pagina: pagina,
                                foco: focoDaPagina,
                                paginaBase: sessao.paginaBase,
                                totalPaginas: atual.leitura.totalPaginas,
                                tempo: sessao.tempoRegistravel,
                                erro: erroDaPagina,
                                salvando: salvando,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: DesignTokens.space4),
                      BotaoPrimario(
                        texto: rotuloDoSalvar(TextosDaSessaoPendente.salvar),
                        carregando: salvando,
                        onPressed: salvarEncerramento,
                      ),
                      if (erroDeEnvio != null) ErroDeEnvioDaSessao(mensagem: erroDeEnvio),
                      const SizedBox(height: DesignTokens.space3),
                      BotaoDestrutivo(
                        texto: TextosDaSessaoPendente.descartar,
                        onPressed: salvando ? null : _descartar,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

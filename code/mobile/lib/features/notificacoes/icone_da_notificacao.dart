import 'package:flutter/widgets.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'notificacao.dart';

IconData iconeDaNotificacao(TipoNotificacao tipo) => switch (tipo) {
  TipoNotificacao.atividadeCurtida => PhosphorIconsRegular.heart,
  TipoNotificacao.atividadeComentada ||
  TipoNotificacao.comentarioRespondido => PhosphorIconsRegular.chatCircle,
  TipoNotificacao.novoSeguidor || TipoNotificacao.solicitacaoCriada => PhosphorIconsRegular.userPlus,
  TipoNotificacao.solicitacaoAceita => PhosphorIconsRegular.userCheck,
  TipoNotificacao.usuarioMencionado => PhosphorIconsRegular.at,
  TipoNotificacao.leituraEmRisco => PhosphorIconsRegular.warning,
  TipoNotificacao.leituraExpirada => PhosphorIconsRegular.pauseCircle,
  TipoNotificacao.recomendacaoRecebida => PhosphorIconsRegular.paperPlaneTilt,
  // F-AVA-2: o mesmo ícone do botão de curtir na resenha, para não confundir com o `Heart` da
  // curtida em atividade (notificacoes.md §5).
  TipoNotificacao.resenhaCurtida => PhosphorIconsRegular.thumbsUp,
};

import 'leitura_service.dart';

const Map<StatusEstante, String> rotuloDoStatus = <StatusEstante, String>{
  StatusEstante.queroLer: 'Quero ler',
  StatusEstante.lendo: 'Lendo',
  StatusEstante.lido: 'Lido',
  StatusEstante.relendo: 'Relendo',
  StatusEstante.abandonado: 'Abandonado',
};

const String rotuloTodos = 'Todos';

const List<StatusEstante> ordemDosFiltros = <StatusEstante>[
  StatusEstante.lendo,
  StatusEstante.queroLer,
  StatusEstante.lido,
  StatusEstante.relendo,
  StatusEstante.abandonado,
];

const OrdenacaoEstante ordenacaoPadrao = OrdenacaoEstante.adicionadoDesc;

const Map<OrdenacaoEstante, String> rotuloDaOrdenacao = <OrdenacaoEstante, String>{
  OrdenacaoEstante.adicionadoDesc: 'Adicionados recentemente',
  OrdenacaoEstante.adicionadoAsc: 'Adicionados há mais tempo',
  OrdenacaoEstante.tituloAsc: 'Título, A a Z',
  OrdenacaoEstante.tituloDesc: 'Título, Z a A',
  OrdenacaoEstante.autorAsc: 'Autor, A a Z',
  OrdenacaoEstante.autorDesc: 'Autor, Z a A',
  OrdenacaoEstante.progressoDesc: 'Maior progresso',
  OrdenacaoEstante.progressoAsc: 'Menor progresso',
};

abstract final class TextosDaEstante {
  static const String titulo = 'Minha estante';
  static const String vaziaTitulo = 'Sua estante está vazia';
  static const String vaziaTexto =
      'Busque um livro pelo título, autor ou ISBN e escolha em qual status ele entra.';
  static const String vaziaBotaoPrimario = 'Buscar livros';
  static const String vaziaBotaoTextual = 'Cadastrar por ISBN';
  static const String erroTexto =
      'Não foi possível carregar sua estante. Verifique sua conexão e tente de novo.';
  static const String erroBotao = 'Tentar de novo';
  static const String rotuloOrdenacao = 'Ordenar por';
  static const String carregando = 'Carregando estante';
  static const String progressoIniciado = 'Iniciada';
}

enum DestinoDoVazio { descobrir, lendo, lido }

class VazioDoFiltro {
  final String titulo;
  final String texto;
  final String? rotuloDoBotao;
  final DestinoDoVazio? destino;

  const VazioDoFiltro({
    required this.titulo,
    required this.texto,
    this.rotuloDoBotao,
    this.destino,
  });
}

const Map<StatusEstante, VazioDoFiltro> vazioDoFiltro = <StatusEstante, VazioDoFiltro>{
  StatusEstante.lendo: VazioDoFiltro(
    titulo: 'Nenhuma leitura em andamento',
    texto: 'Livros aparecem aqui quando você começa a ler.',
  ),
  StatusEstante.queroLer: VazioDoFiltro(
    titulo: 'Nenhum livro para ler depois',
    texto: 'Livros aparecem aqui quando você os adiciona como Quero ler.',
    rotuloDoBotao: 'Buscar livros',
    destino: DestinoDoVazio.descobrir,
  ),
  StatusEstante.lido: VazioDoFiltro(
    titulo: 'Nenhum livro concluído',
    texto: 'Livros aparecem aqui quando você finaliza uma leitura.',
    rotuloDoBotao: 'Ver o que está lendo',
    destino: DestinoDoVazio.lendo,
  ),
  StatusEstante.relendo: VazioDoFiltro(
    titulo: 'Nenhuma releitura em andamento',
    texto: 'Releituras aparecem aqui quando você recomeça um livro que já concluiu.',
    rotuloDoBotao: 'Ver livros lidos',
    destino: DestinoDoVazio.lido,
  ),
  StatusEstante.abandonado: VazioDoFiltro(
    titulo: 'Nenhuma leitura abandonada',
    texto: 'Leituras aparecem aqui quando você as deixa de lado.',
  ),
};

abstract final class TextosDaEstanteDePerfil {
  static const String titulo = 'Estante';
  static const String erroTexto =
      'Não foi possível carregar a estante. Verifique sua conexão e tente de novo.';
}

String textoEstanteDePerfilVazia(String primeiroNome) =>
    '$primeiroNome ainda não adicionou livros à estante.';

String textoVezesLido(int vezes) => 'Lido $vezes ${vezes == 1 ? 'vez' : 'vezes'}';

String textoTotalDeLivros(int total) => '$total ${total == 1 ? 'livro' : 'livros'}';

abstract final class AcoesDeLeitura {
  static const String adicionarQueroLer = 'Adicionar como Quero ler';
  static const String iniciarLeitura = 'Iniciar leitura';
  static const String registrarProgresso = 'Registrar progresso';
  static const String finalizarLeitura = 'Finalizar leitura';
  static const String finalizarReleitura = 'Finalizar releitura';
  static const String iniciarReleitura = 'Iniciar releitura';
  static const String retomarLeitura = 'Retomar leitura';
  static const String abandonarLeitura = 'Abandonar leitura';
  static const String abandonarReleitura = 'Abandonar releitura';
  static const String removerDaEstante = 'Remover da estante';
  static const String cancelar = 'Cancelar';
  static const String salvando = 'Salvando';
  static const String abrir = 'Ações de leitura';
}

abstract final class TextosDeAcao {
  static const String rotuloDataInicio = 'Data de início';
  static const String rotuloDataFim = 'Data de fim';
  static const String ajudaDataInicio = 'A data padrão é hoje. Você pode ajustar se começou antes.';
  static const String ajudaDataFim = 'A data padrão é hoje. Você pode ajustar se terminou antes.';
  static const String erroAoSalvar =
      'Não foi possível salvar. Verifique sua conexão e tente de novo.';
  static const String erroAoCarregar =
      'Não foi possível carregar esta leitura. Verifique sua conexão e tente de novo.';
}

abstract final class ConfirmacaoAbandonarLeitura {
  static const String titulo = 'Abandonar esta leitura?';
  static String texto(int pagina) =>
      'A leitura fica salva na página $pagina e você pode retomá-la depois, continuando de onde parou.';
}

abstract final class ConfirmacaoAbandonarReleitura {
  static const String titulo = 'Abandonar esta releitura?';
  static const String texto =
      'A releitura será salva como incompleta e o livro volta para Lido. Ela não conta como nova conclusão e não pode ser retomada.';
}

abstract final class ConfirmacaoRemover {
  static const String titulo = 'Remover da estante?';
  static const String texto =
      'O livro sai da sua lista de Quero ler. Você pode adicioná-lo de novo quando quiser.';
}

String textoParouNaPagina(int pagina, int total) => 'Parou na página $pagina de $total';

String textoRetomada(int pagina) => 'Você volta para a página $pagina, onde parou.';

abstract final class ErrosDeAcao {
  static const String conflito =
      'O status deste livro mudou em outro lugar. Feche e abra de novo para ver as ações atuais.';
  static const String dataNoFuturo = 'Escolha uma data até hoje.';
}

const String rotuloVoltarAcoes = 'Voltar para as ações';

String textoProximaConclusao(int numero) => 'Esta será sua $numeroª conclusão deste livro.';

String textoConcluido(String dataPorExtenso, int conclusoes) =>
    'Concluído em $dataPorExtenso · $conclusoes ${conclusoes == 1 ? 'conclusão' : 'conclusões'}';

String textoPaginaDe(int pagina, int total) => 'Página $pagina de $total';

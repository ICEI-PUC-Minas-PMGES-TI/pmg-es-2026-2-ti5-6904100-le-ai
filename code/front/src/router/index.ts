import { watch } from 'vue'
import {
  createRouter,
  createWebHistory,
  type NavigationGuard,
  type Router,
  type RouteLocationNormalizedLoaded,
  type RouteRecordRaw,
} from 'vue-router'

import ShellAutenticado from '../layouts/ShellAutenticado.vue'
import { getToken, useSession } from '../session'
import AlterarSenhaView from '../views/auth/AlterarSenhaView.vue'
import BuscarLeitorView from '../views/perfil/BuscarLeitorView.vue'
import CadastroView from '../views/auth/CadastroView.vue'
import ConexoesView from '../views/perfil/ConexoesView.vue'
import ConfiguracoesView from '../views/auth/ConfiguracoesView.vue'
import DescobrirView from '../views/DescobrirView.vue'
import EditarPerfilView from '../views/perfil/EditarPerfilView.vue'
import ExcluirContaView from '../views/conta/ExcluirContaView.vue'
import ExclusaoSolicitadaView from '../views/conta/ExclusaoSolicitadaView.vue'
import EstanteView from '../views/EstanteView.vue'
import FeedView from '../views/FeedView.vue'
import LoginView from '../views/auth/LoginView.vue'
import PoliticaPrivacidadeView from '../views/auth/PoliticaPrivacidadeView.vue'
import ProgressoView from '../views/ProgressoView.vue'
import RecuperarContaView from '../views/conta/RecuperarContaView.vue'
import RecuperarSenhaView from '../views/auth/RecuperarSenhaView.vue'
import RedefinirSenhaView from '../views/auth/RedefinirSenhaView.vue'
import PerfilDeOutroView from '../views/perfil/PerfilDeOutroView.vue'
import PerfilView from '../views/perfil/PerfilView.vue'
import SolicitacoesView from '../views/perfil/SolicitacoesView.vue'
import CadastroIsbnView from '../views/livros/CadastroIsbnView.vue'
import IsbnNaoEncontradoView from '../views/livros/IsbnNaoEncontradoView.vue'
import EscreverResenhaView from '../views/livros/EscreverResenhaView.vue'
import LivroOficialView from '../views/livros/LivroOficialView.vue'
import LivroPessoalFormView from '../views/livros/LivroPessoalFormView.vue'
import LivroPessoalView from '../views/livros/LivroPessoalView.vue'
import ListaView from '../views/listas/ListaView.vue'
import ListasDoLeitorView from '../views/listas/ListasDoLeitorView.vue'
import PaginaDeCatalogoView from '../views/catalogo/PaginaDeCatalogoView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Exige sessão ativa; sem token, a guarda redireciona para /login preservando o destino. */
    requerSessao?: boolean
    /** Com sessão ativa, a guarda redireciona para /estante em vez de renderizar a rota. */
    semSessao?: boolean
    /** Título mostrado no header do shell (CabecalhoTela). */
    titulo?: string
    /**
     * Abaixo de 768px, o header mostra este título no lugar de `titulo` (a política de
     * privacidade vira "Privacidade" para caber ao lado da seta). A partir de 768px vale `titulo`.
     */
    tituloCurto?: string
    /** Tela de detalhe: o header ganha a seta de voltar (cadastro-por-isbn.md §4). */
    voltar?: boolean
    /** Com `voltar`: formulário que se abandona, com `X` no lugar da seta (editar-perfil.md §4). */
    fechar?: boolean
    /**
     * Com `voltar`, a partir de 768px: sem barra, com o link `← <rótulo>` em `musgo` acima do
     * título, como nos protótipos web de F-AUT e F-PERFIL. Abaixo de 768px fica a barra com a seta.
     */
    voltarComRotulo?: string
    /** Header sem o divisor inferior (protótipos de F-AUT e F-PERFIL). */
    semDivisor?: boolean
    /**
     * Abaixo de 768px, sem a barra inferior: o editor de resenha é um fluxo com salvamento e a
     * saída é pelo `X` (escrever-resenha.md §4; abaixo de 768px vale o desenho mobile).
     */
    semBarraInferior?: boolean
    /** Destino da seta ou do `X` sem histórico, quando não é a raiz da aba. */
    voltarPara?: (rota: RouteLocationNormalizedLoaded) => string
    /**
     * Aba do shell que fica ativa. Detalhe não é aba, mas pertence à de onde veio; sem isto,
     * vale o prefixo do caminho (`router/abas.ts`).
     */
    aba?: string | ((rota: RouteLocationNormalizedLoaded) => string)
  }
}

/** Origem do fluxo de cadastro: a estante vazia ou a busca sem resultado (cadastro-por-isbn.md §1). */
const ORIGEM = ':origem(descobrir|estante)'

/** Livro oficial pertence à aba de onde se veio: estante, perfil ou, por padrão, Descobrir. */
const abaDoLivroOficial = (rota: RouteLocationNormalizedLoaded) =>
  rota.query.origem === 'estante' ? '/estante' : rota.query.origem === 'perfil' ? '/perfil' : '/descobrir'

/** Livro pessoal aberto pelo feed é do Feed; pela lista de alguém, do Perfil; pela estante, da Estante. */
const abaDoLivroPessoal = (rota: RouteLocationNormalizedLoaded) =>
  rota.query.via === 'feed' ? '/feed' : rota.query.via === 'lista' ? '/perfil' : '/estante'

/** Listas de outro leitor pertencem à aba de onde se chegou ao perfil dele (lista.md §4.6). */
const abaDoPerfilDeOutro = (rota: RouteLocationNormalizedLoaded) => (rota.query.via === 'feed' ? '/feed' : '/perfil')

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { semSessao: true },
  },
  {
    path: '/cadastro',
    name: 'cadastro',
    component: CadastroView,
    meta: { semSessao: true },
  },
  {
    path: '/recuperar-senha',
    name: 'recuperar-senha',
    component: RecuperarSenhaView,
    meta: { semSessao: true },
  },
  // Sem `semSessao`: o link do e-mail pode ser aberto num navegador que já tem sessão, e mesmo
  // assim a redefinição tem de acontecer (a tela encerra a sessão local ao salvar).
  {
    path: '/redefinir-senha',
    name: 'redefinir-senha',
    component: RedefinirSenhaView,
  },
  // F-CONTA-2, fora do shell. Sem `semSessao` nem `requerSessao`: a primeira abre logo depois de
  // a sessão acabar, e a segunda só depende do acesso de recuperação em memória, que ela confere.
  {
    path: '/conta/exclusao-solicitada',
    name: 'exclusao-solicitada',
    component: ExclusaoSolicitadaView,
  },
  {
    path: '/conta/recuperar',
    name: 'recuperar-conta',
    component: RecuperarContaView,
  },
  {
    path: '/',
    component: ShellAutenticado,
    meta: { requerSessao: true },
    children: [
      { path: '', redirect: '/estante' },
      {
        path: 'estante',
        name: 'estante',
        component: EstanteView,
        meta: { titulo: 'Minha estante' },
      },
      {
        path: 'estante/leituras/:leituraId/progresso',
        name: 'progresso',
        component: ProgressoView,
        meta: { titulo: 'Progresso', voltar: true, aba: '/estante' },
      },
      {
        path: 'descobrir',
        name: 'descobrir',
        component: DescobrirView,
        // Sem divisor: o campo de busca, logo abaixo, é a segunda linha do header (descobrir.md).
        meta: { titulo: 'Descobrir', semDivisor: true },
      },
      // Páginas de autor, editora e série (F-ACV-DESCOBERTA): consulta, não perfil. O prefixo mantém
      // a aba Descobrir ativa. Como na página do livro, o header leva só a seta (e o tipo, abaixo
      // de 768px), e o nome é o h1 da tela.
      ...(['autor', 'editora', 'serie'] as const).map(
        (tipo): RouteRecordRaw => ({
          path: `descobrir/${tipo === 'autor' ? 'autores' : tipo === 'editora' ? 'editoras' : 'series'}/:id`,
          name: `catalogo-${tipo}`,
          component: PaginaDeCatalogoView,
          props: { tipo },
          meta: {
            titulo: '',
            tituloCurto: tipo === 'autor' ? 'Autor' : tipo === 'editora' ? 'Editora' : 'Série',
            voltar: true,
            semDivisor: true,
          },
        }),
      ),
      {
        path: 'feed',
        name: 'feed',
        component: FeedView,
        meta: { titulo: 'Feed' },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: PerfilView,
        // meu-perfil.md §4: o título é `Perfil`; o nome aparece grande logo abaixo.
        meta: { titulo: 'Perfil', semDivisor: true },
      },
      // F-PERFIL. Empilhada sobre Perfil, como as configurações.
      {
        path: 'perfil/editar',
        name: 'editar-perfil',
        component: EditarPerfilView,
        meta: { titulo: 'Editar perfil', voltar: true, fechar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'perfil/buscar',
        name: 'buscar-leitor',
        component: BuscarLeitorView,
        meta: { titulo: 'Buscar leitor', voltar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'perfil/conexoes',
        name: 'conexoes',
        component: ConexoesView,
        meta: { titulo: 'Conexões', voltar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'perfil/solicitacoes',
        name: 'solicitacoes',
        component: SolicitacoesView,
        meta: { titulo: 'Solicitações', voltar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'leitores/:username',
        name: 'perfil-de-outro',
        component: PerfilDeOutroView,
        // Sem título: o nome está grande no bloco de identidade. Chega da busca, das listas e da
        // caixa (aba Perfil) e, com F-FEED, do feed (`?via=feed`).
        meta: {
          titulo: '',
          voltar: true,
          voltarComRotulo: 'Voltar',
          semDivisor: true,
          aba: abaDoPerfilDeOutro,
        },
      },
      // F-LST. O índice em página própria é o `Ver todas` abaixo de 768px; na web ele é a aba
      // `Listas` do perfil (`?aba=listas`), destino do retorno sem histórico.
      {
        path: 'perfil/listas',
        name: 'minhas-listas',
        component: ListasDoLeitorView,
        meta: { titulo: 'Listas', voltar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'perfil/listas/:id',
        name: 'lista-propria',
        component: ListaView,
        // Sem título no header: o título da lista aparece grande no bloco (lista.md §4).
        meta: {
          titulo: '',
          voltar: true,
          voltarComRotulo: 'Minhas listas',
          semDivisor: true,
          voltarPara: () => '/perfil?aba=listas',
        },
      },
      {
        path: 'leitores/:username/listas',
        name: 'listas-de-outro',
        component: ListasDoLeitorView,
        meta: { titulo: 'Listas', voltar: true, voltarComRotulo: 'Voltar', semDivisor: true, aba: abaDoPerfilDeOutro },
      },
      {
        path: 'leitores/:username/listas/:id',
        name: 'lista-de-outro',
        component: ListaView,
        // O rótulo `Listas de Rafael` vem da tela (`cabecalho.ts`): o nome está na resposta.
        meta: {
          titulo: '',
          voltar: true,
          voltarComRotulo: 'Voltar',
          semDivisor: true,
          aba: abaDoPerfilDeOutro,
          voltarPara: (rota) => `/leitores/${String(rota.params.username)}?aba=listas`,
        },
      },
      // F-AUT. Empilhadas sobre Perfil, que fica ativa pelo prefixo do caminho.
      {
        path: 'perfil/configuracoes',
        name: 'configuracoes',
        component: ConfiguracoesView,
        meta: { titulo: 'Configurações', voltar: true, voltarComRotulo: 'Perfil', semDivisor: true },
      },
      {
        path: 'perfil/configuracoes/alterar-senha',
        name: 'alterar-senha',
        component: AlterarSenhaView,
        meta: { titulo: 'Alterar senha', voltar: true, voltarComRotulo: 'Configurações', semDivisor: true },
      },
      {
        path: 'perfil/configuracoes/privacidade',
        name: 'politica-de-privacidade',
        component: PoliticaPrivacidadeView,
        meta: {
          titulo: 'Política de privacidade',
          tituloCurto: 'Privacidade',
          voltar: true,
          voltarComRotulo: 'Configurações',
          semDivisor: true,
        },
      },
      // F-CONTA-2. Empilhada sobre Configurações, como Alterar senha.
      {
        path: 'perfil/configuracoes/excluir-conta',
        name: 'excluir-conta',
        component: ExcluirContaView,
        meta: { titulo: 'Excluir conta', voltar: true, voltarComRotulo: 'Configurações', semDivisor: true },
      },
      // F-ACV-CADASTRO. O prefixo carrega a origem para a aba certa ficar ativa o fluxo inteiro.
      {
        path: `${ORIGEM}/adicionar`,
        name: 'cadastro-isbn',
        component: CadastroIsbnView,
        meta: { titulo: 'Adicionar livro', voltar: true },
      },
      {
        path: `${ORIGEM}/adicionar/nao-encontrado`,
        name: 'isbn-nao-encontrado',
        component: IsbnNaoEncontradoView,
        meta: { titulo: 'Adicionar livro', voltar: true },
      },
      {
        path: `${ORIGEM}/adicionar/pessoal`,
        name: 'livro-pessoal-novo',
        component: LivroPessoalFormView,
        meta: { titulo: 'Cadastrar livro', voltar: true },
      },
      {
        path: 'livros/pessoal/:id',
        name: 'livro-pessoal',
        component: LivroPessoalView,
        // Título vazio de propósito: o título do livro está no hero logo abaixo (livro-pessoal.md §4).
        meta: { titulo: '', voltar: true, aba: abaDoLivroPessoal },
      },
      {
        path: 'livros/pessoal/:id/editar',
        name: 'livro-pessoal-editar',
        component: LivroPessoalFormView,
        meta: { titulo: 'Editar livro', voltar: true, aba: '/estante' },
      },
      {
        path: 'livros/pessoal/:id/resenha',
        name: 'escrever-resenha-pessoal',
        component: EscreverResenhaView,
        meta: {
          titulo: 'Resenha',
          voltar: true,
          fechar: true,
          semBarraInferior: true,
          aba: '/estante',
          voltarPara: (rota) => `/livros/pessoal/${String(rota.params.id)}`,
        },
      },
      {
        path: 'livros/:id/resenha',
        name: 'escrever-resenha',
        component: EscreverResenhaView,
        meta: {
          titulo: 'Resenha',
          voltar: true,
          fechar: true,
          semBarraInferior: true,
          aba: abaDoLivroOficial,
          voltarPara: (rota) =>
            `/livros/${String(rota.params.id)}${rota.query.origem ? `?origem=${String(rota.query.origem)}` : ''}`,
        },
      },
      {
        path: 'livros/:id',
        name: 'livro-oficial',
        component: LivroOficialView,
        meta: {
          titulo: '',
          voltar: true,
          // Sem divisor: com a página no topo, o protótipo não tem linha sob o header.
          semDivisor: true,
          aba: abaDoLivroOficial,
        },
      },
    ],
  },
]

/**
 * Guarda de sessão (feature-P0-NAV.md, Etapa 9): rota com `meta.requerSessao` sem token vai
 * para `/login` preservando o destino em `?destino=`; `/login` e `/cadastro` com sessão ativa
 * vão para `/estante`.
 *
 * Exportada separada do router (não só chamada inline em `router.beforeEach`) para o teste
 * poder montar a mesma guarda numa instância isolada (`createMemoryHistory`), sem depender do
 * router singleton de produção nem duplicar a lógica.
 */
export const guardaDeSessao: NavigationGuard = (to) => {
  const autenticado = getToken() !== null

  if (to.meta.requerSessao && !autenticado) {
    return { path: '/login', query: { destino: to.fullPath } }
  }
  if (to.meta.semSessao && autenticado) {
    return { path: '/estante' }
  }
  return true
}

/**
 * A guarda só roda em navegação. Sessão que acaba com a tela aberta (renovação recusada pelo
 * servidor, saída em outra aba) precisa levar ao login sozinha, preservando onde a pessoa estava.
 */
export function reagirAoFimDaSessao(alvo: Router): void {
  const { autenticado } = useSession()
  watch(autenticado, (agora) => {
    const atual = alvo.currentRoute.value
    if (!agora && atual.meta.requerSessao) {
      void alvo.replace({ path: '/login', query: { destino: atual.fullPath } })
    }
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(guardaDeSessao)
reagirAoFimDaSessao(router)

export default router

# AGENTS.md — Web (Vue + Tailwind)

Convenções da SPA web. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz — que traz as regras gerais (branches, commits, DoD, segurança, fluxo de feature) e prevalece no que for transversal. Fonte de verdade do escopo: [`docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md).

## Stack

- **Node 24.19.0 LTS** + **npm 12.0.2**, fixados em `.nvmrc`, `package.json` e `package-lock.json`.
- **Vue 3.5 + TypeScript 6 + Vite 8** para a SPA; **Vue Router 5** para navegação.
- **Tailwind CSS 4** pelo plugin oficial `@tailwindcss/vite`. Site estático hospedado no Render.
- **Vitest 5 + Vue Test Utils + jsdom** para testes; **ESLint 10** para análise estática.
- **Phosphor Icons Vue 2.2** como única família de ícones.
- Cobre um **subconjunto** de funcionalidades — sem paridade com o mobile. A coluna **Web** de cada RF em `REQUISITOS.md` define o que entra.
- **Fora do escopo web:** desafios, gamificação e notificações.

**Gerenciamento de estado — decidido em P0-NAV (14/09/2026): sem biblioteca nova.** Estado de sessão é um **singleton de módulo**: `src/session.ts` exporta `ref`s no escopo do módulo e funções (`iniciarSessao`, `atualizarTokens`, `encerrarSessao`, `getToken`, `getRefreshToken`) em vez de instanciar um store — mesmo padrão já usado por `src/theme.ts` (P0-DS). Reavaliar para um store de verdade (Pinia) só se uma feature futura precisar de estado mais complexo que sessão/tema.

**Sessão com renovação (F-AUT, 24/09/2026).** Token de acesso e de renovação ficam em `localStorage` (cookie `httpOnly` seria de terceiro entre os dois subdomínios de `onrender.com`); o evento `storage` mantém as abas iguais. Toda chamada com o token da sessão que recebe `401` passa por `renovarSessao` (`src/services/renovacao.ts`) e é repetida uma vez. **A renovação e o logout rodam sob o mesmo lock da Web Locks API**, e quem pega o lock relê o `localStorage` antes de ir ao servidor: duas abas renovando o mesmo token contariam como reuso, e o `identidade` derrubaria todas as sessões do usuário. Sessão que acaba com a tela aberta leva ao login por `reagirAoFimDaSessao` (`router/index.ts`). Rotas públicas do `identidade` (`register`, `login`, `logout`) vão **sem** `Authorization`: o Spring Security recusa token vencido com `401` mesmo em rota aberta.

## Estrutura

- `src/router/`: rotas (`index.ts`, incluindo o shell autenticado com rotas filhas) e a guarda de sessão (`guardaDeSessao`, exportada separada do router para ser testável isolada, sem montar componente nenhum).
- `src/layouts/`: layouts de página — `ShellAutenticado.vue`, o quadro das telas autenticadas (sidebar retrátil na web ≥768px, barra inferior abaixo disso, header padrão), e `LayoutAutenticacao.vue`, o das telas sem sessão (entrar, criar conta, recuperar e redefinir senha: coluna da marca só na web, coluna de 420px à direita).
- `src/views/`: componentes associados a rotas, agrupados por domínio em subpastas: `views/auth/` (entrar, cadastro, recuperar/redefinir/alterar senha, configurações, política), `views/perfil/` (perfil, edição, busca, conexões, solicitações, perfil de outro) e `views/livros/`. Tela nova de um domínio que já tem pasta entra nela.
- `src/components/`: componentes reutilizáveis de aplicação (ex.: `SidebarNavegacao.vue`, `CabecalhoTela.vue`); os de um domínio ficam na subpasta dele (`components/auth/`, `components/perfil/`, `components/livros/`...); componentes do design system (formulário, botão, banner, logo) ficam em `src/components/ui/`.
- `src/services/`: integrações externas — cliente HTTP central (`api.ts`), renovação de sessão (`renovacao.ts`) e serviços por domínio (ex.: `auth.ts`).
- `src/session.ts`: estado de sessão, ver "Gerenciamento de estado" acima.
- `public/`: favicons (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`), copiados pelo Vite para a raiz do `dist/`. São a mesma arte do ícone do app (`code/mobile/assets/icone/icone.svg`, papel sobre musgo); os PNGs saem do SVG com `rsvg-convert`.
- Testes unitários ficam junto do arquivo testado, com sufixo `.spec.ts`.

## Comandos

- `npm ci`: instala exatamente as dependências do lockfile.
- `npm run dev`: inicia o servidor Vite local.
- `npm run lint`: executa o ESLint.
- `npm test`: executa os testes uma vez.
- `npm run test:watch`: executa os testes em modo interativo.
- `npm run build`: verifica os tipos e gera o build de produção em `dist/`.
- `npm run preview`: serve localmente o build de produção.

Uma URL por serviço, sem gateway: `VITE_IDENTIDADE_BASE_URL`, `VITE_ACERVO_BASE_URL`, `VITE_LEITURA_BASE_URL` (local na 3001, porque a 3000 é do `acervo`) e `VITE_SOCIAL_BASE_URL` (`VITE_API_BASE_URL` é o padrão legado do cliente). O `.env.example` traz os valores locais e o `render.yaml` os de DES. A capa de livro pessoal sobe direto ao Cloudinary com `VITE_CLOUDINARY_CLOUD_NAME` (o mesmo `CLOUDINARY_CLOUD_NAME` do `acervo`) e o preset unsigned `VITE_CLOUDINARY_UPLOAD_PRESET` (`leai_capas`, só jpg/png/webp). O avatar do perfil usa o mesmo caminho com `VITE_CLOUDINARY_AVATAR_PRESET` (`leai_avatares`, pasta `avatares`). Localmente, ponha os valores em `.env.local`, que o `.gitignore` já ignora.

**Cliente HTTP central (`src/services/api.ts`)** — regras que valem para toda feature:

- Adiciona `X-Correlation-Id` e tolera até 90 segundos de cold start antes de informar timeout. Timeout **não** se repete.
- `Idempotency-Key` só vai quando a chamada passa `idempotencyKey`. A chave é da **intenção**: quem chama a guarda e a repete no reenvio da mesma intenção (mesmo ISBN, mesmo corpo serializado), e o cliente a repete nas próprias retentativas, com o mesmo correlation-id. O `acervo` e o `identidade` recusam escrita sem chave com `400`.
- Retentativa com espera de 1 s e 3 s (três tentativas) **só** em GET ou escrita com chave, e só em falha de rede ou 502/503/504. 4xx e 500 voltam na hora.
- `ApiError` traz `status`, `code`, `correlationId`, `corpo`, `livroId` (409 de ISBN existente) e `campos` (400, `{ campo: mensagem }`). `204` e corpo vazio viram `undefined`.
- O CORS do `acervo` não expõe headers: `Location` e `Retry-After` não chegam ao JS. Use o corpo.

**Telas de conta (F-AUT):** `ui/EstadoTerminal` é o bloco de tela inteira que substitui um formulário (confirmação neutra, senha alterada, link que não vale mais), com o foco indo para o título. O link de redefinição traz o token no fragmento (`#token=`), lido uma vez e apagado da URL. A política de privacidade mora num lugar só, `components/auth/PoliticaDePrivacidade.vue`, hoje com o texto mock do protótipo (o final é do grupo).

**Abas e telas de detalhe:** a aba ativa do shell vem de `router/abas.ts` (`meta.aba`, texto ou função da rota, e depois prefixo do caminho). Tela de detalhe declara `meta.voltar` para ganhar a seta no header, e põe ações contextuais no header com `<Teleport to="#cabecalho-acoes" defer>`. `meta.tituloCurto` troca o título do header abaixo de 768px (a política de privacidade vira "Privacidade"); a partir de 768px vale `meta.titulo`. O fluxo de cadastro carrega a origem no caminho (`/descobrir/adicionar`, `/estante/adicionar`) para a aba certa ficar ativa o fluxo inteiro.

**Componentes de F-ACV-CADASTRO:** `ui/` ganhou `CampoAreaTexto`, `BotaoDestrutivo` (outline `rubi`), `FaixaInformativa`, `EstadoVazio`, `SobreposicaoModal` (base de modal: bottom sheet abaixo de 768px, dialog de 480px acima, foco preso, `Esc`, foco devolvido), `DialogoConfirmacao` e `FolhaAcoes`; `CampoTexto` ganhou `inputmode`, `mono`, `larguraDoCampo` e `somenteLeitura`, e `BotaoTextual`, `tom`. Os da feature ficam em `components/livros/`. Lógica com estado e tempo (polling da importação) fica fora da tela, em `src/livros/useCadastroIsbn.ts`, testada com relógio simulado.

**Perfil (F-PERFIL):** `services/perfil.ts` fala com o `identidade` (`/me/perfil`); `services/avatar.ts` valida e envia a foto reaproveitando `validarCapa`/`enviarCapa` de `capa.ts` com o preset de avatar, e tira o `publicId` da URL devolvida (o servidor confere igual). `components/perfil/AvatarLeitor` é o círculo de avatar, com miniatura por transformação de URL. Formulário que se abandona declara `meta.fechar` (o header troca a seta pelo `X`) e confirma o descarte num `onBeforeRouteLeave`, que pega o `X`, as abas e o voltar do navegador de uma vez. `atualizarUsuario` (`session.ts`) troca o nome da sessão depois de editar o perfil. Rotas: `/perfil/editar`, `/perfil/buscar`, `/perfil/conexoes?aba=seguidores|seguidos`, `/perfil/solicitacoes` e `/leitores/:username` (aba Perfil; `?via=feed` para o feed). Listas paginadas por rolagem usam `src/perfil/usePaginacao.ts` com `components/perfil/FimDaLista` (`IntersectionObserver`, com `Carregar mais` quando não há). Textos com o nome de outra pessoa ficam em `src/perfil/textos.ts`: **primeiro nome, nunca pronome de gênero** ("essa pessoa"), porque o produto não sabe o gênero de ninguém.

## Componentes compartilhados que mudaram

- **F-ACV-DESCOBERTA (07/10/2026, Vicenzo).** Páginas de autor, editora e série em `views/catalogo/PaginaDeCatalogoView.vue` (uma view, a prop `tipo` vem da rota), estado em `livros/usePaginaDeCatalogo.ts`, filtros em `livros/filtrosDaBusca.ts`, `components/livros/FiltrosAvancados.vue` e `ChipsDeFiltros.vue`. O que mexe no que é de todos:
  - `ui/CampoTexto.vue` ganhou a prop opcional `sufixo` (unidade dentro do campo, à direita, como `páginas`). Sem ela, nada muda.
  - `livros/CardLivroBusca.vue` ganhou a prop opcional `numeroNaSerie` (a linha `Livro N` acima do título).
  - `testes/montarNaRota.ts` aceita `{ largo: true }`, que faz toda media query casar (layout de 768px para cima).
  - `services/acervo.ts`: `LivroOficialDetalhe` tem `editoraId` e `serie`; `testes/massaDoLivro.ts` os traz nulos. `buscarLivros` aceita os filtros e só manda os preenchidos.
  - `views/livros/LivroOficialView.vue` (integrada pelo Renato): a ficha aceita linha com link (`links`) e `complemento`, e há a seção `Assuntos` depois da sinopse.

- **F-LST (05/10/2026, Henrique).** Telas em `views/listas/`, componentes em `components/listas/`, lógica em `src/listas/` e serviço em `services/listas.ts`. O que mexe no que é de todos:
  - `layouts/ShellAutenticado.vue` ganhou o ponto `#avisos-flutuantes`, onde `ui/AvisoFlutuante` (toast do design §7.6, barra lateral `musgo` ou `rubi`) entra por Teleport: acima da barra inferior no mobile, no canto da área de conteúdo na web. E o rótulo do retorno da web pode vir da tela (`cabecalho.ts`, `usarRotuloVoltar`), para `Listas de Rafael`; sem ele, vale `meta.voltarComRotulo`.
  - `components/perfil/SecoesDeLeitura.vue` aceita o slot `listas` (terceira aba, `Listas`) e a prop `abaInicial` (`?aba=listas`); as setas percorrem as três abas.
  - `ui/MenuDeAcoes.vue` é o menu `Mais ações`: folha no mobile, dropdown na web. Entrou na página do livro oficial só com `Adicionar à lista`; outras features acrescentam itens em `acoesDoMenu`.
  - `styles.css` ganhou a classe global `.entrada` (fade único dos skeletons). As telas antigas mantêm a cópia em `<style scoped>`.
  - `services/acervo.ts`: `ViaDeAcesso.via` aceita `lista`. Até a etapa 3 da F-LST, o `acervo` responde 400 a ela, e `LivroPessoalView` trata isso como "indisponível". O dono abre o próprio livro sem via.

- **`components/perfil/FimDaLista.vue` (27/09/2026, F-ACV-BUSCA).** Ganhou a prop opcional `carregando`. O `IntersectionObserver` só avisa quando a marca *entra* na tela; se a página nova não a empurrar para fora (lista curta, edições agrupadas, monitor alto), a paginação parava sem botão. Com `carregando`, cada carga que termina reobserva a marca, e ela pede a seguinte se continuar visível. Sem a prop, o comportamento é o de antes: Conexões, Solicitações e Feed ainda não a passam, e deveriam (é só `:carregando="<flag de carregando mais>"`).

- **`styles.css`, movimento reduzido (27/09/2026, F-ACV-BUSCA).** A regra global de `prefers-reduced-motion` só zerava transições; agora zera também a duração das animações, e o fade `.entrada` dos skeletons fica estático no app todo, como os comentários das telas já diziam.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Segurança de renderização:** conteúdo de usuário tratado como texto com escape (RNF-SEC-14). Resenha em Markdown com HTML embutido desabilitado no parser **e** sanitização antes do DOM (RNF-SEC-15). Enviar `Content-Security-Policy` restritivo (RNF-SEC-16).
- Interface **responsiva** (RNF-USA-02); contraste WCAG AA (RNF-USA-03); toda ação destrutiva exige confirmação (RNF-USA-04); mensagens de erro em pt-BR e acionáveis (RNF-USA-05).
- Tratar hibernação do Render (RNF-ERR-09) e indisponibilidade/timeout com API simulada nos testes (RNF-TST-06).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10. **A fonte visual é o protótipo `.html` renderizado (aberto no navegador), não o prompt `.md`, que é só o kickstart e fica desatualizado.** Abra o protótipo, copie a **estrutura** e chegue visualmente muito próximo dele — incluindo ilustrações e estados vazios (ex.: a arte de "nenhum resultado") —, reconstruindo com CSS Grid, flexbox e unidades relativas. Nada de `position: absolute` para montar layout, nada de largura fixa em px para reproduzir o artboard. Se faltar dado no contrato para implementar o design, **pergunte ao dono da feature em vez de cortar o elemento** — pode ser caso de mudar o contrato. As convenções de escrita do prompt de tela estão no mesmo arquivo.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; quando criado por P0-DS, `docs/design-system/tokens.json` será a fonte canônica consumida pela configuração do Tailwind e pelo `ThemeData` do Flutter (RNF-USA-06).
- `tailwind.config.js` lê diretamente `../../docs/design-system/tokens.json` e é carregado por `@config` em `src/styles.css`. Não criar `code/front/scripts`, arquivos intermediários ou valores duplicados para os tokens.
- Testes unitários de componentes com lógica e de serviços de acesso à API (RNF-TST-05).

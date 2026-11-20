# Sprint 3

### Semana 2 (09/09 - 15/09)

Realizado registro como dono da P0-NAV
Realizado tabela usuário e entidade JPA no identidade
Realizado Spring Security com JWT HS256 e cadeia stateless
Realizado cadastro, login e rota protegida /me no identidade
Realizado rate limiting por IP e bloqueio progressivo no auth
Realizado documentação de register, login e me no spec do identidade
Realizado Swagger UI agregado dos quatro contratos
Realizado sessão, cliente autenticado e base URL do identidade no front
Realizado componentes de formulário, banner e logo no front
Realizado telas de cadastro e login no front
Realizado shell com sidebar retrátil e guarda de rota no front
Realizado sessão com secure storage e POST no cliente de API do mobile
Realizado widgets de formulário, banner e logo no mobile
Realizado telas de cadastro e login no mobile
Realizado navegação com go_router, shell de 4 abas e guarda de sessão no mobile
Realizado fechamento da P0-NAV com status, pendências e timeline

# Sprint 4

### Semana 1 (16/09 - 22/09)

Realizado sincronização de P0-NAV, P0-CI e P0-DEPLOY com o estado verificado
Realizado matriz RACI do projeto

### Semana 2 (23/09 - 29/09)

Realizado registro como dono de F-AUT e F-PERFIL, com estado verificado
Realizado idempotência do cadastro e testes de integração com Postgres no identidade
Realizado recusa de senha comum no cadastro (RNF-SEC-27)
Realizado token de renovação rotativo com detecção de reuso
Realizado logout e troca de senha revogando os tokens de renovação
Realizado recuperação de senha por link com envio assíncrono
Realizado conta administradora provisionada pelo ambiente
Realizado Idempotency-Key obrigatória em register e login
Realizado variáveis P0_PING_ENABLED e WEB_BASE_URL do identidade no Render
Realizado sessão com renovação serializada entre abas e logout no front
Realizado sessão com token de renovação e renovação no 401 no mobile
Realizado telas de recuperar, redefinir e alterar senha e configurações na web e no mobile
Realizado política de privacidade acessível pelo cadastro na web e no mobile
Realizado perfil próprio com avatar validado pela origem no identidade
Realizado perfil de outro leitor e busca por username exato
Realizado seguir, pedir, aceitar e desfazer com eventos na outbox
Realizado listas de seguidores e seguidos e seed reproduzível
Realizado meu perfil e editar perfil com avatar direto ao Cloudinary na web e no mobile
Realizado buscar leitor, perfil de outro, conexões e solicitações na web e no mobile
Realizado contrato do identidade com o backend de F-AUT e F-PERFIL
Realizado teste de aceite de F-AUT e F-PERFIL e correções encontradas
Realizado login e cadastro com coluna ilustrada, ícones e validação ao sair do campo
Realizado e-mail em GET /me e biografia no resumo do perfil
Realizado telas de F-AUT e F-PERFIL conferidas com os protótipos na web e no mobile
Realizado organização do identidade e do front em subpacotes por feature
Realizado documentação de F-AUT e F-PERFIL com decisões e pendências
Realizado prompts de design dos lotes 4, 6 e 7 do período 2

# Sprint 5

### Semana 1 (30/09 - 06/10)

Realizado registro da divisão do Período 2 entre os cinco integrantes
Realizado plano de implementação da F-LST e contrato publicado antes da implementação
Realizado listas de livros no social: criar, editar, excluir, adicionar, remover e reordenar (F-LST)
Realizado listas de livros na web, conferidas no navegador (F-LST)
Realizado listas de livros no app, conferidas no emulador (F-LST)
Realizado correções do texto de exclusão de lista e das margens da página da lista

### Semana 2 (07/10 - 20/10)

Realizado livro pessoal aberto pela lista no acervo (F-LST)
Realizado plano e contrato da F-CONTA-2
Realizado exclusão e recuperação de conta no identidade, com job de exclusão (F-CONTA-2)
Realizado consumidores de conta.excluida no acervo, no leitura e no social (F-CONTA-2)
Realizado excluir e recuperar conta na web e no app, com testes de cold start e timeout (F-CONTA-2)
Realizado segredos da F-CONTA-2 cadastrados no Render e no GitHub e merge do PR #48
Realizado correções de dependências do acervo e do leitura pelo npm audit
Realizado estante própria e contador de livros lidos no meu perfil, na web e no app (F-PERFIL)
Realizado perfil aberto pelo Feed completo no app e correções do review do PR #50
Realizado teste de contrato do identidade contra o OpenAPI, nas respostas e nas requisições aceitas
Realizado testes das VIEWs de contrato, da atomicidade do seguimento e dos logs da autenticação
Realizado correção da rota pública que recusava token vencido no identidade
Realizado guarda da exclusão de conta nos quatro serviços (F-CONTA-2)
Realizado acessibilidade do app para leitor de tela nas listas, no perfil e no cabeçalho das abas
Realizado revisão visual da F-LST e da F-CONTA-2 na web e no app
Realizado testes de tela de login, recuperar senha, conexões e solicitações
Realizado merge do PR #51
Realizado revisão dos PRs #49 (F-GAM e F-DSF) e #53 (F-STA) do Vicenzo
Realizado registro dos donos das features do Período 3
Realizado prompts de design dos lotes 1 a 4 do Período 3

### Semana 3 (21/10 - 27/10)

Realizado protótipos das 15 telas do Período 3
Realizado login e cadastro pessoal do Período 3 alinhados aos canvases aprovados do Período 1
Realizado merge do design do Período 3 (PR #54)

### Semana 4 (28/10 - 03/11)

Realizado revisão dos PRs #59 (correções do CI depois do merge do Período 2) e #60 (APK de DES alcançando os serviços do Render)

# Sprint 6

### Semana 1 (04/11 - 10/11)

Realizado plano de qualidade do projeto (gerência)
Realizado VIEW de autores para recomendação no acervo (F-REC-ALG)
Realizado sugestões por quem o leitor segue e pelo gosto, descarte de sugestão e descarte em lote no social (F-REC-ALG)
Realizado opt-out das leituras nas sugestões no identidade (F-REC-ALG)
Realizado contratos OpenAPI do social, do acervo e do identidade para a F-REC-ALG

### Semana 3 (18/11 - 24/11)

Realizado integração do backend da F-REC-ALG na desenvolvimento, com as suítes dos três serviços verdes
Realizado sugestões, descarte e pergunta de descarte em lote na web (F-REC-ALG)
Realizado sugestões, descarte e pergunta de descarte em lote no app (F-REC-ALG)
Realizado opção de usar as leituras em sugestões nas Configurações, na web e no app (F-REC-ALG)
Realizado PR #68 da F-REC-ALG para a desenvolvimento, com CI verde

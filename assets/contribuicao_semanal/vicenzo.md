# Sprint 2

### Semana 2 (19/08 - 25/08)

Realizado documentação inicial do projeto
Realizado nome no README

### Semana 3 (26/08 - 01/09)

Realizado atualização de coerência
Realizado início do plano de desenvolvimento
Realizado possível DER
Realizado atualização de consistência e DER
Realizado continuação plano de desenvolvimento e início prompts de design
Realizado finalização plano do período-3
Realizado mudança de requisito de histórico de leitura

# Sprint 3

### Semana 1 (01/09 - 08/09)

Realizado v1 das telas do período-0
Realizado v1 das telas do período-1
Realizado v2 das telas, logo do projeto e imagens
Realizado apresentação visão de produto
Realizado decisão de stack de microsserviços fechada
Realizado arquivo tokens.json

### Semana 2 (09/09 - 15/09)

Realizado Dockerfile dos serviços Spring (identidade, social)
Realizado render.yaml (blueprint DES)
Realizado registro do DES no ar (Render + Neon)
Realizado URL por serviço e remoção da branch por dev no Neon
Realizado scaffolding dos microsserviços acervo e leitura (NestJS)
Realizado TLS explícito no Pool pg e erro real no health (Neon)
Realizado log da causa real do erro de banco e devolve health genérico
Realizado instalação devDependencies no build do render.yaml

### Semana 3 (16/09 - 22/09)

Realizado modelo físico do DER aplicado no Neon
Realizado DATABASE_USERNAME e DATABASE_PASSWORD nos serviços Spring do render.yaml
Realizado atualização da P0-MSG e suas implicações
Realizado carga inicial do dump OpenLibrary com normalização e assuntos (F-ACV-INGESTAO)
Realizado cadastro, edição e consulta autorizada de livro pessoal no acervo (F-ACV-CADASTRO)
Realizado importação de livro oficial por ISBN com outbox transacional
Realizado autenticação, idempotência e erro de negócio no serviço acervo
Realizado busca externa resiliente da importação por ISBN
Realizado prompts de tela de F-ACV-CADASTRO
Realizado prompts de tela do período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT
Realizado telas faltantes do período 1
Realizado consumidor de livro.importacao_solicitada no runtime AMQP
Realizado correção do handler de mensageria recebendo o tx do recibo nos consumidores Nest
Realizado replay idempotente de editar, excluir e reprocessar no acervo
Realizado testes de integração do acervo com Postgres real, seed RNF-TST-08 e CI
Realizado testes de integração de 401, 429, 503 e perfil privado na RN-15
Realizado teste da carga da amostra da ingestão contra Postgres real
Realizado ajuste da OpenLibrary real (redirect e autor pela obra)
Realizado herança do primeiro autor da obra em edição sem autor na ingestão
Realizado cliente HTTP do mobile com Idempotency-Key, retentativa e erro rico
Realizado telas mobile de cadastro por ISBN e de livro pessoal
Realizado telas web de F-ACV-CADASTRO com cliente HTTP idempotente
Realizado protótipos HTML de F-ACV-CADASTRO
Realizado AMQP_ENABLED=true nos quatro serviços do render.yaml
Realizado preset unsigned leai_capas no .env.example do mobile
Realizado atualização de F-ACV-CADASTRO e F-ACV-INGESTAO com o estado de 22/09

### Semana 4 (23/09 - 29/09)

Realizado correções do aceite de 23/09 em F-ACV-CADASTRO e F-ACV-INGESTAO (acervo, ingestão, web e mobile)
Realizado correções do teste de 23/09 à noite: fontes de metadados que se completam e modo escuro na web
Realizado GOOGLE_BOOKS_API_KEY no leai-acervo
Realizado dono { nome, avatarUrl } no detalhe do livro pessoal
Realizado componentes de F-ACV-CADASTRO no documento de design
Realizado Thriller como assunto próprio e autobiografia em Biografia na ingestão (31 assuntos curados)
Realizado registro da carga real do acervo (~11k livros) e RNF-DES-04
Realizado merge de F-ACV-CADASTRO e F-ACV-INGESTAO em desenvolvimento (PR #41)
Realizado alocação dos donos das features conforme as issues do GitHub
Realizado correção do título e da limpeza do fluxo ao salvar livro pessoal (web e mobile)
Realizado regra do protótipo renderizado como fonte visual da implementação
Realizado CI sem build em mudança só de markdown
Realizado correção da logo cortada no mobile
Realizado entrega de F-ACV-INGESTAO e F-ACV-CADASTRO (em revisão)
Realizado ícone do app e nome "Lê Aí" no launcher e favicon na web
Realizado curtida otimista no feed da web e do app
Realizado ajustes de interface no mobile em notificações, comentários, respostas, sheet de nota e sino do header
Realizado título "Privacidade" na política de privacidade no celular
Realizado personas e diagramas renderizados
Realizado alteração do público-alvo de 18-30 anos para 18 anos ou mais
Realizado nova imagem da mulher saindo
Realizado prompts de design do período 2 (lotes 1, 2, 3 e 5)
Realizado protótipos do período 2 (lotes 1 a 7)

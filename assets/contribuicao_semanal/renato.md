# Sprint 2

### Semana 3 (26/08 - 01/09)

Realizado preenchimento do CITATION.cff com metadados do projeto
Realizado ata da reunião de abertura do projeto
Realizado revisão dos documentos 1, 2 e 4 e correções na ata de abertura

# Sprint 3

### Semana 2 (09/09 - 15/09)

Realizado criação e configuração do banco de dados no Neon
Realizado criação e configuração dos projetos no Render
Realizado TAP assinado e READMEs de gerência e atas
Realizado scaffolding dos microsserviços identidade e social (Spring)
Realizado declaração de escopo e EAP
Realizado merge do PR P0-NAV na main
Realizado ata da reunião semanal de 11/09
Realizado ata de acordo do INPI assinada
Realizado avaliação heurística dos protótipos
Realizado relatórios de contribuição semanal por integrante

# Sprint 4

### Semana 2 (23/09 - 29/09)

Realizado separação dos ambientes de banco e broker (dev e DES) no plano, na arquitetura e no P0-DEPLOY
Realizado plano de implementação de F-ACV-BUSCA
Realizado busca de livros no acervo com filtro por assunto (F-ACV-BUSCA)
Realizado página do livro com sinopse sob demanda e resenhas filtradas por privacidade
Realizado Descobrir e página do livro oficial na web e no mobile
Realizado testes unitários e de integração da busca e da página do livro
Realizado plano de implementação de F-AVA
Realizado infraestrutura comum do serviço leitura (autenticação, erros, idempotência, outbox, testes de integração e CI com Postgres)
Realizado correção do common-v1 para livro sem autor, com ajuste no social
Realizado nota com meia estrela e "Sua avaliação" na página do livro (F-AVA)
Realizado editor de resenha com spoiler, contador e exclusão, na web e no mobile
Realizado resenhas no perfil com livro, nota e spoiler
Realizado contrato OpenAPI do leitura e documentação de F-AVA
Realizado configuração do JWT_SECRET do leitura no Render e teste manual de F-AVA na web e no mobile
Realizado merge de F-ACV-BUSCA e F-AVA na desenvolvimento
Realizado validação independente de F-AVA no backend, na web e no mobile, com as correções dos defeitos encontrados
Realizado validação independente de F-ACV-BUSCA nas três camadas, com teste real no banco e no broker de dev
Realizado busca palavra por palavra, relevância por título e autor e busca por ISBN-10 no acervo
Realizado correções de robustez no acervo: entradas malformadas, banco indisponível, corpo grande, token sem expiração e sinopse sem marcação
Realizado correções de paginação, falhas e acessibilidade no Descobrir e na página do livro, na web e no mobile
Realizado atualização da documentação de F-ACV-BUSCA, do contrato do acervo e dos AGENTS do acervo e do front
Realizado correção da estante no mobile, que agora recarrega quando a leitura muda em outra tela
Realizado correção da folha de registrar progresso no mobile, que passou a rolar em vez de estourar a tela
Realizado alinhamento dos sufixos h e min do tempo gasto no registro de progresso do mobile

# Sprint 5

### Semana 1 (30/09 - 06/10)

Realizado revisão do PR de fechamento do Período 1
Realizado previsões do cronograma (tarefa 7 de gerência)

### Semana 2 (07/10 - 20/10)

Realizado curtir e descurtir resenhas, com notificação de curtida (F-AVA-2)
Realizado resenha em Markdown com pré-visualização, na web e no mobile
Realizado frases e trechos dos livros, com página
Realizado atualização do handlebars no leitura e no acervo
Realizado denúncia de resenhas e comentários (F-MOD)
Realizado painel de moderação com fila, remoção, arquivamento e registro de auditoria
Realizado remoção de frases pela moderação

### Semana 3 (21/10 - 27/10)

Realizado correções da F-MOD: aviso da denúncia sobre os comentários, painel que retoma remoção não confirmada e pagina a fila
Realizado merge da F-MOD na desenvolvimento
Realizado atualização de dependências do front e do acervo pelo npm audit
Realizado plano de implementação da F-ACV-NOTA
Realizado importação da nota geral do dump do OpenLibrary e na importação por ISBN (F-ACV-NOTA)
Realizado nota geral, nota dos leitores e histograma na página do livro, na web e no mobile
Realizado cache de capas oficiais no Cloudinary, com backfill
Realizado correções das revisões do PR da F-ACV-NOTA: retentativa do Cloudinary, download de capa, recarga da nota dos leitores e histograma com texto ampliado
Realizado merge da F-ACV-NOTA na desenvolvimento

<!-- Artefato de Gerência de Projetos. Versão canônica; o .docx é DERIVADO (template da disciplina
     "Template Plano de Qualidade" preenchido). Deriva de docs/orquestador/plano-de-projeto.md,
     docs/orquestador/REQUISITOS.md §7 a §9, docs/9.plano_de_testes.md, eap.md e matriz_raci.md.
     Não cria processo novo: organiza as verificações que o projeto já pratica ou já planejou. -->

# Gerência de Projetos de Software

## Plano de Qualidade do Lê Ai

> **O que este documento é:** quais artefatos são verificados, por qual tipo de revisão, quando, por quem,
> com qual métrica e o que acontece na não conformidade. Cobre os ciclos já executados como referência
> e planeja as verificações do Período 3, da Verificação e Homologação e do Encerramento.
>
> **O que este documento não é:** o plano de testes, que está em [`docs/9.plano_de_testes.md`](../../docs/9.plano_de_testes.md),
> nem o processo de trabalho, que está em `docs/orquestador/plano-de-projeto.md`.

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai, aplicativo social de leitura |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Versão** | 1.0, de 09/11/2026 |

---

## 1. Artefatos a serem verificados

| Artefato | Tipo de verificação \* | Data | Responsável | Métrica aplicada \*\* | Data limite p/ correção | Ação p/ não conformidade | Respons. avaliação | Respons. correção |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pendências dos arquivos de feature (docs/plano-de-desenvolvimento) | 1 (Informal): reunião semanal e chat do grupo | Semanal | Plantão da semana | Pendências abertas por feature; pendências sem decisão há mais de uma semana | Reunião semanal seguinte | Decisão do grupo registrada na ata e na timeline da feature | Gerente (Vicenzo) | Dono da feature |
| Código-fonte e testes automatizados dos 7 projetos (4 serviços, web, mobile e ingestão) | Teste automatizado no CI (lint, build, testes e npm audit) | A cada push e PR | Kayke (CI/CD) | Testes falhos por workflow; builds vermelhos na desenvolvimento; vulnerabilidades altas no npm audit. Referência: 3.751 testes, 0 falhas (28/10/2026) | Imediata: quem quebrou conserta ou reverte antes de sair | Corrigir ou reverter o commit; branch com teste falhando não é integrada (RNF-TST-07) | Kayke (CI/CD) | Autor do commit |
| Migrations de banco (Flyway nos serviços Spring, Drizzle nos serviços Nest) | 4 (Revisão Técnica): revisão humana obrigatória | Antes de cada push com migration | Dono da feature | Defeitos por migration; migrations que alteram tabela de outro serviço ou sem timestamp no nome | Antes do push: nenhuma migration sobe sem revisão | Migration rejeitada e refeita; erro já aplicado exige migration corretiva | Revisor humano designado pelo dono | Dono da feature |
| Pull request de desenvolvimento para main (release de período e correções) | 4 (Revisão Técnica) | A cada PR; próximo: release do Período 3 | Plantão da semana | Ajustes solicitados por PR; CI verde no último commit (sim/não). Histórico: PRs #45 e #58 aprovados | Antes do merge | Merge bloqueado pela proteção da main até correção e nova aprovação | Integrante revisor, diferente do autor | Autor do PR |
| Specs OpenAPI (docs/api, 4 serviços) e catálogo e JSON Schemas de eventos (docs/mensageria) | 4 (Revisão Técnica) | Na conclusão de cada feature (item do DoD) | Dono da feature | Divergências entre o spec exposto em runtime e o YAML commitado; schemas sem teste de contrato | 17/11/2026 (fechamento do período) | Atualizar YAML ou schema e teste; mudança incompatível de evento cria nova versão | Plantão da semana | Dono da feature |
| Features opcionais do Período 3 (7 features) contra o Definition of Done | 4 (Revisão Técnica): checklist do DoD | 10/11 a 17/11/2026 | Dono de cada feature | Itens do DoD não cumpridos por feature; features concluídas x cortadas | 17/11/2026 (congelamento de features) | Feature não concluída é cortada, com decisão registrada (plano de projeto §3) | Gerente (Vicenzo) | Dono da feature |
| Plano de Testes (docs/9.plano_de_testes.md): casos das desejáveis e lacunas L-01 a L-12 | 4 (Revisão Técnica) | 10/11 a 17/11/2026 | Dono de cada feature desejável | RFs em escopo sem caso de teste automatizado; lacunas abertas (12 em 28/10/2026); casos de RN-04, RN-05 e RN-08 falhando | 17/11/2026 | Escrever o teste faltante ou manter a lacuna registrada com justificativa e prazo | Renato (autor do Plano de Testes) | Dono da feature |
| Protótipos de alta fidelidade do caminho crítico (11 protótipos de P0-NAV e do Período 1) | 5 (Revisão Técnica Formal): avaliação heurística de Nielsen | 15/09/2026 (realizada) | Os cinco integrantes | Problemas por severidade: 6 no total (1 catastrófico, 2 grandes, 3 pequenos) | Antes da implementação da tela no Período 1 | Corrigir no protótipo, onde a correção custa uma edição | Grupo (achados ratificados em conjunto) | Vicenzo (designer de interface) |
| Telas implementadas (web e mobile) x protótipo e design system | 3 (Revisão de Apresentação): o dono apresenta a tela lado a lado com o protótipo | Na conclusão de cada feature com tela; consolidação em 17/11/2026 | Dono da feature | Divergências protótipo x implementação não registradas; textos reprovados no contraste WCAG AA; tokens fora de sincronia (checagem no CI do mobile) | 24/11/2026 (congelamento de código) | Corrigir a tela ou registrar a divergência no arquivo da feature | Vicenzo (protótipos) e Ana (tema mobile) | Dono da feature |
| Segurança e controle de acesso (OWASP Top 10, RN-08 e IDOR em livro pessoal) | 4 (Revisão Técnica) | 17/11/2026 (verificação geral em DES/HML) | Henrique (segurança da aplicação) | Tentativas de acesso não autorizado negadas (meta: 100%); requisitos RNF-SEC sem evidência; vulnerabilidades altas em dependências | 24/11/2026 | Corrigir antes do congelamento; o que não for corrigido vira risco registrado com decisão do grupo | Henrique (segurança) | Dono do serviço ou da feature afetada |
| Avaliação da arquitetura (docs/8.avaliacao_arquitetura.md, 6 cenários) | 5 (Revisão Técnica Formal): ATAM | 10/11 a 17/11/2026 | Avaliador de arquitetura (a designar pelo gerente) e equipe | Cenários com medição real em DES (meta: 6 de 6); latência p95 da busca (meta: até 1 s); riscos, pontos de sensibilidade e tradeoffs | 01/12/2026 (Documento de Arquitetura final) | Corrigir o risco ou documentar a decisão arquitetural | Patrocinadores (professores orientadores) | Dono do serviço afetado |
| Sistema em DES/HML: Relatório de Verificação Geral (EAP 1.8.1) | 5 (Revisão Técnica Formal) | 17/11/2026 | Vicenzo (gerente), com cada dono respondendo pela sua feature | Requisitos Essenciais verificados em DES/HML (meta: 100%); divergências por feature, classificadas | 24/11/2026 (congelamento de código e deploy em PROD) | Corrigir até 24/11; divergência sem correção torna-se decisão registrada | Patrocinadores | Dono de cada feature |
| Documentos do orquestador (REQUISITOS.md e demais) e documentos derivados da disciplina (docs/1 a 9) | 4 (Revisão Técnica): análise de impacto | A cada alteração aprovada; revisão final de 24/11 a 01/12/2026 | Autor da alteração | Impactos não propagados por alteração (features, diagramas, specs, schemas e documentos da disciplina) | Na mesma passada da alteração; 01/12/2026 para a entrega final | Registrar o impacto como pendência na feature e atualizar o derivado | Grupo, na reunião semanal | Autor da alteração |
| Artefatos de gerência (TAP, Declaração de Escopo, EAP, RACI, Orçamento e atas) | 4 (Revisão Técnica): conformidade com o template da disciplina | A cada emissão, antes da coleta de assinaturas | Renato (analista de gerência) | Campos do template sem preenchimento; divergências entre o .md canônico e o .docx/.pdf; linhas da RACI sem exatamente um A | Antes da entrega correspondente | Corrigir o .md e regenerar o .docx e o .pdf | Vicenzo (gerente) | Autor do artefato |
| Release final, pitch e apresentação aos patrocinadores | 2 (Apresentação) | 24/11/2026 (pitch) e 15/12/2026 (apresentação) | Os cinco integrantes | Falhas durante a demonstração; apontamentos dos patrocinadores | 01/12/2026 para o pitch e o vídeo | Corrigir até a entrega final; o que restar entra nas lições aprendidas (EAP 1.9.6) | Patrocinadores | Equipe |

\* Tipos de revisão (Rodrigues, 2001; Paula Filho, 2003): 1 Informal; 2 Apresentação; 3 Revisão de
Apresentação (*walkthrough*); 4 Revisão Técnica; 5 Inspeção ou Revisão Técnica Formal. A linha do CI não é
revisão: é verificação dinâmica por teste automatizado, complementar aos cinco tipos.

\*\* As métricas contam defeitos, divergências ou inconsistências por artefato, módulo ou feature, como
pede o template.

## 2. Padrões e normas utilizados

| Nome | Descrição |
| --- | --- |
| **OWASP Top 10 (2021)** | Organiza os requisitos de segurança do REQUISITOS.md §8 (RNF-SEC), todos Essenciais: controle de acesso no servidor, consultas parametrizadas, segredos só em variável de ambiente, senhas com Argon2, bcrypt ou scrypt, rate limiting e CORS restrito às origens conhecidas. |
| **LGPD (Lei nº 13.709/2018)** | Coleta mínima de dados, cadastro só a partir de 18 anos, política de privacidade e exclusão definitiva da conta após 30 dias (RNF-SEC-40 a RNF-SEC-44). |
| **WCAG, nível AA** | Contraste de texto das paletas definidas no Documento de Design §3.1 (RNF-USA-03). |
| **Heurísticas de Nielsen** | Base da avaliação heurística dos protótipos, com severidade de cosmético a catastrófico. |
| **ATAM (SEI, Carnegie Mellon)** | Método de avaliação da arquitetura por cenários de atributos de qualidade: segurança, desempenho, disponibilidade, resiliência e manutenibilidade. |
| **OpenAPI 3.0.3** | Um contrato HTTP por serviço em docs/api, exposto em runtime e agregado num Swagger UI único. |
| **JSON Schema (draft 2020-12)** | Envelope e 26 schemas de eventos em docs/mensageria; um arquivo por tipo e versão, imutável depois de publicado. |
| **Conventional Commits** | Prefixos feat, fix, docs, chore, test e refactor nas mensagens de commit; base do relatório semanal de contribuição. |
| **Semantic Versioning (vX.Y.Z)** | Tag e GitHub Release ao fim de cada período; produção só a partir de tag. |
| **ISBN-13 (ISO 2108)** | Chave natural da base oficial, validada por formato e dígito verificador (RN-02, RNF-SEC-38). |
| **Definition of Done do projeto** | Checklist obrigatório de 8 itens por feature (plano de projeto §10): código mergeado, CI verde, testes, spec OpenAPI, schemas de evento, fluxo em DES/HML, arquivo da feature atualizado e divergência de protótipo registrada. |
| **Design system (docs/design-system/tokens.json)** | Tokens de cor, tipografia, espaçamento, raio e elevação definidos uma vez e traduzidos para o Tailwind e para o tema Flutter; o CI do mobile verifica a sincronia (RNF-USA-06). |
| **PMBOK (PMI)** | Referência dos artefatos de gerência: TAP, Declaração de Escopo, EAP, RACI e orçamento. |

## 3. Ambiente das atividades de qualidade

- **Repositório e revisão:** GitHub, na organização ICEI-PUC-Minas-PMGES-TI. A branch desenvolvimento recebe o trabalho; a main é protegida e só recebe pull request aprovado por outro integrante. O estado das 37 features é acompanhado no quadro Kanban do GitHub Projects.
- **Integração contínua:** GitHub Actions, com um workflow por projeto filtrado por caminho (identidade, social, acervo, leitura, web, mobile e ingestão), executando lint, build, testes e npm audit a cada push e pull request.
- **Testes:** JUnit 5, Spring Boot Test e Mockito nos serviços Spring; Jest nos serviços NestJS; Vitest e Vue Test Utils na web; flutter_test no mobile; pytest na ingestão. Os testes de integração rodam em PostgreSQL 17 descartável (container no CI ou Docker local), nunca no Neon. A mensageria é testada com broker em memória ou canal AMQP simulado, e OpenLibrary, Google Books, Cloudinary e Brevo são sempre simulados.
- **Homologação:** ambiente DES/HML no Render (Oregon), com banco Neon e broker CloudAMQP próprios, atualizado a cada merge na main; o APK de DES é gerado como artefato do CI. Produção a partir de tag, desde 24/11/2026.
- **Contratos e registros:** Swagger UI único (docker-compose.docs.yml) com os 4 specs; pendências nos arquivos de feature em docs/plano-de-desenvolvimento; atas semanais em assets/atas.
- **Inspeção visual:** protótipos HTML renderizados em Chromium headless, com captura por artboard, usados na avaliação heurística e na comparação com as telas implementadas.

## 4. Equipe da Qualidade

| Nome | Responsabilidades |
| --- | --- |
| **Vicenzo Fonseca de Mello Souza** | Gerente do projeto. Aprova este plano e o resultado das verificações internas, conduz o Relatório de Verificação Geral (EAP 1.8.1) e designa o avaliador do ATAM. Como designer de interface, avalia a aderência das telas aos protótipos. |
| **Renato Douglas Nascimento Silva de Oliveira** | Analista de gerência. Revisa a conformidade dos artefatos de gerência com os templates da disciplina, avalia o Plano de Testes e o registro de lacunas, do qual é autor, e verifica a infraestrutura de DES/HML (Neon e Render). |
| **Henrique Moreira Gomes de Carvalho** | Responsável por segurança da aplicação. Verifica a conformidade com o OWASP Top 10 e a LGPD, o controle de acesso (RN-08 e IDOR) e o rate limiting, e conduz os cenários de segurança do ATAM em DES. |
| **Kayke Emanoel de Souza Santos** | Engenheiro de CI/CD. Mantém os workflows de CI e seus portões (lint, build, testes e npm audit) e acompanha os builds quebrados na desenvolvimento. |
| **Ana Luiza de Freitas Rodrigues** | Desenvolvedora mobile. Verifica a aderência do tema Flutter aos tokens do design system, o contraste WCAG AA no app e os testes da camada de estado, dos serviços e da fila offline. |
| **Dono da feature (cada integrante)** | Escreve os testes automatizados dos casos de uso, submete as próprias migrations à revisão humana, atualiza spec e schemas e responde pela feature na verificação geral. |
| **Plantão da semana (rotativo)** | Revisa e aprova o pull request de desenvolvimento para main, valida o fluxo em DES/HML e consolida a ata da semana. |

> **Pendência:** os papéis de base vêm da [matriz RACI](matriz_raci.md) §1 e §4. São propostas deste plano,
> sem registro anterior no repositório, e precisam de confirmação do grupo antes da entrega: Renato como
> avaliador do Plano de Testes, Henrique conduzindo os cenários de segurança do ATAM, Ana verificando o tema
> mobile e o contraste, e o revisor humano das migrations designado pelo dono da feature. O avaliador de
> arquitetura continua a designar pelo gerente, como na RACI.

## 5. Processos (metodologias) de qualidade utilizados

| Nome | Descrição |
| --- | --- |
| **Definition of Done** | Nenhuma feature é considerada pronta sem cumprir os 8 itens do plano de projeto §10; cada feature pode acrescentar itens, nunca remover. |
| **Integração contínua com portões** | CI a cada push; quem quebra a desenvolvimento conserta ou reverte na hora; a main só recebe pull request com CI verde e uma aprovação. |
| **Revisão por pares em pull request** | Todo merge na main passa pela revisão de outro integrante, imposta pela proteção da branch. |
| **Testes junto da feature** | Testes não são fase: cada feature entrega testes unitários e de integração (mínimo: backend), com prioridade para RN-04, RN-05 e RN-08. Cada caso do Plano de Testes aponta para o teste automatizado que o executa. |
| **Controle de mudança com análise de impacto** | Divergência vira pendência no arquivo da feature, o grupo decide na reunião semanal e o autor da alteração propaga o impacto a features, specs, diagramas e documentos derivados. |
| **Contratos versionados** | Spec OpenAPI por serviço e JSON Schema imutável por tipo e versão de evento, com teste de contrato e comparação no CI entre a cópia usada em runtime e a fonte canônica. |
| **Avaliação heurística** | Inspeção dos protótipos pelas 10 heurísticas de Nielsen antes da implementação, com classificação de severidade e evidência em captura de tela. |
| **ATAM** | Avaliação da arquitetura por cenários derivados dos requisitos não funcionais, com medição no sistema em DES/HML, e não estimada. |
| **Corte de escopo por prioridade** | O que não termina desce de prioridade para o período seguinte; a entrega nunca é atrasada para caber escopo. |

## 6. Rastreabilidade

| Conteúdo deste plano | Origem |
| --- | --- |
| Gerente, papéis e patrocinadores | [`matriz_raci.md`](matriz_raci.md) §1 e §4; [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §8 |
| Datas e marcos | `docs/orquestador/plano-de-projeto.md` §3; [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §6 |
| Definition of Done, CI, PR e migrations | `docs/orquestador/plano-de-projeto.md` §5 e §10 |
| Normas de segurança, acessibilidade e testes | `docs/orquestador/REQUISITOS.md` §7, §8 e §9 |
| Ferramentas, ambiente, resultados e lacunas de teste | [`docs/9.plano_de_testes.md`](../../docs/9.plano_de_testes.md) §9.3, §9.4, §9.7 e §9.8 |
| Avaliação heurística | [`docs/6.1.avaliacao_heuristica_leai.md`](../../docs/6.1.avaliacao_heuristica_leai.md) |
| Cenários ATAM | [`docs/8.avaliacao_arquitetura.md`](../../docs/8.avaliacao_arquitetura.md) §8.1 |
| Verificação geral e release final | [`eap.md`](eap.md) pacotes 1.8.1 a 1.8.3 |
| PRs revisados (#45, #58) | Histórico de pull requests do repositório |

## Referências

- PAULA FILHO, Wilson de Pádua. **Engenharia de software: fundamentos, métodos e padrões**. 2. ed. Rio de Janeiro: LTC, 2003.
- RODRIGUES (2001), citado no template da disciplina como fonte da classificação dos tipos de revisão.
- PROJECT MANAGEMENT INSTITUTE. **A guide to the project management body of knowledge (PMBoK)**. 4. ed. PMI Standard, ANSI, 2008.

<!-- Artefato de Gerência de Projetos. DERIVADO: os rituais vêm de docs/orquestador/plano-de-projeto.md
     §5, §6 e §12; os papéis, da matriz_raci.md; os patrocinadores, da declaracao_de_escopo.md §8.
     Não cria ritual novo: registra quem comunica o quê, a quem, por onde e com que frequência. -->

# Gerência de Projetos de Software

## Plano de Comunicação do Projeto

> **O que este documento é:** como as informações do **Lê Ai** circulam: cada entregável de gerência e
> de processo, para quem ele é comunicado, por qual meio, com que frequência e por quem; as ferramentas
> usadas, os papéis envolvidos e os princípios que valem para qualquer comunicação do projeto.
>
> **O que este documento não é:** o processo de trabalho, que está em
> `docs/orquestador/plano-de-projeto.md`, nem a atribuição de responsabilidade por pacote de trabalho,
> que está na [Matriz RACI](matriz_raci.md).

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Data** | 23/11/2026 |
| **Fontes** | `docs/orquestador/plano-de-projeto.md` §5, §6 e §12, [`matriz_raci.md`](matriz_raci.md) e as atas em [`../atas/`](../atas/README.md) |
| **Template** | [`plano_de_comunicacao.docx`](plano_de_comunicacao.docx), template da disciplina preenchido; [`plano_de_comunicacao.pdf`](plano_de_comunicacao.pdf) para entrega |
| **Versão** | 1.0, de 23/11/2026, por Renato Douglas Nascimento Silva de Oliveira |

---

## 1. Matriz de comunicação

As oito primeiras linhas são as do template da disciplina. Três delas não existem no projeto com o nome
do template e foram mapeadas para o artefato que cumpre o mesmo papel:

- **Plano de qualidade** → o Plano de Testes (`docs/9.plano_de_testes.md`) e o Definition of Done
  (`plano-de-projeto.md` §10);
- **Checklists de inspeção** → o checklist do Definition of Done no arquivo de cada feature e a revisão
  de pull request;
- **Plano de aquisições** → o [orçamento](orcamento_do_projeto.md): não há compra prevista, porque o
  desembolso é de R$ 0,00 em planos gratuitos.

As linhas seguintes cobrem as comunicações que o projeto de fato pratica e que o template não lista.

| Entregável | Público-alvo | Método de comunicação | Frequência | Responsável |
| --- | --- | --- | --- | --- |
| Atas de reunião | Equipe; patrocinadores | Reunião virtual no Google Meet; ata em Markdown em `assets/atas/`, com `.docx` e `.pdf` no template da disciplina; link avisado no grupo de WhatsApp | Semanal | Plantão da semana consolida; Gerente aprova |
| Declaração de escopo | Patrocinadores; equipe | Documento no repositório (`.md` canônico, `.docx` e `.pdf`), entregue no Canvas para coleta de assinaturas | Eventual: na elaboração (14/09) e a cada mudança de escopo aprovada | Gerente do Projeto |
| WBS (EAP) | Equipe; patrocinadores | `eap.md`, `.docx` e `.pdf` no repositório, entregues no Canvas; apresentada na reunião semanal | Eventual: na elaboração (15/09) e quando um pacote de trabalho mudar | Gerente do Projeto |
| Cronograma | Equipe; patrocinadores | Quadro Kanban no GitHub Projects, com acesso dos três orientadores; planilha Previsões do Cronograma; revisão na reunião semanal | Contínua no quadro; semanal na revisão; planilha a cada fechamento de período | Dono da feature atualiza o quadro; Gerente aprova |
| Lista de riscos | Equipe; patrocinadores | `lista_de_riscos.md`, planilha e `.pdf` no repositório; risco que ocorre é registrado na ata; risco alto que ocorre é avisado no WhatsApp no mesmo dia | Revisão semanal; eventual quando surge risco novo | Gerente do Projeto; quem identifica o risco registra |
| Plano de qualidade (Plano de Testes e Definition of Done) | Equipe; patrocinadores | `docs/9.plano_de_testes.md` e DoD do plano de projeto §10; resultado da CI no GitHub Actions a cada push | A cada push (CI); plano revisto a cada fechamento de período | Dono da feature escreve os testes; Gerente aprova o plano |
| Checklists de inspeção (DoD e revisão de PR) | Equipe | Checklist do DoD no arquivo da feature; revisão de pull request no GitHub, com uma aprovação obrigatória no merge para a `main` | A cada feature e a cada PR | Dono da feature preenche; revisor do PR e Plantão verificam |
| Plano de aquisições (planos gratuitos) | Patrocinadores; equipe | Orçamento do projeto §5 no repositório; qualquer gasto é levado à reunião semanal como controle de mudança | Eventual, somente se surgir necessidade de gasto | Gerente do Projeto |
| Matriz RACI | Equipe | `matriz_raci.md` e `.docx` no repositório | Eventual: na elaboração (21/09) e quando a EAP mudar | Gerente do Projeto |
| Orçamento | Patrocinadores; equipe | `orcamento_do_projeto.md`, `.docx` e planilha Previsões do Orçamento | Mensal, na data de status | Gerente do Projeto |
| Estado da feature | Equipe | Arquivo da feature em `docs/plano-de-desenvolvimento/` (status, pendências e decisões) e card no Kanban | Ao fim de cada sessão de trabalho | Dono da feature |
| Decisão urgente ou mudança de requisito | Equipe | Aviso no WhatsApp; pendência registrada no arquivo da feature; decisão na reunião semanal e registro na ata | Eventual | Quem detecta registra; Gerente conduz a decisão |
| Aviso antes de alterar serviço ou contrato de outro dono | Dono do serviço; equipe | Mensagem no WhatsApp e nota no `AGENTS.md` do serviço; revisão do PR pelo dono | Eventual, antes da alteração | Quem vai alterar |
| Quebra da `desenvolvimento` ou da `main` | Equipe | Aviso no WhatsApp; correção ou reversão por commit ou PR | Imediata, quando ocorre | Quem quebrou; Plantão acompanha |
| Release do período (tag, GitHub Release e deploy em DES) | Patrocinadores; equipe | GitHub Release, link do ambiente de DES e entrega no Canvas | Ao fim de cada período | Plantão da semana; Gerente aprova |
| Relatório de contribuição individual | Patrocinadores | Markdown em `assets/contribuicao_semanal/`, entregue no Canvas | Semanal | Cada integrante |
| Entregas da disciplina (documento, relatório de encerramento, vídeo) | Patrocinadores | Repositório no GitHub e entrega no Canvas | Por marco do cronograma (Entregas 1 a 6) | Gerente do Projeto; dono de cada seção |
| Apresentação final | Patrocinadores | Apresentação com o sistema rodando em produção | Única, em 15/12/2026 | Equipe |

## 2. Gerência da comunicação

### Ferramentas

| Ferramenta | Uso |
| --- | --- |
| **WhatsApp** (grupo dos cinco integrantes) | Avisos, combinações rápidas e decisões urgentes e pequenas. Não é registro: o que é decidido ali vai para a ata ou para o arquivo da feature. |
| **Google Meet** | Reunião semanal e reuniões extraordinárias. |
| **GitHub** | Registro oficial do projeto: repositório (documentos, atas e arquivos de feature), pull requests e revisão, Actions (CI), Releases e o quadro Kanban no GitHub Projects. |
| **Canvas** | Entregas aos professores orientadores. |

### Papéis envolvidos

| Papel | Na comunicação |
| --- | --- |
| **Gerente do Projeto** (Vicenzo Fonseca de Mello Souza) | Conduz a reunião semanal, aprova as comunicações formais e responde pelas entregas aos patrocinadores. |
| **Plantão da semana** (rotação entre os cinco) | Consolida a ata, fecha `desenvolvimento` em `main` por PR e avisa no grupo o resultado do deploy em DES. |
| **Dono da feature** | Mantém o arquivo da feature e o card do Kanban atualizados e avisa antes de mexer em serviço de outro dono. |
| **Equipe de Desenvolvimento** | Participa da reunião semanal, revisa PRs e emite o relatório individual de contribuição. |
| **Patrocinadores** (Prof. Artur Martins Mol, Prof. João Paulo Carneiro Aramuni e Prof. Leonardo Vilela Cardoso) | Recebem as entregas, avaliam e aprovam o escopo. Acompanham o quadro Kanban e o repositório. |

O controle de responsabilidades é feito por três instrumentos que já existem: a [Matriz RACI](matriz_raci.md),
a tabela de pendências de cada ata (com responsável e prazo) e o responsável de cada card no Kanban.

### Princípios gerais

- **Seguir a LGPD.** Nenhum dado pessoal de usuário, segredo ou credencial circula em WhatsApp, ata,
  issue, PR, captura de tela ou prompt de agente de IA. Segredos ficam apenas em variáveis de ambiente e
  GitHub Secrets; dados do ambiente de DES não são copiados para os canais.
- **O repositório é o registro oficial.** Decisão tomada no WhatsApp ou em conversa só vale depois de
  registrada na ata ou no arquivo da feature.
- **O `REQUISITOS.md` é a fonte de verdade do produto.** Mudança de requisito segue o controle de mudança
  do plano de projeto §3, nunca uma combinação na conversa.
- **Comunicação com os patrocinadores pelos canais formais** (Canvas e GitHub), sob responsabilidade do
  Gerente do Projeto.
- **Avisar antes, não depois:** alteração em serviço ou contrato de outro dono e quebra de branch são
  comunicadas no grupo na hora.
- **Idioma pt-BR** em documentos, atas e mensagens de commit, que seguem Conventional Commits.

## 3. Legenda

- **Público-alvo:** a quem se destina a comunicação.
- **Método de comunicação:** reunião virtual, mensagem, documento no repositório, entrega no Canvas etc.
- **Frequência:** contínua, semanal, mensal, por período, eventual etc.
- **Responsável:** papel ou pessoa responsável pela comunicação.

## 4. Controle de mudança

Mudança de canal, ritual ou responsável começa neste `.md` e é repetida no `.docx` na mesma passada.

| Versão | Data | Autor | Notas da revisão |
| --- | --- | --- | --- |
| 1.0 | 23/11/2026 | Renato Douglas Nascimento Silva de Oliveira | Versão inicial no template da disciplina. |

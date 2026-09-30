# Artefatos da disciplina de Gerência de Projetos

Este diretório mantém os artefatos de gerência do projeto **Lê Ai**.

## Termo de Abertura de Projeto (TAP) nº 01

O TAP nº 01 foi aprovado pelo grupo na reunião de abertura de **23/08/2026** e encaminhado aos patrocinadores (professores orientadores) para aceite formal. Registro da aprovação: [`../atas/ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md).

| Arquivo | Conteúdo |
| --- | --- |
| [`termo_de_abertura_do_projeto.md`](termo_de_abertura_do_projeto.md) | Estrutura do TAP no template da disciplina, em Markdown. Serve de esqueleto e referência de seções (1 a 5); **o conteúdo preenchido está nos PDFs**, não aqui. |
| [`termo_de_abertura_do_projeto_assinado.pdf`](termo_de_abertura_do_projeto_assinado.pdf) | TAP preenchido, com 3 assinaturas digitais coletadas (24/08/2026). |
| [`../atas/TermoDeAberturaDoProjeto.pdf`](../atas/TermoDeAberturaDoProjeto.pdf) | Versão com o campo de assinatura dos **cinco integrantes**, todas concluídas (última em 12/09/2026). É a versão mais completa do documento. |

Conteúdo consolidado no TAP: objetivo e persona (Marina Torres), escopo e contra-escopo, entregáveis, condições para início, prazo de **04/08/2026 a 15/12/2026**, esforço de **720 h** da equipe (774 h no total geral, somando a orientação docente), custo estimado de **R$ 46.420,88** com desembolso efetivo de **R$ 0,00** (planos gratuitos) e a lista de partes interessadas.

> Pendência: as duas versões assinadas estão em diretórios diferentes (`gerencia/` e `atas/`). Consolidar em um único arquivo canônico neste diretório.

## Declaração de Escopo

Elaborada em **14/09/2026** a partir do TAP nº 01 e da baseline de requisitos. Delimita o que o projeto
entrega e o que não entrega, sob quais restrições e premissas, e contra quais marcos a entrega é medida.
É o documento que a EAP decompõe.

| Arquivo | Conteúdo |
| --- | --- |
| [`declaracao_de_escopo.md`](declaracao_de_escopo.md) | **Versão canônica**, em Markdown e versionada. Toda alteração começa aqui. |
| [`declaracao_de_escopo.docx`](declaracao_de_escopo.docx) | Template da disciplina (`templates/Template - Declaracao de escopo.docx`) preenchido, com os oito campos e os dez marcos. **Derivado** do `.md`. |
| [`declaracao_de_escopo.pdf`](declaracao_de_escopo.pdf) | Versão para leitura e coleta de assinaturas, com o bloco de aprovação do gerente e dos três patrocinadores. **Derivado** do `.docx`. |

## Estrutura Analítica do Projeto (EAP)

Atende ao marco de **15/09** do [`plano-de-projeto.md`](../../docs/orquestador/plano-de-projeto.md) §3
que prevê a EAP junto das funcionalidades prioritárias do Período 1, e ao item 2.3 do TAP. Construída pela estratégia
*top-down* por fases do ciclo de vida do guia [`templates/Criar_EAP.pdf`](../../templates/Criar_EAP.pdf):
nível 2 abrindo com Gerenciamento do Projeto e fechando com Encerramento, **71 pacotes de trabalho**,
dicionário completo e verificação contra os dez mandamentos.

| Arquivo | Conteúdo |
| --- | --- |
| [`eap.md`](eap.md) | **Versão canônica**: representação hierárquica com códigos de conta, dicionário da EAP, conformidade com os dez mandamentos e controle de mudança. |
| [`eap.docx`](eap.docx) | Gerado a partir do `.md`, em paisagem para caber o dicionário. **Derivado**. |
| [`eap.pdf`](eap.pdf) | Versão para leitura e entrega. **Derivado** do `.docx`. |

> Os nove nós de nível 2 da EAP são, um a um, as nove etapas do ciclo de vida declaradas na Declaração
> de Escopo §2. Mudança em um dos documentos exige a mesma mudança no outro, na mesma passada.
>
> Os `.docx` e `.pdf` são **derivados**: nunca edite um deles diretamente. Altere o `.md` e regenere.

## Matriz de Responsabilidades (RACI)

Elaborada em **21/09/2026**. Atribui responsabilidade sobre os pacotes de trabalho da EAP, em **44
linhas de atividade** agrupadas nos nove nós de nível 2. As colunas não são os papéis genéricos do
template (gerente, equipe gerenciada e cliente): são os cinco papéis que o projeto de fato exerce,
incluindo o **dono da entrega** e o **plantão da semana** do
[`plano-de-projeto.md`](../../docs/orquestador/plano-de-projeto.md) §6, sem os quais a divisão
vertical de trabalho não aparece na matriz.

| Arquivo | Conteúdo |
| --- | --- |
| [`matriz_raci.md`](matriz_raci.md) | **Versão canônica**: papéis, convenção de preenchimento, a matriz por etapa do ciclo de vida, a tabela de recursos humanos, rastreabilidade e controle de mudança. |
| [`matriz_raci.docx`](matriz_raci.docx) | Template da disciplina preenchido, em paisagem para caber as seis colunas. **Derivado**, gerado a partir do `.md`. |

Regra de consistência, verificável: **toda linha tem exatamente um `A` e ao menos um `R`**. Pacote de
trabalho novo na EAP exige linha nova aqui; pacote removido tem sua linha removida.

> Pendência: os níveis de proficiência e as capacitações da tabela de recursos humanos foram inferidos
> do que foi entregue no período 0, e não de uma autoavaliação da equipe. O grupo confirma ou corrige
> antes da coleta de assinaturas.

## Processo e planejamento

O processo de trabalho (branches, Definition of Done, rituais, prazos e períodos) não vive aqui — é fonte de verdade em [`../../docs/orquestador/plano-de-projeto.md`](../../docs/orquestador/plano-de-projeto.md). O acompanhamento das 37 features está no quadro Kanban do projeto: https://github.com/orgs/ICEI-PUC-Minas-PMGES-TI/projects/738

## Artefatos ainda planejados

- Registro das partes interessadas (detalhamento do TAP item 5).

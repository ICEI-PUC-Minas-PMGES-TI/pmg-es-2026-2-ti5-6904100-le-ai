# AGENTS.md — Mobile (Flutter)

Convenções do app mobile. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz — que traz as regras gerais (branches, commits, DoD, segurança, fluxo de feature) e prevalece no que for transversal. Fonte de verdade do escopo: [`docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md).

## Stack

- **Flutter** nativo (Android e iOS). **Produto principal**, escopo funcional completo.
- Não usar Flutter Web (vetado): a web é um projeto Vue separado.

> Versão do SDK, gerenciamento de estado, estrutura de pastas, padrão de teste e comandos de build serão fixados aqui quando o projeto arrancar. Por ora, apenas a estrutura de pastas existe.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Fila offline** de registros de progresso: detectar ausência de conectividade e reenviar quando a conexão voltar (RNF-ERR-05).
- **Sessão de leitura cronometrada** com **modo de foco** obrigatório e não contornável; estado mantido **localmente no dispositivo**, não no servidor (RN-16). Recuperação de sessão interrompida.
- Tratar a **hibernação do plano gratuito do Render**: estado de carregamento prolongado na primeira requisição, não erro (RNF-ERR-09).
- **Push** via FCM em Android; iOS recebe as mesmas notificações apenas in-app (RF-NOT-07, arquitetura §2.7).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10: copiar a **estrutura** do protótipo e chegar visualmente muito próximo dele, montando com os widgets de layout do Flutter e respeitando o escalonamento de texto do sistema. Nada de `Stack` com `Positioned` para montar o que é fluxo, nada de tamanho fixo que quebre em outra tela.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; quando criado por P0-DS, `docs/design-system/tokens.json` será a fonte canônica consumida pelo `ThemeData` do Flutter e pela configuração do Tailwind (RNF-USA-06).
- Testes unitários da camada de estado e de serviços, incluindo a fila offline (RNF-TST-04).

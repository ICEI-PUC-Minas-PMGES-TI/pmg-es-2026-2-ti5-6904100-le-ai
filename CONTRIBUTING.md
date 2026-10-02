# Guia de Padronização Git & GitHub

**Projeto:** XYZ  
**Grupo:** GX — TI2/2026-2  
**Repositório:** `plu-cc-2026-2-ti2-4354100-plu-cc-2026-2-ti2-4354100-group-X`

---

## 1. Introdução

Este documento define as regras de contribuição para o repositório do MEDIFLOW. Todas as alterações — sejam de código, documentação ou configuração — devem seguir as convenções aqui descritas.

---

## 2. Golden Rules

As regras abaixo são obrigatórias e se aplicam a todos os membros do grupo, sem exceção:

1. **Nunca faça commit diretamente na branch `main`.** Todo commit deve chegar via PR, garantindo revisão de código.

2. **Uma branch por funcionalidade, correção ou tarefa.** Não combine alterações não relacionadas em uma única branch. Isso facilita a revisão e evita conflitos desnecessários.

3. **Todo Pull Request deve ser revisado por pelo menos um outro membro do grupo** antes do merge. Não faça merge do seu próprio PR sem revisão **(a menos que absolutamente necessário)**.

4. **Delete branches de trabalho após o merge.** Mantenha o repositório organizado removendo branches já integradas. As exceções são as **branches permanentes**, descritas na seção 3.

5. **Nunca delete uma branch permanente.**

6. **Nunca faça `git push --force` em branches permanentes.** Force-push reescreve o histórico e pode causar perda de commits para outros membros.

7. **Sempre mantenha as branches sincronizadas.** Periodicamente, faça `git pull` na branch em que está trabalhando para garantir que você está com a versão mais recente.

---

## 3. Branches Permanentes (Permanent Branches)

Algumas branches não devem ser deletadas após o merge. Elas existem permanentemente no repositório e são usadas recorrentemente para propósitos específicos.

- Branches temporárias (feature, fix, chore, etc.) nascem da `main` e são deletadas após o merge.
- Branches permanentes (`main`, `docs`) nunca são deletadas e recebem merges via PR.

### 3.1 Branch `main`

- **Propósito:** Código estável e pronto para produção.
- **Deve ser deletada?** **Nunca.**
- **Recebe commits diretos?** **Nunca.** Todo merge na `main` deve vir via Pull Request.

### 3.2 Branch `docs`

- **Propósito:** Centralizar alterações de documentação diversa (README, guias, atas de reunião, arquivos de especificação).
- **Deve ser deletada?** **Nunca.**
- **Uso recorrente:** Quando um membro do grupo precisa atualizar um documento, ele pode fazer checkout da `docs`, criar uma branch temporária a partir dela (ex.: `docs/atualiza-readme`), fazer as alterações e abrir um PR de volta para `docs`.
- **Por que é útil:** Evita que a `main` seja poluída com commits de documentação e mantém um histórico separado e organizado.

---

## 4. Nomenclatura de Branches

### 4.1 Formato padrão

```
<tipo>/<descrição-curta>
```

### 4.2 Tipos de branch permitidos

- `feat/` — Nova funcionalidade para o sistema. Exemplo: `feat/cadastro-usuarios`
- `fix/` — Correção de bug. Exemplo: `fix/validacao-cpf-duplicado`
- `docs/` — Alterações apenas em documentação. Exemplo: `docs/atualiza-readme`
- `refactor/` — Melhoria no código sem alterar comportamento. Exemplo: `refactor/limpa-validacoes`
- `test/` — Adição ou modificação de testes. Exemplo: `test/testes-usuario`
- `chore/` — Manutenção, dependências, configuração de build. Exemplo: `chore/atualiza-dependencias`
- `style/` — Formatação, espaçamento, sem alteração de lógica. Exemplo: `style/padroniza-css`

---

## 5. Mensagens de Commit

### 5.1 Formato padrão (Conventional Commits)

Toda mensagem de commit deve seguir a estrutura abaixo:

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

### 5.2 Tipos de commit permitidos

- `feat` — Nova funcionalidade (correlaciona com MINOR no SemVer).
- `fix` — Correção de bug (correlaciona com PATCH no SemVer).
- `docs` — Alterações em documentação.
- `refactor` — Refatoração de código que não corrige bug nem adiciona funcionalidade.
- `test` — Adição ou correção de testes.
- `chore` — Tarefas de manutenção, atualização de dependências, configuração.
- `style` — Formatação, espaçamento ou pontuação sem alteração de lógica.

---

## 6. Templates de Issues e PRs

O repositório já conta com templates de issues em `.github/ISSUE_TEMPLATE/` para **Task**, **Bug Report** e **Feature Request**. Use-os sempre que abrir uma issue — isso ajuda a manter a consistência e a rastreabilidade do trabalho.

Para Pull Requests, o repositório já conta com um template em `.github/PULL_REQUEST_TEMPLATE.md`.

Por padrão, use `Closes #` quando o PR resolve completamente a issue vinculada.

---

Este guia deve ser seguido por todos os membros do grupo G4 durante o desenvolvimento do MEDIFLOW. Em caso de dúvidas, consulte a documentação oficial ou discuta com a equipe antes de fazer alterações que fujam do padrão.

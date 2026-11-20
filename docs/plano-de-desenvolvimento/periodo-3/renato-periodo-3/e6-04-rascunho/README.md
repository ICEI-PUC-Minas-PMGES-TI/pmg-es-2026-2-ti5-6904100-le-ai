# E6-04 — rascunho das capturas (20/11/2026)

Trabalho da etapa 2 da E6-04 interrompido em 19/11/2026 (limite de uso do agente), trazido para cá para revisão em outro computador. **Não é a versão final**: nada disso foi para o `docs/7.solucao.md` ainda.

- `capturas/`: 48 capturas com nome `p<período>-<feature>-<tela>-<web|mobile>.png`, feitas pelo Edge headless e pelo emulador. As do Período 1 e 2 vieram do DES (v0.2.1) com as contas de demonstração; as do Período 3, do ambiente local contra o banco de dev. O agente parou quando ia refazer algumas capturas da web (filtrar resenhas que não são das contas de demonstração, cadastro, buscar, filtros, ações e progresso): **confira se aparece dado de leitor real** antes de usar.
- `scripts/`: os scripts Playwright/adb e de massa usados. Leem as senhas de `%USERPROFILE%\.leai\contas-demo-des.env` e `contas-demo-dev.env`, que ficam fora do repositório (não vão para o outro computador; lá é preciso recriar ou copiar à mão). `ids-des.json` são só ids de objetos de demonstração no DES.

Faltam, pelo plano (`../plano-E6-04-capturas-de-tela.md`): as capturas restantes, o `7.solucao.md`, a validação por agente de contexto limpo e o merge.

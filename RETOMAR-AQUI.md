# Retomada — F-ACV-INGESTAO e F-ACV-CADASTRO

> **Arquivo temporário e descartável.** Foi escrito na sessão de 18/09/2026, feita no
> celular via Termux, só para a próxima sessão no computador começar sabendo onde as
> coisas pararam. **Apague depois de ler.** Nada aqui é fonte de verdade: tudo já está
> nos arquivos de feature, e este é só um índice com a ordem de execução.

---

## 0. Antes de tudo: a branch não está no remoto

`vicenzo-features` existe **apenas neste celular**. Não tem upstream, e `git branch -r`
só mostra `origin/main` e `origin/desenvolvimento`. São **7 commits** que não chegam a
lugar nenhum se a branch não for enviada.

```bash
git push -u origin vicenzo-features
```

Se isso não tiver sido feito antes de você trocar de máquina, o resto deste arquivo não
importa, porque não vai existir aí.

---

## 1. O que roda, e como rodar

| Onde | Comando | Estado em 18/09/2026 |
|---|---|---|
| `code/back/acervo` | `npm run lint && npm run build && npm test` | verde, 125 testes |
| `code/scripts/ingestao` | `python -m pytest` | verde, 70 testes |
| `code/scripts/ingestao` | `python -m leai_ingestao conferir` | 30 assuntos, 104 sinônimos, 208 mapeamentos |

Nada foi executado contra banco, broker, Cloudinary ou app real: o ambiente do celular não
tinha Docker, Postgres, Java nem Flutter. Tudo acima roda sem rede e sem banco.

---

## 2. As três coisas que mordem primeiro

### 2.1 `JWT_SECRET` do `leai-acervo` tem que ser idêntico ao do `leai-identidade`

Declarei a variável no `render.yaml` como `sync: false`, então o **valor** você preenche
no painel do Render. O `identidade` assina em HS256 com os bytes UTF-8 crus dessa string,
e o `acervo` valida com a mesma. Se divergirem, **todo token válido responde 401** e o
sintoma não sugere a causa: o health fica verde, o login funciona, e só as rotas de
`acervo` recusam.

Em desenvolvimento, sem a variável o serviço sobe e loga um aviso no boot; em produção o
boot é recusado de propósito. Mínimo de 32 caracteres, que é o que o Nimbus exige do lado
emissor.

Detalhe: `code/back/acervo/.env.example` já tem o campo com a explicação.

### 2.2 A carga do dump nunca foi executada

O script está pronto e testado contra a amostra versionada, mas os três dumps do
OpenLibrary somam dezenas de GB e não dava para baixar no 5G. **Enquanto a carga não
rodar, o acervo em DES continua vazio e F-ACV-BUSCA não tem o que buscar.**

Roteiro completo em `code/scripts/ingestao/README.md`. Resumo da ordem, que importa:

```bash
cd code/scripts/ingestao
python -m venv .venv && source .venv/bin/activate
pip install -e .[banco,dev]

python -m leai_ingestao conferir          # 1. valida os CSV curados, sem banco
export DATABASE_URL='postgresql://...'    # branch de DES
python -m leai_ingestao semear            # 2. popula assunto, sinonimo, mapa
python -m leai_ingestao filtrar  --dump dumps/ol_dump_editions.txt.gz
python -m leai_ingestao resolver --dump-autores dumps/ol_dump_authors.txt.gz \
                                 --dump-obras   dumps/ol_dump_works.txt.gz
python -m leai_ingestao carregar --processados <N> --descartados <N>
```

`semear` **antes** de `carregar`: `livro_assunto` só casa com assunto que já existe.

Use `--limite N` no `filtrar` para dimensionar a carga. Ao fim, o `carregar` imprime
dados e índice por tabela — **esse número vai para a Timeline da feature**, é item próprio
do DoD registrar o volume carregado e a fração do plano Neon consumida (RNF-DES-04).

### 2.3 Não existem testes de integração com banco

Os 125 testes de `acervo` são todos unitários. Quatro coisas só se provam contra Postgres
de verdade, e nenhuma delas está coberta:

1. atomicidade de `importacao_livro` + `outbox_acervo` na mesma transação;
2. a corrida de duas requisições com a mesma `Idempotency-Key` (o caminho do `23505`);
3. os CHECKs de livro pessoal e da máquina de estados da importação;
4. a autorização RN-15 com massa nas VIEWs de `social` e `identidade`.

Preferi não escrever esses testes às cegas: sem banco aqui, eles entrariam sem nunca ter
rodado e quebrariam o CI para você depurar de longe.

Para habilitá-los é preciso um service container de Postgres no `ci-back-acervo.yml`
**e** um fixture que crie as VIEWs de `leitura`, `social` e `identidade` — elas não
existem num banco que só tem as migrations de `acervo`. Sugestão: criá-las como tabelas
comuns no fixture, já que o Drizzle não distingue view de tabela na leitura e isso permite
inserir a massa de teste de RN-15 direto.

---

## 3. Duas decisões que dependem do grupo, não de você

### 3.1 Os 30 assuntos são proposta, não decisão

RN-21.1 diz que o conjunto curado é **definido pelo grupo**. O que está em
`code/scripts/ingestao/dados/assuntos.csv` é uma proposta minha, e vale o mesmo para os
104 sinônimos de editora e os 208 mapeamentos de tag.

Leve à reunião antes da carga: **trocar um slug depois de carregar exige migrar os
vínculos em `livro_assunto`**, e aí deixa de ser edição de CSV.

### 3.2 Sete componentes novos nasceram nos prompts de tela

Precisam de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:
área de upload de imagem com seus quatro estados, cartão de progresso de operação longa,
faixa informativa neutra em `musgo-fundo`, card de livro em variante de confirmação,
etiqueta `Livro pessoal`, linha de atribuição de dono, zona de exclusão, e o **modo
consulta como variante de página** — este último F-LST vai reaproveitar na via por lista
do Período 2, então vale decidir logo.

Cada prompt lista os seus na seção 7.

---

## 4. Onde continuar o código

Em ordem de dependência:

1. **Web e mobile de F-ACV-CADASTRO** — não começaram. Os quatro prompts estão em
   `docs/design/periodo-1/F-ACV-CADASTRO/`, prontos para colar no Claude Design e gerar
   os protótipos HTML, que também faltam. Dois buracos transversais do cliente aparecem
   aqui primeiro: **nenhum dos dois clientes HTTP suporta `Idempotency-Key` nem
   retentativa com backoff**, e o `ApiClient` do Flutter só tem `get` e `post` — faltam
   `patch` e `delete`. O período exige os dois (README, "Regras de implementação
   compartilhadas").
2. **A carga do dump** (§2.2), que destrava F-ACV-BUSCA.
3. **Testes de integração** (§2.3).
4. O acionador do consumidor de importação — **não faça**. É de P0-MSG. O
   `ProcessadorImportacao` está pronto e testado esperando o dispatcher; não improvise um
   poller de outbox em `acervo`.

---

## 5. Uma nuance de ambiente que não vale documentar em lugar nenhum

No Termux não existe `/usr/bin/env`, então os binários de `node_modules/.bin` não rodam e
`npm test` falha com `jest: not found`. Contornei chamando por `node
node_modules/jest/bin/jest.js`. **No computador isso não acontece** — `npm test`,
`npm run lint` e `npm run build` funcionam normalmente. Não mexi no `package.json` por
causa disso, e não deve mexer.

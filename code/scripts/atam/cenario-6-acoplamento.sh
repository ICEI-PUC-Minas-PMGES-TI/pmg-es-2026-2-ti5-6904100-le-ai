#!/usr/bin/env bash
# Cenário 6: análise estática de acoplamento entre os serviços num commit (padrão: f1f5c7e, a v0.2.1 em DES).
# Lista (1) referências SQL a schema de outro serviço que não sejam VIEW v_*_v<N>, (2) VIEWs usadas,
# (3) import de pacote/módulo de outro serviço. Os achados brutos precisam de classificação manual
# (nome de evento, comentário e módulo interno casam com o padrão).
set -euo pipefail
REF="${1:-f1f5c7e}"
SERVICOS="identidade acervo leitura social"
echo "Cenário 6 - acoplamento entre serviços no commit $REF ($(git log -1 --format=%cs "$REF"))"
echo
echo "## 1 e 2. Referências a schema de outro serviço (código de produção, sem testes)"
for s in $SERVICOS; do
  for o in $SERVICOS; do
    [ "$s" = "$o" ] && continue
    views=$(git grep -h -o -E "\b$o\.v_[a-z_]+_v[0-9]+" "$REF" -- "code/back/$s/src" | grep -vE "/test/|\.spec\." | sort -u | paste -sd' ' || true)
    brutos=$(git grep -n -E "\b$o\.[a-z_]+" "$REF" -- "code/back/$s/src" | grep -vE "\b$o\.v_[a-z_]+_v[0-9]+" | grep -vE "\.(spec|test|int-spec)\.|/test/" || true)
    n=$(printf '%s' "$brutos" | grep -c . || true)
    echo "$s -> $o: VIEWs [${views}] | achados brutos fora de VIEW: $n"
    [ -n "$brutos" ] && printf '%s\n' "$brutos" | sed "s/^$REF:/    /" | cut -c1-200
  done
done
echo
echo "## 2b. Drizzle (acervo e leitura): schemas de outro serviço declarados por pgSchema()"
git grep -n -E "pgSchema\('(identidade|social|leitura|acervo)'\)" "$REF" -- code/back/acervo/src code/back/leitura/src | sed "s/^$REF:/    /"
echo "VIEWs declaradas sobre esses schemas:"
git grep -h -o -E "\.view\('v_[a-z_]+_v[0-9]+'" "$REF" -- code/back/acervo/src/db/contratos-externos.ts code/back/leitura/src/db/contratos-externos.ts | sort | uniq -c | sed 's/^/    /'
echo "Tabelas (.table) declaradas sobre schema de outro serviço: $(git grep -n -E '(identidade|social|leitura|acervo)\.table\(' "$REF" -- code/back/acervo/src code/back/leitura/src | wc -l)"
echo
echo "## 3. Import de código de outro serviço"
echo "Java (social importando pacote de identidade/acervo/leitura): $(git grep -n -E 'import br\.com\.leai\.(identidade|acervo|leitura)' "$REF" -- code/back/social | wc -l)"
echo "Java (identidade importando pacote de social/acervo/leitura): $(git grep -n -E 'import br\.com\.leai\.(social|acervo|leitura)' "$REF" -- code/back/identidade | wc -l)"
echo "TS (acervo/leitura importando caminho de outro serviço em code/back): $(git grep -n -E "from ['\"][^'\"]*back/(identidade|social|acervo|leitura)" "$REF" -- code/back/acervo/src code/back/leitura/src | wc -l)"
echo "TS (dependência de pacote de outro serviço no package.json): $(git grep -n -E '"leai-(identidade|social|acervo|leitura)"\s*:' "$REF" -- code/back/acervo/package.json code/back/leitura/package.json | wc -l)"

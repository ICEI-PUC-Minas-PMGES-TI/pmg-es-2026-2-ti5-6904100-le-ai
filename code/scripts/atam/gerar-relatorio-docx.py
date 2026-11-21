"""Monta o Relatório Técnico ATAM do Lê Ai sobre o Template_Relatorio_ATAM_PUC_2026.docx (E6-03).

Uso: python -I gerar-relatorio-docx.py <template.docx> <componentes.png> <saida.docx>
O conteúdo espelha docs/8.avaliacao_arquitetura.md (E6-03).
"""
import copy
import re
import sys

import docx
from docx.oxml.ns import qn
from docx.shared import Cm

TEMPLATE, DIAGRAMA, SAIDA = sys.argv[1:4]
d = docx.Document(TEMPLATE)
body = d.element.body
els = list(body.iterchildren())

# Protótipos (índices conferidos na inspeção do template)
P_TEXTO = copy.deepcopy(els[5])
P_BULLET = copy.deepcopy(els[8])          # lista numId 1
P_RISCO = copy.deepcopy(els[22])          # lista numId 6
P_NAORISCO = copy.deepcopy(els[24])       # lista numId 5
P_TRADEOFF = copy.deepcopy(els[26])       # lista numId 4
P_SENS = copy.deepcopy(els[28])           # lista numId 3
P_SENS_DESC = copy.deepcopy(els[29])
P_ACAO = copy.deepcopy(els[35])           # lista numId 2
P_H1 = copy.deepcopy(els[4])
P_H2 = copy.deepcopy(els[21])
P_ASSIN_LINHA = copy.deepcopy(els[40])
P_ASSIN_NOME = copy.deepcopy(els[41])
P_ASSIN_PAPEL = copy.deepcopy(els[42])
P_VAZIO_C = copy.deepcopy(els[43])
T_3 = copy.deepcopy(els[13])
T_4 = copy.deepcopy(els[17])

# Cabeçalho: projeto e data
for row in d.tables[0].rows:
    for cell in row.cells:
        for p in cell.paragraphs:
            for r in p.runs:
                # Atribuir r.text apaga desenhos do run (o logo da PUC): só mexe onde há placeholder.
                if '[NOME PROJETO DE SOFTWARE AVALIADO]' in r.text or '[DD/MM/YYYY]' in r.text or 'MINHAS GERAIS' in r.text:
                    r.text = (r.text.replace('[NOME PROJETO DE SOFTWARE AVALIADO]', 'LÊ AI — APLICATIVO SOCIAL DE LEITURA')
                              .replace('[DD/MM/YYYY]', '20/11/2026').replace('MINHAS GERAIS', 'MINAS GERAIS'))
# Placeholders quebrados em vários runs no cabeçalho
for row in d.tables[0].rows:
    for cell in row.cells:
        for p in cell.paragraphs:
            if '[' in p.text and ('PROJETO' in p.text or 'DATA' in p.text) and 'w:drawing' not in p._p.xml:
                txt = p.text.replace('[NOME PROJETO DE SOFTWARE AVALIADO]', 'LÊ AI — APLICATIVO SOCIAL DE LEITURA').replace('[DD/MM/YYYY]', '20/11/2026')
                runs = p.runs
                runs[0].text = txt
                for r in runs[1:]:
                    r.text = ''

# Remove tudo depois da tabela de cabeçalho; o corpo é remontado
sectpr = els[-1]
for el in els[1:-1]:
    body.remove(el)

W = qn


def limpar(p):
    for ch in list(p):
        if ch.tag != W('w:pPr'):
            p.remove(ch)
    return p


def run_el(texto, negrito=False, italico=False, mono=False, tamanho=None):
    r = docx.oxml.parse_xml(
        '<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:rPr/></w:r>')
    rpr = r[0]
    if mono:
        f = rpr.makeelement(W('w:rFonts'), {W('w:ascii'): 'Consolas', W('w:hAnsi'): 'Consolas', W('w:cs'): 'Consolas'})
        rpr.append(f)
    if negrito:
        rpr.append(rpr.makeelement(W('w:b'), {}))
    if italico:
        rpr.append(rpr.makeelement(W('w:i'), {}))
    if tamanho:
        rpr.append(rpr.makeelement(W('w:sz'), {W('w:val'): str(tamanho)}))
        rpr.append(rpr.makeelement(W('w:szCs'), {W('w:val'): str(tamanho)}))
    rpr.append(rpr.makeelement(W('w:lang'), {W('w:val'): 'pt-BR'}))
    partes = texto.split('\n')
    for i, parte in enumerate(partes):
        if i:
            r.append(r.makeelement(W('w:br'), {}))
        t = r.makeelement(W('w:t'), {'{http://www.w3.org/XML/1998/namespace}space': 'preserve'})
        t.text = parte
        r.append(t)
    return r


def segs(texto):
    """'**negrito** normal `código`' -> lista de (texto, negrito, mono)."""
    out = []
    for m in re.finditer(r'\*\*(.+?)\*\*|`(.+?)`|([^*`]+|\*|`)', texto):
        if m.group(1) is not None:
            out.append((m.group(1), True, False))
        elif m.group(2) is not None:
            out.append((m.group(2), False, True))
        else:
            out.append((m.group(3), False, False))
    return out


def par(proto, texto, **kw):
    p = limpar(copy.deepcopy(proto))
    for t, b, mono in segs(texto):
        p.append(run_el(t, negrito=b or kw.get('negrito', False), italico=kw.get('italico', False),
                        mono=mono or kw.get('mono', False), tamanho=kw.get('tamanho')))
    body.insert(len(body) - 1, p)
    return p


def h1(t):
    return par(P_H1, t)


def h2(t):
    return par(P_H2, t)


def texto(t, **kw):
    return par(P_TEXTO, t, **kw)


def item(proto, titulo, linhas):
    p = limpar(copy.deepcopy(proto))
    ppr = p.find(W('w:pPr'))
    ppr.append(ppr.makeelement(W('w:keepLines'), {}))
    for tt, b, mono in segs(titulo):
        p.append(run_el(tt, negrito=True, mono=mono))
    for linha in linhas:
        p.append(p.makeelement(W('w:r'), {}))
        p[-1].append(p.makeelement(W('w:br'), {}))
        for tt, b, mono in segs(linha):
            p.append(run_el(tt, negrito=b, mono=mono))
    body.insert(len(body) - 1, p)


def celula_texto(tc, txt, header):
    for p in tc.findall(W('w:p')):
        tc.remove(p)
    p = tc.makeelement(W('w:p'), {})
    ppr = p.makeelement(W('w:pPr'), {})
    ppr.append(ppr.makeelement(W('w:spacing'), {W('w:before'): '0', W('w:after'): '0', W('w:line'): '252', W('w:lineRule'): 'auto'}))
    p.append(ppr)
    for tt, b, mono in segs(txt):
        r = run_el(tt, negrito=b or header, mono=mono, tamanho=18 if not header else 20)
        if header:
            rpr = r[0]
            rpr.insert(0, rpr.makeelement(W('w:color'), {W('w:val'): 'FFFFFF'}))
        p.append(r)
    tc.append(p)


def tabela(cabecalho, linhas, larguras):
    tbl = copy.deepcopy(T_4)
    trs = tbl.findall(W('w:tr'))
    tc_head = copy.deepcopy(trs[0].findall(W('w:tc'))[0])
    tc_data = copy.deepcopy(trs[1].findall(W('w:tc'))[0])
    tr_head = copy.deepcopy(trs[0])
    tr_data = copy.deepcopy(trs[1])
    for tr in trs:
        tbl.remove(tr)
    total = sum(larguras)
    tbl.find(W('w:tblPr')).find(W('w:tblW')).set(W('w:w'), str(total))
    grid = tbl.find(W('w:tblGrid'))
    for g in list(grid):
        grid.remove(g)
    for w in larguras:
        grid.append(grid.makeelement(W('w:gridCol'), {W('w:w'): str(w)}))

    def linha(proto_tr, proto_tc, valores, header):
        tr = copy.deepcopy(proto_tr)
        for tc in tr.findall(W('w:tc')):
            tr.remove(tc)
        for v, w in zip(valores, larguras):
            tc = copy.deepcopy(proto_tc)
            tc.find(W('w:tcPr')).find(W('w:tcW')).set(W('w:w'), str(w))
            celula_texto(tc, v, header)
            tr.append(tc)
        tbl.append(tr)

    linha(tr_head, tc_head, cabecalho, True)
    for valores in linhas:
        linha(tr_data, tc_data, valores, False)
    for i, tr in enumerate(tbl.findall(W('w:tr'))):
        trpr = tr.find(W('w:trPr'))
        if trpr is None:
            trpr = tr.makeelement(W('w:trPr'), {})
            tr.insert(0, trpr)
        trpr.append(trpr.makeelement(W('w:cantSplit'), {}))
        if i == 0:
            trpr.append(trpr.makeelement(W('w:tblHeader'), {}))
    body.insert(len(body) - 1, tbl)
    texto('')


def bullet(t):
    return par(P_BULLET, t)


# ---------------------------------------------------------------- conteúdo

h1('1. Resumo Executivo')
texto('O Lê Ai é um aplicativo social de leitura: o app Flutter é o produto principal, e a web Vue cobre um subconjunto. Ele roda sobre quatro microsserviços em duas stacks (Spring e NestJS), um PostgreSQL único com um schema por serviço e mensageria RabbitMQ. A análise foi motivada por três fatores que concentram o risco do projeto: a privacidade de perfil e do livro pessoal (o produto é social, e o vazamento de um perfil privado quebra a confiança do leitor), a infraestrutura em plano gratuito, com hibernação e limites de recurso, e a heterogeneidade proposital das stacks.')
texto('Seis cenários foram exercitados contra o sistema real, no ambiente DES (versão v0.2.1, região Oregon), em 19/11/2026, com uma segunda rodada do C-04 na noite de 20/11:')
bullet('**Segurança atende.** 26 de 26 tentativas de acesso não autorizado foram negadas, sem vazamento e sem alteração nos dados do dono.')
bullet('**Desempenho atende com folga.** A busca teve p95 de 296 ms com 10 clientes concorrentes, contra o limite de 1 s, já incluindo a ida e volta Brasil–Oregon.')
bullet('**Mensageria atende com ressalva.** Outbox, idempotência, retentativa em 1/5/15 s e DLQ se comportaram como projetado sob falhas forçadas, mas a retentativa segura a fila por cerca de 21 s.')
bullet('**Manutenibilidade atende com ressalva.** Nenhum serviço lê tabela de outro nem importa código de outro, e as 117 operações dos contratos existem no runtime, mas os specs gerados em runtime não declaram os códigos de erro que os contratos declaram.')
bullet('**Disponibilidade sob hibernação atende só em parte.** Os serviços Spring levaram cerca de três minutos para acordar (de 167,5 a 179,4 s; numa das rodadas, o serviço identidade não respondeu em 180 s), acima dos 30 a 60 s previstos e acima do timeout de 90 s dos clientes. A idempotência da escrita, que protege o reenvio, atende. O plano de ação (seção 6) trata esse risco primeiro.')

h1('2. Objetivos de Negócio e Direcionadores Arquiteturais')
texto('O objetivo do produto é aumentar a adesão à leitura entre leitores brasileiros adultos por três mecanismos: registro, meta e pertencimento. Desse objetivo e das restrições do projeto (equipe de cinco, plano gratuito de nuvem, duas stacks de backend) saem os direcionadores:')
bullet('**Direcionador 1: Privacidade e controle de acesso (Segurança).** Perfil privado, livro pessoal e dados de leitura só chegam a quem tem direito, com validação no servidor (RNF-SEC-01 a 07; LGPD, com cadastro a partir de 18 anos).')
bullet('**Direcionador 2: Resposta rápida nas leituras do dia a dia (Desempenho).** Busca, estante e feed respondem em até 1 s no p95 (RNF-DES-01/03, RNF-ARQ-04), porque registrar a leitura precisa ser um gesto curto.')
bullet('**Direcionador 3: Operação em plano gratuito e em rede móvel instável (Disponibilidade).** A hibernação aparece como carregamento, não como erro, e o progresso registrado sem rede é reenviado sem duplicar (RNF-ERR-04/05/09, RNF-ARQ-08).')
bullet('**Direcionador 4: Consistência entre serviços sem acoplamento síncrono (Resiliência assíncrona).** Feed, notificações e capas seguem eventos com outbox, idempotência e DLQ (RNF-ERR-06/07/10, RNF-ARQ-06).')
bullet('**Direcionador 5: Evolução em duas stacks por cinco desenvolvedores (Manutenibilidade e interoperabilidade).** Contratos OpenAPI e JSON Schema versionados, e leitura entre schemas só por VIEW (RNF-ARQ-01/03).')

h1('3. Topologia e Abordagem da Arquitetura')
tabela(['Componente / Camada', 'Tecnologia', 'Papel Estrutural e Mecanismo de Comunicação'], [
    ['App móvel (produto principal)', 'Flutter 3.47', 'Escopo funcional completo. HTTP/JSON direto a cada serviço, sem gateway; fila local de progresso offline com chave de idempotência; push Android por FCM.'],
    ['Web (subconjunto)', 'Vue 3.5 + Tailwind 4, site estático no Render', 'SPA com o subconjunto web do escopo. HTTP/JSON direto aos serviços; aviso de servidor iniciando durante o cold start.'],
    ['Serviço identidade', 'Spring Boot 4.1, Java 21', 'Conta, autenticação (JWT de acesso curto + refresh revogável), perfil, privacidade e seguidores; e-mail de recuperação de senha pelo Brevo. Publica eventos pela outbox; expõe VIEWs de perfil e de seguimento aceito.'],
    ['Serviço acervo', 'NestJS 11, Node 22', 'Catálogo, busca indexada, livro pessoal, capas (Cloudinary) e sinopses (OpenLibrary e Google Books). Consome eventos de leitura e de conta.'],
    ['Serviço leitura', 'NestJS 11, Node 22', 'Estante, leitura, progresso, nota, resenha, desafios, sequência e estatísticas. Publica eventos de leitura pela outbox; expõe VIEWs públicas de estante, nota e resenha.'],
    ['Serviço social', 'Spring Boot 4.1, Java 21', 'Feed, comentários, listas, recomendações, notificações (tempo real e FCM) e moderação. Consome eventos dos demais serviços.'],
    ['Banco de dados', 'PostgreSQL no Neon', 'Um schema por serviço. A leitura entre schemas usa só VIEW versionada, que o dono expõe como contrato.'],
    ['Mensageria', 'RabbitMQ (CloudAMQP)', 'Exchange por produtor, fila durável e DLQ por consumidor. Envelope único, validado por JSON Schema nas duas stacks.'],
    ['Processos de apoio', 'GitHub Actions (schedule) e script Python', 'Jobs diários por HTTP autenticado (exclusão de conta, inatividade); carga manual do dump OpenLibrary.'],
], [2200, 2300, 4860])
pp = d.add_paragraph()
pp.alignment = 1
pp.add_run().add_picture(DIAGRAMA, width=Cm(13.5))
body.remove(pp._p)
body.insert(len(body) - 1, pp._p)
texto('Figura 1 — Diagrama de componentes do Lê Ai (docs/diagramas/componentes.mmd).', italico=True)

h1('4. Árvore de Utilidade e Inventário de Cenários')
_intro = texto('Árvore de utilidade, com a prioridade no formato (importância para o negócio, dificuldade técnica):')
_intro.find(W('w:pPr')).append(_intro.makeelement(W('w:keepNext'), {}))
for linha in [
    'Utilidade',
    '├── Segurança',
    '│   ├── C-01 Perfil privado negado em todo endpoint ....... (Alta, Média)',
    '│   └── C-02 IDOR e livro pessoal alheio .................. (Alta, Média)',
    '├── Desempenho',
    '│   └── C-03 Busca com p95 ≤ 1 s, clientes concorrentes ... (Alta, Média)',
    '├── Disponibilidade e resiliência',
    '│   ├── C-04 Hibernação do Render e progresso offline ..... (Alta, Alta)',
    '│   └── C-05 Mensageria com falha, duplicata e broker fora  (Média, Alta)',
    '└── Manutenibilidade e interoperabilidade',
    '    └── C-06 Contratos e acoplamento entre stacks ......... (Média, Média)',
]:
    p = texto(linha, mono=True, tamanho=17)
    ppr = p.find(W('w:pPr'))
    ppr.append(ppr.makeelement(W('w:spacing'), {W('w:after'): '0', W('w:line'): '240', W('w:lineRule'): 'auto'}))
    ppr.append(ppr.makeelement(W('w:keepNext'), {}))
texto('')
tabela(['ID', 'Atributo de Qualidade', 'Descrição do Cenário (Estímulo, Ambiente e Resposta)', 'Prioridade (Negócio / Dificuldade)'], [
    ['C-01', 'Segurança', 'Controle de acesso a perfil privado: um leitor tenta acessar a estante, as resenhas e as estatísticas de um perfil privado do qual não é seguidor aceito, inclusive tentando os endpoints de listagem e busca diretamente. O sistema deve negar o acesso em todos os endpoints, validando a relação de seguidor no servidor (RNF-SEC-01/02/03, RN-08), sem vazar o conteúdo protegido.', 'Alta / Média'],
    ['C-02', 'Segurança', 'IDOR e livro pessoal: um leitor, conhecendo o identificador de um livro pessoal de outro usuário, tenta adicioná-lo à estante, favoritar ou iniciar uma leitura. Essas mutações devem ser sempre negadas. A consulta por terceiro só pode ocorrer quando há uma referência válida no feed ou em uma lista do dono, com autorização e privacidade do perfil revalidadas na página; a substituição direta do ID não concede acesso (RNF-SEC-05/06/07, RN-15).', 'Alta / Média'],
    ['C-03', 'Desempenho', 'Busca sob carga: com múltiplos clientes concorrentes, uma busca de livros por título/autor/ISBN deve responder em até 1 s no percentil 95, desconsiderada a hibernação do plano gratuito, apoiada nos índices de busca (RNF-DES-01/03, RNF-ARQ-04).', 'Alta / Média'],
    ['C-04', 'Disponibilidade e resiliência', 'Hibernação e offline: a primeira requisição a um serviço hibernado do Render (cold start de 30–60 s) deve ser tratada como carregamento prolongado, não como erro; e o app móvel, sem conectividade, deve enfileirar localmente os registros de progresso e reenviá-los ao reconectar, sem perda nem duplicação (RNF-ERR-05/09, RNF-ERR-04/06).', 'Alta / Alta'],
    ['C-05', 'Resiliência assíncrona', 'Mensageria: uma mensagem de notificação que falha repetidamente no consumidor deve, após a tentativa inicial e retentativas em 1, 5 e 15 segundos, ir para a dead-letter queue sem bloquear a fila principal; e a entrega duplicada do mesmo eventId não deve gerar efeito em dobro (RNF-ERR-06/07, RNF-TST-03).', 'Média / Alta'],
    ['C-06', 'Manutenibilidade e interoperabilidade', 'Microsserviços heterogêneos: uma feature altera o contrato de um serviço (Spring ou NestJS). O impacto deve ficar contido pelos quatro OpenAPI versionados, pelas views de schema e pelos JSON Schemas de evento, sem que outro serviço dependa de tipo ou biblioteca interna do primeiro (RNF-ARQ-01/03).', 'Média / Média'],
], [700, 1700, 5560, 1400])

h2('4.1. Resultados das medições')
texto('**Ambientes.** DES: Render (Oregon), Neon e CloudAMQP na mesma região, rodando a v0.2.1; cliente no Brasil, então as latências incluem a ida e volta até Oregon (linha de base da rede: mediana de 252,5 ms). Local: `identidade` e `acervo` no mesmo commit, com RabbitMQ 4 e Postgres 17 em Docker, usado só no C-05 para forçar falhas sem tocar o broker compartilhado. Três contas de demonstração com e-mail `.invalid` foram criadas no DES pelo cadastro normal: Marina (perfil privado), Caio (seguidor aceito da Marina) e Bia (não segue ninguém).')
tabela(['Cenário', 'O que foi medido', 'Resultado'], [
    ['C-01 (DES)', 'Bia, Caio e chamada sem token nas 7 rotas que expõem conteúdo da Marina (estante, resenhas, estatísticas, listas, lista, livros da lista e atividade)', '**7 de 7 negadas** para a Bia (6 × 403, 1 × 404, dentro dos códigos que o contrato declara), 0 conteúdo protegido no corpo; 7 de 7 com 200 para o Caio; 7 de 7 com 401 sem token'],
    ['C-02 (DES)', 'Livro pessoal alheio por ID direto, por via inválida e por via válida; mutações e IDOR', '**12 de 12 negadas**: 5 acessos sem via válida (403), 3 mutações de estante, favorito e leitura (403), 4 IDOR em leitura, progresso e lista (404). Via válida: 200. Busca pelo título exato do livro pessoal: 0 resultados. Dados do dono inalterados'],
    ['C-03 (DES)', 'Busca por título, autor e ISBN reais com 1, 5 e 10 clientes, teto de 10 req/s, acervo de 11.011 livros', 'p95 = 322 ms (1 cliente), 359 ms (5) e **296 ms (10)**; 0 erros em 1.316 requisições. Complemento sequencial: estante 618 ms, feed 873 ms, estante de outro perfil 304 ms no p95'],
    ['C-04 (DES)', 'Primeira chamada a cada serviço depois de período sem tráfego, em duas rodadas; login na web; mesma escrita repetida com a mesma Idempotency-Key', 'NestJS: acervo 52,5 e 47,9 s, leitura 57,6 e 66,8 s. **Spring: social 167,5 e 179,4 s; identidade sem resposta em 180 s e depois 176,9 s.** Timeout dos clientes: 90 s, sem retentativa em timeout. Web: aviso de servidor iniciando em 0,9 s e estante em 6 s, mas provavelmente sem hibernação real. Escrita repetida: **mesmo progresso e 1 registro**. Fila offline do app: coberta por testes automatizados; medição no app não executada'],
    ['C-05 (local)', 'ping.teste do identidade (Spring) ao acervo (NestJS), no lugar de uma notificação; eventId duplicado, schema inválido, falha transitória, broker parado', 'Mesmo correlationId na outbox, no AMQP e no log (o recibo se liga pelo eventId); duplicata com 1 recibo e 1 efeito; schema inválido direto para a DLQ; retentativas a **1.006, 5.005 e 15.002 ms** e depois DLQ; com o broker parado, a escrita respondeu 201 em 64 ms e o evento foi publicado ~10 s depois da volta'],
    ['C-06 (DES e repositório)', 'Spec em runtime × YAML; análise estática de acoplamento', '**117 de 117** operações presentes no runtime; 0 tabela crua de outro schema; 0 import entre serviços. Divergências: 34 operationId; em 111 operações o runtime omite os códigos de erro; em 4, o código de sucesso difere'],
], [1500, 3200, 4660])

h1('5. Inventário Analítico Rastreável (Saídas do ATAM)')
texto('Achados mapeados a partir do cruzamento dos cenários com a topologia e com as medições.')
h2('Riscos Identificados (R)')
item(P_RISCO, 'R-01: Cold start dos serviços Spring acima do timeout dos clientes', [
    'Cenários afetados: C-04 | Componente crítico: serviços identidade e social no Render free; clientes web e móvel',
    'Descrição técnica: a JVM com Spring Boot no plano gratuito levou cerca de três minutos para responder: de 167,5 a 179,4 s em duas rodadas, e numa delas o serviço identidade não respondeu em 180 s. O RNF-ERR-09 prevê de 30 a 60 s, e os clientes esperam 90 s e não repetem a chamada depois de timeout. O primeiro acesso do dia, que costuma ser o login, termina em erro depois de 90 s, e o leitor precisa tentar de novo. O aviso de servidor iniciando cobre a espera, mas não a falha.'])
item(P_RISCO, 'R-02: Mecanismos transversais implementados duas vezes', [
    'Cenários afetados: C-01, C-02, C-06 | Componente crítico: os quatro serviços',
    'Descrição técnica: erro padronizado, correlation-id, rate limiting, idempotência e controle de acesso são implementados em cada stack, Spring e NestJS, sem biblioteca comum. Mesmo entre os dois serviços Spring há cópia: o rate limiting, a idempotência, o escritor de erro e a configuração de segurança do serviço social foram portados, de forma declarada, das classes do serviço identidade. Uma correção de segurança feita num serviço pode não chegar aos outros.'])
item(P_RISCO, 'R-03: A retentativa no consumidor atrasa a fila', [
    'Cenários afetados: C-05 | Componente crítico: consumidores RabbitMQ (prefetch = 1)',
    'Descrição técnica: a espera de 1 + 5 + 15 s acontece dentro do consumidor. Por cerca de 21 s, as mensagens seguintes daquela fila esperam. Uma rajada de falhas transitórias atrasa o feed e as notificações.'])
item(P_RISCO, 'R-04: DLQ sem reprocessamento automático', [
    'Cenários afetados: C-05 | Componente crítico: DLQs por fila',
    'Descrição técnica: a mensagem que chega à DLQ só volta por ação manual. Sem alarme, um evento de feed ou de exclusão de conta pode ficar parado sem que ninguém perceba.'])
item(P_RISCO, 'R-05: Spec em runtime menos completo que o contrato', [
    'Cenários afetados: C-06 | Componente crítico: contratos OpenAPI',
    'Descrição técnica: o runtime não declara as respostas de erro e diverge em 4 códigos de sucesso. Um consumidor que gere cliente a partir do runtime terá um contrato mais pobre, e uma divergência real de código de sucesso pode passar despercebida.'])
item(P_RISCO, 'R-06: Limites do plano gratuito (Neon e Render)', [
    'Cenários afetados: C-03, C-04 | Componente crítico: Neon (0,25 a 2 CU, tempo ativo mensal) e Render free (hibernação após ~15 min)',
    'Descrição técnica: a própria medição consumiu +764 s de tempo ativo do Neon. Um uso real maior pode esgotar a cota mensal.'])

h2('Pontos de Não-Risco (NR)')
item(P_NAORISCO, 'NR-01: Autorização no servidor em toda rota de perfil e de livro pessoal', [
    'Cenários afetados: C-01, C-02',
    'Descrição técnica: a relação de seguidor e a propriedade são validadas no serviço que guarda o dado, e o livro pessoal só abre por uma referência válida, revalidada na página. 26 de 26 tentativas negadas, sem vazamento e sem alteração no dono.'])
item(P_NAORISCO, 'NR-02: Busca indexada com folga', [
    'Cenários afetados: C-03',
    'Descrição técnica: com índices normalizados de título, autor e ISBN e serviços sem estado, o p95 ficou em 296 ms com 10 clientes, dos quais cerca de 250 ms correspondem à latência de rede até o cliente. Banco e serviços estão na mesma região, o que reduz a latência entre eles a poucos milissegundos.'])
item(P_NAORISCO, 'NR-03: A escrita síncrona independe do broker', [
    'Cenários afetados: C-05',
    'Descrição técnica: a outbox transacional grava o evento junto com a operação. Com o broker parado, o "seguir" foi confirmado em 64 ms, e o evento foi publicado sozinho depois da volta.'])
item(P_NAORISCO, 'NR-04: Consumo idempotente', [
    'Cenários afetados: C-05, C-04',
    'Descrição técnica: o recibo do eventId é gravado na mesma transação do efeito, e a entrega duplicada é confirmada sem segundo efeito. No lado síncrono, a chave de idempotência por intenção cumpre o mesmo papel para o reenvio da fila offline.'])
item(P_NAORISCO, 'NR-05: Isolamento entre serviços no banco único', [
    'Cenários afetados: C-06',
    'Descrição técnica: nenhuma leitura de tabela crua de outro schema e nenhum import entre serviços. A leitura cruzada usa só as VIEWs versionadas. As VIEWs do serviço identidade têm teste de contrato no CI, e os JSON Schemas copiados são conferidos contra o canônico.'])

h2('Tradeoffs Técnicos (T)')
item(P_TRADEOFF, 'T-01: Duas stacks vs. custo de manutenção', [
    'Cenários afetados: C-06, C-01',
    'Descrição técnica: Spring e NestJS demonstram interoperabilidade real e aproveitam o que cada parte da equipe domina, ao custo de implementar os mecanismos transversais duas vezes (R-02). A escolha foi manter as duas stacks e conter o custo com contratos e testes de contrato.'])
item(P_TRADEOFF, 'T-02: Banco único com schemas vs. isolamento físico', [
    'Cenários afetados: C-06, C-03',
    'Descrição técnica: um único PostgreSQL cabe no teto do plano gratuito e permite as junções da recomendação, ao custo de acoplamento físico. A regra "só VIEW entre schemas" recupera o isolamento lógico, e o C-06 confirmou que ela é seguida.'])
item(P_TRADEOFF, 'T-03: Retentativa no consumidor vs. simplicidade da topologia', [
    'Cenários afetados: C-05',
    'Descrição técnica: retentar dentro do consumidor dispensa filas de espera com TTL ou plugin de atraso no broker, ao custo de segurar a fila durante a espera (R-03).'])
item(P_TRADEOFF, 'T-04: Outbox vs. latência de publicação', [
    'Cenários afetados: C-05',
    'Descrição técnica: a outbox garante a consistência entre operação e evento e tira o broker do caminho síncrono, ao custo de o evento sair pelo dispatcher, com atraso (o ping foi publicado 0,9 s depois de gravado).'])
item(P_TRADEOFF, 'T-05: Plano gratuito vs. disponibilidade', [
    'Cenários afetados: C-04, C-03',
    'Descrição técnica: Render, Neon e CloudAMQP gratuitos zeram o custo do projeto acadêmico, ao custo da hibernação e dos limites de recurso (R-01, R-06).'])

h2('Pontos de Sensibilidade (S)')
for titulo, cen, desc in [
    ('S-01: Timeout dos clientes vs. tempo de cold start', 'C-04', 'o valor de 90 s por tentativa, sem retentativa em timeout, decide se o primeiro acesso a um serviço Spring hibernado vira carregamento longo ou erro. Uma variação de segundos no tempo de subida da JVM muda o resultado do C-04.'),
    ('S-02: Região do banco em relação aos serviços', 'C-03', 'com o banco em outra região, cada consulta ganha a ida e volta entre regiões; a mudança do banco para Oregon, em 25/09, tirou cerca de 170 ms por consulta. Hipótese não medida: o feed, que já está em 873 ms no p95 e faz várias consultas, seria o primeiro a passar de 1 s.'),
    ('S-03: Revalidação do seguimento em cada rota de listagem', 'C-01, C-02', 'a privacidade do C-01 depende de cada endpoint novo de listagem chamar a validação de seguidor. Uma rota esquecida vaza o conteúdo do perfil privado.'),
    ('S-04: Chave de idempotência da intenção, não da tentativa', 'C-04', 'se o app gerar uma chave nova a cada reenvio da fila offline, o servidor passa a gravar registros duplicados de progresso.'),
    ('S-05: Prefetch e esperas do consumidor', 'C-05', 'o atraso da fila sob falha (R-03) cresce com o prefetch e com a soma das esperas (1 + 5 + 15 s). Mudar qualquer um desses valores muda o comportamento do C-05.'),
]:
    item(P_SENS, titulo, ['Cenários afetados: ' + cen, 'Descrição técnica: ' + desc])

h1('6. Plano de Ação e Recomendações Técnicas')
texto('Sugestões de evolução para neutralizar os riscos apontados na seção 5, em ordem de prioridade.')
par(P_ACAO, '**Ação de Curto Prazo (Mitigação Crítica), R-01:** aquecer os serviços identidade e social antes do uso esperado, com um GET /health agendado no GitHub Actions a cada 10 a 14 min nos horários de uso, e aumentar para 240 s o timeout da primeira chamada no login e no cadastro (as duas rodadas chegaram perto de 180 s), mantendo o aviso de servidor iniciando, ou repetir uma vez automaticamente depois do timeout quando a chamada for idempotente. Medir de novo o C-04 com os serviços de fato hibernados.')
par(P_ACAO, '**Ação de Curto Prazo, R-04:** alarme de mensagens na DLQ na CloudAMQP e roteiro de reprocessamento manual por serviço.')
par(P_ACAO, '**Ação de Curto Prazo, R-05:** conferir as 4 diferenças de código de sucesso contra a resposta real e corrigir o lado errado (anotação ou contrato).')
par(P_ACAO, '**Ação de Curto Prazo, C-04:** executar em DES a medição do app offline (modo avião, registros e reenvio), prevista no roteiro da avaliação.')
par(P_ACAO, '**Ação de Médio/Longo Prazo, R-01 e R-06:** plano pago com instância sempre ativa para os serviços Spring, ou imagem nativa (GraalVM) para reduzir o tempo de subida.')
par(P_ACAO, '**Ação de Médio/Longo Prazo, R-03:** trocar a retentativa no consumidor por filas de espera com TTL e dead-letter de volta para a fila principal, liberando o consumidor durante a espera.')
par(P_ACAO, '**Ação de Médio/Longo Prazo, R-02:** testes de contrato comuns às duas stacks para os mecanismos transversais (formato do erro, correlation-id, rate limiting e 401/403/404), rodando contra os quatro serviços no CI.')
par(P_ACAO, '**Ação de Médio/Longo Prazo, R-05:** gerar o contrato a partir do código, ou validar no CI que o spec em runtime e o contrato coincidem nos códigos de status.')
texto('')
h2('6.1. Avaliação final')
tabela(['Atributo', 'Cenários', 'Resultado', 'O que fica de risco'], [
    ['Segurança', 'C-01, C-02', '**Atende**', 'S-03: toda rota nova de listagem precisa validar o seguimento'],
    ['Desempenho', 'C-03', '**Atende**', 'Feed a 873 ms no p95 em leitura sequencial, o mais perto do limite'],
    ['Disponibilidade e resiliência', 'C-04', '**Atende parcialmente**', 'R-01 (cold start Spring de ~3 min); app offline verificado só por teste automatizado'],
    ['Resiliência assíncrona', 'C-05', '**Atende com ressalva**', 'A fila espera ~21 s atrás de uma mensagem com falha transitória (R-03); R-04'],
    ['Manutenibilidade e interoperabilidade', 'C-06', '**Atende com ressalva**', 'R-02 e R-05'],
], [2400, 1300, 1900, 3760])
texto('A arquitetura cumpre, no sistema em execução, os direcionadores de privacidade, desempenho, consistência assíncrona e isolamento entre serviços. O ponto fraco é a combinação dos serviços Spring com o plano gratuito do Render, que ultrapassa o tempo de espera que os clientes toleram. É uma limitação de infraestrutura com mitigação barata, não uma falha da decomposição.')
texto('**Limites desta avaliação:** as medições são da v0.2.1, sem as features do Período 3 (suspensão de conta, assuntos no livro pessoal, recomendação algorítmica e lembretes); a carga do C-03 foi leve de propósito, porque o DES é compartilhado, e não estabelece a capacidade máxima.')
texto('**Evidências:** os dados brutos de cada medição (horários em UTC, sem token, senha ou e-mail real) estão no repositório do projeto em docs/evidencias/atam/, e os scripts que os geraram em code/scripts/atam/. A versão em Markdown deste relatório é docs/8.avaliacao_arquitetura.md.')

# Assinaturas: os 5 integrantes, numa página própria
inicio = copy.deepcopy(P_VAZIO_C)
ppr = inicio.find(W('w:pPr'))
ppr.insert(0, ppr.makeelement(W('w:pageBreakBefore'), {}))
body.insert(len(body) - 1, inicio)
par(P_ASSIN_NOME, 'Os integrantes da equipe declaram que conduziram esta avaliação e concordam com o seu conteúdo.')
for nome in ['Vicenzo Fonseca de Mello Souza', 'Renato Douglas Nascimento Silva de Oliveira',
             'Henrique Moreira Gomes de Carvalho', 'Kayke Emanoel de Souza Santos',
             'Ana Luiza de Freitas Rodrigues']:
    for _ in range(2):
        body.insert(len(body) - 1, copy.deepcopy(P_VAZIO_C))
    body.insert(len(body) - 1, copy.deepcopy(P_ASSIN_LINHA))
    par(P_ASSIN_NOME, nome.upper())
    par(P_ASSIN_PAPEL, 'EQUIPE LÊ AI — ARQUITETURA E AVALIAÇÃO')

d.save(SAIDA)
restos = [p.text for p in d.paragraphs if re.search(r'\[[A-Z][^\]]*\]', p.text)]
print('placeholders restantes:', restos)

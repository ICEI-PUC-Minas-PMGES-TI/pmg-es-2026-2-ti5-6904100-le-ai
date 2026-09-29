# F-SESSAO — Sessão de leitura cronometrada (mobile)

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** mobile (+ reuso do endpoint de progresso de `leitura`)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4 (RF-PRG-05..12), RN-16, RN-17, §10.9. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §5.3. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **sessão de leitura cronometrada com modo de foco** — a segunda forma de registrar progresso, com o tempo **medido pelo aplicativo** em vez de informado. Continua [F-PRG](../periodo-1/feature-F-PRG.md) (que fixou a entrada de página e adiou a sessão para cá) e é **exclusiva do mobile** (RN-16 é inaplicável a uma aba de navegador — §10.9). Fecha os requisitos **Desejáveis**:

- **RF-PRG-05** iniciar uma sessão cronometrada a partir de uma leitura em andamento;
- **RF-PRG-06** operar em **modo de foco** durante a sessão, bloqueando o acesso às demais áreas (não configurável nem contornável — RN-16.3/4);
- **RF-PRG-07** ao encerrar, informar a página; o sistema **registra a atualização de progresso** com o tempo cronometrado (RN-17);
- **RF-PRG-08** **cancelar** a sessão sem registro;
- **RF-PRG-09** **recuperar** sessão interrompida por fechamento/falha/desligamento (RN-16.9);
- **RF-PRG-10** ver o tempo transcorrido;
- **RF-PRG-11** **pausar** (5, 10 ou 15 min) e retomar (RN-16.14);
- **RF-PRG-12** encerrar automaticamente a sessão cuja pausa se esgote, preservando o tempo medido (RN-16.18/19).

RNF atendidos: **RNF-ERR-05** (fila offline para o registro resultante), **RNF-ERR-04** (idempotência do registro), **RNF-USA-04** (confirmação ao cancelar/descartar), **RNF-TST-04** (testes de estado/recuperação no mobile). O tempo de sessão **não é verificável pelo servidor** (RN-16.7, §10.9) — aceito por ser individual (desafios/estatísticas pessoais).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não aplicável | sem infra própria; reusa progresso de `leitura` |
| Backend | não aplicável | nenhum endpoint novo — só o registro final reusa `POST /leituras/{id}/progresso` de [F-PRG](../periodo-1/feature-F-PRG.md) |
| Web | não aplicável | **fora do escopo web** — RN-16 inaplicável a aba de navegador (§10.9) |
| Mobile | não iniciado | máquina de estados da sessão, modo de foco, cronômetro, pausa e recuperação |

## Especificação

### App Flutter (`code/mobile`) — a feature vive aqui

A sessão é **estado exclusivamente local do dispositivo** (RN-16.7/9/10): **iniciar e cancelar não geram chamada ao servidor**; a **única escrita remota** do fluxo é a atualização de progresso resultante do encerramento. Usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); alvo de demonstração Android.

- **Iniciar (RF-PRG-05, RN-16.1/2):** a partir de uma leitura em **Lendo** ou **Relendo** ([F-EST](../periodo-1/feature-F-EST.md)); **uma sessão ativa por dispositivo** — iniciar outra exige encerrar/cancelar a anterior.
- **Modo de foco (RF-PRG-06, RN-16.3/4/20):** enquanto ativa, a navegação fica **restrita à tela da sessão** (estante, busca, feed, perfil, notificações e recomendações indisponíveis). **Não** é opcional nem tem ajuste. As únicas saídas são encerrar informando a página (RF-PRG-07) ou cancelar (RF-PRG-08). O modo de foco **permanece durante a pausa** (RN-16.20). Coerente com o design: modo de foco = **zero motion** ([P0-DS](../periodo-0/feature-P0-DS.md) §7).
- **Cronômetro e recuperação (RF-PRG-09/10, RN-16.9):** o estado local é o par `tempo acumulado` + `instante de início do trecho corrente`; o cronômetro exibido é `tempo acumulado + (agora − início do trecho)` — **não** um contador em memória. Assim o app **restaura** o estado ao reabrir, tenha sido fechado pelo usuário, encerrado pelo SO ou desligado com o aparelho. Sair do app **não encerra** a sessão; ao reabrir com sessão ativa, o app **retorna direto à tela da sessão**, em modo de foco (RN-16.5). Estado local se perde só em reinstalação/troca de aparelho (aceito — RN-16.10).
- **Encerrar (RF-PRG-07, RN-16.6/7):** o leitor informa a página; o app envia página, tempo medido e os metadados automáticos `registradoEmDispositivo`/`fusoHorarioDispositivo` do contrato de [F-PRG](../periodo-1/feature-F-PRG.md), com `Idempotency-Key`. A sessão local só é apagada depois que o pedido for confirmado ou persistido duravelmente na fila offline FIFO. Página igual à atual encerra sem registro e descarta o tempo (RN-16.7). Registro confirmado zera a inatividade.
- **Cancelar (RF-PRG-08, RN-16.8):** descarta o tempo medido, sem atualização de progresso (confirmação — RNF-USA-04).
- **Pausa (RF-PRG-11/12, RN-16.14–19):** pausar escolhendo **5, 10 ou 15 min**; o cronômetro de leitura **para** e um cronômetro de pausa inicia. O tempo em pausa **não conta** como leitura. Retomar reinicia a contagem, acumulando. **Sem limite de pausas.** Se a pausa **esgota sem retomada**, a sessão é **encerrada automaticamente** preservando o tempo medido (o da pausa não soma) e fica **pendente de confirmação de página** na reabertura (RN-16.19), no mesmo fluxo da sessão expirada.
- **Duração máxima (RN-16.11):** **12 h de tempo cronometrado** (fora o tempo em pausa), verificada na reabertura; sessão que exceda é apresentada como **expirada**, cabendo informar a página ou descartar; o tempo registrado é limitado a 12 h.
- **Alimenta desafios em minutos** (RN-16.13) — o tempo medido entra igual ao informado manualmente ([F-DSF](feature-F-DSF.md)).

### Backend / API — `leitura`

- **Nenhum endpoint novo.** O único ponto remoto é o **registro de progresso** de [F-PRG](../periodo-1/feature-F-PRG.md); esta feature apenas o alimenta com o tempo medido, usando o mesmo payload e sem distinguir origem.

## Critérios de aceite

- [ ] Iniciar exige leitura em Lendo/Relendo; **uma sessão ativa por dispositivo** (RN-16.1/2).
- [ ] O **modo de foco** bloqueia toda a navegação e não tem ajuste; permanece na pausa (RF-PRG-06, RN-16.3/4/20).
- [ ] O cronômetro é derivado de `tempo acumulado + início do trecho` e o app **recupera** a sessão ao reabrir após fechamento/falha/desligamento (RF-PRG-09, RN-16.9).
- [ ] Encerrar informando página registra progresso com o **tempo medido** (RN-17); página = atual encerra **sem** registro (RN-16.7); o registro **zera a inatividade** (RN-16.12).
- [ ] Cancelar descarta o tempo, com confirmação (RF-PRG-08, RNF-USA-04).
- [ ] Pausa de 5/10/15 para o cronômetro; pausa esgotada **encerra automaticamente** preservando o tempo e pede a página na reabertura (RF-PRG-11/12, RN-16.18/19).
- [ ] Sessão acima de **12 h** de tempo cronometrado é apresentada como **expirada**, limitada a 12 h (RN-16.11).
- [ ] O registro resultante entra na **fila offline** e não duplica (RNF-ERR-04/05).
- [ ] Falha entre encerrar e enviar não perde a sessão: o estado só é limpo após confirmação ou enfileiramento local durável, preservando instante/fuso.
- [ ] O fluxo completo funciona no app (alvo Android) **em DES** (o registro chega a `leitura`).

## Definition of Done

(plano §10)

- [ ] Código (mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes automatizados: máquina de estados, recuperação, modo de foco, cronômetro, 12 h, instante/fuso e falha antes/depois do enfileiramento offline (RNF-TST-04)
- [ ] `docs/api/leitura.yaml` revisado; nenhuma alteração esperada porque a feature reusa sem mudanças `POST /leituras/{id}/progresso` de [F-PRG](../periodo-1/feature-F-PRG.md)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — o registro de progresso chega ao serviço
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** o modo de foco é a decisão de produto central desta feature (§10.9) — registrar as consequências aceitas (não consultar estante/resenha durante a sessão; bloqueio vale **dentro** do app).

## Pendências

- **Telas (design P2):** prompts escritos em 27/09/2026 e protótipos exportados em 28/09/2026: [`modo-de-foco.md`](../../design/periodo-2/F-SESSAO/modo-de-foco.md) ([protótipo](../../design/periodo-2/F-SESSAO/prototipos/modo-de-foco.html)) e [`encerrar-sessao.md`](../../design/periodo-2/F-SESSAO/encerrar-sessao.md) ([protótipo](../../design/periodo-2/F-SESSAO/prototipos/encerrar-sessao.html); inclui a sessão pendente por pausa esgotada e a expirada). A entrada `Iniciar sessão de leitura` fica nas edições consolidadas de `docs/design/periodo-2/acoes-de-leitura/` e `docs/design/periodo-2/registrar-progresso/` (lotes futuros). Decisões do prompt a ratificar pelo dono: `Retomar leitura` como primário na pausa (o §4.10 fixa `Encerrar sessão`), cronômetro correndo com o sheet de encerrar aberto, página pendente exibida na hora quando a pausa esgota com o app aberto e bloqueando o app até salvar ou descartar, e arredondamento de segundos para minutos (incluindo sessão com menos de 1 minuto).
- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (endpoint de progresso, fila offline, regras de RN-17) e [F-EST](../periodo-1/feature-F-EST.md) (leitura em Lendo/Relendo), [P0-DS](../periodo-0/feature-P0-DS.md) (tokens; modo de foco = zero motion), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- Biblioteca de persistência local do estado da sessão (mobile) a fixar no arranque.
- Stack de `leitura` definida: **NestJS** (arquitetura §2.1) — irrelevante para o cliente, relevante só para o campo opcional acima.

## Timeline

### Criação 28/08/2026: arquivo criado a partir do escopo de F-SESSAO no [periodo-2/README.md](README.md), de RF-PRG-05..12 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4, da RN-16 e da decisão §10.9. Sessão fixada como estado local do dispositivo (só o progresso final é remoto, reusando F-PRG); web fora de escopo; nenhum endpoint novo.

### Revisão 29/08/2026: encerramento foi alinhado ao payload atual de F-PRG e passou a limpar a sessão somente após confirmação ou enfileiramento local durável. Nenhum endpoint ou infraestrutura adicional foi criado.

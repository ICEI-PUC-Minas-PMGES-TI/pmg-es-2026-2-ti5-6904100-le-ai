-- Modelo completo do schema `social`.
-- Identificadores de outros servicos sao referencias logicas e, por contrato,
-- nao recebem FK fisica entre schemas.

CREATE TABLE "atividade" (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id               uuid        NOT NULL,
  tipo                   text        NOT NULL,
  livro_id               uuid        NOT NULL,
  event_id               uuid        NOT NULL,
  chave_fato             text        NOT NULL,
  origem_tipo            text        NOT NULL,
  origem_id              uuid        NOT NULL,
  snap_usuario_nome      text        NOT NULL,
  snap_usuario_username  text        NOT NULL,
  snap_usuario_avatar    text,
  snap_livro_titulo      text        NOT NULL,
  snap_livro_autor       text        NOT NULL,
  snap_livro_capa        text,
  ativo                  boolean     NOT NULL DEFAULT true,
  criado_em              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT atividade_tipo_valido CHECK (tipo IN (
    'leitura_iniciada', 'leitura_retomada', 'leitura_concluida',
    'leitura_abandonada', 'resenha_publicada'
  )),
  CONSTRAINT atividade_origem_tipo_valido CHECK (origem_tipo IN ('leitura', 'resenha')),
  CONSTRAINT atividade_tipo_origem_coerente CHECK (
    (tipo = 'resenha_publicada' AND origem_tipo = 'resenha') OR
    (tipo <> 'resenha_publicada' AND origem_tipo = 'leitura')
  ),
  CONSTRAINT atividade_chave_fato_preenchida CHECK (btrim(chave_fato) <> ''),
  CONSTRAINT atividade_snap_usuario_nome_preenchido CHECK (btrim(snap_usuario_nome) <> ''),
  CONSTRAINT atividade_snap_usuario_username_preenchido CHECK (btrim(snap_usuario_username) <> ''),
  CONSTRAINT atividade_snap_livro_titulo_preenchido CHECK (btrim(snap_livro_titulo) <> ''),
  CONSTRAINT atividade_snap_livro_autor_preenchido CHECK (btrim(snap_livro_autor) <> ''),
  CONSTRAINT atividade_event_id_unico UNIQUE (event_id),
  CONSTRAINT atividade_fato_unico UNIQUE (tipo, chave_fato)
);

CREATE INDEX atividade_feed_autor_idx
  ON "atividade" (autor_id, criado_em DESC, id) WHERE ativo;
CREATE INDEX atividade_livro_ativo_idx
  ON "atividade" (livro_id, autor_id) WHERE ativo;

CREATE TABLE "curtida_atividade" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id  uuid        NOT NULL,
  usuario_id    uuid        NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT curtida_atividade_atividade_fk
    FOREIGN KEY (atividade_id) REFERENCES "atividade" (id) ON DELETE CASCADE,
  CONSTRAINT curtida_atividade_usuario_unico UNIQUE (atividade_id, usuario_id)
);

CREATE INDEX curtida_atividade_usuario_idx
  ON "curtida_atividade" (usuario_id, criado_em DESC);

CREATE TABLE "comentario" (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id           uuid        NOT NULL,
  autor_id               uuid        NOT NULL,
  comentario_raiz_id     uuid,
  respondido_usuario_id  uuid,
  texto                  text        NOT NULL,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  atualizado_em          timestamptz,

  CONSTRAINT comentario_texto_preenchido CHECK (btrim(texto) <> ''),
  CONSTRAINT comentario_raiz_nao_autorreferente CHECK (comentario_raiz_id IS NULL OR comentario_raiz_id <> id),
  CONSTRAINT comentario_atualizacao_valida CHECK (atualizado_em IS NULL OR atualizado_em >= criado_em),
  CONSTRAINT comentario_id_atividade_unico UNIQUE (id, atividade_id),
  CONSTRAINT comentario_atividade_fk
    FOREIGN KEY (atividade_id) REFERENCES "atividade" (id) ON DELETE CASCADE,
  -- A composicao impede ligar uma resposta a comentario de outra atividade.
  CONSTRAINT comentario_raiz_mesma_atividade_fk
    FOREIGN KEY (comentario_raiz_id, atividade_id)
    REFERENCES "comentario" (id, atividade_id) ON DELETE CASCADE
);

CREATE INDEX comentario_atividade_criado_idx
  ON "comentario" (atividade_id, criado_em, id);
CREATE INDEX comentario_raiz_criado_idx
  ON "comentario" (comentario_raiz_id, criado_em, id) WHERE comentario_raiz_id IS NOT NULL;
CREATE INDEX comentario_autor_idx
  ON "comentario" (autor_id, criado_em DESC);

CREATE FUNCTION "validar_comentario_raiz"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.comentario_raiz_id IS DISTINCT FROM OLD.comentario_raiz_id THEN
    RAISE EXCEPTION 'a raiz de um comentario nao pode ser alterada'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.comentario_raiz_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "comentario" AS raiz
    WHERE raiz.id = NEW.comentario_raiz_id
      AND raiz.comentario_raiz_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'comentario_raiz_id deve apontar para um comentario raiz'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER comentario_raiz_valida_trigger
BEFORE INSERT OR UPDATE OF comentario_raiz_id ON "comentario"
FOR EACH ROW EXECUTE FUNCTION "validar_comentario_raiz"();

CREATE TABLE "comentario_mencao" (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id  uuid        NOT NULL,
  mencionado_id  uuid        NOT NULL,
  posicao         integer     NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT comentario_mencao_posicao_valida CHECK (posicao >= 0),
  CONSTRAINT comentario_mencao_comentario_fk
    FOREIGN KEY (comentario_id) REFERENCES "comentario" (id) ON DELETE CASCADE,
  CONSTRAINT comentario_mencao_posicao_unica UNIQUE (comentario_id, posicao)
);

CREATE INDEX comentario_mencao_mencionado_idx
  ON "comentario_mencao" (mencionado_id, criado_em DESC);

CREATE TABLE "lista" (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid        NOT NULL,
  titulo         text        NOT NULL,
  descricao      text,
  ativo          boolean     NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lista_titulo_preenchido CHECK (btrim(titulo) <> ''),
  CONSTRAINT lista_atualizacao_valida CHECK (atualizado_em >= criado_em)
);

CREATE INDEX lista_usuario_ativa_idx
  ON "lista" (usuario_id, criado_em DESC, id) WHERE ativo;

CREATE TABLE "lista_item" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id      uuid        NOT NULL,
  livro_id      uuid        NOT NULL,
  ordem         integer     NOT NULL,
  adicionado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lista_item_ordem_positiva CHECK (ordem > 0),
  CONSTRAINT lista_item_lista_fk
    FOREIGN KEY (lista_id) REFERENCES "lista" (id) ON DELETE CASCADE,
  CONSTRAINT lista_item_livro_unico UNIQUE (lista_id, livro_id),
  -- Adiavel para permitir trocar/reordenar posicoes dentro de uma transacao.
  CONSTRAINT lista_item_ordem_unica UNIQUE (lista_id, ordem)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX lista_item_livro_idx ON "lista_item" (livro_id, lista_id);

CREATE TABLE "recomendacao" (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id     uuid        NOT NULL,
  destinatario_id  uuid        NOT NULL,
  livro_id         uuid        NOT NULL,
  mensagem         text,
  event_id         uuid,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  expira_em        timestamptz NOT NULL DEFAULT (now() + interval '90 days'),

  CONSTRAINT recomendacao_destinatario_distinto CHECK (remetente_id <> destinatario_id),
  CONSTRAINT recomendacao_expiracao_valida CHECK (expira_em = criado_em + interval '90 days'),
  CONSTRAINT recomendacao_event_id_unico UNIQUE (event_id)
);

CREATE INDEX recomendacao_destinatario_expiracao_idx
  ON "recomendacao" (destinatario_id, expira_em, criado_em DESC);
CREATE INDEX recomendacao_par_ativo_idx
  ON "recomendacao" (remetente_id, destinatario_id, expira_em);
CREATE INDEX recomendacao_destinatario_livro_idx
  ON "recomendacao" (destinatario_id, livro_id);

CREATE TABLE "sugestao_descartada" (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid        NOT NULL,
  livro_id       uuid        NOT NULL,
  descartado_em  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sugestao_descartada_usuario_livro_unico UNIQUE (usuario_id, livro_id)
);

CREATE TABLE "notificacao" (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id  uuid        NOT NULL,
  tipo             text        NOT NULL,
  dados            jsonb       NOT NULL,
  leitura_ref      uuid,
  lida_em          timestamptz,
  event_id         uuid        NOT NULL,
  chave_negocio    text        NOT NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notificacao_tipo_valido CHECK (tipo IN (
    'novo_seguidor', 'solicitacao_seguir', 'solicitacao_aceita',
    'atividade_curtida', 'atividade_comentada', 'comentario_respondido',
    'usuario_mencionado', 'recomendacao_recebida', 'lembrete_sequencia',
    'resenha_curtida', 'leitura_em_risco', 'leitura_expirada'
  )),
  CONSTRAINT notificacao_dados_objeto CHECK (jsonb_typeof(dados) = 'object'),
  CONSTRAINT notificacao_chave_negocio_preenchida CHECK (btrim(chave_negocio) <> ''),
  CONSTRAINT notificacao_leitura_ref_coerente CHECK (
    (tipo IN ('leitura_em_risco', 'leitura_expirada') AND leitura_ref IS NOT NULL) OR
    (tipo NOT IN ('leitura_em_risco', 'leitura_expirada') AND leitura_ref IS NULL)
  ),
  CONSTRAINT notificacao_leitura_valida CHECK (lida_em IS NULL OR lida_em >= criado_em),
  CONSTRAINT notificacao_event_id_unico UNIQUE (event_id),
  CONSTRAINT notificacao_negocio_unico UNIQUE (destinatario_id, tipo, chave_negocio)
);

CREATE INDEX notificacao_destinatario_criado_idx
  ON "notificacao" (destinatario_id, criado_em DESC, id);
CREATE INDEX notificacao_nao_lida_idx
  ON "notificacao" (destinatario_id, criado_em DESC, id) WHERE lida_em IS NULL;

CREATE TABLE "preferencia_notificacao" (
  usuario_id  uuid    NOT NULL,
  tipo        text    NOT NULL,
  habilitada  boolean NOT NULL DEFAULT true,

  CONSTRAINT preferencia_notificacao_pk PRIMARY KEY (usuario_id, tipo),
  CONSTRAINT preferencia_notificacao_tipo_valido CHECK (tipo IN (
    'novo_seguidor', 'solicitacao_seguir', 'solicitacao_aceita',
    'atividade_curtida', 'atividade_comentada', 'comentario_respondido',
    'usuario_mencionado', 'recomendacao_recebida', 'lembrete_sequencia',
    'resenha_curtida', 'leitura_em_risco', 'leitura_expirada'
  ))
);

CREATE TABLE "dispositivo_push" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid        NOT NULL,
  fcm_token     text        NOT NULL,
  plataforma    text        NOT NULL,
  ativo         boolean     NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  revogado_em   timestamptz,

  CONSTRAINT dispositivo_push_token_preenchido CHECK (btrim(fcm_token) <> ''),
  CONSTRAINT dispositivo_push_plataforma_valida CHECK (plataforma IN ('android')),
  CONSTRAINT dispositivo_push_atualizacao_valida CHECK (atualizado_em >= criado_em),
  CONSTRAINT dispositivo_push_revogacao_valida CHECK (
    revogado_em IS NULL OR (NOT ativo AND revogado_em >= criado_em)
  ),
  CONSTRAINT dispositivo_push_fcm_token_unico UNIQUE (fcm_token)
);

CREATE INDEX dispositivo_push_usuario_ativo_idx
  ON "dispositivo_push" (usuario_id, id) WHERE ativo;

CREATE TABLE "denuncia" (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  denunciante_id  uuid        NOT NULL,
  alvo_tipo       text        NOT NULL,
  alvo_id         uuid        NOT NULL,
  motivo          text        NOT NULL,
  estado          text        NOT NULL DEFAULT 'pendente',
  criado_em       timestamptz NOT NULL DEFAULT now(),
  resolvido_em    timestamptz,

  CONSTRAINT denuncia_alvo_tipo_valido CHECK (alvo_tipo IN ('resenha', 'comentario')),
  CONSTRAINT denuncia_motivo_preenchido CHECK (btrim(motivo) <> ''),
  CONSTRAINT denuncia_estado_valido CHECK (estado IN ('pendente', 'removida', 'arquivada')),
  CONSTRAINT denuncia_resolucao_coerente CHECK (
    (estado = 'pendente' AND resolvido_em IS NULL) OR
    (estado IN ('removida', 'arquivada') AND resolvido_em IS NOT NULL AND resolvido_em >= criado_em)
  )
);

CREATE INDEX denuncia_pendente_idx
  ON "denuncia" (criado_em, id) WHERE estado = 'pendente';
CREATE INDEX denuncia_alvo_idx ON "denuncia" (alvo_tipo, alvo_id);
CREATE INDEX denuncia_denunciante_idx ON "denuncia" (denunciante_id, criado_em DESC);

CREATE TABLE "log_moderacao" (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin           text        NOT NULL,
  acao            text        NOT NULL,
  alvo_tipo       text        NOT NULL,
  alvo_id         uuid,
  denuncia_id     uuid,
  detalhe         text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  anonimizado_em  timestamptz,

  CONSTRAINT log_moderacao_admin_preenchido CHECK (btrim(admin) <> ''),
  CONSTRAINT log_moderacao_acao_valida CHECK (acao IN (
    'remover_conteudo', 'arquivar_denuncia', 'suspender_conta', 'reativar_conta'
  )),
  CONSTRAINT log_moderacao_alvo_tipo_valido CHECK (alvo_tipo IN (
    'resenha', 'comentario', 'frase', 'usuario'
  )),
  CONSTRAINT log_moderacao_anonimizacao_coerente CHECK (
    (anonimizado_em IS NULL AND alvo_id IS NOT NULL) OR
    (anonimizado_em IS NOT NULL AND anonimizado_em >= criado_em
      AND alvo_id IS NULL AND denuncia_id IS NULL AND detalhe IS NULL)
  ),
  CONSTRAINT log_moderacao_denuncia_fk
    FOREIGN KEY (denuncia_id) REFERENCES "denuncia" (id) ON DELETE SET NULL
);

CREATE INDEX log_moderacao_denuncia_idx
  ON "log_moderacao" (denuncia_id) WHERE denuncia_id IS NOT NULL;
CREATE INDEX log_moderacao_criado_idx ON "log_moderacao" (criado_em DESC, id);

CREATE TABLE "idempotencia_social" (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_ref     uuid,
  operacao        text        NOT NULL,
  chave           text,
  payload_hash    text,
  status_http     integer     NOT NULL,
  resposta        jsonb,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  replay_ate      timestamptz NOT NULL,
  anonimizado_em  timestamptz,

  CONSTRAINT idempotencia_social_operacao_preenchida CHECK (btrim(operacao) <> ''),
  CONSTRAINT idempotencia_social_status_http_valido CHECK (status_http BETWEEN 100 AND 599),
  CONSTRAINT idempotencia_social_replay_valido CHECK (replay_ate >= criado_em),
  CONSTRAINT idempotencia_social_anonimizacao_coerente CHECK (
    (anonimizado_em IS NULL AND subject_ref IS NOT NULL AND chave IS NOT NULL
      AND btrim(chave) <> '' AND payload_hash IS NOT NULL AND btrim(payload_hash) <> ''
      AND resposta IS NOT NULL) OR
    (anonimizado_em IS NOT NULL AND anonimizado_em >= criado_em
      AND subject_ref IS NULL AND chave IS NULL AND payload_hash IS NULL AND resposta IS NULL)
  )
);

CREATE UNIQUE INDEX idempotencia_social_chave_unica
  ON "idempotencia_social" (subject_ref, operacao, chave)
  WHERE subject_ref IS NOT NULL AND chave IS NOT NULL;
CREATE INDEX idempotencia_social_replay_idx
  ON "idempotencia_social" (replay_ate) WHERE anonimizado_em IS NULL;

CREATE TABLE "outbox_social" (
  event_id         uuid        PRIMARY KEY,
  tipo             text        NOT NULL,
  versao           integer     NOT NULL,
  chave_negocio    text,
  correlation_id   uuid,
  payload          jsonb,
  status           text        NOT NULL DEFAULT 'pendente',
  tentativas       integer     NOT NULL DEFAULT 0,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  publicado_em     timestamptz,
  anonimizado_em   timestamptz,

  CONSTRAINT outbox_social_tipo_preenchido CHECK (btrim(tipo) <> ''),
  CONSTRAINT outbox_social_versao_positiva CHECK (versao > 0),
  CONSTRAINT outbox_social_status_valido CHECK (status IN ('pendente', 'publicado')),
  CONSTRAINT outbox_social_tentativas_validas CHECK (tentativas >= 0),
  CONSTRAINT outbox_social_publicacao_coerente CHECK (
    (status = 'pendente' AND publicado_em IS NULL) OR
    (status = 'publicado' AND publicado_em IS NOT NULL AND publicado_em >= criado_em)
  ),
  CONSTRAINT outbox_social_anonimizacao_coerente CHECK (
    (anonimizado_em IS NULL AND chave_negocio IS NOT NULL AND btrim(chave_negocio) <> ''
      AND correlation_id IS NOT NULL AND payload IS NOT NULL) OR
    (anonimizado_em IS NOT NULL AND anonimizado_em >= criado_em
      AND status = 'publicado' AND chave_negocio IS NULL
      AND correlation_id IS NULL AND payload IS NULL)
  )
);

CREATE INDEX outbox_social_pendente_idx
  ON "outbox_social" (criado_em, event_id) WHERE status = 'pendente';

-- Contratos de leitura para o servico `acervo`. A classificacao do livro como
-- pessoal continua pertencendo ao acervo; estas views expoem apenas as vias
-- sociais ativas e o dono que deve ser revalidado por aquele servico.
CREATE VIEW "v_atividade_livro_pessoal_v1" AS
SELECT
  atividade.id AS atividade_id,
  atividade.autor_id AS dono_id,
  atividade.livro_id
FROM "atividade"
WHERE atividade.ativo;

CREATE VIEW "v_lista_livro_pessoal_v1" AS
SELECT
  lista.id AS lista_id,
  lista.usuario_id AS dono_id,
  lista_item.livro_id
FROM "lista"
JOIN "lista_item" ON lista_item.lista_id = lista.id
WHERE lista.ativo;

COMMENT ON VIEW "v_atividade_livro_pessoal_v1" IS
  'Contrato v1: atividades ativas que autorizam consulta de livro pessoal pelo feed.';
COMMENT ON VIEW "v_lista_livro_pessoal_v1" IS
  'Contrato v1: itens de listas ativas que autorizam consulta de livro pessoal pela lista do dono.';

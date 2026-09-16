-- Schema completo do servico `identidade`, conforme o DER de 15/09/2026.
-- A extensao fica em `public` por ser compartilhada pelo cluster PostgreSQL; as
-- tabelas e views abaixo continuam no schema default do Flyway (`identidade`).
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- Os indices funcionais anteriores ja garantem que nao ha duplicatas ignorando
-- caixa. Eles precisam sair antes da conversao para constraints nativas de citext.
DROP INDEX usuario_email_unico;
DROP INDEX usuario_username_unico;

ALTER TABLE usuario
  ALTER COLUMN email TYPE public.citext USING email::public.citext,
  ALTER COLUMN username TYPE public.citext USING username::public.citext,
  ADD COLUMN biografia text,
  ADD COLUMN avatar_url text,
  ADD COLUMN avatar_asset_id text,
  ADD COLUMN privacidade text NOT NULL DEFAULT 'publico',
  ADD COLUMN suspenso boolean NOT NULL DEFAULT false,
  ADD COLUMN opt_out_recomendacao boolean NOT NULL DEFAULT false,
  ADD COLUMN qtd_seguidores integer NOT NULL DEFAULT 0,
  ADD COLUMN qtd_seguidos integer NOT NULL DEFAULT 0,
  ADD COLUMN exclusao_solicitada_em timestamptz,
  ADD COLUMN exclusao_prevista_em timestamptz,
  ADD COLUMN atualizado_em timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT usuario_email_unico UNIQUE (email),
  ADD CONSTRAINT usuario_username_unico UNIQUE (username),
  ADD CONSTRAINT usuario_email_tamanho_valido
    CHECK (length(email::text) BETWEEN 1 AND 254),
  ADD CONSTRAINT usuario_username_tamanho_valido
    CHECK (length(username::text) BETWEEN 1 AND 30),
  ADD CONSTRAINT usuario_privacidade_valida
    CHECK (privacidade IN ('publico', 'privado')),
  ADD CONSTRAINT usuario_qtd_seguidores_nao_negativa CHECK (qtd_seguidores >= 0),
  ADD CONSTRAINT usuario_qtd_seguidos_nao_negativa CHECK (qtd_seguidos >= 0),
  ADD CONSTRAINT usuario_exclusao_datas_coerentes CHECK (
    (exclusao_solicitada_em IS NULL AND exclusao_prevista_em IS NULL)
    OR
    (exclusao_solicitada_em IS NOT NULL
      AND exclusao_prevista_em = exclusao_solicitada_em + INTERVAL '30 days')
  );

CREATE TABLE refresh_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  token_hash text NOT NULL,
  revogado boolean NOT NULL DEFAULT false,
  expira_em timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT refresh_token_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT refresh_token_hash_unico UNIQUE (token_hash),
  CONSTRAINT refresh_token_expiracao_valida CHECK (expira_em > criado_em)
);

CREATE INDEX refresh_token_usuario_idx ON refresh_token (usuario_id);
CREATE INDEX refresh_token_expiracao_idx ON refresh_token (expira_em)
  WHERE revogado = false;

CREATE TABLE reset_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  token_hash text NOT NULL,
  consumido boolean NOT NULL DEFAULT false,
  expira_em timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reset_token_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT reset_token_hash_unico UNIQUE (token_hash),
  CONSTRAINT reset_token_expiracao_valida CHECK (
    expira_em > criado_em
    AND expira_em <= criado_em + INTERVAL '1 hour'
  )
);

CREATE INDEX reset_token_usuario_idx ON reset_token (usuario_id);
CREATE INDEX reset_token_expiracao_idx ON reset_token (expira_em)
  WHERE consumido = false;

CREATE TABLE seguidor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seguidor_id uuid NOT NULL,
  seguido_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT seguidor_seguidor_fk
    FOREIGN KEY (seguidor_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT seguidor_seguido_fk
    FOREIGN KEY (seguido_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT seguidor_par_unico UNIQUE (seguidor_id, seguido_id),
  CONSTRAINT seguidor_usuarios_distintos CHECK (seguidor_id <> seguido_id)
);

CREATE INDEX seguidor_seguido_idx ON seguidor (seguido_id, criado_em DESC);

CREATE TABLE solicitacao_seguir (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id uuid NOT NULL,
  alvo_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,

  CONSTRAINT solicitacao_seguir_solicitante_fk
    FOREIGN KEY (solicitante_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT solicitacao_seguir_alvo_fk
    FOREIGN KEY (alvo_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT solicitacao_seguir_usuarios_distintos
    CHECK (solicitante_id <> alvo_id),
  CONSTRAINT solicitacao_seguir_status_valido
    CHECK (status IN ('pendente', 'aceita', 'recusada')),
  CONSTRAINT solicitacao_seguir_resolucao_coerente CHECK (
    (status = 'pendente' AND resolvido_em IS NULL)
    OR
    (status IN ('aceita', 'recusada') AND resolvido_em IS NOT NULL)
  ),
  CONSTRAINT solicitacao_seguir_resolucao_posterior
    CHECK (resolvido_em IS NULL OR resolvido_em >= criado_em)
);

CREATE UNIQUE INDEX solicitacao_seguir_pendente_unica
  ON solicitacao_seguir (solicitante_id, alvo_id)
  WHERE status = 'pendente';
CREATE INDEX solicitacao_seguir_alvo_pendente_idx
  ON solicitacao_seguir (alvo_id, criado_em DESC)
  WHERE status = 'pendente';

CREATE TABLE tentativa_login (
  identidade public.citext PRIMARY KEY,
  falhas integer NOT NULL DEFAULT 0,
  bloqueado_ate timestamptz,
  ultima_tentativa timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tentativa_login_identidade_nao_vazia
    CHECK (length(trim(identidade::text)) > 0),
  CONSTRAINT tentativa_login_falhas_nao_negativas CHECK (falhas >= 0)
);

CREATE INDEX tentativa_login_bloqueio_idx ON tentativa_login (bloqueado_ate)
  WHERE bloqueado_ate IS NOT NULL;

-- Recibo tecnico sem FK: usuario_ref deve poder ser limpo na anonimizacao sem
-- apagar o registro que comprova o processamento da exclusao.
CREATE TABLE exclusao_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_ref uuid,
  chave_idempotencia text,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  prevista_em timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  cancelada_em timestamptz,
  concluida_em timestamptz,
  replay_ate timestamptz NOT NULL,
  anonimizado_em timestamptz,

  CONSTRAINT exclusao_conta_idempotencia_unica
    UNIQUE (usuario_ref, chave_idempotencia),
  CONSTRAINT exclusao_conta_status_valido
    CHECK (status IN ('pendente', 'cancelada', 'concluida')),
  CONSTRAINT exclusao_conta_previsao_valida
    CHECK (prevista_em = criado_em + INTERVAL '30 days'),
  CONSTRAINT exclusao_conta_replay_valido CHECK (replay_ate >= criado_em),
  CONSTRAINT exclusao_conta_estado_coerente CHECK (
    (status = 'pendente' AND cancelada_em IS NULL AND concluida_em IS NULL)
    OR
    (status = 'cancelada' AND cancelada_em IS NOT NULL AND concluida_em IS NULL)
    OR
    (status = 'concluida' AND cancelada_em IS NULL AND concluida_em IS NOT NULL)
  ),
  CONSTRAINT exclusao_conta_datas_estado_validas CHECK (
    (cancelada_em IS NULL OR cancelada_em >= criado_em)
    AND (concluida_em IS NULL OR concluida_em >= prevista_em)
  ),
  CONSTRAINT exclusao_conta_anonimizacao_completa CHECK (
    (anonimizado_em IS NULL
      AND usuario_ref IS NOT NULL
      AND chave_idempotencia IS NOT NULL)
    OR
    (anonimizado_em IS NOT NULL
      AND status = 'concluida'
      AND usuario_ref IS NULL
      AND chave_idempotencia IS NULL
      AND anonimizado_em >= concluida_em)
  )
);

CREATE INDEX exclusao_conta_processamento_idx
  ON exclusao_conta (prevista_em)
  WHERE status = 'pendente';
CREATE INDEX exclusao_conta_usuario_idx ON exclusao_conta (usuario_ref)
  WHERE usuario_ref IS NOT NULL;

CREATE TABLE idempotencia_identidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_ref uuid,
  operacao text NOT NULL,
  chave text,
  payload_hash text,
  status_http integer NOT NULL,
  resposta jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  replay_ate timestamptz NOT NULL,
  anonimizado_em timestamptz,

  CONSTRAINT idempotencia_identidade_chave_unica
    UNIQUE (subject_ref, operacao, chave),
  CONSTRAINT idempotencia_identidade_operacao_nao_vazia
    CHECK (length(trim(operacao)) > 0),
  CONSTRAINT idempotencia_identidade_status_http_valido
    CHECK (status_http BETWEEN 100 AND 599),
  CONSTRAINT idempotencia_identidade_replay_valido
    CHECK (replay_ate >= criado_em),
  CONSTRAINT idempotencia_identidade_anonimizacao_completa CHECK (
    (anonimizado_em IS NULL
      AND subject_ref IS NOT NULL
      AND chave IS NOT NULL
      AND payload_hash IS NOT NULL
      AND resposta IS NOT NULL)
    OR
    (anonimizado_em IS NOT NULL
      AND subject_ref IS NULL
      AND chave IS NULL
      AND payload_hash IS NULL
      AND resposta IS NULL
      AND anonimizado_em >= criado_em)
  )
);

CREATE INDEX idempotencia_identidade_replay_idx
  ON idempotencia_identidade (replay_ate)
  WHERE anonimizado_em IS NULL;

CREATE TABLE outbox_identidade (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  versao integer NOT NULL,
  chave_negocio text,
  correlation_id uuid,
  payload jsonb,
  status text NOT NULL DEFAULT 'pendente',
  tentativas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  publicado_em timestamptz,
  anonimizado_em timestamptz,

  CONSTRAINT outbox_identidade_tipo_nao_vazio CHECK (length(trim(tipo)) > 0),
  CONSTRAINT outbox_identidade_versao_positiva CHECK (versao > 0),
  CONSTRAINT outbox_identidade_status_valido
    CHECK (status IN ('pendente', 'publicado')),
  CONSTRAINT outbox_identidade_tentativas_nao_negativas CHECK (tentativas >= 0),
  CONSTRAINT outbox_identidade_publicacao_coerente CHECK (
    (status = 'pendente' AND publicado_em IS NULL)
    OR
    (status = 'publicado' AND publicado_em IS NOT NULL)
  ),
  CONSTRAINT outbox_identidade_publicacao_posterior
    CHECK (publicado_em IS NULL OR publicado_em >= criado_em),
  CONSTRAINT outbox_identidade_payload_presente
    CHECK (payload IS NOT NULL OR anonimizado_em IS NOT NULL),
  CONSTRAINT outbox_identidade_anonimizacao_completa CHECK (
    (anonimizado_em IS NULL
      AND chave_negocio IS NOT NULL
      AND correlation_id IS NOT NULL)
    OR
    (anonimizado_em IS NOT NULL
      AND status = 'publicado'
      AND chave_negocio IS NULL
      AND correlation_id IS NULL
      AND payload IS NULL
      AND anonimizado_em >= publicado_em)
  )
);

CREATE INDEX outbox_identidade_publicacao_idx
  ON outbox_identidade (criado_em)
  WHERE status = 'pendente';

-- Contratos publicos entre schemas. Contas suspensas ou dentro da janela de
-- exclusao ficam invisiveis; cancelar a exclusao ou reativar restaura as linhas.
CREATE VIEW v_perfil_referencia_v1 AS
SELECT
  id,
  username,
  nome_exibicao,
  avatar_url,
  privacidade,
  opt_out_recomendacao
FROM usuario
WHERE suspenso = false
  AND exclusao_solicitada_em IS NULL;

CREATE VIEW v_seguimento_aceito_v1 AS
SELECT
  s.seguidor_id,
  s.seguido_id
FROM seguidor s
JOIN usuario u_seguidor ON u_seguidor.id = s.seguidor_id
JOIN usuario u_seguido ON u_seguido.id = s.seguido_id
WHERE u_seguidor.suspenso = false
  AND u_seguidor.exclusao_solicitada_em IS NULL
  AND u_seguido.suspenso = false
  AND u_seguido.exclusao_solicitada_em IS NULL;

COMMENT ON VIEW v_perfil_referencia_v1 IS
  'Contrato v1 de identidade publica; omite contas suspensas ou em exclusao pendente.';
COMMENT ON VIEW v_seguimento_aceito_v1 IS
  'Contrato v1 de seguimentos aceitos; omite pares com conta suspensa ou em exclusao pendente.';

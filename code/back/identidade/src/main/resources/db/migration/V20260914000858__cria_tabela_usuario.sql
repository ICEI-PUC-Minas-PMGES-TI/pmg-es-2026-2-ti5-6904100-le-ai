-- Tabela `usuario` do serviço `identidade` (P0-NAV, requisitos RF-AUT-01/02/03).
-- Primeira tabela de domínio do serviço; a migration anterior só criou o schema.
-- Escopo deliberadamente mínimo: é o esqueleto de autenticação. Perfil, privacidade,
-- avatar e seguidores chegam com F-PERFIL; recuperação de senha e refresh token com F-AUT.

CREATE TABLE "usuario" (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Guardados como o leitor digitou, para exibição. A unicidade é garantida pelos
  -- índices funcionais abaixo, que ignoram caixa: `Marina@x.com` e `marina@x.com`
  -- são a mesma conta, e `MarinaBLeu` não convive com `marinableu`.
  email           varchar(254) NOT NULL,
  username        varchar(30)  NOT NULL,

  nome_exibicao   varchar(60)  NOT NULL,
  data_nascimento date         NOT NULL,

  -- Hash bcrypt com sal embutido (RNF-SEC-09). Nunca a senha em claro.
  -- Bcrypt ocupa 60 caracteres; a folga existe para trocar de algoritmo sem migration.
  senha_hash      varchar(255) NOT NULL,

  criado_em       timestamptz  NOT NULL DEFAULT now(),

  -- Recusa de menores de 18 anos (RNF-SEC-43) é validada no servidor, mas a data
  -- precisa ser sempre passada: sem isto, um relógio errado grava nascimento futuro.
  CONSTRAINT usuario_data_nascimento_passada CHECK (data_nascimento < CURRENT_DATE)
);

-- Unicidade sem depender da extensão `citext`, que exigiria privilégio de CREATE EXTENSION
-- no Neon. O índice funcional resolve o mesmo problema e é o que devolve o 409 do cadastro.
CREATE UNIQUE INDEX usuario_email_unico    ON "usuario" (lower(email));
CREATE UNIQUE INDEX usuario_username_unico ON "usuario" (lower(username));

COMMENT ON TABLE  "usuario"                 IS 'Conta de leitor. RF-AUT-01.';
COMMENT ON COLUMN "usuario".email           IS 'E-mail de login. Unico ignorando caixa.';
COMMENT ON COLUMN "usuario".username        IS 'Identificador publico. Unico ignorando caixa. RF-SOC-03 busca por ele.';
COMMENT ON COLUMN "usuario".data_nascimento IS 'Usada para recusar menores de 18 anos no cadastro. RNF-SEC-43.';
COMMENT ON COLUMN "usuario".senha_hash      IS 'Hash bcrypt. RNF-SEC-09.';

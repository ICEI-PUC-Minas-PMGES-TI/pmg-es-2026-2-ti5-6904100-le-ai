-- F-MOD-OPC (Renato, 06/11/2026) — identidade de cada comando de suspensão e reativação.
-- Henrique: migration no schema do `identidade`, escrita pelo dono da F-MOD-OPC com nota datada
-- em code/back/identidade/AGENTS.md. Motivo: revisão do PR #61. O `social` manda um id por
-- intenção do administrador (`X-Comando-Id`); sem guardar esse id aqui, uma suspensão aplicada
-- cuja resposta se perdeu (timeout) era executada de novo quando reenviada, mesmo depois de uma
-- reativação, e a auditoria do episódio original não tinha como ser concluída.
--   * `aplicado`: o comando rodou; a linha guarda o estado que ele devolveu, e a repetição do
--     mesmo id devolve esse estado sem executar de novo.
--   * `cancelado`: o `social` pediu a resolução de um comando que nunca chegou a rodar (antes de
--     uma ação nova sobre a mesma conta). Se ele chegar depois, é recusado (409).
-- As duas escritas travam antes a linha da conta (`SELECT ... FOR UPDATE`), então o comando
-- atrasado e a resolução nunca se cruzam. A linha sai com a conta (ON DELETE CASCADE).

CREATE TABLE comando_de_conta (
  id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL,
  acao text,
  estado text NOT NULL,
  suspenso boolean,
  suspenso_em timestamptz,
  reativado_em timestamptz,
  alterado boolean,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comando_de_conta_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT comando_de_conta_estado_valido CHECK (estado IN ('aplicado', 'cancelado')),
  CONSTRAINT comando_de_conta_acao_valida CHECK (acao IN ('suspensao', 'reativacao')),
  CONSTRAINT comando_de_conta_aplicado_completo CHECK (
    estado <> 'aplicado' OR (acao IS NOT NULL AND suspenso IS NOT NULL AND alterado IS NOT NULL)
  )
);

CREATE INDEX comando_de_conta_usuario_idx ON comando_de_conta (usuario_id);

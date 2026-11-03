-- identidade.usuario.username e citext: o snapshot dos eventos de interacao lia a coluna como
-- PGobject e gravava {"null":false,"type":"citext","value":"<username>"} em autorAcao.username.
-- O schema exige string, entao essas linhas ficavam pendentes para sempre. Aqui o objeto vira o
-- texto que ele carrega e a linha fica elegivel para a proxima rodada do dispatcher.
UPDATE outbox_social
   SET payload = jsonb_set(payload, '{autorAcao,username}', payload -> 'autorAcao' -> 'username' -> 'value'),
       proxima_tentativa_em = NULL
 WHERE status = 'pendente'
   AND jsonb_typeof(payload -> 'autorAcao' -> 'username') = 'object';

-- F-LST: teto de titulo e descricao das listas, decidido pelo dono da feature em 30/09/2026
-- (80 e 300 caracteres, os mesmos dos prototipos). A API valida antes; o CHECK garante o limite
-- para qualquer escrita. Nenhum codigo gravava em lista ate aqui, entao as linhas existentes
-- (se houver) nao violam o limite.
ALTER TABLE "lista"
  ADD CONSTRAINT lista_titulo_tamanho CHECK (char_length(titulo) <= 80),
  ADD CONSTRAINT lista_descricao_tamanho CHECK (descricao IS NULL OR char_length(descricao) <= 300);

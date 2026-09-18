import { ValidationError } from '@nestjs/common';
import { CampoInvalido, ErroDeValidacao } from './erros-de-negocio';

/**
 * Converte o resultado do `ValidationPipe` no corpo `ErroValidacao` do contrato
 * (`docs/api/acervo.yaml`): `{ codigo, mensagem, correlationId, campos[] }`.
 *
 * Sem isto o `ValidationPipe` devolve o corpo padrão do Nest — `{ statusCode,
 * message[], error }` — que não é o corpo de erro padronizado de RNF-ERR-01 e
 * não tem `campos`. Um cliente que só sabe ler `{ codigo, mensagem }` perderia
 * a informação de qual campo falhou.
 */
export function montarErroDeValidacao(
  erros: ValidationError[],
): ErroDeValidacao {
  return new ErroDeValidacao(achatar(erros));
}

function achatar(erros: ValidationError[], prefixo = ''): CampoInvalido[] {
  const campos: CampoInvalido[] = [];

  for (const erro of erros) {
    const caminho = prefixo ? `${prefixo}.${erro.property}` : erro.property;

    for (const mensagem of Object.values(erro.constraints ?? {})) {
      campos.push({ campo: caminho, mensagem });
    }

    if (erro.children?.length) {
      campos.push(...achatar(erro.children, caminho));
    }
  }

  return campos;
}

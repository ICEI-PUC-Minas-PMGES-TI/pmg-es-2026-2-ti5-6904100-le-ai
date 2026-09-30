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

    for (const [restricao, mensagem] of Object.entries(
      erro.constraints ?? {},
    )) {
      campos.push({
        campo: caminho,
        // O `forbidNonWhitelisted` não aceita mensagem própria e responderia
        // "property x should not exist", em inglês.
        mensagem:
          restricao === 'whitelistValidation'
            ? 'Este campo não é aceito.'
            : mensagem,
      });
    }

    if (erro.children?.length) {
      campos.push(...achatar(erro.children, caminho));
    }
  }

  return campos;
}

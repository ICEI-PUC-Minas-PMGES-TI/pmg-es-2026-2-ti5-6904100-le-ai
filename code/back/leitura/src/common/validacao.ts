import { ValidationError } from '@nestjs/common';
import { CampoInvalido, ErroDeValidacao } from './erros-de-negocio';

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

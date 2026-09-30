import { ValidationError } from '@nestjs/common';
import { montarErroDeValidacao } from './validacao';

function erro(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
) {
  return { property, constraints, children } as ValidationError;
}

describe('montarErroDeValidacao', () => {
  it('devolve o corpo de erro padrão com os campos rejeitados', () => {
    const resultado = montarErroDeValidacao([
      erro('texto', { isString: 'Informe o texto da resenha.' }),
    ]);

    expect(resultado.getStatus()).toBe(400);
    expect(resultado.codigo).toBe('REQUISICAO_INVALIDA');
    expect(resultado.extras).toEqual({
      campos: [{ campo: 'texto', mensagem: 'Informe o texto da resenha.' }],
    });
  });

  it('achata propriedades aninhadas com caminho pontuado', () => {
    const resultado = montarErroDeValidacao([
      erro('capa', {}, [erro('url', { isUrl: 'Informe uma URL válida.' })]),
    ]);

    expect(resultado.extras).toEqual({
      campos: [{ campo: 'capa.url', mensagem: 'Informe uma URL válida.' }],
    });
  });

  it('lista todas as restrições violadas de um mesmo campo', () => {
    const resultado = montarErroDeValidacao([
      erro('titulo', {
        isString: 'Informe o título.',
        maxLength: 'Máximo de 500.',
      }),
    ]);

    expect((resultado.extras.campos as unknown[]).length).toBe(2);
  });
});

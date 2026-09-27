import type { PipeTransform } from '@nestjs/common';

/**
 * UUID de caminho em minúsculas, depois do `ParseUUIDPipe`, que aceita maiúsculas. Sem isto,
 * o mesmo livro sairia com outro `livroId` na resposta e outra chave de negócio nos eventos.
 */
export class MinusculasPipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    return valor.toLowerCase();
  }
}

export const emMinusculas = new MinusculasPipe();

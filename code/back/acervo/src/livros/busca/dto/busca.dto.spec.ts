import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BuscaLivrosQueryDto } from './busca.dto';

/** Mesmo caminho do `ValidationPipe` global: transforma e depois valida. */
function validar(query: Record<string, unknown>) {
  const dto = plainToInstance(BuscaLivrosQueryDto, query);
  const erros = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, campos: erros.map((erro) => erro.property) };
}

describe('BuscaLivrosQueryDto', () => {
  it('apara o q antes de validar', () => {
    const { dto, campos } = validar({ q: '  machado  ' });
    expect(campos).toEqual([]);
    expect(dto.q).toBe('machado');
  });

  it('recusa q só com espaços no campo q', () => {
    expect(validar({ q: '   ' }).campos).toEqual(['q']);
  });

  it('recusa q com mais de 200 caracteres', () => {
    expect(validar({ q: 'a'.repeat(201) }).campos).toEqual(['q']);
  });

  it('converte page e limit da query string', () => {
    const { dto, campos } = validar({ q: 'a', page: '3', limit: '50' });
    expect(campos).toEqual([]);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it.each([
    [{ limit: '51' }, 'limit'],
    [{ limit: '0' }, 'limit'],
    [{ page: '0' }, 'page'],
    [{ page: 'dois' }, 'page'],
    [{ assunto: 'romance' }, 'assunto'],
  ])('recusa %j', (extra, campo) => {
    expect(validar({ q: 'a', ...extra }).campos).toEqual([campo]);
  });

  it('recusa parâmetro fora do contrato', () => {
    expect(validar({ q: 'a', ordem: 'titulo' }).campos).toEqual(['ordem']);
  });
});

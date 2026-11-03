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

  it('apara os filtros de texto e converte os numéricos', () => {
    const { dto, campos } = validar({
      autor: '  evaristo ',
      editora: 'pallas\u0000',
      serie: ' harry ',
      ano: '2019',
      paginasMin: '100',
      paginasMax: '150',
    });
    expect(campos).toEqual([]);
    expect(dto).toMatchObject({
      autor: 'evaristo',
      editora: 'pallas',
      serie: 'harry',
      ano: 2019,
      paginasMin: 100,
      paginasMax: 150,
    });
  });

  it.each([
    [{ autor: '   ' }, 'autor'],
    [{ editora: 'a'.repeat(201) }, 'editora'],
    [{ serie: '' }, 'serie'],
    [{ ano: '0' }, 'ano'],
    [{ ano: '10000' }, 'ano'],
    [{ ano: '2019.5' }, 'ano'],
    [{ paginasMin: '0' }, 'paginasMin'],
    [{ paginasMax: '100001' }, 'paginasMax'],
    [{ paginasMax: 'cem' }, 'paginasMax'],
  ])('recusa o filtro %j', (filtro, campo) => {
    expect(validar(filtro).campos).toEqual([campo]);
  });

  it('dá as mensagens dos filtros em pt-BR, com o gênero certo', () => {
    const dto = plainToInstance(BuscaLivrosQueryDto, { editora: ' ' });
    const [erro] = validateSync(dto);
    expect(Object.values(erro.constraints ?? {})).toContain(
      'Informe uma editora para filtrar.',
    );
  });

  it('recusa parâmetro fora do contrato', () => {
    expect(validar({ q: 'a', ordem: 'titulo' }).campos).toEqual(['ordem']);
  });
});

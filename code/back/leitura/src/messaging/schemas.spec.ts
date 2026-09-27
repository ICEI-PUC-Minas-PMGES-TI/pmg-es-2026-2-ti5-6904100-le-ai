import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RUNTIME = join(__dirname, 'schemas');
const CANONICO = join(__dirname, '../../../../../docs/mensageria/schemas');

describe('schemas runtime de mensageria', () => {
  const arquivos = readdirSync(RUNTIME).filter((nome) =>
    nome.endsWith('.json'),
  );

  it('existe ao menos o envelope', () => {
    expect(arquivos).toContain('envelope-v1.schema.json');
  });

  it.each(arquivos)('%s é idêntico ao canônico', (arquivo) => {
    const runtime = JSON.parse(
      readFileSync(join(RUNTIME, arquivo), 'utf8'),
    ) as unknown;
    const canonico = JSON.parse(
      readFileSync(join(CANONICO, arquivo), 'utf8'),
    ) as unknown;
    expect(runtime).toEqual(canonico);
  });
});

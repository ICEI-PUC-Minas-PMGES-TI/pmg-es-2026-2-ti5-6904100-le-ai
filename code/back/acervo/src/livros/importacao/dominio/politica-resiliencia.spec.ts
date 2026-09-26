import { FonteIndisponivel } from './fonte-metadados';
import { PoliticaDeResiliencia } from './politica-resiliencia';

function politica(extra: Record<string, unknown> = {}) {
  const esperas: number[] = [];
  let agora = 0;

  const instancia = new PoliticaDeResiliencia({
    esperasMs: [1_000, 5_000, 15_000],
    agora: () => agora,
    esperar: async (ms) => {
      esperas.push(ms);
      agora += ms;
    },
    ...extra,
  });

  return { instancia, esperas, avancar: (ms: number) => (agora += ms) };
}

describe('PoliticaDeResiliencia', () => {
  it('devolve o resultado na primeira tentativa bem-sucedida', async () => {
    const { instancia, esperas } = politica();
    await expect(instancia.executar('x', async () => 'ok')).resolves.toBe('ok');
    expect(esperas).toEqual([]);
  });

  // 1/5/15 s: os mesmos intervalos do retry de mensagem de P0-MSG, para o
  // serviço não ter duas políticas de espera para a mesma classe de problema.
  it('retenta com backoff de 1, 5 e 15 segundos', async () => {
    const { instancia, esperas } = politica();
    const operacao = jest
      .fn()
      .mockRejectedValue(new FonteIndisponivel('x', 'fora do ar'));

    await expect(instancia.executar('x', operacao)).rejects.toBeInstanceOf(
      FonteIndisponivel,
    );
    expect(esperas).toEqual([1_000, 5_000, 15_000]);
    expect(operacao).toHaveBeenCalledTimes(4);
  });

  it('para de retentar assim que uma tentativa passa', async () => {
    const { instancia, esperas } = politica();
    const operacao = jest
      .fn()
      .mockRejectedValueOnce(new FonteIndisponivel('x', 'instável'))
      .mockResolvedValueOnce('ok');

    await expect(instancia.executar('x', operacao)).resolves.toBe('ok');
    expect(esperas).toEqual([1_000]);
  });

  // Erro que não é indisponibilidade não se resolve com espera: retentar só
  // atrasaria a resposta ao leitor.
  it('não retenta erro que não é de indisponibilidade', async () => {
    const { instancia, esperas } = politica();
    const operacao = jest.fn().mockRejectedValue(new TypeError('bug'));

    await expect(instancia.executar('x', operacao)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(operacao).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it('abre o circuito após as falhas consecutivas configuradas', async () => {
    const { instancia } = politica({ falhasParaAbrir: 2 });
    const falhar = () =>
      Promise.reject(new FonteIndisponivel('x', 'fora do ar'));

    await expect(instancia.executar('x', falhar)).rejects.toThrow();
    expect(instancia.circuitoAberto).toBe(false);
    await expect(instancia.executar('x', falhar)).rejects.toThrow();
    expect(instancia.circuitoAberto).toBe(true);
  });

  // Com o circuito aberto a chamada falha na hora, sem gastar o timeout inteiro
  // em cada tentativa contra uma fonte que já se sabe fora do ar.
  it('com o circuito aberto falha sem chamar a fonte', async () => {
    const { instancia } = politica({ falhasParaAbrir: 1 });
    await expect(
      instancia.executar('x', () =>
        Promise.reject(new FonteIndisponivel('x', 'fora')),
      ),
    ).rejects.toThrow();

    const operacao = jest.fn();
    await expect(instancia.executar('x', operacao)).rejects.toThrow(
      /circuito aberto/,
    );
    expect(operacao).not.toHaveBeenCalled();
  });

  it('fecha o circuito depois da janela de abertura', async () => {
    const { instancia, avancar } = politica({
      falhasParaAbrir: 1,
      aberturaMs: 30_000,
    });
    await expect(
      instancia.executar('x', () =>
        Promise.reject(new FonteIndisponivel('x', 'fora')),
      ),
    ).rejects.toThrow();

    avancar(30_001);
    await expect(instancia.executar('x', async () => 'ok')).resolves.toBe('ok');
  });

  it('sucesso zera as falhas consecutivas', async () => {
    const { instancia } = politica({ falhasParaAbrir: 2 });
    await expect(
      instancia.executar('x', () =>
        Promise.reject(new FonteIndisponivel('x', 'fora')),
      ),
    ).rejects.toThrow();
    await instancia.executar('x', async () => 'ok');
    await expect(
      instancia.executar('x', () =>
        Promise.reject(new FonteIndisponivel('x', 'fora')),
      ),
    ).rejects.toThrow();

    expect(instancia.circuitoAberto).toBe(false);
  });
});

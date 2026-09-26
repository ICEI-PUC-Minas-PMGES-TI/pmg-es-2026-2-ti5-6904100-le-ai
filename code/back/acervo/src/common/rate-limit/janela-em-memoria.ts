/**
 * Contador de janela fixa em memória.
 *
 * Em memória de propósito, e pelo mesmo motivo que o `RateLimitFilter` do
 * serviço `identidade` registrou: o plano gratuito do Render roda **uma**
 * instância, então um mapa local conta certo. Com mais de uma instância a
 * contagem passa a ser por instância e o limite efetivo multiplica — a decisão
 * entre Redis e banco fica para quando houver escala que a justifique.
 *
 * O relógio é injetável para os testes não dependerem de timer real.
 */
export class JanelaEmMemoria {
  private readonly contagens = new Map<
    string,
    { total: number; expiraEm: number }
  >();
  private acessosDesdeALimpeza = 0;

  constructor(
    private readonly agora: () => number = () => Date.now(),
    private readonly limpezaACada = 500,
  ) {}

  /**
   * Registra um acesso e devolve quantos segundos faltam para liberar, ou
   * `null` quando ainda está dentro do limite.
   */
  registrar(
    chave: string,
    limite: number,
    janelaSegundos: number,
  ): number | null {
    const agora = this.agora();
    this.limparSeNecessario(agora);

    const atual = this.contagens.get(chave);
    if (!atual || atual.expiraEm <= agora) {
      this.contagens.set(chave, {
        total: 1,
        expiraEm: agora + janelaSegundos * 1000,
      });
      return null;
    }

    atual.total += 1;
    if (atual.total > limite) {
      return Math.max(1, Math.ceil((atual.expiraEm - agora) / 1000));
    }
    return null;
  }

  /**
   * Limpeza preguiçosa: um `setInterval` seguraria o processo aberto e faria o
   * Jest não encerrar sozinho.
   */
  private limparSeNecessario(agora: number): void {
    this.acessosDesdeALimpeza += 1;
    if (this.acessosDesdeALimpeza < this.limpezaACada) {
      return;
    }
    this.acessosDesdeALimpeza = 0;
    for (const [chave, valor] of this.contagens) {
      if (valor.expiraEm <= agora) {
        this.contagens.delete(chave);
      }
    }
  }
}

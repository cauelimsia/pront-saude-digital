import type { OddsProvider } from "./contract";

/**
 * Registry simples de provedores. Novos adaptadores (ex.: REST autorizado)
 * são registrados aqui e passam a ser ingeridos pelo worker sem mudanças
 * no pipeline.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, OddsProvider>();

  register(provider: OddsProvider): void {
    if (this.providers.has(provider.providerId)) {
      throw new Error(`Provedor duplicado: ${provider.providerId}`);
    }
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): OddsProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provedor não registrado: ${providerId}`);
    }
    return provider;
  }

  list(): OddsProvider[] {
    return [...this.providers.values()];
  }
}

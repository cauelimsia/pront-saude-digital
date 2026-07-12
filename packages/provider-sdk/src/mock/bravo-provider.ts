import type {
  CompetitionQuery,
  EventQuery,
  OddsProvider,
  OddsQuery,
  ProviderCompetition,
  ProviderEvent,
  ProviderHealth,
  ProviderOddsPayload,
  ProviderSport,
} from "../contract";
import {
  BRAVO_PROVIDER_ID,
  bravoCompetitions,
  bravoSports,
  buildBravoEvents,
  buildBravoOddsEntries,
} from "./bravo-fixtures";

export interface MockOddsProviderBravoOptions {
  clock?: () => Date;
}

/**
 * Segundo provedor mockado determinístico. As variações de nomenclatura,
 * horário e ordem dos participantes vivem NAS FIXTURES do adaptador —
 * o matching não contém nenhum caso especial para este provedor.
 */
export class MockOddsProviderBravo implements OddsProvider {
  readonly providerId = BRAVO_PROVIDER_ID;
  private readonly clock: () => Date;

  constructor(options: MockOddsProviderBravoOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  async getSports(): Promise<ProviderSport[]> {
    return structuredClone(bravoSports);
  }

  async getCompetitions(params?: CompetitionQuery): Promise<ProviderCompetition[]> {
    const all = structuredClone(bravoCompetitions);
    if (!params?.sportKey) return all;
    const sport = bravoSports.find((s) => s.key === params.sportKey);
    return all.filter((c) => c.sportExternalId === sport?.externalId);
  }

  async getEvents(params?: EventQuery): Promise<ProviderEvent[]> {
    let events = buildBravoEvents(this.clock());
    if (params?.fromDate) events = events.filter((e) => e.startsAt >= params.fromDate!);
    if (params?.toDate) events = events.filter((e) => e.startsAt <= params.toDate!);
    return events;
  }

  async getOdds(params?: OddsQuery): Promise<ProviderOddsPayload> {
    const now = this.clock();
    let entries = buildBravoOddsEntries(now);
    if (params?.eventExternalIds?.length) {
      const wanted = new Set(params.eventExternalIds);
      entries = entries.filter((e) => wanted.has(e.eventExternalId));
    }
    return {
      providerId: this.providerId,
      generatedAt: now,
      sports: structuredClone(bravoSports),
      competitions: structuredClone(bravoCompetitions),
      events: buildBravoEvents(now),
      odds: entries,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.providerId,
      healthy: true,
      latencyMs: 2,
      checkedAt: this.clock(),
      message: "mock provider bravo sempre disponível",
    };
  }
}

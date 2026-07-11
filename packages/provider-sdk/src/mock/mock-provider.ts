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
  buildMockEvents,
  buildMockOddsEntries,
  MOCK_PROVIDER_ID,
  mockCompetitions,
  mockSports,
} from "./fixtures";

export interface MockOddsProviderOptions {
  /** Relógio injetável para testes determinísticos. */
  clock?: () => Date;
  /**
   * Quando true, aplica um jitter determinístico de até ±1% nas odds,
   * derivado do número do ciclo (mesmo ciclo ⇒ mesmas odds). A surebet
   * de tênis (margem ~3,7%) sobrevive a ±1% por construção.
   */
  variability?: boolean;
}

/** PRNG determinístico (mulberry32) — jitter reprodutível por ciclo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockOddsProvider implements OddsProvider {
  readonly providerId = MOCK_PROVIDER_ID;
  private readonly clock: () => Date;
  private readonly variability: boolean;

  constructor(options: MockOddsProviderOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.variability = options.variability ?? false;
  }

  async getSports(): Promise<ProviderSport[]> {
    return structuredClone(mockSports);
  }

  async getCompetitions(params?: CompetitionQuery): Promise<ProviderCompetition[]> {
    const all = structuredClone(mockCompetitions);
    if (!params?.sportKey) return all;
    const sport = mockSports.find((s) => s.key === params.sportKey);
    return all.filter((c) => c.sportExternalId === sport?.externalId);
  }

  async getEvents(params?: EventQuery): Promise<ProviderEvent[]> {
    let events = buildMockEvents(this.clock());
    if (params?.fromDate) {
      events = events.filter((e) => e.startsAt >= params.fromDate!);
    }
    if (params?.toDate) {
      events = events.filter((e) => e.startsAt <= params.toDate!);
    }
    return events;
  }

  async getOdds(params?: OddsQuery): Promise<ProviderOddsPayload> {
    const now = this.clock();
    let entries = buildMockOddsEntries(now);

    if (params?.eventExternalIds?.length) {
      const wanted = new Set(params.eventExternalIds);
      entries = entries.filter((e) => wanted.has(e.eventExternalId));
    }

    if (this.variability) {
      const rand = mulberry32((params?.cycle ?? 0) + 1);
      entries = entries.map((entry) => ({
        ...entry,
        outcomes: entry.outcomes.map((o) => {
          const jitter = 1 + (rand() * 2 - 1) * 0.01; // ±1%
          const jittered = (Number(o.odd) * jitter).toFixed(2);
          // Nunca deixar a odd cair para ≤ 1.
          return { ...o, odd: Number(jittered) <= 1 ? "1.01" : jittered };
        }),
      }));
    }

    return {
      providerId: this.providerId,
      generatedAt: now,
      sports: structuredClone(mockSports),
      competitions: structuredClone(mockCompetitions),
      events: buildMockEvents(now),
      odds: entries,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.providerId,
      healthy: true,
      latencyMs: 1,
      checkedAt: this.clock(),
      message: "mock provider sempre disponível",
    };
  }
}

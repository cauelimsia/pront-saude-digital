import { z } from "zod";
import { MARKET_PERIODS, MARKET_TYPES, OUTCOMES } from "@rataria/shared";

/**
 * Contrato neutro de provedor de odds. Adaptadores concretos (mock, REST)
 * implementam esta interface; a ingestão valida cada payload com os schemas
 * Zod abaixo antes de qualquer processamento.
 *
 * Adaptadores NÃO contêm lógica de arbitragem.
 */

export const providerSportSchema = z.object({
  externalId: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
});

export const providerCompetitionSchema = z.object({
  externalId: z.string().min(1),
  sportExternalId: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  country: z.string().nullable(),
});

export const providerEventSchema = z.object({
  externalId: z.string().min(1),
  competitionExternalId: z.string().min(1),
  homeName: z.string().min(1),
  awayName: z.string().min(1),
  startsAt: z.coerce.date(),
  status: z.enum(["SCHEDULED", "LIVE", "SUSPENDED", "FINISHED", "CANCELLED"]),
});

export const providerOddsEntrySchema = z.object({
  eventExternalId: z.string().min(1),
  bookmakerKey: z.string().min(1),
  bookmakerName: z.string().min(1),
  marketType: z.nativeEnum(MARKET_TYPES),
  period: z.nativeEnum(MARKET_PERIODS),
  /** Linha do mercado (ex.: 2.5 para totais); null quando não se aplica. */
  line: z.string().nullable(),
  marketStatus: z.enum(["OPEN", "SUSPENDED"]),
  outcomes: z
    .array(
      z.object({
        outcome: z.nativeEnum(OUTCOMES),
        /** Odd decimal serializada como string para preservar precisão. */
        odd: z.string().regex(/^\d+(\.\d+)?$/),
      }),
    )
    .min(1),
  /** Timestamp informado pelo provedor para estas odds. */
  providerTimestamp: z.coerce.date(),
});

export const providerOddsPayloadSchema = z.object({
  providerId: z.string().min(1),
  generatedAt: z.coerce.date(),
  events: z.array(providerEventSchema),
  competitions: z.array(providerCompetitionSchema),
  sports: z.array(providerSportSchema),
  odds: z.array(providerOddsEntrySchema),
});

export type ProviderSport = z.infer<typeof providerSportSchema>;
export type ProviderCompetition = z.infer<typeof providerCompetitionSchema>;
export type ProviderEvent = z.infer<typeof providerEventSchema>;
export type ProviderOddsEntry = z.infer<typeof providerOddsEntrySchema>;
export type ProviderOddsPayload = z.infer<typeof providerOddsPayloadSchema>;

export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  latencyMs: number;
  checkedAt: Date;
  message?: string;
}

export interface CompetitionQuery {
  sportKey?: string;
}

export interface EventQuery {
  sportKey?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface OddsQuery {
  eventExternalIds?: string[];
  /** Número do ciclo de coleta — permite variação determinística no mock. */
  cycle?: number;
}

export interface OddsProvider {
  readonly providerId: string;
  getSports(): Promise<ProviderSport[]>;
  getCompetitions(params?: CompetitionQuery): Promise<ProviderCompetition[]>;
  getEvents(params?: EventQuery): Promise<ProviderEvent[]>;
  getOdds(params?: OddsQuery): Promise<ProviderOddsPayload>;
  healthCheck(): Promise<ProviderHealth>;
}

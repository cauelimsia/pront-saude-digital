import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DEFAULT_MATCHING_CONFIG } from "./config";
import { normalizeText } from "./text";
import { generateCandidates, matchAgainstCandidates, scoreMatch } from "./match";
import type {
  ApprovedAlias,
  MatchableCanonicalEvent,
  MatchableProviderEvent,
} from "./types";

const BASE_TIME = new Date("2026-07-12T18:00:00.000Z");

function providerEvent(overrides: Partial<MatchableProviderEvent> = {}): MatchableProviderEvent {
  const home = overrides.homeNameOriginal ?? "Flamengo RJ";
  const away = overrides.awayNameOriginal ?? "Palmeiras SP";
  const comp = overrides.competitionNameOriginal ?? "Campeonato Brasileiro Série A";
  return {
    providerKey: "mock-bravo",
    externalId: "bv-test",
    sportKey: "football",
    homeNameOriginal: home,
    awayNameOriginal: away,
    homeNameNormalized: normalizeText(home, DEFAULT_MATCHING_CONFIG),
    awayNameNormalized: normalizeText(away, DEFAULT_MATCHING_CONFIG),
    competitionNameOriginal: comp,
    competitionNameNormalized: normalizeText(comp, DEFAULT_MATCHING_CONFIG),
    country: "Brasil",
    startsAt: BASE_TIME,
    ...overrides,
    // normalizados sempre derivados dos overrides quando fornecidos
    ...(overrides.homeNameOriginal && !overrides.homeNameNormalized
      ? { homeNameNormalized: normalizeText(overrides.homeNameOriginal, DEFAULT_MATCHING_CONFIG) }
      : {}),
    ...(overrides.awayNameOriginal && !overrides.awayNameNormalized
      ? { awayNameNormalized: normalizeText(overrides.awayNameOriginal, DEFAULT_MATCHING_CONFIG) }
      : {}),
    ...(overrides.competitionNameOriginal && !overrides.competitionNameNormalized
      ? {
          competitionNameNormalized: normalizeText(
            overrides.competitionNameOriginal,
            DEFAULT_MATCHING_CONFIG,
          ),
        }
      : {}),
  };
}

function canonicalEvent(
  overrides: Partial<MatchableCanonicalEvent> = {},
): MatchableCanonicalEvent {
  return {
    eventId: "ev-canonical-1",
    sportKey: "football",
    homeNameNormalized: normalizeText("Flamengo", DEFAULT_MATCHING_CONFIG),
    awayNameNormalized: normalizeText("Palmeiras", DEFAULT_MATCHING_CONFIG),
    competitionNameNormalized: normalizeText("Brasileirão Série A", DEFAULT_MATCHING_CONFIG),
    country: "Brasil",
    startsAt: BASE_TIME,
    ...overrides,
  };
}

const competitionAlias: ApprovedAlias = {
  kind: "COMPETITION",
  aliasNormalized: "campeonato brasileiro serie a",
  canonicalNormalized: "brasileirao serie a",
};

const atpAlias: ApprovedAlias = {
  kind: "COMPETITION",
  aliasNormalized: "atp rio de janeiro",
  canonicalNormalized: "atp rio open",
};

// ─────────────────────────── CASOS NEGATIVOS ───────────────────────────

describe("scoreMatch — casos negativos (escritos primeiro)", () => {
  it("rejeita mesmo nome em esportes diferentes", () => {
    const r = scoreMatch(
      providerEvent({ sportKey: "futsal" }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.map((h) => h.code)).toContain("SPORT_MISMATCH");
  });

  it("rejeita mesmos participantes em datas incompatíveis (fora da janela)", () => {
    const r = scoreMatch(
      providerEvent({ startsAt: new Date(BASE_TIME.getTime() + 9 * 24 * 3_600_000) }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.map((h) => h.code)).toContain("START_TIME_INCOMPATIBLE");
  });

  it("rejeita time principal vs sub-20 mesmo com nomes e horário iguais", () => {
    const r = scoreMatch(
      providerEvent({
        homeNameOriginal: "São Paulo U20",
        awayNameOriginal: "Corinthians U20",
      }),
      canonicalEvent({
        homeNameNormalized: "sao paulo",
        awayNameNormalized: "corinthians",
      }),
      [competitionAlias],
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.map((h) => h.code)).toContain("CATEGORY_CONFLICT");
  });

  it("rejeita masculino vs feminino", () => {
    const r = scoreMatch(
      providerEvent({ homeNameOriginal: "Santos W", awayNameOriginal: "Ferroviária W" }),
      canonicalEvent({ homeNameNormalized: "santos", awayNameNormalized: "ferroviaria" }),
      [competitionAlias],
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.map((h) => h.code)).toContain("CATEGORY_CONFLICT");
  });

  it("rejeita participantes apenas parcialmente semelhantes em competição diferente", () => {
    // Barcelona (La Liga, Espanha) vs Barcelona SC (LigaPro, Equador)
    const r = scoreMatch(
      providerEvent({
        homeNameOriginal: "Barcelona",
        awayNameOriginal: "Espanyol",
        competitionNameOriginal: "La Liga",
        country: "Espanha",
      }),
      canonicalEvent({
        homeNameNormalized: "barcelona sc",
        awayNameNormalized: "emelec",
        competitionNameNormalized: "ligapro ecuador",
        country: "Equador",
      }),
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.length).toBeGreaterThan(0);
  });

  it("regra eliminatória prevalece sobre score textual alto", () => {
    // nomes idênticos, mas esporte diferente
    const r = scoreMatch(providerEvent({ sportKey: "esports" }), canonicalEvent(), [
      competitionAlias,
    ]);
    expect(r.features.participantDirectSimilarity).toBeGreaterThan(0.8);
    expect(r.decision).toBe("REJECTED");
  });

  it("horário fora da tolerância automática nunca aprova sozinho", () => {
    const r = scoreMatch(
      providerEvent({ startsAt: new Date(BASE_TIME.getTime() + 3 * 3_600_000) }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("REVIEW_REQUIRED");
  });

  it("ordem invertida em futebol (mando relevante) exige revisão, nunca auto", () => {
    const r = scoreMatch(
      providerEvent({ homeNameOriginal: "Palmeiras SP", awayNameOriginal: "Flamengo RJ" }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.matchedWithReversedParticipants).toBe(true);
    expect(r.decision).toBe("REVIEW_REQUIRED");
    expect(r.negativeReasons.map((n) => n.code)).toContain("REVERSED_ORDER_NEEDS_REVIEW");
  });

  it("participantes estruturalmente diferentes são conflito, não score baixo", () => {
    const r = scoreMatch(
      providerEvent({ homeNameOriginal: "Fortaleza", awayNameOriginal: "Ceará" }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("REJECTED");
    expect(r.hardConflictReasons.map((h) => h.code)).toContain(
      "PARTICIPANTS_STRUCTURALLY_DIFFERENT",
    );
  });
});

// ─────────────────────────── CASOS POSITIVOS ───────────────────────────

describe("scoreMatch — casos positivos", () => {
  it("aprova automaticamente nomes equivalentes com sufixos e alias de competição", () => {
    const r = scoreMatch(providerEvent(), canonicalEvent(), [competitionAlias]);
    expect(r.decision).toBe("AUTO_APPROVED");
    expect(r.score).toBeGreaterThanOrEqual(DEFAULT_MATCHING_CONFIG.autoApproveThreshold);
    expect(r.matchedWithReversedParticipants).toBe(false);
  });

  it("aprova com diferença de caixa e acentos", () => {
    const r = scoreMatch(
      providerEvent({ homeNameOriginal: "FLAMENGO", awayNameOriginal: "palmeiras" }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("AUTO_APPROVED");
  });

  it("aprova abreviações com iniciais (tênis) e ordem invertida permitida", () => {
    const r = scoreMatch(
      providerEvent({
        sportKey: "tennis",
        homeNameOriginal: "L. Alvarez",
        awayNameOriginal: "J. Monteiro",
        competitionNameOriginal: "ATP Rio de Janeiro",
        country: "Brasil",
        startsAt: new Date(BASE_TIME.getTime() + 10 * 60_000),
      }),
      canonicalEvent({
        sportKey: "tennis",
        homeNameNormalized: "joao monteiro",
        awayNameNormalized: "lucas alvarez",
        competitionNameNormalized: "atp rio open",
      }),
      [atpAlias],
    );
    expect(r.matchedWithReversedParticipants).toBe(true);
    expect(r.decision).toBe("AUTO_APPROVED"); // tênis: ordem irrelevante
  });

  it("alias aprovado de participante garante similaridade máxima", () => {
    const alias: ApprovedAlias = {
      kind: "PARTICIPANT",
      aliasNormalized: "manchester united",
      canonicalNormalized: "man utd",
    };
    const r = scoreMatch(
      providerEvent({
        homeNameOriginal: "Manchester United",
        awayNameOriginal: "Palmeiras SP",
      }),
      canonicalEvent({ homeNameNormalized: "man utd" }),
      [competitionAlias, alias],
    );
    expect(r.features.exactAliasMatches).toBe(1);
    expect(r.positiveReasons.map((p) => p.code)).toContain("PARTICIPANT_ALIAS");
  });

  it("pequena diferença de horário (5 min) mantém aprovação automática", () => {
    const r = scoreMatch(
      providerEvent({ startsAt: new Date(BASE_TIME.getTime() + 5 * 60_000) }),
      canonicalEvent(),
      [competitionAlias],
    );
    expect(r.decision).toBe("AUTO_APPROVED");
  });

  it("é determinístico: mesma entrada e versão produzem o mesmo resultado", () => {
    const a = scoreMatch(providerEvent(), canonicalEvent(), [competitionAlias]);
    const b = scoreMatch(providerEvent(), canonicalEvent(), [competitionAlias]);
    expect(a).toEqual(b);
  });
});

// ─────────────────────────── BLOCKING ───────────────────────────

describe("generateCandidates", () => {
  const events = [
    canonicalEvent({ eventId: "e1" }),
    canonicalEvent({ eventId: "e2", sportKey: "tennis" }),
    canonicalEvent({
      eventId: "e3",
      startsAt: new Date(BASE_TIME.getTime() + 5 * 24 * 3_600_000),
    }),
  ];

  it("filtra por esporte e janela de horário", () => {
    const { candidates, evaluated } = generateCandidates(providerEvent(), events);
    expect(evaluated).toBe(3);
    expect(candidates.map((c) => c.eventId)).toEqual(["e1"]);
  });

  it("evento fora da janela não gera candidato (data incompatível)", () => {
    const { candidates } = generateCandidates(
      providerEvent({ startsAt: new Date(BASE_TIME.getTime() + 9 * 24 * 3_600_000) }),
      [canonicalEvent()],
    );
    expect(candidates).toHaveLength(0);
  });
});

describe("matchAgainstCandidates", () => {
  it("ordena por score e é estável para empates", () => {
    const { results } = matchAgainstCandidates(
      providerEvent(),
      [canonicalEvent({ eventId: "b" }), canonicalEvent({ eventId: "a" })],
      [competitionAlias],
    );
    expect(results).toHaveLength(2);
    expect(results[0]!.score).toBe(results[1]!.score);
    expect(results[0]!.candidateEventId).toBe("a"); // desempate determinístico
  });
});

// ─────────────────────────── INVARIANTES ───────────────────────────

describe("invariantes (property-based)", () => {
  const nameArb = fc
    .array(fc.constantFrom("alpha", "beta", "gamma", "united", "city", "fc"), {
      minLength: 1,
      maxLength: 3,
    })
    .map((tokens) => tokens.join(" "));

  it("score sempre em [0, 100]", () => {
    fc.assert(
      fc.property(nameArb, nameArb, fc.integer({ min: -60, max: 60 }), (home, away, offsetMin) => {
        const r = scoreMatch(
          providerEvent({ homeNameOriginal: home, awayNameOriginal: away }),
          canonicalEvent({ startsAt: new Date(BASE_TIME.getTime() + offsetMin * 60_000) }),
        );
        return r.score >= 0 && r.score <= 100;
      }),
      { numRuns: 200 },
    );
  });

  it("regra eliminatória sempre impede aprovação", () => {
    fc.assert(
      fc.property(nameArb, nameArb, (home, away) => {
        const r = scoreMatch(
          providerEvent({ homeNameOriginal: home, awayNameOriginal: away, sportKey: "handball" }),
          canonicalEvent({
            homeNameNormalized: normalizeText(home, DEFAULT_MATCHING_CONFIG),
            awayNameNormalized: normalizeText(away, DEFAULT_MATCHING_CONFIG),
          }),
        );
        return r.decision === "REJECTED";
      }),
      { numRuns: 100 },
    );
  });

  it("aumentar a diferença de horário nunca aumenta o score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 0, max: 300 }),
        (minutesA, minutesB) => {
          const [smaller, larger] = minutesA <= minutesB ? [minutesA, minutesB] : [minutesB, minutesA];
          const near = scoreMatch(
            providerEvent({ startsAt: new Date(BASE_TIME.getTime() + smaller * 60_000) }),
            canonicalEvent(),
            [competitionAlias],
          );
          const far = scoreMatch(
            providerEvent({ startsAt: new Date(BASE_TIME.getTime() + larger * 60_000) }),
            canonicalEvent(),
            [competitionAlias],
          );
          return far.score <= near.score;
        },
      ),
      { numRuns: 150 },
    );
  });

  it("alias exato aprovado nunca piora o score", () => {
    fc.assert(
      fc.property(nameArb, (home) => {
        const withoutAlias = scoreMatch(
          providerEvent({ homeNameOriginal: home }),
          canonicalEvent(),
          [competitionAlias],
        );
        const withAlias = scoreMatch(providerEvent({ homeNameOriginal: home }), canonicalEvent(), [
          competitionAlias,
          {
            kind: "PARTICIPANT",
            aliasNormalized: normalizeText(home, DEFAULT_MATCHING_CONFIG),
            canonicalNormalized: "flamengo",
          },
        ]);
        return withAlias.score >= withoutAlias.score;
      }),
      { numRuns: 100 },
    );
  });
});

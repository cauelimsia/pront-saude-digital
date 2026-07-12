import { describe, expect, it } from "vitest";
import { calculateConfidence } from "./confidence";
import type { ConfidenceInput } from "./types";

const base: ConfidenceInput = {
  maxOddsAgeSeconds: 5,
  providerCount: 1,
  bookmakerCount: 2,
  profitPercent: 3.5,
  secondsToEventStart: 3600,
  revalidated: true,
};

describe("calculateConfidence", () => {
  it("dados frescos e revalidados atingem confiança alta", () => {
    const r = calculateConfidence(base);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.classification).toBe("HIGH");
    expect(r.positiveFactors.some((f) => f.code === "REVALIDATED")).toBe(true);
  });

  it("monotonicidade: odd mais antiga nunca aumenta o score", () => {
    let previous = Infinity;
    for (const age of [0, 10, 30, 60, 120, 600]) {
      const r = calculateConfidence({ ...base, maxOddsAgeSeconds: age });
      expect(r.score).toBeLessThanOrEqual(previous);
      previous = r.score;
    }
  });

  it("margem irrealista reduz a confiança", () => {
    const normal = calculateConfidence(base);
    const suspicious = calculateConfidence({ ...base, profitPercent: 25 });
    expect(suspicious.score).toBeLessThan(normal.score);
    expect(suspicious.negativeFactors.some((f) => f.code === "UNREALISTIC_MARGIN")).toBe(true);
  });

  it("evento já iniciado penaliza fortemente", () => {
    const r = calculateConfidence({ ...base, secondsToEventStart: -10 });
    expect(r.score).toBeLessThan(calculateConfidence(base).score);
    expect(r.negativeFactors.some((f) => f.code === "EVENT_STARTED")).toBe(true);
  });

  it("monotonicidade: score de matching menor nunca aumenta a confiança", () => {
    let previous = Infinity;
    for (const matchScore of [100, 95, 85, 70, 60]) {
      const r = calculateConfidence({ ...base, minMatchScore: matchScore });
      expect(r.score).toBeLessThanOrEqual(previous);
      previous = r.score;
    }
  });

  it("associação manual aparece como fator positivo sem inflar o score", () => {
    const auto = calculateConfidence({ ...base, minMatchScore: 90 });
    const manual = calculateConfidence({ ...base, minMatchScore: 90, manualMatch: true });
    expect(manual.score).toBe(auto.score);
    expect(manual.positiveFactors.some((f) => f.code === "MANUAL_MATCH")).toBe(true);
  });

  it("score permanece no intervalo [0, 100]", () => {
    const worst = calculateConfidence({
      maxOddsAgeSeconds: 100000,
      providerCount: 1,
      bookmakerCount: 1,
      profitPercent: 90,
      secondsToEventStart: -1,
      revalidated: false,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.classification).toBe("HIDDEN_BY_DEFAULT");
    const best = calculateConfidence({ ...base, providerCount: 3 });
    expect(best.score).toBeLessThanOrEqual(100);
  });
});

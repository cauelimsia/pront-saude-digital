import { describe, expect, it } from "vitest";
import { MockOddsProviderBravo } from "./bravo-provider";
import { providerOddsPayloadSchema } from "../contract";

const fixedClock = () => new Date("2026-07-11T12:00:00.000Z");

describe("MockOddsProviderBravo (teste de contrato)", () => {
  it("produz payload válido segundo o schema do contrato", async () => {
    const provider = new MockOddsProviderBravo({ clock: fixedClock });
    const parsed = providerOddsPayloadSchema.safeParse(await provider.getOdds());
    expect(parsed.success).toBe(true);
  });

  it("é determinístico entre coletas", async () => {
    const provider = new MockOddsProviderBravo({ clock: fixedClock });
    const a = await provider.getOdds();
    const b = await provider.getOdds();
    expect(JSON.stringify(a.odds)).toBe(JSON.stringify(b.odds));
  });

  it("representa o tênis com ordem INVERTIDA em relação ao provedor primário", async () => {
    const provider = new MockOddsProviderBravo({ clock: fixedClock });
    const events = await provider.getEvents();
    const tennis = events.find((e) => e.externalId === "bv-tn-12")!;
    // primário: home = João Monteiro; bravo: home = L. Alvarez
    expect(tennis.homeName).toBe("L. Alvarez");
    expect(tennis.awayName).toBe("J. Monteiro");
  });

  it("contém o UNDER 2.10 (totais 2.5 FT) que forma a surebet multi-provedor", async () => {
    const provider = new MockOddsProviderBravo({ clock: fixedClock });
    const payload = await provider.getOdds();
    const totals = payload.odds.find(
      (o) =>
        o.eventExternalId === "bv-fp-77" &&
        o.marketType === "TOTALS" &&
        o.period === "FULL_TIME" &&
        o.line === "2.5",
    )!;
    const under = totals.outcomes.find((x) => x.outcome === "UNDER")!.odd;
    expect(under).toBe("2.10");
    // com o OVER 1.92 do mock-primary: 1/1.92 + 1/2.10 < 1
    expect(1 / 1.92 + 1 / 2.1).toBeLessThan(1);
  });

  it("mercados de linha 3.0 e 1º tempo existem e não têm arbitragem interna", async () => {
    const provider = new MockOddsProviderBravo({ clock: fixedClock });
    const payload = await provider.getOdds();
    const line3 = payload.odds.find((o) => o.line === "3")!;
    const firstHalf = payload.odds.find((o) => o.period === "FIRST_HALF")!;
    for (const market of [line3, firstHalf]) {
      const inv = market.outcomes.reduce((acc, o) => acc + 1 / Number(o.odd), 0);
      expect(inv).toBeGreaterThan(1);
    }
  });
});

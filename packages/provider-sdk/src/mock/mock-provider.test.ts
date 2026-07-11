import { describe, expect, it } from "vitest";
import { MockOddsProvider } from "./mock-provider";
import { providerOddsPayloadSchema } from "../contract";

const fixedClock = () => new Date("2026-07-11T12:00:00.000Z");

describe("MockOddsProvider", () => {
  it("produz payload válido segundo o schema do contrato", async () => {
    const provider = new MockOddsProvider({ clock: fixedClock });
    const payload = await provider.getOdds();
    const parsed = providerOddsPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("é determinístico: duas coletas idênticas retornam as mesmas odds", async () => {
    const provider = new MockOddsProvider({ clock: fixedClock });
    const a = await provider.getOdds({ cycle: 1 });
    const b = await provider.getOdds({ cycle: 1 });
    expect(JSON.stringify(a.odds)).toBe(JSON.stringify(b.odds));
  });

  it("com variabilidade, o mesmo ciclo gera as mesmas odds (reprodutível)", async () => {
    const provider = new MockOddsProvider({ clock: fixedClock, variability: true });
    const a = await provider.getOdds({ cycle: 7 });
    const b = await provider.getOdds({ cycle: 7 });
    const c = await provider.getOdds({ cycle: 8 });
    expect(JSON.stringify(a.odds)).toBe(JSON.stringify(b.odds));
    expect(JSON.stringify(a.odds)).not.toBe(JSON.stringify(c.odds));
  });

  it("contém o par de odds que forma a surebet de tênis (2.10 / 2.05)", async () => {
    const provider = new MockOddsProvider({ clock: fixedClock });
    const payload = await provider.getOdds();
    const tennis = payload.odds.filter((o) => o.eventExternalId === "ev-atp-rio-final");
    const alphaHome = tennis
      .find((o) => o.bookmakerKey === "bet-alpha")!
      .outcomes.find((x) => x.outcome === "HOME")!.odd;
    const bravoAway = tennis
      .find((o) => o.bookmakerKey === "bet-bravo")!
      .outcomes.find((x) => x.outcome === "AWAY")!.odd;
    expect(alphaHome).toBe("2.10");
    expect(bravoAway).toBe("2.05");
    // 1/2.10 + 1/2.05 < 1 → arbitragem presente nas fixtures
    expect(1 / 2.1 + 1 / 2.05).toBeLessThan(1);
  });

  it("eventos ficam no futuro em relação ao relógio injetado", async () => {
    const provider = new MockOddsProvider({ clock: fixedClock });
    const events = await provider.getEvents();
    for (const event of events) {
      expect(event.startsAt.getTime()).toBeGreaterThan(fixedClock().getTime());
    }
  });
});

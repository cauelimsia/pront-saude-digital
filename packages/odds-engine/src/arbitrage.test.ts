import { describe, expect, it } from "vitest";
import fc from "fast-check";
import Decimal from "decimal.js";
import { detectArbitrage, planStakes } from "./arbitrage";
import type { ArbitrageSelection } from "./types";

const twoWayArb: ArbitrageSelection[] = [
  { selectionKey: "HOME", bookmakerKey: "bk-alpha", odd: "2.10" },
  { selectionKey: "AWAY", bookmakerKey: "bk-beta", odd: "2.05" },
];

const threeWayArb: ArbitrageSelection[] = [
  { selectionKey: "HOME", bookmakerKey: "bk-alpha", odd: "3" },
  { selectionKey: "DRAW", bookmakerKey: "bk-beta", odd: "4" },
  { selectionKey: "AWAY", bookmakerKey: "bk-gamma", odd: "5" },
];

describe("detectArbitrage", () => {
  it("detecta arbitragem de duas seleções com valores conhecidos", () => {
    const r = detectArbitrage(twoWayArb, ["HOME", "AWAY"]);
    expect(r.hasArbitrage).toBe(true);
    // inverseSum = 1/2.10 + 1/2.05 = 4.15/4.305
    expect(r.inverseSum.toFixed(10)).toBe(new Decimal(4.15).div(4.305).toFixed(10));
    expect(r.profitPercent.toNumber()).toBeCloseTo(3.7349, 3);
  });

  it("detecta arbitragem de três seleções com frações exatas", () => {
    const r = detectArbitrage(threeWayArb, ["HOME", "DRAW", "AWAY"]);
    expect(r.hasArbitrage).toBe(true);
    // 1/3 + 1/4 + 1/5 = 47/60
    expect(r.inverseSum.toFixed(12)).toBe(new Decimal(47).div(60).toFixed(12));
    expect(r.payoutMultiplier.toFixed(12)).toBe(new Decimal(60).div(47).toFixed(12));
  });

  it("não sinaliza mercado sem arbitragem", () => {
    const r = detectArbitrage(
      [
        { selectionKey: "HOME", bookmakerKey: "a", odd: "1.90" },
        { selectionKey: "AWAY", bookmakerKey: "b", odd: "1.90" },
      ],
      ["HOME", "AWAY"],
    );
    expect(r.hasArbitrage).toBe(false);
    expect(r.reason).toBe("NO_ARBITRAGE");
    expect(r.inverseSum.gt(1)).toBe(true);
  });

  it("inverseSum exatamente 1 NÃO é arbitragem", () => {
    const r = detectArbitrage(
      [
        { selectionKey: "HOME", bookmakerKey: "a", odd: "2" },
        { selectionKey: "AWAY", bookmakerKey: "b", odd: "2" },
      ],
      ["HOME", "AWAY"],
    );
    expect(r.inverseSum.eq(1)).toBe(true);
    expect(r.hasArbitrage).toBe(false);
  });

  it.each([["1"], ["1.00"], ["0.5"], ["-2"], ["0"], ["abc"], ["Infinity"]])(
    "rejeita odd inválida %s",
    (odd) => {
      const r = detectArbitrage([
        { selectionKey: "HOME", bookmakerKey: "a", odd },
        { selectionKey: "AWAY", bookmakerKey: "b", odd: "2.5" },
      ]);
      expect(r.hasArbitrage).toBe(false);
      expect(r.reason).toBe("INVALID_ODD");
    },
  );

  it("rejeita mercado incompleto (1X2 sem o empate)", () => {
    const r = detectArbitrage(
      [
        { selectionKey: "HOME", bookmakerKey: "a", odd: "3.1" },
        { selectionKey: "AWAY", bookmakerKey: "b", odd: "3.4" },
      ],
      ["HOME", "DRAW", "AWAY"],
    );
    expect(r.reason).toBe("INCOMPLETE_MARKET");
  });

  it("rejeita seleções duplicadas", () => {
    const r = detectArbitrage([
      { selectionKey: "HOME", bookmakerKey: "a", odd: "2.2" },
      { selectionKey: "HOME", bookmakerKey: "b", odd: "2.3" },
    ]);
    expect(r.reason).toBe("DUPLICATE_SELECTION");
  });

  it("rejeita mercado vazio e seleção única", () => {
    expect(detectArbitrage([]).reason).toBe("EMPTY_MARKET");
    expect(
      detectArbitrage([{ selectionKey: "HOME", bookmakerKey: "a", odd: "2.2" }]).reason,
    ).toBe("INCOMPLETE_MARKET");
  });

  it("é invariante à ordem das seleções", () => {
    const direct = detectArbitrage(twoWayArb, ["HOME", "AWAY"]);
    const reversed = detectArbitrage([...twoWayArb].reverse(), ["HOME", "AWAY"]);
    expect(direct.inverseSum.eq(reversed.inverseSum)).toBe(true);
    expect(direct.profitPercent.eq(reversed.profitPercent)).toBe(true);
  });

  it("é idempotente (repetição do cálculo produz o mesmo resultado)", () => {
    const a = detectArbitrage(threeWayArb);
    const b = detectArbitrage(threeWayArb);
    expect(a.inverseSum.eq(b.inverseSum)).toBe(true);
    expect(a.profitPercent.eq(b.profitPercent)).toBe(true);
  });

  it("mantém precisão com odds extremas (muito grandes e muito pequenas)", () => {
    const r = detectArbitrage([
      { selectionKey: "HOME", bookmakerKey: "a", odd: "1000000" },
      { selectionKey: "AWAY", bookmakerKey: "b", odd: "1.0000011" },
    ]);
    // 1/1000000 + 1/1.0000011 = 0.000001 + 0.9999989000012... < 1
    expect(r.hasArbitrage).toBe(true);
    expect(r.inverseSum.lt(1)).toBe(true);
    expect(r.inverseSum.gt("0.9999")).toBe(true);
  });
});

describe("planStakes", () => {
  it("distribui a banca com retornos equilibrados (caso conhecido 2.10/2.05, R$1000)", () => {
    const plan = planStakes(twoWayArb, {
      totalStake: "1000",
      stakeIncrement: "0.01",
    });
    expect(plan.viable).toBe(true);
    const home = plan.legs.find((l) => l.selectionKey === "HOME")!;
    const away = plan.legs.find((l) => l.selectionKey === "AWAY")!;
    // valores ideais conhecidos: 493.9759... e 506.0240...
    expect(home.idealStake.toNumber()).toBeCloseTo(493.9759, 3);
    expect(away.idealStake.toNumber()).toBeCloseTo(506.0241, 3);
    expect(home.roundedStake.toFixed(2)).toBe("493.98");
    expect(away.roundedStake.toFixed(2)).toBe("506.02");
    expect(plan.totalStaked.toFixed(2)).toBe("1000.00");
    // pior lucro recalculado após arredondamento continua positivo
    expect(plan.worstProfit.toNumber()).toBeGreaterThan(37);
    expect(plan.profitPercentAfterRounding.toNumber()).toBeCloseTo(3.73, 1);
  });

  it("arredondamento que preserva o lucro mantém viabilidade", () => {
    const plan = planStakes(twoWayArb, {
      totalStake: "1000",
      stakeIncrement: "1",
      minWorstProfit: "10",
    });
    expect(plan.viable).toBe(true);
    expect(plan.worstProfit.gte(10)).toBe(true);
  });

  it("arredondamento que elimina o lucro marca como inviável", () => {
    // margem de apenas 0,4975%; incremento grosseiro destrói a arbitragem
    const marginal: ArbitrageSelection[] = [
      { selectionKey: "HOME", bookmakerKey: "a", odd: "2.00" },
      { selectionKey: "AWAY", bookmakerKey: "b", odd: "2.02" },
    ];
    const plan = planStakes(marginal, { totalStake: "9", stakeIncrement: "1" });
    expect(plan.viable).toBe(false);
    expect(plan.viability).toBe("UNPROFITABLE_AFTER_ROUNDING");
    expect(plan.worstProfit.lt(0)).toBe(true);
  });

  it("respeita stake mínima por perna", () => {
    const plan = planStakes(twoWayArb, {
      totalStake: "1000",
      minStakePerLeg: "500",
    });
    expect(plan.viable).toBe(false);
    expect(plan.viability).toBe("BELOW_MIN_STAKE");
  });

  it("respeita stake máxima por perna", () => {
    const plan = planStakes(twoWayArb, {
      totalStake: "1000",
      maxStakePerLeg: "500",
    });
    expect(plan.viable).toBe(false);
    expect(plan.viability).toBe("ABOVE_MAX_STAKE");
  });

  it("banca insuficiente para o incremento é inviável", () => {
    const plan = planStakes(twoWayArb, { totalStake: "1", stakeIncrement: "1" });
    expect(plan.viable).toBe(false);
    expect(plan.viability).toBe("BELOW_MIN_STAKE");
  });

  it("mercado sem arbitragem nunca gera plano viável", () => {
    const plan = planStakes(
      [
        { selectionKey: "HOME", bookmakerKey: "a", odd: "1.9" },
        { selectionKey: "AWAY", bookmakerKey: "b", odd: "1.9" },
      ],
      { totalStake: "1000" },
    );
    expect(plan.viable).toBe(false);
    expect(plan.viability).toBe("NO_ARBITRAGE");
    expect(plan.legs).toHaveLength(0);
  });

  it("aloca três seleções com incremento 0.25 em múltiplos exatos", () => {
    const plan = planStakes(threeWayArb, {
      totalStake: "600",
      stakeIncrement: "0.25",
    });
    expect(plan.viable).toBe(true);
    for (const leg of plan.legs) {
      expect(leg.roundedStake.mod("0.25").isZero()).toBe(true);
    }
    // stakes ideais: 600×(1/3)/(47/60)=255.319..., 191.489..., 153.191...
    const home = plan.legs.find((l) => l.selectionKey === "HOME")!;
    expect(home.idealStake.toNumber()).toBeCloseTo(255.3191, 3);
    expect(plan.worstProfit.gt(150)).toBe(true); // margem 27,66% sobrevive folgada
  });

  it("lança erro para banca ou incremento não positivos", () => {
    expect(() => planStakes(twoWayArb, { totalStake: "0" })).toThrow(RangeError);
    expect(() =>
      planStakes(twoWayArb, { totalStake: "10", stakeIncrement: "0" }),
    ).toThrow(RangeError);
  });

  it("é idempotente e invariante à ordem", () => {
    const a = planStakes(twoWayArb, { totalStake: "777.77" });
    const b = planStakes([...twoWayArb].reverse(), { totalStake: "777.77" });
    const byKey = (k: string) => (l: { selectionKey: string }) => l.selectionKey === k;
    expect(
      a.legs.find(byKey("HOME"))!.roundedStake.eq(b.legs.find(byKey("HOME"))!.roundedStake),
    ).toBe(true);
    expect(a.worstProfit.eq(b.worstProfit)).toBe(true);
  });
});

describe("invariantes (property-based)", () => {
  const oddArb = fc
    .integer({ min: 102, max: 10000 })
    .map((n) => (n / 100).toFixed(2));

  it("com arbitragem detectada, a alocação ideal produz lucro em todos os cenários", () => {
    fc.assert(
      fc.property(oddArb, oddArb, oddArb, (o1, o2, o3) => {
        const selections: ArbitrageSelection[] = [
          { selectionKey: "A", bookmakerKey: "x", odd: o1 },
          { selectionKey: "B", bookmakerKey: "y", odd: o2 },
          { selectionKey: "C", bookmakerKey: "z", odd: o3 },
        ];
        const det = detectArbitrage(selections);
        fc.pre(det.hasArbitrage);
        // incremento minúsculo ≈ alocação ideal: todo cenário deve lucrar
        const plan = planStakes(selections, {
          totalStake: "10000",
          stakeIncrement: "0.000001",
        });
        return plan.worstProfit.gte(0);
      }),
      { numRuns: 200 },
    );
  });

  it("inverseSum é invariante a permutações", () => {
    fc.assert(
      fc.property(oddArb, oddArb, oddArb, (o1, o2, o3) => {
        const sels: ArbitrageSelection[] = [
          { selectionKey: "A", bookmakerKey: "x", odd: o1 },
          { selectionKey: "B", bookmakerKey: "y", odd: o2 },
          { selectionKey: "C", bookmakerKey: "z", odd: o3 },
        ];
        const a = detectArbitrage(sels);
        const b = detectArbitrage([sels[2]!, sels[0]!, sels[1]!]);
        return a.inverseSum.eq(b.inverseSum);
      }),
      { numRuns: 100 },
    );
  });
});

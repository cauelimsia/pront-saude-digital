import Decimal from "decimal.js";
import type {
  ArbitrageDetection,
  ArbitrageSelection,
  StakeLeg,
  StakePlan,
  StakePlanOptions,
  StakePlanViability,
} from "./types";

// Precisão interna alta; valores expostos são quantizados na borda pelo chamador.
const D = Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

const ZERO = new D(0);
const ONE = new D(1);
const HUNDRED = new D(100);

export function toDecimal(value: string | number | Decimal): Decimal {
  return new D(value as Decimal.Value);
}

function invalidDetection(
  reason: NonNullable<ArbitrageDetection["reason"]>,
  selections: ReadonlyArray<ArbitrageSelection>,
): ArbitrageDetection {
  return {
    hasArbitrage: false,
    reason,
    inverseSum: ZERO,
    payoutMultiplier: ZERO,
    profitPercent: ZERO,
    selections,
  };
}

/**
 * Detecta arbitragem matemática em um mercado com resultados mutuamente
 * exclusivos e coletivamente exaustivos.
 *
 * inverseSum = Σ(1/odd_i); existe arbitragem quando inverseSum < 1.
 *
 * `expectedOutcomes`, quando fornecido, exige que o conjunto de seleções
 * cubra exatamente esses resultados (mercado completo).
 */
export function detectArbitrage(
  selections: ReadonlyArray<ArbitrageSelection>,
  expectedOutcomes?: ReadonlyArray<string>,
): ArbitrageDetection {
  if (selections.length === 0) {
    return invalidDetection("EMPTY_MARKET", selections);
  }

  const seen = new Set<string>();
  for (const sel of selections) {
    if (seen.has(sel.selectionKey)) {
      return invalidDetection("DUPLICATE_SELECTION", selections);
    }
    seen.add(sel.selectionKey);
  }

  if (expectedOutcomes) {
    const expected = new Set(expectedOutcomes);
    if (expected.size !== selections.length) {
      return invalidDetection("INCOMPLETE_MARKET", selections);
    }
    for (const outcome of expected) {
      if (!seen.has(outcome)) {
        return invalidDetection("INCOMPLETE_MARKET", selections);
      }
    }
  } else if (selections.length < 2) {
    return invalidDetection("INCOMPLETE_MARKET", selections);
  }

  // Ordem canônica: torna o resultado exatamente invariante a permutações
  // (a soma decimal em precisão finita não é associativa) e determinístico.
  const canonical = [...selections].sort((a, b) =>
    a.selectionKey.localeCompare(b.selectionKey),
  );

  let inverseSum = ZERO;
  for (const sel of canonical) {
    let odd: Decimal;
    try {
      odd = new D(sel.odd);
    } catch {
      return invalidDetection("INVALID_ODD", selections);
    }
    if (!odd.isFinite() || odd.lte(ONE)) {
      return invalidDetection("INVALID_ODD", selections);
    }
    inverseSum = inverseSum.plus(ONE.div(odd));
  }

  const payoutMultiplier = ONE.div(inverseSum);
  const profitPercent = payoutMultiplier.minus(ONE).times(HUNDRED);
  const hasArbitrage = inverseSum.lt(ONE);

  return {
    hasArbitrage,
    reason: hasArbitrage ? undefined : "NO_ARBITRAGE",
    inverseSum,
    payoutMultiplier,
    profitPercent,
    selections: canonical,
  };
}

function roundToIncrement(value: Decimal, increment: Decimal): Decimal {
  // Arredonda para o múltiplo do incremento mais próximo (half-even).
  return value.div(increment).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).times(increment);
}

/**
 * Distribui a banca entre as seleções (stake_i = total × (1/odd_i)/inverseSum),
 * aplica incremento mínimo e limites, e RECALCULA todos os cenários após o
 * arredondamento. A viabilidade é decidida pelo pior lucro pós-arredondamento —
 * nunca se assume que a arbitragem sobrevive ao arredondamento.
 */
export function planStakes(
  selections: ReadonlyArray<ArbitrageSelection>,
  options: StakePlanOptions,
  expectedOutcomes?: ReadonlyArray<string>,
): StakePlan {
  const detection = detectArbitrage(selections, expectedOutcomes);
  const requestedStake = new D(options.totalStake);
  const increment = new D(options.stakeIncrement ?? "0.01");
  const minWorstProfit = new D(options.minWorstProfit ?? "0");
  const minStake = options.minStakePerLeg ? new D(options.minStakePerLeg) : null;
  const maxStake = options.maxStakePerLeg ? new D(options.maxStakePerLeg) : null;

  if (requestedStake.lte(ZERO) || increment.lte(ZERO)) {
    throw new RangeError("totalStake e stakeIncrement devem ser positivos");
  }

  const emptyPlan = (viability: StakePlanViability): StakePlan => ({
    viable: false,
    viability,
    legs: [],
    requestedStake,
    totalStaked: ZERO,
    unallocated: requestedStake,
    worstProfit: ZERO,
    bestProfit: ZERO,
    worstReturn: ZERO,
    bestReturn: ZERO,
    returnSpread: ZERO,
    profitPercentBeforeRounding: detection.profitPercent,
    profitPercentAfterRounding: ZERO,
  });

  if (!detection.hasArbitrage) {
    return emptyPlan("NO_ARBITRAGE");
  }

  // 1) Alocação ideal.
  const legs: StakeLeg[] = detection.selections.map((sel) => {
    const odd = new D(sel.odd);
    const idealRatio = ONE.div(odd).div(detection.inverseSum);
    const idealStake = requestedStake.times(idealRatio);
    return {
      selectionKey: sel.selectionKey,
      bookmakerKey: sel.bookmakerKey,
      odd,
      idealRatio,
      idealStake,
      roundedStake: ZERO,
      grossReturn: ZERO,
      profit: ZERO,
    };
  });

  // 2) Arredondamento explícito por incremento + limites operacionais.
  let violation: StakePlanViability | null = null;
  for (const leg of legs) {
    let stake = roundToIncrement(leg.idealStake, increment);
    if (stake.lte(ZERO)) {
      // Banca insuficiente para cobrir esta perna com o incremento dado.
      violation = "BELOW_MIN_STAKE";
    }
    if (minStake && stake.lt(minStake)) {
      violation = "BELOW_MIN_STAKE";
    }
    if (maxStake && stake.gt(maxStake)) {
      stake = roundToIncrement(maxStake, increment).gt(maxStake)
        ? roundToIncrement(maxStake.minus(increment), increment)
        : roundToIncrement(maxStake, increment);
      leg.roundedStake = stake;
      violation = violation ?? "ABOVE_MAX_STAKE";
      continue;
    }
    leg.roundedStake = stake;
  }

  // 3) Recalcular TODOS os cenários com as stakes finais.
  const totalStaked = legs.reduce((acc, leg) => acc.plus(leg.roundedStake), ZERO);
  for (const leg of legs) {
    leg.grossReturn = leg.roundedStake.times(leg.odd);
    leg.profit = leg.grossReturn.minus(totalStaked);
  }

  const returns = legs.map((l) => l.grossReturn);
  const profits = legs.map((l) => l.profit);
  const worstReturn = returns.reduce((a, b) => (a.lt(b) ? a : b));
  const bestReturn = returns.reduce((a, b) => (a.gt(b) ? a : b));
  const worstProfit = profits.reduce((a, b) => (a.lt(b) ? a : b));
  const bestProfit = profits.reduce((a, b) => (a.gt(b) ? a : b));
  const profitPercentAfterRounding = totalStaked.gt(ZERO)
    ? worstProfit.div(totalStaked).times(HUNDRED)
    : ZERO;

  let viability: StakePlanViability = "VIABLE";
  if (violation) {
    viability = violation;
  } else if (worstProfit.lt(minWorstProfit)) {
    viability = "UNPROFITABLE_AFTER_ROUNDING";
  }

  return {
    viable: viability === "VIABLE",
    viability,
    legs,
    requestedStake,
    totalStaked,
    unallocated: requestedStake.minus(totalStaked),
    worstProfit,
    bestProfit,
    worstReturn,
    bestReturn,
    returnSpread: bestReturn.minus(worstReturn),
    profitPercentBeforeRounding: detection.profitPercent,
    profitPercentAfterRounding,
  };
}

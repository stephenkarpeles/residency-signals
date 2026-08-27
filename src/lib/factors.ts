import type { FactorDef, FactorId, Weights } from "./types";

export const GOLD_SLOTS = 3;
export const SILVER_SLOTS = 15;
export const CONSIDERING_SLOTS = 20;

export const FACTORS: FactorDef[] = [
  {
    id: "programQuality",
    label: "Quality of the program",
    description:
      "Reputation, academic depth, case mix, and overall training caliber.",
    defaultWeight: 50,
  },
  {
    id: "inStateColleges",
    label: "Quality of in-state colleges",
    description:
      "Strength of universities in that state — useful if a partner or family may study there.",
    defaultWeight: 15,
  },
  {
    id: "schools",
    label: "Quality of middle / high schools",
    description:
      "Metro-area public school quality (middle and high school, averaged).",
    defaultWeight: 15,
  },
  {
    id: "affordability",
    label: "Affordable cost of living",
    description:
      "How far a resident salary goes. Lower cost-of-living index scores higher here.",
    defaultWeight: 10,
  },
  {
    id: "townQuality",
    label: "Quality of the town",
    description:
      "Things to do, restaurants, culture, amenities, and overall livability.",
    defaultWeight: 5,
  },
  {
    id: "water",
    label: "Proximity to water",
    description:
      "Ocean, bay, Great Lakes, or major waterfront access from the city.",
    defaultWeight: 5,
  },
  {
    id: "fellowship",
    label: "Fellowship strength",
    description:
      "On-site subspecialty training and historical fellowship match (MFM, Gyn Onc, REI, UroGyn, MIGS).",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "classSize",
    label: "Larger class size",
    description:
      "Prefers bigger residency classes — more co-residents, coverage, and often more subspecialties.",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "doRepresentation",
    label: "DO representation",
    description:
      "Share of current residents who are DOs. Useful if osteopathic culture and mentorship matter.",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "citySize",
    label: "Bigger city",
    description:
      "Prefers larger city populations — more restaurants, airports, and urban energy.",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "safety",
    label: "Neighborhood safety",
    description:
      "Metro-level safety approximation. Citywide, not a specific hospital block.",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "walkability",
    label: "Walkability",
    description:
      "How easy it is to live without a car near the typical training sites.",
    defaultWeight: 0,
    suggested: true,
  },
  {
    id: "climate",
    label: "Mild climate",
    description:
      "Prefers places with milder winters and more comfortable year-round weather.",
    defaultWeight: 0,
    suggested: true,
  },
];

export const FACTOR_IDS = FACTORS.map((f) => f.id);

export function defaultWeights(): Weights {
  return Object.fromEntries(
    FACTORS.map((f) => [f.id, f.defaultWeight]),
  ) as Weights;
}

export function activeFactors(weights: Weights): FactorDef[] {
  return FACTORS.filter((f) => (weights[f.id] ?? 0) > 0);
}

export function unusedFactors(weights: Weights): FactorDef[] {
  return FACTORS.filter((f) => (weights[f.id] ?? 0) === 0);
}

export function weightsTotal(weights: Weights): number {
  return FACTOR_IDS.reduce((sum, id) => sum + (weights[id] ?? 0), 0);
}

function numericWeight(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Factors currently in the mix, plus one being edited so it can enter at 0. */
function poolIds(weights: Weights, editing?: FactorId): FactorId[] {
  const ids = FACTOR_IDS.filter(
    (key) => key === editing || numericWeight(weights[key]) > 0,
  );
  return ids.length > 0 ? ids : (["programQuality"] as FactorId[]);
}

function distributeRemaining(
  next: Weights,
  others: FactorId[],
  remaining: number,
  prior: Weights,
): Weights {
  if (others.length === 0) return next;
  if (remaining <= 0) {
    for (const key of others) next[key] = 0;
    return next;
  }

  const othersSum = others.reduce((sum, key) => sum + numericWeight(prior[key]), 0);
  let allocated = 0;

  others.forEach((key, index) => {
    if (index === others.length - 1) {
      next[key] = Math.max(0, remaining - allocated);
      return;
    }
    const value =
      othersSum > 0
        ? Math.round((numericWeight(prior[key]) / othersSum) * remaining)
        : Math.round(remaining / others.length);
    next[key] = Math.max(0, value);
    allocated += next[key];
  });

  let othersTotal = others.reduce((sum, key) => sum + next[key], 0);
  if (othersTotal !== remaining) {
    const delta = remaining - othersTotal;
    const target = others.reduce((best, key) =>
      next[key] >= next[best] ? key : best,
    );
    next[target] = Math.max(0, next[target] + delta);
    othersTotal = others.reduce((sum, key) => sum + next[key], 0);
    if (othersTotal !== remaining) {
      next[target] = Math.max(0, next[target] + (remaining - othersTotal));
    }
  }
  return next;
}

export function normalizeWeights(weights: Weights): Weights {
  const next = { ...defaultWeights() };
  for (const id of FACTOR_IDS) {
    next[id] = numericWeight(weights[id]);
  }
  const total = weightsTotal(next);
  if (total === 100) return next;
  if (total <= 0) return defaultWeights();

  const others = poolIds(next);
  const scaled = { ...next };
  for (const id of FACTOR_IDS) {
    if (!others.includes(id)) scaled[id] = 0;
  }
  return distributeRemaining(scaled, others, 100, next);
}

export function setWeightKeepingTotal(
  weights: Weights,
  id: FactorId,
  nextValue: number,
): Weights {
  const current = normalizeWeights(weights);
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)));
  const others = poolIds(current, id).filter((key) => key !== id);
  const next = { ...current, [id]: clamped };

  for (const key of FACTOR_IDS) {
    if (key !== id && !others.includes(key)) next[key] = 0;
  }

  if (others.length === 0) {
    next[id] = 100;
    return next;
  }

  return distributeRemaining(next, others, 100 - clamped, current);
}

export function addSuggestedFactor(weights: Weights, id: FactorId): Weights {
  if ((weights[id] ?? 0) > 0) return weights;
  return setWeightKeepingTotal(weights, id, 5);
}

export function removeFactor(weights: Weights, id: FactorId): Weights {
  return setWeightKeepingTotal(weights, id, 0);
}

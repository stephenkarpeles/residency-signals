import { FACTORS } from "./factors";
import type { FactorId, Program, Weights } from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function factorScore(program: Program, id: FactorId): number | null {
  switch (id) {
    case "programQuality":
      return program.programQuality;
    case "inStateColleges":
      return program.inStateCollegeQuality;
    case "schools":
      if (program.middleSchoolQuality == null || program.highSchoolQuality == null) return null;
      return (program.middleSchoolQuality + program.highSchoolQuality) / 2;
    case "affordability":
      if (program.costOfLiving == null) return null;
      return clamp(((180 - program.costOfLiving) / 100) * 100);
    case "townQuality":
      return program.townQuality;
    case "water":
      return program.waterProximity;
    case "fellowship":
      return program.fellowshipStrength;
    case "classSize":
      if (program.classSize == null) return null;
      return clamp((program.classSize / 12) * 100);
    case "doRepresentation":
      return program.percentDO;
    case "citySize": {
      if (program.cityPopulation == null) return null;
      const log = Math.log10(Math.max(program.cityPopulation, 1));
      return clamp(((log - 4.3) / (6.92 - 4.3)) * 100);
    }
    case "safety":
      return program.safety;
    case "walkability":
      return program.walkability;
    case "climate":
      return program.climate;
  }
}

export function matchScore(program: Program, weights: Weights): number | null {
  // A state-level college score alone is not enough to rank a program.
  if (program.coverage === "basic") return null;
  const scored = FACTORS.flatMap((factor) => {
    const weight = weights[factor.id] ?? 0;
    if (weight <= 0) return [];
    const score = factorScore(program, factor.id);
    if (score == null) return [];
    return [{ weight, score }];
  });
  const total = scored.reduce((sum, factor) => sum + factor.weight, 0);
  if (total <= 0) return null;
  const weighted = scored.reduce((sum, factor) => sum + (factor.weight / total) * factor.score, 0);
  return Math.round(weighted * 10) / 10;
}

/** True when a weighted factor has no data, so the score leaves that factor out. */
export function matchUsesPartialData(program: Program, weights: Weights): boolean {
  return FACTORS.some((factor) => {
    const weight = weights[factor.id] ?? 0;
    return weight > 0 && factorScore(program, factor.id) == null;
  });
}

export function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}

export function formatDeliveries(n: number): string {
  return n.toLocaleString("en-US");
}

export function deliverySourceLabel(source: string): string {
  switch (source) {
    case "published":
      return "Hospital-published";
    case "sparcs":
      return "NYS SPARCS 2023";
    case "hcai":
      return "CA HCAI 2024";
    case "cms":
      return "CMS cost report";
    default:
      return "Unmatched estimate";
  }
}

export function colLabel(index: number): string {
  if (index >= 150) return "Very high";
  if (index >= 120) return "High";
  if (index >= 105) return "Above avg";
  if (index >= 95) return "Average";
  if (index >= 85) return "Affordable";
  return "Low cost";
}

export function scoreTone(score: number): string {
  if (score >= 90) return "text-emerald-800";
  if (score >= 80) return "text-teal-800";
  if (score >= 70) return "text-stone-800";
  return "text-stone-500";
}

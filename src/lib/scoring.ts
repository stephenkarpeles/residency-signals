import { FACTORS } from "./factors";
import type { FactorId, Program, Weights } from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function factorScore(program: Program, id: FactorId): number {
  switch (id) {
    case "programQuality":
      return program.programQuality;
    case "inStateColleges":
      return program.inStateCollegeQuality;
    case "schools":
      return (program.middleSchoolQuality + program.highSchoolQuality) / 2;
    case "affordability":
      return clamp(((180 - program.costOfLiving) / 100) * 100);
    case "townQuality":
      return program.townQuality;
    case "water":
      return program.waterProximity;
    case "fellowship":
      return program.fellowshipStrength;
    case "classSize":
      return clamp((program.classSize / 12) * 100);
    case "doRepresentation":
      return program.percentDO;
    case "citySize": {
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

export function matchScore(program: Program, weights: Weights): number {
  const total = FACTORS.reduce((sum, factor) => sum + (weights[factor.id] ?? 0), 0);
  if (total <= 0) return 0;
  const weighted = FACTORS.reduce((sum, factor) => {
    const weight = weights[factor.id] ?? 0;
    if (weight <= 0) return sum;
    return sum + (weight / total) * factorScore(program, factor.id);
  }, 0);
  return Math.round(weighted * 10) / 10;
}

export function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
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

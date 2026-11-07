import { catalogBySpecialty, getCatalogProgram, type CatalogProgram } from "./catalog";
import {
  OBGYN_SPECIALTY,
  PROGRAMS,
  REGION_BY_STATE,
  getProgram as getEnrichedProgram,
} from "./programs";
import type { Program, Region } from "./types";

export { OBGYN_SPECIALTY };

type PlaceStats = {
  region: Region;
  cityPopulation: number;
  costOfLiving: number;
  middleSchoolQuality: number;
  highSchoolQuality: number;
  inStateCollegeQuality: number;
  townQuality: number;
  waterProximity: number;
  waterNote: string;
  safety: number;
  walkability: number;
  climate: number;
};

function placeKey(city: string, state: string) {
  const normalized = city
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bst\b/g, "saint")
    .replace(/[^a-z0-9]/g, "");
  return `${normalized}|${state}`;
}

const placeByCity = new Map<string, PlaceStats>();
const collegeByState = new Map<string, { sum: number; count: number }>();

for (const program of PROGRAMS) {
  const key = placeKey(program.city, program.state);
  if (
    !placeByCity.has(key) &&
    program.cityPopulation != null &&
    program.costOfLiving != null &&
    program.middleSchoolQuality != null &&
    program.highSchoolQuality != null &&
    program.inStateCollegeQuality != null &&
    program.townQuality != null &&
    program.waterProximity != null &&
    program.safety != null &&
    program.walkability != null &&
    program.climate != null
  ) {
    placeByCity.set(key, {
      region: program.region,
      cityPopulation: program.cityPopulation,
      costOfLiving: program.costOfLiving,
      middleSchoolQuality: program.middleSchoolQuality,
      highSchoolQuality: program.highSchoolQuality,
      inStateCollegeQuality: program.inStateCollegeQuality,
      townQuality: program.townQuality,
      waterProximity: program.waterProximity,
      waterNote: program.waterNote,
      safety: program.safety,
      walkability: program.walkability,
      climate: program.climate,
    });
  }
  if (program.inStateCollegeQuality != null) {
    const current = collegeByState.get(program.state) ?? { sum: 0, count: 0 };
    current.sum += program.inStateCollegeQuality;
    current.count += 1;
    collegeByState.set(program.state, current);
  }
}

function collegeScore(state: string) {
  const row = collegeByState.get(state);
  if (!row || row.count === 0) return null;
  return Math.round(row.sum / row.count);
}

export function shortenProgramName(name: string) {
  return name.replace(/\s+Program$/i, "").trim();
}

function toDirectoryProgram(catalogProgram: CatalogProgram): Program {
  const place = placeByCity.get(placeKey(catalogProgram.city, catalogProgram.state));
  const region = place?.region ?? REGION_BY_STATE[catalogProgram.state] ?? "South";
  const inStateCollegeQuality = place?.inStateCollegeQuality ?? collegeScore(catalogProgram.state);
  return {
    id: catalogProgram.id,
    name: catalogProgram.name,
    shortName: shortenProgramName(catalogProgram.name),
    city: catalogProgram.city,
    state: catalogProgram.state,
    region,
    specialty: catalogProgram.specialty,
    coverage: place ? "place" : "basic",
    type: null,
    classSize: null,
    annualDeliveries: null,
    annualDeliveriesSource: null,
    annualDeliveriesNote: "",
    cityPopulation: place?.cityPopulation ?? null,
    costOfLiving: place?.costOfLiving ?? null,
    middleSchoolQuality: place?.middleSchoolQuality ?? null,
    highSchoolQuality: place?.highSchoolQuality ?? null,
    inStateCollegeQuality,
    programQuality: null,
    townQuality: place?.townQuality ?? null,
    waterProximity: place?.waterProximity ?? null,
    waterNote: place?.waterNote ?? "",
    percentMD: null,
    percentDO: null,
    percentIMG: null,
    doMdSource: null,
    fellowshipStrength: null,
    safety: place?.safety ?? null,
    walkability: place?.walkability ?? null,
    climate: place?.climate ?? null,
    highlights: [],
  };
}

const directoryCache = new Map<string, Program>();

/** Enriched obstetrics programs keep their existing ids. Every other program comes from the ACGME directory. */
export function getProgram(id: string | null | undefined): Program | undefined {
  if (!id) return undefined;
  const enriched = getEnrichedProgram(id);
  if (enriched) return enriched;
  const cached = directoryCache.get(id);
  if (cached) return cached;
  const catalogProgram = getCatalogProgram(id);
  if (!catalogProgram) return undefined;
  const program = toDirectoryProgram(catalogProgram);
  directoryCache.set(id, program);
  return program;
}

export function programsForSpecialties(specialties: readonly string[]): Program[] {
  const seen = new Set<string>();
  const programs: Program[] = [];
  for (const specialty of specialties) {
    const source =
      specialty === OBGYN_SPECIALTY
        ? PROGRAMS
        : catalogBySpecialty(specialty).map((program) => getProgram(program.id));
    for (const program of source) {
      if (!program || seen.has(program.id)) continue;
      seen.add(program.id);
      programs.push(program);
    }
  }
  return programs;
}

export function specialtyProgramCount(specialty: string) {
  if (specialty === OBGYN_SPECIALTY) return PROGRAMS.length;
  return catalogBySpecialty(specialty).length;
}

import data from "@/data/catalog.json";

export type CatalogProgram = {
  id: string;
  name: string;
  city: string;
  state: string;
  specialty: string;
  search: string;
};

const STATE_NAMES: Record<string, string> = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  DC: "district of columbia",
  FL: "florida",
  GA: "georgia",
  GU: "guam",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new hampshire",
  NJ: "new jersey",
  NM: "new mexico",
  NY: "new york",
  NC: "north carolina",
  ND: "north dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  PR: "puerto rico",
  RI: "rhode island",
  SC: "south carolina",
  SD: "south dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west virginia",
  WI: "wisconsin",
  WY: "wyoming",
};

function alias(specialty: string) {
  const value = specialty.toLowerCase();
  if (value.includes("obstetric") && value.includes("gynecology")) return "obgyn ob/gyn ob gyn";
  if (value === "family medicine") return "fm family med";
  if (value === "internal medicine") return "im";
  if (value === "emergency medicine") return "em";
  if (value === "pediatrics") return "peds";
  if (value === "psychiatry") return "psych";
  if (value === "internal medicine/pediatrics") return "med peds medpeds";
  if (value.startsWith("orthopaedic")) return "orthopedics orthopedic ortho";
  if (value.startsWith("anesthesiology")) return "anesthesia";
  return "";
}

function buildSearch(program: Omit<CatalogProgram, "search">) {
  return [
    program.name,
    program.city,
    program.state,
    STATE_NAMES[program.state] ?? "",
    program.specialty,
    alias(program.specialty),
  ]
    .join(" ")
    .toLowerCase();
}

const rows = data.programs as [string, string, string, string, string][];

export const CATALOG: CatalogProgram[] = rows.map(([id, name, city, state, specialty]) => {
  const program = { id, name, city, state, specialty };
  return { ...program, search: buildSearch(program) };
});

const byId = new Map(CATALOG.map((program) => [program.id, program]));

export function getCatalogProgram(id: string | null | undefined) {
  if (!id) return undefined;
  return byId.get(id);
}

export const SPECIALTIES = [...new Set(CATALOG.map((program) => program.specialty))].sort((a, b) =>
  a.localeCompare(b),
);

const bySpecialty = new Map<string, CatalogProgram[]>();
for (const program of CATALOG) {
  const list = bySpecialty.get(program.specialty);
  if (list) list.push(program);
  else bySpecialty.set(program.specialty, [program]);
}

export function catalogBySpecialty(specialty: string) {
  return bySpecialty.get(specialty) ?? [];
}

export function specialtySearchText(specialty: string) {
  return `${specialty} ${alias(specialty)}`.toLowerCase();
}

/** Core residencies applicants signal. Everything else in SPECIALTIES is still selectable. */
export const RESIDENCY_SPECIALTIES = [
  "Anesthesiology",
  "Child neurology",
  "Dermatology",
  "Emergency medicine",
  "Family medicine",
  "Internal medicine",
  "Internal medicine/Pediatrics",
  "Interventional radiology - integrated",
  "Medical genetics and genomics",
  "Neurological surgery",
  "Neurology",
  "Nuclear medicine",
  "Obstetrics and gynecology",
  "Ophthalmology",
  "Orthopaedic surgery",
  "Osteopathic neuromusculoskeletal medicine",
  "Otolaryngology - Head and Neck Surgery",
  "Pathology-anatomic and clinical",
  "Pediatrics",
  "Physical medicine and rehabilitation",
  "Plastic Surgery - Integrated",
  "Psychiatry",
  "Public health and general preventive medicine",
  "Radiation oncology",
  "Radiology-diagnostic",
  "Surgery",
  "Thoracic surgery - integrated",
  "Transitional year",
  "Urology",
  "Vascular surgery - integrated",
].filter((name) => SPECIALTIES.includes(name));

const RESIDENCY_SET = new Set<string>(RESIDENCY_SPECIALTIES);

export const CATALOG_GENERATED = data.generated;
export const CATALOG_COUNT = CATALOG.length;

export const SPECIALTY_CHIPS: { specialty: string; label: string }[] = [
  { specialty: "Family medicine", label: "Family med" },
  { specialty: "Internal medicine", label: "Internal med" },
  { specialty: "Obstetrics and gynecology", label: "OB/GYN" },
  { specialty: "Pediatrics", label: "Pediatrics" },
  { specialty: "Emergency medicine", label: "Emergency" },
  { specialty: "Surgery", label: "Surgery" },
  { specialty: "Psychiatry", label: "Psychiatry" },
  { specialty: "Anesthesiology", label: "Anesthesia" },
  { specialty: "Neurology", label: "Neurology" },
  { specialty: "Orthopaedic surgery", label: "Orthopedics" },
  { specialty: "Dermatology", label: "Dermatology" },
  { specialty: "Radiology-diagnostic", label: "Radiology" },
].filter((chip) => SPECIALTIES.includes(chip.specialty));

const SPECIALTY_LABELS = new Map(SPECIALTY_CHIPS.map((chip) => [chip.specialty, chip.label]));

export function specialtyLabel(specialty: string) {
  return SPECIALTY_LABELS.get(specialty) ?? specialty;
}

function tokenHits(program: CatalogProgram, token: string) {
  if (token.length <= 2) {
    if (program.state.toLowerCase() === token) return true;
    return program.search.split(/[^a-z0-9]+/).some((word) => word.startsWith(token));
  }
  return program.search.includes(token);
}

export function searchCatalog(
  query: string,
  specialty: string | readonly string[] = "",
  limit = 40,
) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const names = typeof specialty === "string" ? (specialty ? [specialty] : []) : specialty;
  const allowed = names.length > 0 ? new Set<string>(names) : null;
  const pool = allowed
    ? CATALOG.filter((program) => allowed.has(program.specialty))
    : CATALOG.filter((program) => RESIDENCY_SET.has(program.specialty));
  if (tokens.length === 0) {
    return {
      matches: allowed ? pool.slice(0, limit) : [],
      total: pool.length,
    };
  }
  const matched = pool.filter((program) => tokens.every((token) => tokenHits(program, token)));
  return { matches: matched.slice(0, limit), total: matched.length };
}

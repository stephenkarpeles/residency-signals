export type ProgramType = "University" | "Hybrid" | "Community";
export type Region = "Northeast" | "Midwest" | "South" | "West";
export type DoMdSource = "published" | "estimated" | "roster";
export type DeliverySource = "published" | "sparcs" | "hcai" | "cms" | "estimated";

export type ProgramCoverage = "full" | "place" | "basic";

export type Program = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  region: Region;
  specialty: string;
  /** full = program stats, place = city stats only, basic = name and location */
  coverage: ProgramCoverage;
  type: ProgramType | null;
  classSize: number | null;
  annualDeliveries: number | null;
  annualDeliveriesSource: DeliverySource | null;
  annualDeliveriesNote: string;
  cityPopulation: number | null;
  costOfLiving: number | null;
  middleSchoolQuality: number | null;
  highSchoolQuality: number | null;
  inStateCollegeQuality: number | null;
  programQuality: number | null;
  townQuality: number | null;
  waterProximity: number | null;
  waterNote: string;
  percentMD: number | null;
  percentDO: number | null;
  percentIMG: number | null;
  doMdSource: DoMdSource | null;
  fellowshipStrength: number | null;
  safety: number | null;
  walkability: number | null;
  climate: number | null;
  highlights: string[];
};

export type FactorId =
  | "programQuality"
  | "inStateColleges"
  | "schools"
  | "affordability"
  | "townQuality"
  | "water"
  | "fellowship"
  | "classSize"
  | "doRepresentation"
  | "citySize"
  | "safety"
  | "walkability"
  | "climate";

export type Weights = Record<FactorId, number>;

export type FactorDef = {
  id: FactorId;
  label: string;
  description: string;
  defaultWeight: number;
  suggested?: boolean;
};

export type Selections = {
  gold: (string | null)[];
  silver: (string | null)[];
  considering: (string | null)[];
};

export type SignalTier = "gold" | "silver" | "considering";

export type DeliveryBandId =
  | "low"
  | "medium"
  | "mediumHigh"
  | "high"
  | "veryHigh"
  | "extremelyHigh";

export type SortKey =
  | "score"
  | "name"
  | "col"
  | "classSize"
  | "deliveries"
  | "do"
  | "population"
  | "schools";

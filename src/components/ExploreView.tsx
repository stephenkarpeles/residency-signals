"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProgramCard } from "@/components/ProgramCard";
import { useApp } from "@/context/AppProvider";
import { specialtyLabel } from "@/lib/catalog";
import { programsForSpecialties } from "@/lib/directory";
import { DELIVERY_BANDS, REGIONS, STATE_NAMES, deliveryBandId } from "@/lib/programs";
import { colLabel, formatPopulation, matchScore } from "@/lib/scoring";
import type { DeliveryBandId, ProgramType, SortKey } from "@/lib/types";

const TYPES: ProgramType[] = ["University", "Hybrid", "Community"];

const TYPE_LABELS: Record<ProgramType, string> = {
  University: "University · academic",
  Hybrid: "Hybrid · academic + community",
  Community: "Community · community-based",
};

const CITY_NICKNAMES: Record<string, string> = {
  "Oklahoma City": "okc",
  "New York": "nyc manhattan",
  "Los Angeles": "la",
  "San Francisco": "sf bay",
  "Washington": "dc d.c.",
  "Las Vegas": "vegas",
  "New Orleans": "nola",
  "Philadelphia": "philly",
  "Chicago": "chi",
  "Atlanta": "atl",
  "Houston": "hou",
  "Dallas": "dfw",
  "Fort Worth": "dfw",
  "Arlington": "dfw",
  "Miami": "mia",
  "Boston": "bos",
  "Seattle": "sea",
  "Phoenix": "phx",
  "St. Louis": "stl",
  "St Louis": "stl",
  "Kansas City": "kc",
  Peoria: "osf st francis saint francis hospital",
  Maywood: "loyola",
  Aurora: "anschutz",
  Columbia: "mizzou",
  Wichita: "kumc",
};

const PROGRAM_NICKNAMES: Record<string, string> = {
  "ku-wichita": "kumc kumc wichita ku wichita",
  "ssm-okc": "saint anthony st anthony st. anthony",
  "osu-tulsa-osteopathic": "oklahoma state osu tulsa",
  "ou-tulsa": "ou tulsa oklahoma tulsa",
  missouri: "mizzou mizzou columbia",
  "cape-fear-valley": "cape fear fayetteville",
  "uk-bowling-green": "med center health medical center bowling green mch the medical center",
  colorado: "anschutz cu anschutz university of colorado aurora",
  buffalo: "university of buffalo ub buffalo",
  "buffalo-sisters": "sisters of charity sisters buffalo",
  "advocate-aurora-milwaukee": "aurora healthcare aurora milwaukee aurora health",
  "saint-joseph-denver": "st joseph denver st. joseph hospital denver",
  loyola: "loyola maywood stritch",
  umkc: "umkc truman",
  oklahoma: "ou oklahoma city ouhsc university of oklahoma",
  nebraska: "unmc university of nebraska omaha",
  "creighton-omaha": "creighton omaha",
  "advocate-illinois-masonic": "illinois masonic masonic chicago",
  "uic-peoria-osf": "uic peoria osf peoria",
  uams: "university of arkansas uams little rock",
  "ut-chattanooga": "uetc uetcom utcom chattanooga erlanger",
  "nymc-passaic": "st marys st mary's st. mary's passaic",
  "westchester-nymc": "westchester valhalla westchester medical center",
};

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "hospital",
  "hospitals",
  "in",
  "of",
  "or",
  "program",
  "programs",
  "residency",
  "the",
  "to",
]);

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = cur;
    }
  }
  return row[b.length];
}

const POPULATION_STEPS = [
  0, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, Number.POSITIVE_INFINITY,
] as const;

const COL_STEPS = [0, 85, 95, 100, 105, 120, 150, Number.POSITIVE_INFINITY] as const;

function populationSummary(minValue: number, maxValue: number): string {
  const minAny = minValue === 0;
  const maxAny = !Number.isFinite(maxValue);
  if (minAny && maxAny) return "Any";
  if (minAny) return `Up to ${formatPopulation(maxValue)}`;
  if (maxAny) return `${formatPopulation(minValue)}+`;
  return `${formatPopulation(minValue)} – ${formatPopulation(maxValue)}`;
}

function colStepLabel(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "Any";
  return `${value} · ${colLabel(value)}`;
}

function colSummary(minValue: number, maxValue: number): string {
  const minAny = minValue === 0;
  const maxAny = !Number.isFinite(maxValue);
  if (minAny && maxAny) return "Any";
  if (minAny) return `Up to ${maxValue} · ${colLabel(maxValue)}`;
  if (maxAny) return `${minValue}+ · ${colLabel(minValue)}`;
  return `${minValue} – ${maxValue}`;
}

function tokenMatchesHay(token: string, hay: string): boolean {
  if (hay.includes(token)) return true;
  if (token === "st" || token === "st.") return hay.includes("saint");
  if (token.length < 5) return false;
  const maxDist = token.length >= 8 ? 2 : 1;
  return hay
    .split(/[^a-z]+/)
    .some(
      (word) =>
        word.length >= 5 &&
        Math.abs(word.length - token.length) <= maxDist &&
        editDistance(token, word) <= maxDist,
    );
}

function compareNullable(a: number | null, b: number | null, direction: "asc" | "desc") {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function ExploreView() {
  const {
    weights,
    specialties,
  } = useApp();
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [deliveryBands, setDeliveryBands] = useState<string[]>([]);
  const [minDO, setMinDO] = useState(0);
  const [minMD, setMinMD] = useState(0);
  const [minPopIndex, setMinPopIndex] = useState(0);
  const [maxPopIndex, setMaxPopIndex] = useState(POPULATION_STEPS.length - 1);
  const [minColIndex, setMinColIndex] = useState(0);
  const [maxColIndex, setMaxColIndex] = useState(COL_STEPS.length - 1);
  const [waterfront, setWaterfront] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  const programs = useMemo(() => programsForSpecialties(specialties), [specialties]);
  const clinical = programs.some((program) => program.coverage === "full");
  const placeStats = programs.some((program) => program.cityPopulation != null);
  const advancedActive =
    (clinical && types.length > 0) ||
    (placeStats &&
      (minPopIndex > 0 ||
        maxPopIndex < POPULATION_STEPS.length - 1 ||
        minColIndex > 0 ||
        maxColIndex < COL_STEPS.length - 1));
  const showSpecialty = specialties.length > 1;

  const stateOptions = useMemo(() => {
    const codes = [...new Set(programs.map((program) => program.state))].sort();
    if (regions.length === 0) return codes;
    return codes.filter((code) =>
      programs.some((program) => program.state === code && regions.includes(program.region)),
    );
  }, [programs, regions]);

  useEffect(() => {
    setStates((current) => {
      const next = current.filter((code) => stateOptions.includes(code));
      return next.length === current.length ? current : next;
    });
  }, [stateOptions]);

  useEffect(() => {
    setPage(1);
  }, [
    specialties,
    query,
    regions,
    states,
    types,
    deliveryBands,
    minDO,
    minMD,
    minPopIndex,
    maxPopIndex,
    minColIndex,
    maxColIndex,
    waterfront,
    sort,
  ]);

  useEffect(() => {
    if (!clinical && (sort === "classSize" || sort === "deliveries" || sort === "do")) {
      setSort("score");
    }
    if (!placeStats && (sort === "col" || sort === "population" || sort === "schools")) {
      setSort("score");
    }
  }, [clinical, placeStats, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const populationActive = minPopIndex > 0 || maxPopIndex < POPULATION_STEPS.length - 1;
    const colActive = minColIndex > 0 || maxColIndex < COL_STEPS.length - 1;
    const rows = programs.filter((program) => {
      if (regions.length > 0 && !regions.includes(program.region)) return false;
      if (states.length > 0 && !states.includes(program.state)) return false;
      if (clinical && types.length > 0 && (program.type == null || !types.includes(program.type))) {
        return false;
      }
      if (
        clinical &&
        deliveryBands.length > 0 &&
        (program.annualDeliveries == null ||
          !deliveryBands.includes(deliveryBandId(program.annualDeliveries)))
      ) {
        return false;
      }
      if (clinical && minDO > 0 && (program.percentDO == null || program.percentDO < minDO)) return false;
      if (clinical && minMD > 0 && (program.percentMD == null || program.percentMD < minMD)) return false;
      if (placeStats && populationActive) {
        if (program.cityPopulation == null) return false;
        if (program.cityPopulation < POPULATION_STEPS[minPopIndex]) return false;
        if (program.cityPopulation > POPULATION_STEPS[maxPopIndex]) return false;
      }
      if (placeStats && colActive) {
        if (program.costOfLiving == null) return false;
        if (program.costOfLiving < COL_STEPS[minColIndex]) return false;
        if (program.costOfLiving > COL_STEPS[maxColIndex]) return false;
      }
      if (placeStats && waterfront && (program.waterProximity == null || program.waterProximity < 70)) {
        return false;
      }
      if (!q) return true;
      const nick = CITY_NICKNAMES[program.city] ?? "";
      const programNick = PROGRAM_NICKNAMES[program.id] ?? "";
      const hay =
        `${program.name} ${program.shortName} ${program.city} ${program.state} ${STATE_NAMES[program.state] ?? ""} ${program.highlights.join(" ")} ${nick} ${programNick}`.toLowerCase();
      const tokens = q.split(/\s+/).filter((token) => !SEARCH_STOPWORDS.has(token));
      if (tokens.length === 0) return true;
      return tokens.every((token) => tokenMatchesHay(token, hay));
    });

    rows.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.shortName.localeCompare(b.shortName);
        case "col":
          return compareNullable(a.costOfLiving, b.costOfLiving, "asc") || a.shortName.localeCompare(b.shortName);
        case "classSize":
          return compareNullable(a.classSize, b.classSize, "desc") || a.shortName.localeCompare(b.shortName);
        case "deliveries":
          return (
            compareNullable(a.annualDeliveries, b.annualDeliveries, "desc") ||
            a.shortName.localeCompare(b.shortName)
          );
        case "do":
          return compareNullable(a.percentDO, b.percentDO, "desc") || a.shortName.localeCompare(b.shortName);
        case "population":
          return (
            compareNullable(a.cityPopulation, b.cityPopulation, "desc") ||
            a.shortName.localeCompare(b.shortName)
          );
        case "schools": {
          const aSchools =
            a.middleSchoolQuality != null && a.highSchoolQuality != null
              ? a.middleSchoolQuality + a.highSchoolQuality
              : null;
          const bSchools =
            b.middleSchoolQuality != null && b.highSchoolQuality != null
              ? b.middleSchoolQuality + b.highSchoolQuality
              : null;
          return compareNullable(aSchools, bSchools, "desc") || a.shortName.localeCompare(b.shortName);
        }
        default:
          return compareNullable(matchScore(a, weights), matchScore(b, weights), "desc") ||
            a.shortName.localeCompare(b.shortName);
      }
    });
    return rows;
  }, [
    programs,
    clinical,
    placeStats,
    query,
    regions,
    states,
    types,
    deliveryBands,
    minDO,
    minMD,
    minPopIndex,
    maxPopIndex,
    minColIndex,
    maxColIndex,
    waterfront,
    sort,
    weights,
  ]);

  const specialtyNames = specialties.map((name) => specialtyLabel(name)).join(", ");
  const needsDirectoryNote = programs.some((program) => program.coverage !== "full");

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Explore
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Assign your 3 Gold and 15 Silver signals
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 py-1">
          {specialties.map((name) => (
            <span
              key={name}
              className="inline-flex h-7 items-center rounded-full border border-stone-300 bg-white px-3 text-[12px] font-medium leading-none text-stone-700"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
          Search {programs.length.toLocaleString()} {specialtyNames} programs, then drag one into an
          open gold, silver, or considering slot on the left — or tap Gold / Silver / Consider on a
          card. Scores update live from your Important Factors.
        </p>
        {needsDirectoryNote ? (
          <p className="mt-2 text-[13px] leading-relaxed text-stone-400">
            Detailed program stats are included for obstetrics and gynecology. Other specialties
            come from the ACGME directory, and scores use city and state factors when we have them.
          </p>
        ) : null}
      </header>

      <div className="mt-8 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <label className="sr-only" htmlFor="program-search">
              Search programs
            </label>
            <input
              id="program-search"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by program, city, or state"
              className="w-full rounded-xl border border-stone-200 bg-[#FBF9F6] py-2.5 pr-10 pl-4 text-[14px] text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#C4A35A] focus:ring-2 focus:ring-[#C4A35A]/20"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-stone-200 bg-[#FBF9F6] py-2.5 pr-9 pl-3 text-[13px] text-stone-700 outline-none focus:border-[#C4A35A]"
          >
            <option value="score">Sort: Match Score</option>
            <option value="name">Sort: Name</option>
            {placeStats ? <option value="col">Sort: Cost of Living</option> : null}
            {clinical ? <option value="classSize">Sort: Class Size</option> : null}
            {clinical ? <option value="deliveries">Sort: Deliveries</option> : null}
            {clinical ? <option value="do">Sort: % DO</option> : null}
            {placeStats ? <option value="population">Sort: City Size</option> : null}
            {placeStats ? <option value="schools">Sort: School Quality</option> : null}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <MultiSelect label="Region" values={regions} onChange={setRegions} options={REGIONS} />
          <MultiSelect
            label="State"
            values={states}
            onChange={setStates}
            options={stateOptions}
            formatOption={(code) => `${code} · ${STATE_NAMES[code] ?? code}`}
          />
          {clinical ? (
            <MultiSelect
              label="Deliveries"
              values={deliveryBands}
              onChange={setDeliveryBands}
              options={DELIVERY_BANDS.map((band) => band.id)}
              formatOption={(id) =>
                DELIVERY_BANDS.find((band) => band.id === (id as DeliveryBandId))?.label ?? id
              }
            />
          ) : null}
          {placeStats ? (
            <Toggle pressed={waterfront} onClick={() => setWaterfront((v) => !v)}>
              Near water
            </Toggle>
          ) : null}
        </div>

        {clinical ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <PercentSlider
              label="Min DO %"
              value={minDO}
              onChange={setMinDO}
              accent="gold"
            />
            <PercentSlider
              label="Min MD %"
              value={minMD}
              onChange={setMinMD}
              accent="green"
            />
          </div>
        ) : null}

        {clinical || placeStats ? (
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
          className={`mt-3 text-[13px] font-medium ${
            advancedActive ? "text-[#8A6A2A]" : "text-stone-500 hover:text-stone-700"
          }`}
        >
          {advancedOpen ? "Hide advanced filters" : "Advanced filters"}
          {!advancedOpen && advancedActive ? " · on" : ""}
        </button>
        ) : null}

        {advancedOpen && (clinical || placeStats) ? (
          <div className="mt-3 space-y-2">
            {clinical ? (
              <MultiSelect
                label="Type"
                values={types}
                onChange={setTypes}
                options={TYPES}
                emptyLabel="Any type"
                formatOption={(value) => TYPE_LABELS[value as ProgramType] ?? value}
              />
            ) : null}
            {placeStats ? (
              <>
                <PopulationSlider
                  minIndex={minPopIndex}
                  maxIndex={maxPopIndex}
                  onChangeMin={(index) => {
                    setMinPopIndex(index);
                    if (index > maxPopIndex) setMaxPopIndex(index);
                  }}
                  onChangeMax={(index) => {
                    setMaxPopIndex(index);
                    if (index < minPopIndex) setMinPopIndex(index);
                  }}
                />
                <ColSlider
                  minIndex={minColIndex}
                  maxIndex={maxColIndex}
                  onChangeMin={(index) => {
                    setMinColIndex(index);
                    if (index > maxColIndex) setMaxColIndex(index);
                  }}
                  onChangeMax={(index) => {
                    setMaxColIndex(index);
                    if (index < minColIndex) setMinColIndex(index);
                  }}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-[13px] text-stone-500">
        {filtered.length} program{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(filtered.length > 360 ? filtered.slice(0, page * 72) : filtered).map((program) => (
          <ProgramCard key={program.id} program={program} showSpecialty={showSpecialty} />
        ))}
      </div>
      {filtered.length > 360 && page * 72 < filtered.length ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="rounded-xl bg-white px-4 py-2 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-[#FBF9F6]"
          >
            Show more · {(filtered.length - page * 72).toLocaleString()} left
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-medium text-stone-800">No programs match those filters</p>
          <p className="mt-1 text-sm text-stone-500">Try clearing a filter or searching a different city.</p>
        </div>
      ) : null}
    </div>
  );
}

function MultiSelect({
  label,
  values,
  onChange,
  options,
  formatOption,
  emptyLabel = "All",
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly string[];
  formatOption?: (value: string) => string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = values.filter((value) => options.includes(value));
  const summary =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? (formatOption?.(selected[0]) ?? selected[0])
        : `${selected.length} selected`;

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option],
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] ${
          selected.length > 0
            ? "border-[#E6D5A3] bg-[#FBF6E8] text-stone-800"
            : "border-stone-200 bg-[#FBF9F6] text-stone-600"
        }`}
      >
        <span className="text-stone-400">{label}</span>
        <span className="max-w-[220px] truncate font-medium text-stone-800">{summary}</span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-64 min-w-[260px] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-[0_8px_24px_rgba(28,25,23,0.12)]"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-stone-600 hover:bg-[#FBF9F6]"
            onClick={() => onChange([])}
          >
            <span className="w-4 text-center text-[#C4A35A]">{selected.length === 0 ? "✓" : ""}</span>
            {emptyLabel}
          </button>
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-stone-800 hover:bg-[#FBF9F6]"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    checked
                      ? "border-[#C4A35A] bg-[#C4A35A] text-white"
                      : "border-stone-300 bg-white"
                  }`}
                >
                  {checked ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M2 5.2L4.1 7.3 8 2.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                {formatOption?.(option) ?? option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PercentSlider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accent: "gold" | "green";
}) {
  const active = value > 0;
  return (
    <label
      className={`rounded-xl border px-3 py-2.5 ${
        active
          ? accent === "gold"
            ? "border-[#E6D5A3] bg-[#FBF6E8]"
            : "border-[#C5D4CE] bg-[#F3F7F5]"
          : "border-stone-200 bg-[#FBF9F6]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold tabular-nums text-stone-800">
          {value === 0 ? "Any" : `${value}%`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent === "gold" ? "accent-[#C4A35A]" : "accent-[#3F5C51]"}`}
      />
    </label>
  );
}

function PopulationSlider({
  minIndex,
  maxIndex,
  onChangeMin,
  onChangeMax,
}: {
  minIndex: number;
  maxIndex: number;
  onChangeMin: (index: number) => void;
  onChangeMax: (index: number) => void;
}) {
  const last = POPULATION_STEPS.length - 1;
  const minValue = POPULATION_STEPS[minIndex];
  const maxValue = POPULATION_STEPS[maxIndex];
  const active = minIndex > 0 || maxIndex < last;
  const minLabel = minIndex === 0 ? "Any" : formatPopulation(minValue);
  const maxLabel = maxIndex === last ? "Any" : formatPopulation(maxValue);

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        active ? "border-[#E6D5A3] bg-[#FBF6E8]" : "border-stone-200 bg-[#FBF9F6]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-stone-500">Town population</span>
        <span className="font-semibold tabular-nums text-stone-800">
          {populationSummary(minValue, maxValue)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
            Min
            <span className="tabular-nums text-stone-600">{minLabel}</span>
          </span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={minIndex}
            aria-label="Minimum town population"
            onChange={(e) => onChangeMin(Number(e.target.value))}
            className="w-full accent-[#C4A35A]"
          />
        </label>
        <label>
          <span className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
            Max
            <span className="tabular-nums text-stone-600">{maxLabel}</span>
          </span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={maxIndex}
            aria-label="Maximum town population"
            onChange={(e) => onChangeMax(Number(e.target.value))}
            className="w-full accent-[#C4A35A]"
          />
        </label>
      </div>
    </div>
  );
}

function ColSlider({
  minIndex,
  maxIndex,
  onChangeMin,
  onChangeMax,
}: {
  minIndex: number;
  maxIndex: number;
  onChangeMin: (index: number) => void;
  onChangeMax: (index: number) => void;
}) {
  const last = COL_STEPS.length - 1;
  const minValue = COL_STEPS[minIndex];
  const maxValue = COL_STEPS[maxIndex];
  const active = minIndex > 0 || maxIndex < last;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        active ? "border-[#E6D5A3] bg-[#FBF6E8]" : "border-stone-200 bg-[#FBF9F6]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-stone-500">Cost of living</span>
        <span className="font-semibold tabular-nums text-stone-800">
          {colSummary(minValue, maxValue)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
            Min
            <span className="tabular-nums text-stone-600">{colStepLabel(minValue)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={minIndex}
            aria-label="Minimum cost of living"
            onChange={(e) => onChangeMin(Number(e.target.value))}
            className="w-full accent-[#C4A35A]"
          />
        </label>
        <label>
          <span className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
            Max
            <span className="tabular-nums text-stone-600">{colStepLabel(maxValue)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={maxIndex}
            aria-label="Maximum cost of living"
            onChange={(e) => onChangeMax(Number(e.target.value))}
            className="w-full accent-[#C4A35A]"
          />
        </label>
      </div>
    </div>
  );
}

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
        pressed
          ? "border-[#C4A35A] bg-[#F3E6C0] text-[#6F5420]"
          : "border-stone-200 bg-[#FBF9F6] text-stone-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

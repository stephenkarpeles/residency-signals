"use client";

import { useApp } from "@/context/AppProvider";
import { CONSIDERING_SLOTS, FACTORS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";
import { getProgram } from "@/lib/directory";
import { colLabel, deliverySourceLabel, factorScore, formatDeliveries, formatPopulation, matchScore, matchUsesPartialData } from "@/lib/scoring";

export function ProgramModal() {
  const { detailId, setDetailId, assign, unassign, findSlot, weights, goldCount, silverCount, consideringCount } =
    useApp();
  const program = getProgram(detailId);
  if (!program) return null;
  const slot = findSlot(program.id);
  const score = matchScore(program, weights);
  const partial = score != null && matchUsesPartialData(program, weights);
  const schoolAvg =
    program.middleSchoolQuality != null && program.highSchoolQuality != null
      ? Math.round((program.middleSchoolQuality + program.highSchoolQuality) / 2)
      : null;
  const scoredFactors = FACTORS.filter(
    (factor) => (weights[factor.id] ?? 0) > 0 && factorScore(program, factor.id) != null,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/35"
        aria-label="Close details"
        onClick={() => setDetailId(null)}
      />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">
              {program.coverage === "full" && program.type
                ? `${program.type} · ${program.region}`
                : `${program.specialty} · ${program.region}`}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
              {program.shortName}
            </h2>
            <p className="mt-1 text-sm text-stone-500">{program.name}</p>
            <p className="mt-1 text-sm text-stone-500">
              {program.city}, {program.state}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F4F1EB] px-3 py-2 text-right">
            <p className="text-[10px] tracking-wide text-stone-500 uppercase">Match</p>
            <p className="text-2xl font-semibold tabular-nums">
              {score == null ? "—" : score.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {program.cityPopulation != null ? (
            <Fact label="Population" value={formatPopulation(program.cityPopulation)} />
          ) : null}
          {program.costOfLiving != null ? (
            <Fact
              label="Cost of living"
              value={`${program.costOfLiving}`}
              hint={colLabel(program.costOfLiving)}
            />
          ) : null}
          {program.classSize != null ? (
            <Fact label="Class size" value={`${program.classSize}`} hint="per year" />
          ) : null}
          {program.annualDeliveries != null ? (
            <Fact
              label="Deliveries"
              value={formatDeliveries(program.annualDeliveries)}
              hint={`${deliverySourceLabel(program.annualDeliveriesSource ?? "estimated")} · per year`}
            />
          ) : null}
          {program.waterProximity != null ? (
            <Fact label="Water" value={`${program.waterProximity}`} hint={program.waterNote} />
          ) : null}
        </div>
        {program.annualDeliveriesNote ? (
          <p className="mt-2 text-[11px] text-stone-400">{program.annualDeliveriesNote}</p>
        ) : null}

        {program.percentMD != null && program.percentDO != null && program.percentIMG != null ? (
          <div className="mt-5 rounded-2xl bg-[#FBF9F6] p-4">
            <div className="mb-2 flex justify-between text-[12px] text-stone-500">
              <span>MD {program.percentMD}%</span>
              <span>DO {program.percentDO}%</span>
              <span>IMG {program.percentIMG}%</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-stone-200">
              <span className="bg-[#3F5C51]" style={{ width: `${program.percentMD}%` }} />
              <span className="bg-[#C4A35A]" style={{ width: `${program.percentDO}%` }} />
              <span className="bg-stone-400" style={{ width: `${program.percentIMG}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-stone-400">
              {program.doMdSource === "roster"
                ? "Resident mix counted from the program's current resident roster."
                : program.doMdSource === "published"
                  ? "Resident mix from 2026 FREIDA program surveys (three-year averages)."
                  : "Resident mix estimated from program type and typical mix."}
            </p>
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {program.programQuality != null ? (
            <ScoreRow label="Program quality" value={program.programQuality} />
          ) : null}
          {program.fellowshipStrength != null ? (
            <ScoreRow label="Fellowship strength" value={program.fellowshipStrength} />
          ) : null}
          {program.middleSchoolQuality != null ? (
            <ScoreRow label="Middle schools" value={program.middleSchoolQuality} />
          ) : null}
          {program.highSchoolQuality != null ? (
            <ScoreRow label="High schools" value={program.highSchoolQuality} />
          ) : null}
          {program.inStateCollegeQuality != null ? (
            <ScoreRow label="In-state colleges" value={program.inStateCollegeQuality} />
          ) : null}
          {program.townQuality != null ? (
            <ScoreRow label="Town / amenities" value={program.townQuality} />
          ) : null}
          {program.safety != null ? <ScoreRow label="Safety (metro)" value={program.safety} /> : null}
          {program.walkability != null ? (
            <ScoreRow label="Walkability" value={program.walkability} />
          ) : null}
        </dl>

        {schoolAvg != null || program.climate != null ? (
          <p className="mt-2 text-[12px] text-stone-400">
            {schoolAvg != null ? `Combined public-school score ${schoolAvg}. ` : ""}
            {program.climate != null ? `Climate livability ${program.climate}.` : ""}
          </p>
        ) : null}
        {partial ? (
          <p className="mt-2 text-[12px] leading-relaxed text-stone-400">
            This score uses the city and state factors we have. Program quality, class size,
            deliveries, and resident mix are not in for this specialty yet, so they are left out.
          </p>
        ) : null}

        {program.highlights.length > 0 ? (
          <ul className="mt-5 space-y-1.5">
            {program.highlights.map((item) => (
              <li key={item} className="text-[14px] text-stone-600 before:mr-2 before:text-[#C4A35A] before:content-['•']">
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6">
          <p className="text-[11px] font-semibold tracking-wide text-stone-400 uppercase">
            How this program scores for you
          </p>
          <div className="mt-2 space-y-2">
            {scoredFactors.map((factor) => {
              const value = factorScore(program, factor.id) ?? 0;
              return (
                <div key={factor.id} className="flex items-center gap-3 text-[12px]">
                  <span className="w-40 truncate text-stone-500">{factor.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <span className="block h-full bg-[#3F5C51]" style={{ width: `${value}%` }} />
                  </span>
                  <span className="w-10 text-right tabular-nums text-stone-700">
                    {Math.round(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {slot ? (
            <button
              type="button"
              onClick={() => unassign(program.id)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              Remove from {slot.tier}
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={slot?.tier === "gold"}
            disabled={slot?.tier !== "gold" && goldCount >= GOLD_SLOTS}
            onClick={() => assign(program.id, "gold")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 ${
              slot?.tier === "gold"
                ? "bg-[#C4A35A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]"
                : "bg-[#C4A35A] hover:bg-[#B3944C]"
            }`}
          >
            Signal gold
          </button>
          <button
            type="button"
            aria-pressed={slot?.tier === "silver"}
            disabled={slot?.tier !== "silver" && silverCount >= SILVER_SLOTS}
            onClick={() => assign(program.id, "silver")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 ${
              slot?.tier === "silver"
                ? "bg-stone-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]"
                : "bg-stone-800 hover:bg-stone-700"
            }`}
          >
            Signal silver
          </button>
          <button
            type="button"
            aria-pressed={slot?.tier === "considering"}
            disabled={slot?.tier !== "considering" && consideringCount >= CONSIDERING_SLOTS}
            onClick={() => assign(program.id, "considering")}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 ${
              slot?.tier === "considering"
                ? "bg-[#3F5C51] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]"
                : "bg-[#3F5C51] hover:bg-[#344c43]"
            }`}
          >
            Considering
          </button>
          <button
            type="button"
            onClick={() => setDetailId(null)}
            className="ml-auto rounded-xl px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-[#FBF9F6] px-3 py-3">
      <p className="text-[10px] tracking-wide text-stone-400 uppercase">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-stone-900">{value}</p>
      {hint ? <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500">{hint}</p> : null}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#FBF9F6] px-3 py-2.5 text-[13px]">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-stone-900">{value}</dd>
    </div>
  );
}

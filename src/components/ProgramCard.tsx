"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { CONSIDERING_SLOTS, GOLD_SLOTS, SILVER_SLOTS } from "@/lib/factors";
import { colLabel, formatDeliveries, formatPopulation, matchScore, matchUsesPartialData } from "@/lib/scoring";
import type { Program } from "@/lib/types";

export function ProgramCard({
  program,
  overlay = false,
  showSpecialty = false,
}: {
  program: Program;
  overlay?: boolean;
  showSpecialty?: boolean;
}) {
  const { weights, findSlot, assign, unassign, setDetailId, goldCount, silverCount, consideringCount } =
    useApp();
  const [mounted, setMounted] = useState(false);
  const slot = findSlot(program.id);
  const score = matchScore(program, weights);
  const partial = score != null && matchUsesPartialData(program, weights);
  const stats = cardStats(program);
  const draggable = useDraggable({
    id: `card-${program.id}`,
    data: { programId: program.id, from: "card" },
    disabled: overlay || !mounted,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const transform = !overlay ? CSS.Translate.toString(draggable.transform) : undefined;
  const dragProps = !overlay && mounted ? { ...draggable.listeners, ...draggable.attributes } : {};

  return (
    <article
      ref={overlay ? undefined : draggable.setNodeRef}
      style={transform ? { transform } : undefined}
      {...dragProps}
      className={`flex h-full flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow ${
        overlay ? "" : "cursor-grab active:cursor-grabbing"
      } ${
        slot?.tier === "gold"
          ? "border-[#E6D5A3]"
          : slot?.tier === "silver"
            ? "border-stone-300"
            : slot?.tier === "considering"
              ? "border-[#C5D4CE]"
              : "border-stone-200/80"
      } ${draggable.isDragging && !overlay ? "opacity-30" : ""} ${
        overlay ? "shadow-xl ring-1 ring-stone-200" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">
            {program.coverage === "full" && program.type
              ? `${program.type} · ${program.region}`
              : program.region}
          </p>
          <h3 className="mt-1 line-clamp-3 text-[15px] leading-snug font-semibold text-stone-900">
            {program.shortName}
          </h3>
          <p className="mt-0.5 text-[13px] text-stone-500">
            {program.city}, {program.state}
          </p>
          {showSpecialty ? (
            <p className="mt-0.5 text-[12px] text-stone-400">{program.specialty}</p>
          ) : null}
        </div>
        {score == null ? null : (
          <div
            className="rounded-2xl bg-[#F3E6C0] px-2.5 py-1.5 text-right"
            title={
              partial
                ? "Scored from the city and state factors we have. Program-specific stats are not in for this specialty yet."
                : undefined
            }
          >
            <p className="text-[10px] tracking-wide text-[#8A6A2A] uppercase">Match</p>
            <p className="text-lg leading-none font-semibold tabular-nums text-[#6F5420]">
              {score.toFixed(1)}
            </p>
            {partial ? <p className="mt-0.5 text-[9px] text-[#8A6A2A]">City data</p> : null}
          </div>
        )}
      </div>

      {stats.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[12px]">
          {stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-[12px] leading-relaxed text-stone-400">
          City and program stats are not in for this program yet. You can still signal it.
        </p>
      )}

      {program.percentMD != null && program.percentDO != null && program.percentIMG != null ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-stone-500">
            <span>MD {program.percentMD}%</span>
            <span>DO {program.percentDO}%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-stone-100">
            <span className="bg-[#3F5C51]" style={{ width: `${program.percentMD}%` }} />
            <span className="bg-[#C4A35A]" style={{ width: `${program.percentDO}%` }} />
            <span className="bg-stone-300" style={{ width: `${program.percentIMG}%` }} />
          </div>
        </div>
      ) : null}

      {slot ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p
            className={`text-[11px] font-medium ${
              slot.tier === "considering" ? "text-[#3F5C51]" : "text-[#8A6A2A]"
            }`}
          >
            {slot.tier === "gold"
              ? `Gold signal ${slot.index + 1}`
              : slot.tier === "silver"
                ? `Silver signal ${slot.index + 1}`
                : `Considering ${slot.index + 1}`}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => unassign(program.id)}
            className="shrink-0 rounded-xl px-2 py-0.5 text-[11px] text-stone-500 hover:bg-stone-100"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setDetailId(program.id)}
          className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium text-stone-600 hover:bg-stone-100"
        >
          Details
        </button>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            disabled={slot?.tier !== "gold" && goldCount >= GOLD_SLOTS}
            onClick={() => assign(program.id, "gold")}
            className="rounded-xl bg-[#F3E6C0] px-2.5 py-1.5 text-[12px] font-medium text-[#6F5420] hover:bg-[#EAD7A0] disabled:opacity-40"
          >
            Gold
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            disabled={slot?.tier !== "silver" && silverCount >= SILVER_SLOTS}
            onClick={() => assign(program.id, "silver")}
            className="rounded-xl bg-stone-200 px-2.5 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-300 disabled:opacity-40"
          >
            Silver
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            disabled={slot?.tier !== "considering" && consideringCount >= CONSIDERING_SLOTS}
            onClick={() => assign(program.id, "considering")}
            className="rounded-xl bg-[#E4EDE8] px-2.5 py-1.5 text-[12px] font-medium text-[#3F5C51] hover:bg-[#D5E3DC] disabled:opacity-40"
          >
            Consider
          </button>
        </div>
      </div>
    </article>
  );
}

function cardStats(program: Program) {
  const stats: { label: string; value: string }[] = [];
  if (program.cityPopulation != null) {
    stats.push({ label: "Population", value: formatPopulation(program.cityPopulation) });
  }
  if (program.costOfLiving != null) {
    stats.push({
      label: "Cost of living",
      value: `${program.costOfLiving} · ${colLabel(program.costOfLiving)}`,
    });
  }
  if (program.classSize != null) {
    stats.push({ label: "Class size", value: `${program.classSize} / year` });
  }
  if (program.annualDeliveries != null) {
    stats.push({ label: "Deliveries", value: `${formatDeliveries(program.annualDeliveries)} / year` });
  }
  if (program.middleSchoolQuality != null && program.highSchoolQuality != null) {
    stats.push({
      label: "Schools",
      value: `${Math.round((program.middleSchoolQuality + program.highSchoolQuality) / 2)}`,
    });
  }
  return stats;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-wide text-stone-400 uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium text-stone-800">{value}</dd>
    </div>
  );
}

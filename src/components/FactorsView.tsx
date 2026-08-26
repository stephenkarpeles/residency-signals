"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppProvider";
import {
  FACTORS,
  unusedSuggestedFactors,
  weightsTotal,
} from "@/lib/factors";
import { PROGRAMS } from "@/lib/programs";
import { factorScore, matchScore } from "@/lib/scoring";
import type { FactorId } from "@/lib/types";

export function FactorsView() {
  const { weights, setWeight, addFactor, dropFactor, resetWeights } = useApp();
  const total = weightsTotal(weights);
  const active = FACTORS.filter((f) => !f.suggested || (weights[f.id] ?? 0) > 0);
  const suggestions = unusedSuggestedFactors(weights);

  const preview = useMemo(
    () =>
      [...PROGRAMS]
        .map((program) => ({ program, score: matchScore(program, weights) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [weights],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Weights
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Important factors
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Drag the sliders to change how programs are scored. Weights always add up to 100%.
          Unused ideas sit at the bottom — add any that matter to you.
        </p>
      </header>

      <div className="mt-8 flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-5 py-4">
        <p className="text-sm text-stone-600">
          Total weight{" "}
          <span
            className={`font-semibold tabular-nums ${
              total === 100 ? "text-stone-900" : "text-[#8A6A2A]"
            }`}
          >
            {total}%
          </span>
          {total === 100 ? null : (
            <span className="ml-2 text-[13px] text-[#8A6A2A]">— must equal 100%</span>
          )}
        </p>
        <button
          type="button"
          onClick={resetWeights}
          className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-stone-600 hover:bg-stone-100"
        >
          Reset defaults
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {active.map((factor) => (
          <article
            key={factor.id}
            className="rounded-2xl border border-stone-200/80 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-stone-900">{factor.label}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                  {factor.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-right text-lg font-semibold tabular-nums text-stone-900">
                  {weights[factor.id]}%
                </span>
                {factor.suggested || factor.defaultWeight === 0 ? (
                  <button
                    type="button"
                    onClick={() => dropFactor(factor.id)}
                    className="rounded-lg px-2 py-1 text-[12px] text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[factor.id]}
              onChange={(e) => setWeight(factor.id, Number(e.target.value))}
              className="mt-4 w-full accent-[#C4A35A]"
            />
          </article>
        ))}
      </div>

      {suggestions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[12px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
            Other things you might factor in
          </h2>
          <p className="mt-2 text-[14px] text-stone-500">
            Adding one starts it at 5% and scales the rest down so you stay at 100%.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {suggestions.map((factor) => (
              <button
                key={factor.id}
                type="button"
                onClick={() => addFactor(factor.id)}
                className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-left hover:border-[#C4A35A] hover:bg-[#FBF6E8]/50"
              >
                <p className="text-[14px] font-medium text-stone-900">{factor.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                  {factor.description}
                </p>
                <p className="mt-3 text-[12px] font-medium text-[#8A6A2A]">Add to mix</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-[12px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          Top matches with these weights
        </h2>
        <div className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
          {preview.map(({ program, score }, index) => (
            <div key={program.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-5 text-[13px] tabular-nums text-stone-400">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-stone-900">
                  {program.shortName}
                </p>
                <p className="text-[12px] text-stone-500">
                  {program.city}, {program.state}
                </p>
              </div>
              <ScoreStack programId={program.id} weights={weights} />
              <span className="text-[15px] font-semibold tabular-nums text-stone-900">
                {score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
        <BreakdownNote />
      </section>
    </div>
  );
}

function ScoreStack({
  programId,
  weights,
}: {
  programId: string;
  weights: Record<FactorId, number>;
}) {
  const program = PROGRAMS.find((p) => p.id === programId);
  if (!program) return null;
  const parts = FACTORS.filter((f) => (weights[f.id] ?? 0) > 0).slice(0, 4);
  return (
    <div className="hidden items-center gap-1 md:flex">
      {parts.map((factor) => (
        <span
          key={factor.id}
          title={factor.label}
          className="h-1.5 w-8 overflow-hidden rounded-full bg-stone-100"
        >
          <span
            className="block h-full bg-[#3F5C51]"
            style={{ width: `${factorScore(program, factor.id)}%` }}
          />
        </span>
      ))}
    </div>
  );
}

function BreakdownNote() {
  return (
    <p className="mt-4 text-[12px] leading-relaxed text-stone-400">
      Scores are a weighted blend of the factors above. City data is stored locally in this
      app after being compiled from public sources (Census, C2ER-style cost of living, metro
      school ratings, and published residency directories).
    </p>
  );
}

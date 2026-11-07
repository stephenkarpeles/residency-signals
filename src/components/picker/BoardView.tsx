"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePicker } from "@/context/PickerProvider";
import { getCatalogProgram } from "@/lib/catalog";
import { PICKER_CRITERIA, rankedInterviews, type ScoredInterview } from "@/lib/picker";

export function BoardView() {
  const { board } = usePicker();
  const { rows, counted } = useMemo(() => rankedInterviews(board), [board]);
  const total = board.programIds.length;
  const countedSet = useMemo(() => new Set(counted), [counted]);

  if (total === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Your board</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          Add interview invites before there is anything to rank.
        </p>
        <Link
          href="/picker"
          className="mt-5 inline-flex rounded-xl bg-[#C4A35A] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#B3944C]"
        >
          Add interviews
        </Link>
      </div>
    );
  }

  const ordered = counted.length > 0;
  const countedWeight = counted.reduce((sum, id) => sum + board.weights[id], 0);

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[12px] font-medium tracking-[0.16em] text-[#8A6A2A] uppercase">
          Overall
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
          Current picks
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
          {ordered
            ? `Sorted from the ${counted.length} area${counted.length === 1 ? "" : "s"} you have ranked. #1 is best. A program can lead overall and still sit lower in one area.${
                countedWeight < 100
                  ? ` Those areas are ${countedWeight}% of the full mix, and they split the decision in that proportion until you rank the rest.`
                  : ""
              }`
            : "This is the order you added them. Rank an area and it will start sorting the list. Unranked areas stay out of the score."}
        </p>
      </header>

      <ol className="mt-6 space-y-3">
        {(ordered
          ? rows
          : board.programIds.map(
              (programId): ScoredInterview => ({ programId, score: 0, ranks: {} }),
            )
        ).map(
          (row, index) => {
            const program = getCatalogProgram(row.programId);
            return (
              <li
                key={row.programId}
                className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/80"
              >
                <div className="flex items-start gap-4">
                  <p className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E6C0] px-2 text-xl font-semibold tabular-nums leading-none text-[#6F5420]">
                    #{index + 1}
                  </p>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold text-stone-900">
                      {program?.name ?? "Program no longer in the directory"}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-stone-500">
                      {program
                        ? `${program.city}, ${program.state} · ${program.specialty}`
                        : row.programId}
                    </p>
                    {ordered ? (
                      <div className="mt-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-[#C4A35A]"
                            style={{ width: `${Math.max(4, Math.round(row.score))}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[12px] text-stone-500">
                          Fit {Math.round(row.score)} of 100 on the areas counted so far
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {PICKER_CRITERIA.map((criterion) => {
                    const rank = row.ranks[criterion.id];
                    const countedHere = countedSet.has(criterion.id);
                    return (
                      <div key={criterion.id} className="rounded-xl bg-[#F6F3EE] px-3 py-2">
                        <dt className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
                          {criterion.short}
                          <span className="ml-1 tracking-normal text-stone-400 normal-case">
                            {board.weights[criterion.id]}%
                          </span>
                        </dt>
                        <dd
                          className={`mt-0.5 text-[13px] font-medium tabular-nums ${
                            countedHere ? "text-stone-800" : "text-stone-400"
                          }`}
                        >
                          {countedHere && rank ? `#${rank} of ${total}` : "Not ranked"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            );
          },
        )}
      </ol>
    </div>
  );
}

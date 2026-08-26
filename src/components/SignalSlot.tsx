"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { getProgram } from "@/lib/programs";

export function SignalSlot({
  tier,
  index,
  programId,
}: {
  tier: "gold" | "silver";
  index: number;
  programId: string | null;
}) {
  const { unassign, setDetailId } = useApp();
  const [mounted, setMounted] = useState(false);
  const droppable = useDroppable({ id: `${tier}-${index}` });
  const draggable = useDraggable({
    id: `slot-${tier}-${index}`,
    data: { programId, from: "slot" },
    disabled: !programId || !mounted,
  });
  const program = getProgram(programId);
  const gold = tier === "gold";
  const over = droppable.isOver;

  useEffect(() => {
    setMounted(true);
  }, []);

  const style = {
    transform: CSS.Translate.toString(draggable.transform),
  };

  const setRefs = (node: HTMLElement | null) => {
    droppable.setNodeRef(node);
    draggable.setNodeRef(node);
  };

  if (program) {
    const dragProps = mounted ? { ...draggable.listeners, ...draggable.attributes } : {};
    return (
      <div
        ref={setRefs}
        style={style}
        {...dragProps}
        className={`group flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
          gold ? "border-[#E6D5A3] bg-white" : "border-stone-200 bg-white"
        } ${draggable.isDragging ? "opacity-40" : ""} ${over ? "ring-2 ring-[#C4A35A]" : ""}`}
      >
        <span
          className={`w-4 shrink-0 text-center text-[10px] font-semibold tabular-nums ${
            gold ? "text-[#C4A35A]" : "text-stone-400"
          }`}
        >
          {index + 1}
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setDetailId(program.id)}
        >
          <p className="truncate text-[12px] font-medium text-stone-800">
            {program.shortName}
          </p>
          <p className="truncate text-[10px] text-stone-500">
            {program.city}, {program.state}
          </p>
        </button>
        <button
          type="button"
          aria-label={`Remove ${program.shortName}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => unassign(program.id)}
          className="rounded-lg p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={droppable.setNodeRef}
      className={`flex items-center gap-2 rounded-xl border border-dashed px-2 ${
        gold ? "h-[46px] border-[#E0C97A]/80 bg-[#FBF6E8]/50" : "h-[40px] border-stone-300/80 bg-stone-50/80"
      } ${over ? (gold ? "border-[#C4A35A] bg-[#F3E6C0] ring-2 ring-inset ring-[#C4A35A]" : "border-stone-400 bg-stone-100 ring-2 ring-inset ring-stone-400") : ""}`}
    >
      <span
        className={`w-4 shrink-0 text-center text-[10px] font-semibold tabular-nums ${
          gold ? "text-[#D4B56A]" : "text-stone-300"
        }`}
      >
        {index + 1}
      </span>
      <span className={`text-[11px] ${gold ? "text-[#C4A35A]/80" : "text-stone-400"}`}>
        Open slot
      </span>
    </div>
  );
}

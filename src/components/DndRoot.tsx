"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { useApp } from "@/context/AppProvider";
import { getProgram } from "@/lib/programs";
import type { SignalTier } from "@/lib/types";
import { ProgramCard } from "@/components/ProgramCard";

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) {
    const slots = pointer.filter(
      (hit) =>
        typeof hit.id === "string" &&
        /^(gold|silver|considering)-\d+$/.test(hit.id),
    );
    return slots.length ? slots : pointer;
  }
  return closestCorners(args);
};

export function DndRoot({ children }: { children: ReactNode }) {
  const { assign } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragStart(event: DragStartEvent) {
    const programId = event.active.data.current?.programId as string | undefined;
    setActiveId(programId ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const programId = event.active.data.current?.programId as string | undefined;
    const overId = event.over?.id;
    if (!programId || typeof overId !== "string") return;

    if (overId === "gold-group") {
      assign(programId, "gold");
      return;
    }
    if (overId === "silver-group") {
      assign(programId, "silver");
      return;
    }
    if (overId === "considering-group") {
      assign(programId, "considering");
      return;
    }

    const slotMatch = overId.match(/^(gold|silver|considering)-(\d+)$/);
    if (slotMatch) {
      assign(programId, slotMatch[1] as SignalTier, Number(slotMatch[2]));
    }
  }

  const activeProgram = getProgram(activeId);

  return (
    <DndContext
      id="signal-board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeProgram ? (
          <div className="w-[320px] rotate-1 opacity-95">
            <ProgramCard program={activeProgram} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
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
import { getProgram } from "@/lib/directory";
import type { SignalTier } from "@/lib/types";
import { ProgramCard } from "@/components/ProgramCard";

const SLOT_ID = /^(gold|silver|considering)-\d+$/;

const collisionDetection: CollisionDetection = (args) => {
  const activeId = args.active.id;
  const draggingSlot = typeof activeId === "string" && SLOT_ID.test(activeId);
  const pointer = args.pointerCoordinates;

  // Slot pickup uses a large card overlay, so the dragged rect's center is
  // nowhere near the pointer. Rank by pointer so a one-spot move hits the neighbor.
  if (draggingSlot && pointer) {
    const slots = args.droppableContainers.filter(
      (container) =>
        !container.disabled &&
        typeof container.id === "string" &&
        SLOT_ID.test(container.id),
    );
    const nearest = closestCenter({
      ...args,
      collisionRect: {
        width: 0,
        height: 0,
        top: pointer.y,
        bottom: pointer.y,
        left: pointer.x,
        right: pointer.x,
      },
      droppableContainers: slots,
    });
    if (nearest.length > 0) return nearest;
  }

  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const slots = pointerHits.filter((hit) => typeof hit.id === "string" && SLOT_ID.test(hit.id));
    return slots.length ? slots : pointerHits;
  }
  return closestCorners(args);
};

type OverlayState = {
  programId: string;
  from: "slot" | "card";
  tier?: SignalTier;
};

export function DndRoot({ children }: { children: ReactNode }) {
  const { assign } = useApp();
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragStart(event: DragStartEvent) {
    const programId = event.active.data.current?.programId as string | undefined;
    const from = event.active.data.current?.from === "slot" ? "slot" : "card";
    const tier = event.active.data.current?.tier as SignalTier | undefined;
    setOverlay(programId ? { programId, from, tier } : null);
  }

  function onDragEnd(event: DragEndEvent) {
    setOverlay(null);
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

  const activeProgram = getProgram(overlay?.programId);
  const slotBorder =
    overlay?.tier === "gold"
      ? "border-[#E6D5A3]"
      : overlay?.tier === "considering"
        ? "border-[#C5D4CE]"
        : "border-stone-200";

  return (
    <DndContext
      id="signal-board"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setOverlay(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeProgram && overlay?.from === "slot" ? (
          <div className={`w-[251px] rounded-xl border bg-white px-2 py-1.5 shadow-lg ${slotBorder}`}>
            <p className="truncate text-[12px] font-medium text-stone-800">{activeProgram.shortName}</p>
            <p className="truncate text-[10px] text-stone-500">
              {activeProgram.city}, {activeProgram.state}
            </p>
          </div>
        ) : activeProgram ? (
          <div className="w-[320px] rotate-1 opacity-95">
            <ProgramCard program={activeProgram} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

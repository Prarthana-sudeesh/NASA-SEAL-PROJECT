import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { getComponent } from '../config/components.ts';
import { DIFFICULTY } from '../config/difficulty.ts';
import { announce } from '../components/LiveRegion.tsx';
import { PlanetVisual } from '../components/PlanetVisual.tsx';
import { getPlanet } from '../data/planets.ts';
import type { SlotId } from '../data/types.ts';
import {
  addComponent,
  buildStats,
  clampCrew,
  emptyBuild,
  launchBlocks,
  removeFromSlot,
  slotLabel,
} from '../engine/build.ts';
import { missionRequirements } from '../engine/requirements.ts';
import { CrewSelector } from '../builder/CrewSelector.tsx';
import { type DragData, resolveDrop } from '../builder/dropLogic.ts';
import { LiveStats } from '../builder/LiveStats.tsx';
import { Palette } from '../builder/Palette.tsx';
import { PartIcon } from '../builder/parts/RocketParts.tsx';
import { RocketCanvas } from '../builder/RocketCanvas.tsx';
import { useMediaQuery } from '../hooks/useReducedMotion.ts';
import { useGame } from '../store/gameStore.ts';
import { ScreenMissing } from './ScreenMissing.tsx';

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function overName(id: string | number | undefined): string {
  if (!id) return 'nothing';
  const s = String(id);
  if (s === 'palette-drop') return 'the palette (remove)';
  if (s.startsWith('slot:')) return `the ${slotLabel(s.slice(5) as SlotId)} slot`;
  return s;
}

function dataName(d: unknown): string {
  return getComponent((d as DragData | undefined)?.componentId)?.name ?? 'component';
}

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${dataName(active.data.current)}.`,
  onDragOver: ({ active, over }) =>
    `${dataName(active.data.current)} is over ${overName(over?.id)}.`,
  onDragEnd: ({ active, over }) =>
    `${dataName(active.data.current)} dropped on ${overName(over?.id)}.`,
  onDragCancel: ({ active }) => `Cancelled. ${dataName(active.data.current)} returned.`,
};

export function Builder() {
  const { run, planetId, build, setBuild, go } = useGame();
  const planet = getPlanet(planetId);
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [active, setActive] = useState<DragData | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  if (!run || !planet) return <ScreenMissing what="a mission" />;
  const difficulty = run.difficulty;
  const cfg = DIFFICULTY[difficulty];

  const report = (text: string, ok: boolean) => {
    setMessage({ text, ok });
    announce(text);
  };

  const onAdd = (id: string) => {
    const r = addComponent(build, id, difficulty);
    if (r.ok) setBuild(r.build);
    report(r.message, r.ok);
  };
  const onRemove = (slot: SlotId) => {
    const r = removeFromSlot(build, slot);
    if (r.ok) setBuild(clampCrew(r.build, difficulty));
    report(r.message, r.ok);
  };
  const onDragStart = (e: DragStartEvent) => {
    setActive(e.active.data.current as DragData);
    setMessage(null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as DragData | undefined;
    setActive(null);
    if (!data) return;
    const r = resolveDrop(build, data, e.over ? String(e.over.id) : null, difficulty);
    if (r.ok) setBuild(clampCrew(r.build, difficulty));
    setMessage({ text: r.message, ok: r.ok });
    // Screen readers already hear dnd-kit's drop announcement; add the result.
    window.setTimeout(() => announce(r.message), 200);
  };

  const blocks = launchBlocks(build, difficulty);
  const req = missionRequirements(planet, difficulty);
  const quick = buildStats(build, req);
  const activeComp = getComponent(active?.componentId);

  return (
    <div className="flex flex-col gap-3">
      <header className="panel flex flex-wrap items-center gap-3 p-3">
        <PlanetVisual planet={planet} size={48} decorative />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Build for</p>
          <h1 className="text-xl font-bold">{planet.name}</h1>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('brief')}>
          ← Mission brief
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setBuild(emptyBuild());
            report('Rocket cleared.', true);
          }}
        >
          Clear rocket
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={blocks.length > 0}
          onClick={() => go('prelaunch')}
          aria-describedby={blocks.length ? 'launch-blocks' : undefined}
        >
          Review &amp; launch →
        </button>
        {blocks.length > 0 && (
          <span id="launch-blocks" className="sr-only">
            Launch blocked: {blocks.map((b) => b.message).join(' ')}
          </span>
        )}
      </header>

      <div aria-live="off" className="min-h-8">
        {message && (
          <p
            className={`rounded-lg border px-3 py-1.5 text-sm ${message.ok ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/50 bg-bad/10 text-bad'}`}
          >
            {message.ok ? '✓ ' : '✕ '}
            {message.text}
          </p>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'To pick up a component, press space or enter. Use the arrow keys to move it over a rocket slot, then press space or enter to drop it, or escape to cancel. You can also use the Add buttons.',
          },
        }}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] xl:grid-cols-[minmax(0,1fr)_300px_minmax(0,320px)]">
          <div className="order-2 md:order-1 md:row-span-2 xl:row-span-1">
            <Palette modules={cfg.modules} build={build} onAdd={onAdd} dragDisabled={isPhone} />
          </div>
          <div className="order-1 flex flex-col gap-3 md:order-2">
            <RocketCanvas
              build={build}
              difficulty={difficulty}
              modules={cfg.modules}
              onRemove={onRemove}
              dragDisabled={isPhone}
            />
            <CrewSelector
              build={build}
              difficulty={difficulty}
              onChange={(crew) => setBuild({ ...build, crew })}
            />
          </div>
          <div className="order-3">
            <LiveStats build={build} planet={planet} difficulty={difficulty} />
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.3)' }}>
          {activeComp ? (
            <div className="flex items-center gap-2 rounded-xl border border-accent bg-space-800/95 p-2 shadow-2xl">
              <PartIcon component={activeComp} />
              <span className="text-sm font-semibold">{activeComp.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Phone/tablet summary bar so totals stay visible while scrolling the palette. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-space-600 bg-space-900/95 px-4 py-2 backdrop-blur md:hidden">
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <span>
            <span className="text-muted">Cost </span>
            <strong className={quick.cost > cfg.budget ? 'text-warn' : ''}>{quick.cost}</strong>/
            {cfg.budget}
          </span>
          <span>
            <span className="text-muted">Δv </span>
            <strong>{quick.deltaVKms}</strong>/{req.deltaVKms}
          </span>
          <span>
            <span className="text-muted">TWR </span>
            <strong>{quick.liftoffTWR}</strong>
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm ml-auto"
            disabled={blocks.length > 0}
            onClick={() => go('prelaunch')}
          >
            Review →
          </button>
        </div>
        {message && (
          <p className={`mt-1 truncate text-xs ${message.ok ? 'text-ok' : 'text-bad'}`}>
            {message.text}
          </p>
        )}
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </div>
  );
}

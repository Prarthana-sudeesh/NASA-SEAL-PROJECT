import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { Badge } from '../../components/Badge.tsx';
import { ATMOSPHERE_INFO } from '../../config/physics.ts';
import { getPlanet } from '../../data/planets.ts';
import type { Planet } from '../../data/types.ts';
import { useGame } from '../../store/gameStore.ts';
import {
  DIFFICULTIES,
  SCORING,
  SLOT_LABELS,
  SLOT_ORDER,
  TUNING,
  getPart,
  partsOf,
  type Part,
  type SlotKind,
} from '../config.ts';
import {
  buildCost,
  checks,
  dialZones,
  dryMass,
  fuelLoad,
  fuelNeeded,
  launchBlocks,
  outsidePressure,
  parts,
  requiredSeal,
  twrEarth,
  type Build as BuildT,
} from '../engine.ts';
import { Dial } from '../ui/Dial.tsx';
import { QuizPanel } from '../ui/QuizPanel.tsx';
import { BigButton, TopMenu } from '../ui/Hud.tsx';
import { Astronaut, Scientist, SpeechBubble } from '../ui/Pixel.tsx';
import { PartIcon, RocketArt } from '../ui/RocketArt.tsx';
import { Blueprint, Stage } from '../ui/Scenery.tsx';

const SLOT_ICONS: Record<SlotKind, string> = {
  payload: 'payload-capsule',
  antenna: 'antenna-high',
  body: 'body-medium',
  hull: 'hull-titanium',
  engine: 'engine-small',
};

function partStats(p: Part): string[] {
  switch (p.kind) {
    case 'payload':
      return [`${p.massT} t`, p.seats ? `${p.seats} seats` : 'no crew'];
    case 'antenna':
      return [`${p.massT} t`, Number.isFinite(p.rangeLy) ? `< ${p.rangeLy} ly` : 'any range'];
    case 'body':
      return [`${p.massT} t`, `${p.capacityT} t fuel`];
    case 'hull':
      return [`${p.massPerSegmentT} t/section`, `≤ ${p.maxK} K`, `≤ ${p.strengthAtm} atm`];
    case 'engine':
      return [`${p.massT} t`, `${p.thrustKN} kN`, `×${p.efficiency} fuel economy`];
  }
}

function PartCard({ part, onAdd, fitted }: { part: Part; onAdd: () => void; fitted: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `part:${part.id}`,
    data: { partId: part.id },
  });
  return (
    <motion.li initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="list-none">
      <div
        className={`flex items-center gap-2 rounded-lg border-2 bg-[#0d2547]/90 p-[4%] ${fitted ? 'border-[#ffe24a]' : 'border-[#8fc3ff]/40'} ${isDragging ? 'opacity-40' : ''}`}
      >
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-roledescription="draggable part"
          aria-label={`${part.name}, ${part.cost} credits. ${partStats(part).join(', ')}. Press space to pick up, then drop on the rocket.`}
          className="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-2 active:cursor-grabbing"
        >
          <div className="grid h-[clamp(30px,3.4vw,44px)] w-[clamp(30px,3.4vw,44px)] shrink-0 place-items-center rounded bg-[#163a6b]">
            <PartIcon id={part.id} size={36} />
          </div>
          <div className="min-w-0 text-[clamp(8px,0.9vw,12px)] leading-tight">
            <div className="flex justify-between gap-1 font-bold text-white">
              <span className="truncate">{part.name}</span>
              <span className="shrink-0 text-[#ffb35a]">{part.cost}</span>
            </div>
            <div className="text-[#b9d8ff]">{partStats(part).join(' · ')}</div>
            <div className="truncate text-[#8fb3d9]">{part.blurb}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="tool-btn shrink-0 px-2 text-[11px]"
          aria-label={`Fit ${part.name} to rocket`}
        >
          {fitted ? '✓' : '+'}
        </button>
      </div>
    </motion.li>
  );
}

function RocketDrop({
  build,
  highlight,
  flash,
}: {
  build: BuildT;
  highlight: SlotKind | null;
  flash: number;
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'rocket' });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-1/2 top-[6%] flex h-[80%] w-[26%] -translate-x-1/2 items-end justify-center rounded-2xl transition-colors ${
        active
          ? isOver
            ? 'bg-[#ffe24a]/15 ring-2 ring-[#ffe24a]'
            : 'ring-2 ring-dashed ring-white/40'
          : ''
      }`}
      aria-label="Rocket: drop parts here"
    >
      <motion.div
        key={flash}
        initial={{ scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
        className="h-full"
      >
        <RocketArt
          build={build}
          height={1000}
          highlight={highlight}
          ghosts
          className="h-full w-auto"
        />
      </motion.div>
      {active && (
        <div className="outlined pointer-events-none absolute top-[40%] text-center text-[clamp(10px,1.2vw,16px)] font-bold">
          Drop on the rocket
        </div>
      )}
    </div>
  );
}

function hintFor(
  step: 'parts' | 'quiz' | 'dials',
  build: BuildT,
  planet: Planet,
  hints: 'zones' | 'tips' | 'none',
  missing: SlotKind[],
): string {
  const p = parts(build);
  const T = Math.round(planet.eqTempK.value);
  if (step === 'parts') {
    if (missing.length) {
      const next = missing[0];
      return `Drag a ${SLOT_LABELS[next].toLowerCase()} from the toolbar onto the rocket. ${missing.length > 1 ? `${missing.length} parts to go!` : 'Last one!'}`;
    }
    if (hints === 'none')
      return 'Hard mode: no hints. Check the planet data on the left, then set the dials.';
    if (p && p.hull.maxK < T)
      return `Careful! ${p.hull.name} melts above ${p.hull.maxK} K, and ${planet.name} is ${T} K.`;
    if (p && p.hull.strengthAtm < requiredSeal(planet))
      return `${p.hull.name} can only hold ${p.hull.strengthAtm} atm, but you'll need a ${requiredSeal(planet)} atm seal here.`;
    if (p && planet.distanceLy.value >= p.antenna.rangeLy)
      return `Your ${p.antenna.name.toLowerCase()} can't reach ${planet.distanceLy.value} light-years.`;
    return 'Looking good! Next, a quick science check, then the dials.';
  }
  if (step === 'quiz')
    return `Quick science check before you set the dials! Use the planet data on the left. A right answer earns bonus points.`;
  if (hints === 'zones')
    return 'Turn each dial into its green zone. Less fuel and thrust means a lighter rocket and a better score.';
  if (hints === 'tips' && p) {
    const need = fuelNeeded(p, build.crew, useGame.getState().dials, planet).toFixed(1);
    return `Tip: at this thrust you need about ${need} t of fuel, and a seal of at least ${requiredSeal(planet)} atm. Thrust must beat ${planet.name}'s ${planet.surfaceGravityG.value} g.`;
  }
  return 'Use the planet data to set the dials. Too little fuel strands you; too much makes the rocket too heavy.';
}

export function Build() {
  const {
    player,
    difficulty,
    planetId,
    build,
    dials,
    step,
    setBuild,
    setDials,
    setStep,
    launch,
    go,
    quiz,
    answerQuiz,
    nextMissionNumber,
  } = useGame();
  const [tool, setTool] = useState<SlotKind>('payload');
  const [dragging, setDragging] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const planet = getPlanet(planetId);
  const mission = nextMissionNumber();
  const quizChoice =
    quiz && planet && quiz.planetId === planet.id && quiz.mission === mission ? quiz.choice : null;
  if (!planet) {
    return (
      <div className="p-6 text-center">
        <button type="button" className="big-btn" onClick={() => go('mission')}>
          Mission control
        </button>
      </div>
    );
  }
  const cfg = DIFFICULTIES[difficulty];
  const p = parts(build);
  const cost = buildCost(build);
  const missing = SLOT_ORDER.filter((k) => !build[k]);
  const blocks = launchBlocks(build, difficulty);
  const zones = cfg.hints === 'zones' ? dialZones(build, dials, planet) : null;
  const liveChecks = cfg.hints !== 'none' ? checks(build, dials, planet) : [];
  const seats = (getPart(build.payload) as { seats?: number } | undefined)?.seats ?? 0;

  const fit = (id: string) => {
    const part = getPart(id);
    if (!part) return;
    const next = { ...build, [part.kind]: id } as BuildT;
    if (part.kind === 'payload') next.crew = Math.min(next.crew, part.seats);
    setBuild(next);
    setTool(part.kind);
    setFlash((f) => f + 1);
    announce(`${part.name} fitted as ${SLOT_LABELS[part.kind].toLowerCase()}.`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.data.current?.partId as string | undefined;
    setDragging(null);
    if (!id) return;
    if (e.over?.id === 'rocket') fit(id);
    else announce('Dropped outside the rocket. The part went back to the toolbar.');
  };

  const dragged = getPart(dragging);
  const totalMass = p ? dryMass(p, build.crew) + fuelLoad(p, dials) : 0;
  const twr = p ? twrEarth(p, build.crew, dials) : 0;

  return (
    <Stage>
      <Blueprint>
        <TopMenu />
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setDragging((e.active.data.current?.partId as string) ?? null)}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          {/* Planet data card (top-left) */}
          <section
            aria-label="Planet data"
            className="absolute left-[1.5%] top-[2%] z-10 w-[21%] rounded-lg border-2 border-white/30 bg-[#0b2a52]/80 p-[1%] text-[clamp(8px,0.9vw,12px)] text-white backdrop-blur"
          >
            <button
              type="button"
              onClick={() => go('mission')}
              className="mb-1 text-[#ffe24a] underline"
            >
              ◂ Mission control
            </button>
            <div className="title-font text-[clamp(11px,1.4vw,18px)]">{planet.name}</div>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-[2px]">
              <dt className="text-[#b9d8ff]">Distance</dt>
              <dd className="flex items-center justify-end gap-1">
                {planet.distanceLy.value} ly <Badge source="nasa" />
              </dd>
              <dt className="text-[#b9d8ff]">Gravity</dt>
              <dd className="flex items-center justify-end gap-1">
                {planet.surfaceGravityG.value} g <Badge source="model" />
              </dd>
              <dt className="text-[#b9d8ff]">Temperature</dt>
              <dd className="flex items-center justify-end gap-1">
                {Math.round(planet.eqTempK.value)} K <Badge source="nasa" />
              </dd>
              <dt className="text-[#b9d8ff]">Atmosphere</dt>
              <dd className="flex items-center justify-end gap-1">
                {ATMOSPHERE_INFO[planet.atmosphere.value].label} <Badge source="model" />
              </dd>
              <dt className="text-[#b9d8ff]">Outside pressure</dt>
              <dd className="flex items-center justify-end gap-1">
                {outsidePressure(planet)} atm <Badge source="model" />
              </dd>
              <dt className="text-[#b9d8ff]">Budget</dt>
              <dd
                className={`text-right font-bold ${cost > cfg.budget ? 'text-[#ff6b6b]' : 'text-[#ffb35a]'}`}
              >
                {cost} / {cfg.budget}
              </dd>
            </dl>
          </section>

          <RocketDrop build={build} highlight={step === 'parts' ? tool : null} flash={flash} />

          {/* Right side: toolbar + drawer (parts) or dials */}
          <AnimatePresence initial={false}>
            {step === 'parts' ? (
              <motion.div
                key="parts"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                className="absolute right-[1.2%] top-[11%] z-10 flex h-[72%] gap-[0.6vw]"
              >
                <section
                  aria-label={`${SLOT_LABELS[tool]} options`}
                  className="flex w-[clamp(170px,22vw,300px)] flex-col rounded-lg border-2 border-white/30 bg-[#0b2a52]/85 p-[3%] backdrop-blur"
                >
                  <h2 className="font-pixel mb-2 text-[clamp(7px,0.8vw,10px)] uppercase tracking-wider text-[#ffe24a]">
                    {SLOT_LABELS[tool]}
                  </h2>
                  <ul className="flex min-h-0 flex-1 flex-col gap-[3%] overflow-y-auto pr-1">
                    {partsOf(tool).map((part) => (
                      <PartCard
                        key={part.id}
                        part={part}
                        fitted={build[tool] === part.id}
                        onAdd={() => fit(part.id)}
                      />
                    ))}
                  </ul>
                  {tool === 'payload' && (
                    <div className="mt-2 rounded-md bg-black/30 p-2 text-[clamp(8px,0.9vw,12px)] text-white">
                      <div className="flex items-center justify-between">
                        <span>Astronauts</span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            className="tool-btn px-2"
                            aria-label="Remove astronaut"
                            onClick={() =>
                              setBuild({ ...build, crew: Math.max(0, build.crew - 1) })
                            }
                          >
                            −
                          </button>
                          <output
                            className="w-5 text-center font-bold"
                            aria-label="Astronauts on board"
                          >
                            {build.crew}
                          </output>
                          <button
                            type="button"
                            className="tool-btn px-2"
                            aria-label="Add astronaut"
                            disabled={build.crew >= Math.min(seats, cfg.maxCrew)}
                            onClick={() => setBuild({ ...build, crew: build.crew + 1 })}
                          >
                            +
                          </button>
                        </span>
                      </div>
                      <p className="mt-1 text-[#b9d8ff]">
                        {seats
                          ? `Success: score × ${(1 + SCORING.crewBonus * build.crew).toFixed(1)}. Failure: −${SCORING.crewPenalty} each.`
                          : 'Fit the crew capsule to bring astronauts.'}
                      </p>
                    </div>
                  )}
                </section>
                <nav
                  aria-label="Part categories"
                  className="flex flex-col gap-[0.5vw] rounded-lg bg-[#0b2a52]/70 p-[0.4vw]"
                >
                  {SLOT_ORDER.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTool(k)}
                      aria-pressed={tool === k}
                      aria-label={`${SLOT_LABELS[k]}${build[k] ? ' (fitted)' : ''}`}
                      title={SLOT_LABELS[k]}
                      className={`relative grid h-[clamp(34px,3.8vw,52px)] w-[clamp(34px,3.8vw,52px)] place-items-center rounded-md border-2 ${tool === k ? 'border-[#ffe24a] bg-[#2d6fb8]' : 'border-white/40 bg-[#14417a]'}`}
                    >
                      <PartIcon id={SLOT_ICONS[k]} size={30} />
                      {build[k] && (
                        <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#3ddc84] text-[8px] font-bold text-[#0b0f1e]">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </motion.div>
            ) : step === 'quiz' ? (
              <QuizPanel
                key="quiz"
                planet={planet}
                mission={mission}
                choice={quizChoice}
                onAnswer={answerQuiz}
              />
            ) : (
              <motion.section
                key="dials"
                aria-label="Mission dials"
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 60, opacity: 0 }}
                className="absolute right-[1.2%] top-[10%] z-10 flex w-[clamp(190px,24vw,320px)] flex-col items-center gap-[2%] rounded-lg border-2 border-white/30 bg-[#0b2a52]/85 p-[1.2%] backdrop-blur"
              >
                <h2 className="font-pixel text-[clamp(7px,0.8vw,10px)] uppercase tracking-wider text-[#ffe24a]">
                  Set the dials
                </h2>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <Dial
                    label="Fuel"
                    unit="% full"
                    value={dials.fuel}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(v) => setDials({ fuel: v })}
                    zone={zones?.fuel}
                    size={110}
                  />
                  <Dial
                    label="Thrust"
                    unit="% power"
                    value={dials.thrust}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(v) => setDials({ thrust: v })}
                    zone={zones?.thrust}
                    size={110}
                  />
                  <div className="col-span-2 flex justify-center">
                    <Dial
                      label="Pressure seal"
                      unit="atm"
                      value={dials.pressure}
                      min={0}
                      max={TUNING.pressureMax}
                      step={0.5}
                      onChange={(v) => setDials({ pressure: v })}
                      zone={zones?.pressure}
                      size={110}
                    />
                  </div>
                </div>
                {liveChecks.length > 0 && (
                  <ul
                    aria-label="Flight checks"
                    className="mt-1 grid w-full grid-cols-2 gap-x-2 gap-y-0.5 text-[clamp(8px,0.8vw,11px)] text-white"
                  >
                    {liveChecks.map((c) => (
                      <li key={c.id} className={c.ok ? 'text-ok' : 'text-[#ff8a8a]'}>
                        {c.ok ? '✓' : '✕'} {c.label}
                      </li>
                    ))}
                  </ul>
                )}
                {cfg.hints === 'none' && (
                  <p className="text-center text-[11px] text-[#b9d8ff]">
                    Hard mode: no flight checks shown. Trust your maths!
                  </p>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          <DragOverlay
            dropAnimation={{ duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.4)' }}
          >
            {dragged ? (
              <div className="flex items-center gap-2 rounded-lg border-2 border-[#ffe24a] bg-[#0d2547] p-2 text-[12px] font-bold text-white shadow-2xl">
                <PartIcon id={dragged.id} size={40} />
                {dragged.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Crew + scientist hint (bottom-left) */}
        <div className="absolute bottom-[3%] left-[1.5%] w-[6%]">
          <Astronaut name={player?.username} enter={false} />
        </div>
        <div className="absolute bottom-[3%] left-[8.5%] w-[5.5%]">
          <Scientist enter={false} />
        </div>
        <div className="absolute bottom-[27%] left-[4%] z-10 max-w-[30%]">
          <SpeechBubble
            speaker="Dr. Hart"
            text={hintFor(step, build, planet, cfg.hints, missing)}
          />
        </div>

        {/* Readout bar + main action */}
        <div className="absolute bottom-[2.5%] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-[0.4vw]">
          <div className="outlined flex gap-[1.2vw] whitespace-nowrap text-[clamp(9px,1.1vw,15px)] font-bold tabular-nums">
            <span>Thrust/W: {twr.toFixed(2)}</span>
            <span>Mass: {totalMass.toFixed(1)}t</span>
            <span>Fuel: {p ? fuelLoad(p, dials).toFixed(0) : 0}t</span>
            <span className={cost > cfg.budget ? 'text-[#ff8a8a]' : ''}>
              Cost: {cost}/{cfg.budget}
            </span>
          </div>
          {step === 'parts' ? (
            <BigButton
              onClick={() => setStep(quizChoice === null ? 'quiz' : 'dials')}
              disabled={missing.length > 0}
              className="text-[clamp(16px,2.4vw,32px)]"
            >
              {quizChoice === null ? 'SCIENCE CHECK ▸' : 'SET DIALS ▸'}
            </BigButton>
          ) : step === 'quiz' ? (
            <div className="flex items-center gap-[1vw]">
              <button
                type="button"
                className="tool-btn px-3 py-1 text-[12px]"
                onClick={() => setStep('parts')}
              >
                ◂ Parts
              </button>
              <BigButton
                onClick={() => setStep('dials')}
                disabled={quizChoice === null}
                className="text-[clamp(16px,2.4vw,32px)]"
              >
                SET DIALS ▸
              </BigButton>
            </div>
          ) : (
            <div className="flex items-center gap-[1vw]">
              <button
                type="button"
                className="tool-btn px-3 py-1 text-[12px]"
                onClick={() => setStep('parts')}
              >
                ◂ Parts
              </button>
              <BigButton
                onClick={() => {
                  const a = launch();
                  if (a) announce(`Launching mission ${a.n} to ${planet.name}.`);
                }}
                disabled={blocks.length > 0}
                describedBy={blocks.length ? 'launch-blocks' : undefined}
                className="text-[clamp(20px,3vw,42px)]"
              >
                LAUNCH
              </BigButton>
            </div>
          )}
          {blocks.length > 0 && step === 'dials' && (
            <p id="launch-blocks" role="alert" className="outlined text-[12px] text-[#ff8a8a]">
              {blocks.join(' ')}
            </p>
          )}
        </div>
      </Blueprint>
    </Stage>
  );
}

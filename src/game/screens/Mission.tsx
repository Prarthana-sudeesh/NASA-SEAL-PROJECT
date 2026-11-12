import { useState } from 'react';
import { Badge } from '../../components/Badge.tsx';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import { ATMOSPHERE_INFO } from '../../config/physics.ts';
import { getPlanet } from '../../data/planets.ts';
import type { Planet } from '../../data/types.ts';
import { DIFFICULTY_IDS } from '../../data/types.ts';
import { useGame } from '../../store/gameStore.ts';
import { ATTEMPTS_PER_RUN, DIFFICULTIES, partsOf, type Difficulty } from '../config.ts';
import { outsidePressure } from '../engine.ts';
import { BigButton, Pill, Readout, TopMenu } from '../ui/Hud.tsx';
import { Astronaut, Scientist, SpeechBubble } from '../ui/Pixel.tsx';
import { CommandCenter, Hologram, Stage, WallScreen } from '../ui/Scenery.tsx';

type Tab = 'level' | 'description' | 'stats' | 'resources';
const TABS: { id: Tab; label: string }[] = [
  { id: 'level', label: 'Level' },
  { id: 'description', label: 'Description' },
  { id: 'stats', label: 'Stats' },
  { id: 'resources', label: 'Resources' },
];

export const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0;

function planetTip(p: Planet): string {
  const T = Math.round(p.eqTempK.value);
  const atmo = p.atmosphere.value;
  if (T > 1300)
    return `${p.name} is ${T} K. That would melt most metals! Only one hull material survives that heat.`;
  if (T > 450)
    return `${p.name} is ${T} K, too hot for aluminium. Pick a hull that can take the heat.`;
  if (atmo === 'thick')
    return `${p.name} may have crushing air: about ${outsidePressure(p)} atm. Your hull and pressure seal must hold that.`;
  if (p.distanceLy.value > 60)
    return `${p.name} is ${p.distanceLy.value} light-years away. You'll need a long-range antenna and plenty of fuel.`;
  if (p.surfaceGravityG.value > 1.3)
    return `Gravity on ${p.name} is ${p.surfaceGravityG.value} g. Taking off again needs extra thrust.`;
  return `${p.name} is a good place to start. Check its distance and gravity, then build a light rocket.`;
}

function PlanetTabs({ planet, difficulty }: { planet: Planet; difficulty: Difficulty }) {
  const [tab, setTab] = useState<Tab>('level');
  const cfg = DIFFICULTIES[difficulty];
  const level = cfg.planets.indexOf(planet.id) + 1;
  const row = (label: string, value: string, source: 'nasa' | 'model') => (
    <div className="flex items-center justify-between gap-2 border-b border-[#5ff3ff]/15 py-[1.5%]">
      <dt className="text-[#9fd8e6]">{label}</dt>
      <dd className="flex items-center gap-1 text-right font-semibold tabular-nums">
        {value} <Badge source={source} />
      </dd>
    </div>
  );
  return (
    <div className="flex h-full flex-col text-[clamp(8px,0.95vw,13px)]">
      <div role="tablist" aria-label="Planet details" className="mb-[2%] flex flex-wrap gap-[2%]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-[3%] py-[1%] font-semibold ${tab === t.id ? 'bg-[#5ff3ff] text-[#06223a]' : 'bg-[#0b2f4d] text-[#9fd8e6] hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === 'level' && (
          <div className="flex flex-col gap-1">
            <p className="title-font text-[clamp(12px,1.6vw,22px)] text-white">
              {cfg.label} · Level {level}
            </p>
            <p>
              {planet.name}, orbiting {planet.host}
            </p>
            <p className="text-[#9fd8e6]">
              Goal: fly there, land, take off again, and bring everyone home.
            </p>
          </div>
        )}
        {tab === 'description' && <p className="leading-relaxed">{planet.description}</p>}
        {tab === 'stats' && (
          <dl>
            {row('Distance', `${planet.distanceLy.value} ly`, 'nasa')}
            {row('Gravity', `${planet.surfaceGravityG.value} g`, 'model')}
            {row('Temperature', `${Math.round(planet.eqTempK.value)} K`, 'nasa')}
            {row('Atmosphere', ATMOSPHERE_INFO[planet.atmosphere.value].label, 'model')}
            {row('Outside pressure', `${outsidePressure(planet)} atm`, 'model')}
            {row('Size', `${planet.radiusEarth.value} × Earth`, 'nasa')}
            {row('Discovered', `${planet.discoveryYear.value}`, 'nasa')}
          </dl>
        )}
        {tab === 'resources' && (
          <div className="flex flex-col gap-1">
            <p>
              Budget: <strong className="text-[#ffb35a]">{cfg.budget} credits</strong>
            </p>
            <p>Astronauts: up to {cfg.maxCrew}</p>
            <p className="text-[#9fd8e6]">
              Parts: {partsOf('payload').length} payloads, {partsOf('antenna').length} antennas,{' '}
              {partsOf('body').length} fuel tanks, {partsOf('hull').length} hull materials,{' '}
              {partsOf('engine').length} thrusters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Mission() {
  const {
    player,
    difficulty,
    planetId,
    run,
    briefed,
    setBriefed,
    chooseDifficulty,
    choosePlanet,
    go,
    newCampaign,
  } = useGame();
  const [line, setLine] = useState(0);
  const cfg = DIFFICULTIES[difficulty];
  const planet = getPlanet(planetId) ?? getPlanet(cfg.planets[0])!;
  const activeRun = run && run.difficulty === difficulty ? run : null;
  const done = activeRun?.attempts.length ?? 0;
  const totals = activeRun?.attempts.map((a) => a.result.total) ?? [];
  const name = player?.username ?? 'Engineer';

  const briefing = [
    `Welcome to Mission Control, ${name}! You've been promoted: from now on your rockets carry astronauts.`,
    'That means a double trip: Earth to the planet, and back home again.',
    'Pick a difficulty and a planet on the right screen. The left screen shows its real NASA data.',
    'Then head to the blueprint room to build your rocket. Good luck!',
  ];
  const talking = !briefed;
  const speech = talking ? briefing[line] : planetTip(planet);

  return (
    <Stage>
      <CommandCenter>
        <Hologram planet={planet} size="24%" />
        <Readout
          className="left-[1.5%] top-[2%] z-10"
          lines={[
            'Mission settings',
            ['Difficulty', cfg.label],
            ['Budget', `${cfg.budget} credits`],
            ['Planet', planet.name],
            ['Distance', `${planet.distanceLy.value} ly`],
            ['Gravity', `${planet.surfaceGravityG.value} g`],
            ['Temperature', `${Math.round(planet.eqTempK.value)} K`],
            ['Atmosphere', ATMOSPHERE_INFO[planet.atmosphere.value].label],
            ['Max crew', String(cfg.maxCrew)],
            ['Mission', `${Math.min(done + 1, ATTEMPTS_PER_RUN)} / ${ATTEMPTS_PER_RUN}`],
            ['Average', String(avg(totals))],
          ]}
        />
        <TopMenu />

        <WallScreen
          title={`Planet file · ${planet.name}`}
          className="left-[17%] top-[17%] h-[38%] w-[25%]"
        >
          <PlanetTabs planet={planet} difficulty={difficulty} />
        </WallScreen>

        <WallScreen title="Choose mission" className="right-[2%] top-[17%] h-[44%] w-[26%]">
          <div className="flex h-full flex-col gap-[3%] text-[clamp(8px,0.95vw,13px)]">
            <div className="flex gap-[3%]" role="group" aria-label="Difficulty">
              {DIFFICULTY_IDS.map((d) => (
                <Pill key={d} active={d === difficulty} onClick={() => chooseDifficulty(d)}>
                  {DIFFICULTIES[d].label}
                </Pill>
              ))}
            </div>
            <p className="text-[#9fd8e6]">{cfg.summary}</p>
            <ul
              className="flex min-h-0 flex-1 flex-col gap-[2%] overflow-y-auto pr-1"
              aria-label="Planets"
            >
              {cfg.planets.map((id, i) => {
                const p = getPlanet(id);
                if (!p) return null;
                const visited = activeRun?.attempts.some((a) => a.planetId === id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => choosePlanet(id)}
                      aria-pressed={id === planet.id}
                      className={`flex w-full items-center gap-2 rounded-md border px-2 py-[1.5%] text-left transition ${
                        id === planet.id
                          ? 'border-[#ffe24a] bg-[#ffe24a]/15'
                          : 'border-transparent hover:border-[#5ff3ff]/50'
                      }`}
                    >
                      <PlanetVisual planet={p} size={26} decorative />
                      <span className="flex-1 font-semibold">
                        {i + 1}. {p.name}
                      </span>
                      <span className="tabular-nums text-[#9fd8e6]">{p.distanceLy.value} ly</span>
                      {visited && <span className="text-ok">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </WallScreen>

        {/* Crew: astronaut bottom-left, scientist briefing beside them */}
        <div className="absolute bottom-[5%] left-[2%] w-[8%]">
          <Astronaut name={name} />
        </div>
        <div className="absolute bottom-[5%] left-[12%] w-[7.5%]">
          <Scientist name="Dr. Hart" />
        </div>
        <div className="absolute bottom-[34%] left-[10%] z-10">
          <SpeechBubble speaker="Dr. Hart · Mission Scientist" text={speech} />
          {talking && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-md border-2 border-[#0b0f1e] bg-[#ffe24a] px-3 py-1 text-[12px] font-bold text-[#0b0f1e] shadow-[0_3px_0_#0b0f1e]"
                onClick={() => (line < briefing.length - 1 ? setLine(line + 1) : setBriefed())}
              >
                {line < briefing.length - 1 ? 'Next ▸' : 'Got it!'}
              </button>
              <button
                type="button"
                className="rounded-md bg-black/50 px-3 py-1 text-[12px] text-white"
                onClick={setBriefed}
              >
                Skip
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-[4%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
          <BigButton onClick={() => go('build')} className="text-[clamp(20px,3.4vw,48px)]">
            BUILD ROCKET
          </BigButton>
          <div className="outlined text-[clamp(9px,1vw,14px)] font-bold">
            Mission {Math.min(done + 1, ATTEMPTS_PER_RUN)}/{ATTEMPTS_PER_RUN} · Avg {avg(totals)}
            {done > 0 && (
              <button type="button" className="ml-2 underline" onClick={newCampaign}>
                restart campaign
              </button>
            )}
          </div>
        </div>
      </CommandCenter>
    </Stage>
  );
}

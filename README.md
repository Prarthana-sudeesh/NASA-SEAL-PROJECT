# Rocket Builder

**Team SEAL · NASA Space Apps Challenge entry**

An educational browser game. You play a newly appointed rocket scientist designing crewed rockets that
fly to **real exoplanets and back**: Earth → planet → Earth. You choose a destination, study its real
data, build a rocket by drag and drop within a budget, and launch it. Afterwards an engineering debrief
explains which of your design decisions made the mission succeed or fail. Ten missions make a campaign,
and your average goes on a leaderboard for that difficulty.

The game covers five themes:

- space exploration
- rocket engineering and design
- physics-based decisions (Δv, thrust-to-weight, gravity, temperature, pressure)
- budget management
- competition through leaderboards

> This game is a NASA Space Apps Challenge entry and is not endorsed by NASA.

## Quick start

Requires **Node.js 22.18 or newer**.

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL (usually http://localhost:5173). The game runs fully offline: planet data is
bundled in `src/data/planets.json`.

| Command                 | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                                 |
| `npm run build`         | Type-check and build for production into `dist/`                     |
| `npm run preview`       | Serve the production build                                           |
| `npm test`              | Run the Vitest suite (engine, data, builder, store, services)        |
| `npm run typecheck`     | TypeScript in strict mode                                            |
| `npm run lint`          | ESLint                                                               |
| `npm run format`        | Prettier                                                             |
| `npm run balance-check` | Exhaustive balance check over every planet and component combination |
| `npm run fetch-planets` | Refresh planet data from the NASA Exoplanet Archive                  |
| `npm run check`         | Type check, lint, tests and balance check together                   |

## How to play

1. **Briefing**: meet the (fictional) mission-control team and choose a call-sign.
2. **Difficulty**: Easy, Medium or Hard. Each level adds new engineering systems, not just a smaller budget.
3. **Destination**: pick an exoplanet. Each card has Level, Description, Stats and Resources tabs.
4. **Mission brief**: real values are badged **NASA DATA**; simplified assumptions and computed values are
   badged **GAME MODEL**.
5. **Build**: drag parts from the palette onto the rocket, or use **+ Add**. Live stats show cost, mass,
   Δv and thrust-to-weight.
6. **Pre-flight review**: a checklist with pass/warn/fail lights. You may launch a rocket that will fail,
   so you can learn from it.
7. **Launch**: countdown, lift-off, then a shared journey animation. The pressure meter, mission status
   tracker, fuel gauge and crew indicator update as you fly.
8. **Outcome**: score breakdown, astronaut multiplier, and a debrief tied to your exact choices.
9. **Repeat**: ten missions per campaign. The average goes to that difficulty's leaderboard.

## Project structure

```
src/
  app/          App shell, header/footer, error boundary (screen switching lives in the store)
  screens/      Briefing, Difficulty, PlanetSelect, PlanetBrief, Builder, PreLaunch, Launch,
                Outcome, RunSummary, Leaderboard, Credits
  components/   Badge, Gauge, StatCard, StatusLight, Dialogue, Avatar, ProgressTracker,
                PlanetVisual, ScienceNote, LiveRegion, planetInfo helpers
  builder/      Palette, ComponentCard, RocketCanvas, Slot, CrewSelector, LiveStats, dropLogic,
                parts/ (SVG rocket parts shared by builder, review and launch)
  launch/       Scenes (shared journey animation), sound (Web Audio)
  engine/       physics, requirements, build, mission, scoring, debrief, attempt (pure TypeScript, tested)
  config/       components, physics, difficulty, scoring, characters (all tuning lives here)
  data/         planets.json (snapshot), planets.ts (typed loader + validation), types.ts
  services/     leaderboard/ (interface, Local, Remote stub), nameValidation
  store/        gameStore (run, attempt, build, screen), settingsStore, persistence
scripts/        fetch-planets.ts, planet-descriptions.ts, balance-check.ts
```

## Tuning the game

Everything you would want to tweak is in `src/config/`:

- `components.ts`: every part's cost, mass, thrust, Isp, fuel, comms tier, pressure rating, temperature
  range, crew seats and life support. Each astronaut adds `ASTRONAUT_MASS_T` (0.5 t).
- `physics.ts`: the Δv legs, the `GAME_DV_SCALE` playability factor, thrust-to-weight minimums, comms tier
  distances, atmosphere rules, pressure per atmosphere, life-support formula and overspend allowance.
- `difficulty.ts`: budget, modules in play, checks in play, crew limit and hint mode per difficulty.
- `scoring.ts`: category maximums, ideal bands and crew multiplier.

After changing anything, run `npm run balance-check`. It fails if any planet becomes unwinnable within
budget, or if one rocket can win every Hard planet. Record notable changes in `DECISIONS.md`.

## Refreshing planet data

```bash
npm run fetch-planets
```

This queries the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) TAP service
(`pscomppars` table) and filters to planets with distance, radius, mass and equilibrium temperature, and a
radius ≤ 2.5 Earth radii. It assigns the curated difficulty pools and rewrites `src/data/planets.json` with
the retrieval date. Pool lists and planet descriptions live in `scripts/planet-descriptions.ts`. A planet
added to a pool needs a description there.

Behind a corporate or sandbox proxy, Node's built-in `fetch` ignores `HTTPS_PROXY` unless you enable it
(Node ≥ 22.21):

```bash
NODE_USE_ENV_PROXY=1 npm run fetch-planets
```

No API key is needed: the archive's TAP service is open. If a future script needs a NASA API key, copy
`.env.example` to `.env` and set `NASA_API_KEY` (it falls back to `DEMO_KEY`). `.env` is git-ignored.

## Leaderboard storage

Leaderboards sit behind the `LeaderboardService` interface (`src/services/leaderboard/`):

- `LocalLeaderboardService` is the default. It uses `localStorage`, works offline, and scores stay in that browser.
- `RemoteLeaderboardService` is a stub, ready for Supabase, Firebase or any REST backend.

To switch to a hosted leaderboard:

1. Create a `leaderboard` table/collection with
   `id, name, difficulty, average, best, planets_visited, date`. Allow inserts and reads only (for
   example with Supabase row-level security).
2. Implement `list()` and `submit()` in `RemoteLeaderboardService.ts`. There is an example Supabase REST
   call in the comments.
3. Set Vite env vars, for example in `.env.local`:
   ```
   VITE_LEADERBOARD=remote
   VITE_LEADERBOARD_URL=https://your-project.supabase.co
   VITE_LEADERBOARD_KEY=your-public-anon-key
   ```
4. `getLeaderboardService()` in `index.ts` picks the remote service automatically when these are set.

## Scientific accuracy

Actually travelling to an exoplanet is far beyond what any human spacecraft can do today. Even the closest
one would take tens of thousands of years with current rockets. In Rocket Builder the **distances,
sizes, masses and temperatures are real** (NASA DATA), but **travel physics are simplified** (GAME
MODEL) so missions are playable:

- Δv uses the real rocket equation, but each mission leg is scaled down by a single playability factor.
- Atmospheres are estimated from size, gravity and temperature, because the archive has no atmosphere
  data for most planets.
- Life support uses game days, not real voyage times.

Every value in the game is badged so players can tell real data from game assumptions. See
`DECISIONS.md` for the full list of assumptions.

## Data sources and credits

- **NASA Exoplanet Archive**, Planetary Systems Composite Parameters (`pscomppars`):
  https://exoplanetarchive.ipac.caltech.edu/. The retrieval date is shown in the game footer.
- **NASA Science, Strange New Worlds**, used for tone and inspiration:
  https://science.nasa.gov/exoplanets/immersive/strange-new-worlds/
- Planet descriptions, characters and all artwork are original to Team SEAL. No NASA logos or insignia are
  used.
- Built with React, Vite, TypeScript, Tailwind CSS, Recharts, dnd-kit, Framer Motion and Zustand.

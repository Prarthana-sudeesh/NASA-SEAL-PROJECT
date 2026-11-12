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
- physics-based decisions (thrust-to-weight, fuel, gravity, temperature, pressure)
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

1. **Crew login**: enter a username (shown on the leaderboard) and an email (stored only on your device).
2. **Mission control**: Dr. Hart, the mission scientist, briefs you. Pick **Easy, Medium or Hard**, then a
   planet. The wall screen shows its **Level, Description, Stats and Resources**. Real values are badged
   **NASA DATA**; game assumptions are badged **GAME MODEL**.
3. **Blueprint room**: drag parts from the toolbar onto the rocket (or press **+**):
   payload (probe or crew capsule), communication antenna, fuel tank (rocket length), outer hull material
   (aluminium, titanium, stainless steel, carbon-ceramic) and thruster. Add astronauts for a score multiplier.
4. **Set the dials** using the planet data: fuel load, engine thrust and pressure seal. On Easy the dials
   show their safe zones; on Medium the scientist gives tips; on Hard you're on your own.
5. **Launch** from Earth City and follow the shared journey through space, with a live pressure meter, fuel
   gauge, crew indicator and mission tracker. If something is wrong, the rocket fails at that stage.
6. **Mission report**: score breakdown (mission, budget, each dial, part choice, astronauts) and a
   debrief explaining exactly why the mission succeeded or failed.
7. **Ten missions per campaign**: your average goes on that difficulty's leaderboard.

## Project structure

```
src/
  app/            App shell (screen switching) and error boundary
  game/
    config.ts     All tuning: parts, costs, budgets, planets per difficulty, scoring
    engine.ts     Pure game rules: checks, dial zones, simulation, score, debrief text
    screens/      Login, Mission (control room), Build (blueprint + dials), Launch, Result, Summary, Leaderboard
    ui/           Pixel characters, scenery (control room, hologram, blueprint), rocket art, dial, HUD
    sound.ts      Web Audio beeps and engine rumble (off by default)
  components/     Badge, PlanetVisual, LiveRegion
  data/           planets.json (NASA snapshot), planets.ts (typed loader + validation), types.ts
  services/       leaderboard (interface, local storage, remote stub), name validation
  store/          gameStore (player, campaign, build, dials), settingsStore, persistence
scripts/          fetch-planets.ts, planet-descriptions.ts, balance-check.ts
```

## Tuning the game

Everything lives in `src/game/config.ts`: part costs, masses, fuel capacity, heat limits, hull strength,
thrust, fuel economy, the fuel formula, budgets, which planets are in each difficulty, and scoring. After a
change, run `npm run balance-check`. It fails if a planet can't be won within its budget, or if one rocket
can win every Hard planet.

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

- Fuel needs grow with distance (log scale), gravity and rocket mass, using one simple formula rather than full orbital mechanics.
- Atmospheres are estimated from size, gravity and temperature, because the archive has no atmosphere
  data for most planets.
- Outside pressure comes from the atmosphere class, which is estimated.

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

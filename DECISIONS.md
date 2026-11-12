# Design decisions

Assumptions and choices made beyond the original brief, kept up to date as the game is tuned.
Items marked **(tunable)** live in `src/config/` and can be changed without touching code.

## Architecture

- **No router library.** React Router was not on the approved dependency list. The current screen lives
  in the Zustand game store (`src/store/gameStore.ts`) and `App.tsx` switches between screens. This also
  makes "refresh and keep your place" trivial: the screen is persisted with the run.
- **Refresh during the launch animation** resumes on the Outcome screen. The attempt is recorded the moment
  the player presses Launch, so a refresh can't be used to re-roll a failure.
- **Engine is pure TypeScript** (`src/engine/`, no React). Scripts import it directly using Node's built-in
  TypeScript type stripping (Node ≥ 22.18), so no `tsx`/`ts-node` dependency is needed. All internal
  imports use explicit `.ts` extensions for that reason.
- **Extra dev-only tooling** (implied by the stack): `@vitejs/plugin-react`, `@tailwindcss/vite`,
  `jsdom`, `@testing-library/{dom,jest-dom,user-event}`, `typescript-eslint`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `globals`, `@types/*`, and `@dnd-kit/utilities`.
- **`@dnd-kit/sortable` was dropped**: nothing in the builder is a sortable list, and `@dnd-kit/core`
  covers palette → slot dragging, snapping and keyboard support.
- **Sound** is synthesised with the Web Audio API (`src/launch/sound.ts`), so there are no audio files. Off by
  default.
- **Vendor code is split** into `charts`, `motion` and `dnd` chunks to keep the main bundle small.

## Planet data

- Fetched from the Exoplanet Archive TAP service (`pscomppars`) on **2026-11-12**. 2,510 planets passed the
  filters (distance, radius, mass and Teq present; R ≤ 2.5 R⊕).
- **Curated pools** (see `scripts/planet-descriptions.ts`): preferred planets are listed by name; if one
  stops passing its rules after a refresh, the script fills the gap with the closest rule-passing planet
  that has a written description (and fails loudly if a pool drops below 8).
  - Easy (10): Proxima Cen b, Ross 128 b, Teegarden's Star b & c, GJ 1061 c & d, Wolf 1061 c, GJ 1002 b,
    GJ 273 b, tau Cet f.
  - Medium (10): TRAPPIST-1 d, e, f, g; LHS 1140 b & c; Gliese 12 b; Wolf 1069 b; L 98-59 f; GJ 1132 c.
  - Hard (12): 55 Cnc e, K2-141 b, Kepler-10 b, CoRoT-7 b, Kepler-78 b, LHS 3844 b, GJ 367 b, GJ 3323 c,
    Kepler-186 f, Kepler-22 b, K2-18 b, Kepler-452 b.
- **Loosened bound:** Medium gravity was widened from 0.5–1.8 g to **0.5–1.9 g** so LHS 1140 b (1.87 g),
  which the brief names explicitly, qualifies.
- **Hard rule** used: gravity 0.4–2.5 g and (Teq > 600 K or Teq < 150 K or distance > 100 ly).
- **Some "NASA DATA" radii/masses are archive estimates.** For planets found by radial velocity (e.g.
  Proxima Cen b) the composite table fills radius from a mass–radius relation. We still label them NASA DATA
  because they are the archive's published values.
- **Atmosphere classes (GAME MODEL)**, in priority order: Scorching (Teq > 600 K), Frozen (< 180 K),
  Thin/None (g < 0.75 or R < 0.85), Thick (R > 1.6 or g > 1.5), otherwise Earth-like **(tunable)**.
- **Planet descriptions** are original 2–3 sentence write-ups by the team, based on archive values.
- **Fetching behind a proxy:** Node's built-in `fetch` ignores `HTTPS_PROXY` unless
  `NODE_USE_ENV_PROXY=1` is set (Node ≥ 22.21). The README documents this.

## Physics (GAME MODEL, `src/config/physics.ts`)

The brief's raw Δv model makes every mission impossible with the given engines. Proxima Cen b alone needs
about 33 km/s, while the best chemical rocket manages about 6–7 km/s. So:

- **`GAME_DV_SCALE = 0.18`** multiplies every leg of the round trip. It keeps the _relative_ difficulty
  between planets (distance via log₁₀, gravity via escape velocity) while making missions reachable.
  Tuned with the balance script.
- **Earth-return leg** (not specified in the brief): 1.5 km/s raw (aerobraking assumed).
- **Phase-based engines:** high-thrust legs (Earth launch, landing, ascent) burn with the lift-capable
  engines (thrust-weighted Isp when two fire together). Coast/transfer legs (transit out, transit back,
  Earth return) use the most efficient engine fitted. Burns are simulated leg by leg with Tsiolkovsky,
  so fuel is consumed in order and the mission fails at the exact leg where it runs out.
  Because mass ratios multiply, the builder's "Δv available" uses the matching effective Isp and
  agrees exactly with the simulation.
- **Ion Hybrid "needs a booster"** = its thrust doesn't count for lift-off, landing or ascent. An ion-only
  rocket fails the lift-off thrust-to-weight check.
- **Thrust-to-weight:** lift-off ≥ 1.2 at Earth (as briefed); ascent ≥ 1.2 in the planet's gravity, using the
  mass remaining after landing.
- **Pressure rating by atmosphere** (atm): Thin 1, Earth-like 1, Frozen 3, Scorching 3, Thick 10.
- **Protection** must cover the planet's equilibrium temperature.
- **Life support** (Hard, crewed only): required days = 60 + 40 × log₁₀(ly), in game days. Payloads
  carry it: Crew Capsule 200 days, Habitat Module 400 days.
- **Crew on Easy:** Easy has no pressure module, so crew-rated payloads are treated as having built-in
  life support and the pressure check is skipped. On Medium/Hard a crewed rocket needs a crew-rated
  pressure system (all three tanks are crew-rated).
- **Requirement checks per difficulty** follow the brief. Landing gear and per-leg fuel checks are always
  on. The "Round-trip Δv" check is a summary and never stops the flight on its own; the per-leg fuel
  checks decide where the rocket runs dry.
- A check passes with a **warning** inside a 5% margin **(tunable)**.

## Components (`src/config/components.ts`)

- **Payload life support** added (Probe 0, Capsule 200, Habitat 400 days) to support the Hard check.
- **Heat Shield range** set to 200–900 K (the brief says "up to 900 K").
- **Cryo + Heat Composite restored to the brief's 50–1,500 K**, and a fourth protection option was added:
  **Lava Ablator** (130 cr, 9 t, 600–2,500 K). Without it the lava worlds (1,750–2,220 K) were
  impossible. Widening the composite instead let one rocket win every Hard planet, which breaks the
  "no one rocket fits all" rule. Now a frozen world and a lava world need different shields.

## Difficulty (`src/config/difficulty.ts`)

- **Hard budget raised from 700 to 1,150 credits.** Hard requires all six modules. The cheapest payload plus the comms,
  pressure and protection each Hard planet needs already cost 300–400 credits, and the three heaviest worlds (55 Cnc e,
  K2-141 b, Kepler-22 b) need two nuclear engines. The cheapest possible successful builds cost 670–1,110
  credits, so 700 made most Hard planets unwinnable. Hard is still the _tightest_ campaign relative to what
  missions need: the cheapest win uses 58–97% of the budget, versus 42–46% on Easy and 59–75% on Medium.
- **Hard hints:** the builder still shows the live totals (weight, cost, Δv, thrust-to-weight) and the
  requirement numbers, but no pass/fail lights or advice. The pre-flight checklist still shows lights,
  because Stage 6 requires it on every difficulty.
- **Missing required modules are not a hard block.** The brief's hard blocks are kept as listed. A missing
  comms, pressure or protection system makes the matching check fail in flight, so players learn from it.

## Scoring (`src/config/scoring.ts`)

- Mission: 400 on success, else 40 × stages cleared (max 320 if the last stage fails).
- Performance: two halves (75 each). Δv margin is ideal at 5–25% and drops to 0 at +150%. Lift-off TWR
  margin is ideal at 5–100% and drops to 0 at +300%: a wider band, because healthy rockets often have
  plenty of thrust. Under-engineering earns at most 60% of a half.
- Budget: full at 70–100% of budget, linear to 0 at +15%. Underspend below 70% loses up to 15 points on
  success and up to 60 on failure ("underspend that caused failure").
- Component selection: the payload, comms and (where in play) pressure and protection choices are each
  rated. The cheapest suitable option scores 1, the next ones 0.7 and 0.45, unsuitable 0.2, missing 0.
  The average is scaled to 150.
- Resource management: fuel left at the end is ideal at 2–20%. Failed missions score at most 60%, and
  missions that ran out of fuel score 20%.
- Astronaut multiplier: as briefed (×(1 + 0.1·crew) on success, −60 per astronaut on failure, floor 0).
- Run average: mean of the 10 attempt totals, one decimal place.

## Balance check results (`npm run balance-check`)

Exhaustive search over every component combination (with 0 crew and with full crew) for every planet:

| Difficulty | Budget | Builds tested | Cheapest win per planet | Required Δv     |
| ---------- | ------ | ------------- | ----------------------- | --------------- |
| Easy       | 1,000  | 3,990         | 420–460                 | 5.95–7.38 km/s  |
| Medium     | 850    | 11,970        | 500–640                 | 5.89–8.61 km/s  |
| Hard       | 1,150  | 47,880        | 670–1,110               | 6.11–10.09 km/s |

- Every planet has at least one successful build within budget. ✓
- No single build succeeds on every Hard planet. The best single build wins 7 of 12. ✓
- Score spread (p10 / median / max) is about 290 / 450–580 / 1,200 on Easy and 260 / 415–450 / 1,000–1,600 on
  Hard. The maximum includes the crew multiplier.

## Leaderboard

- Every finished campaign is its own entry (a player can appear more than once). Ranked by average,
  then best attempt, then earliest date. Top 20 per difficulty are shown, and up to 200 per difficulty
  are kept in storage.
- "Your" entries are the ones submitted from this browser. Their IDs are remembered in settings and the
  rows are highlighted.
- The score is submitted automatically when the campaign summary opens after mission 10. If the
  submission fails, a retry button appears.
- Name filter: 2–16 characters (letters, numbers, spaces, `.`, `_`, `-`) and a short profanity list with
  leetspeak folding. Words that often appear inside real names (e.g. "Dickens", "Essex") are deliberately
  not blocked.

## Accessibility and UX

- Every drag action has a button alternative ("+ Add", "✕ Remove"). dnd-kit keyboard dragging is enabled
  too, with custom screen-reader announcements. On phones (< 640 px) dragging is turned off, the
  builder uses tap-to-add, and a sticky bar shows cost, Δv and thrust-to-weight.
- Status is never shown by colour alone: every status uses ✓ / ! / ✕ icons and text.
- Reduced motion follows the operating-system setting by default. A header toggle can force it on or off.
  When reduced, scenes cross-fade and objects jump to their final positions.
- "Skip animation" appears after the player has watched one full launch.
- The briefing shows the full 8-line version the first time and a 3-line version afterwards, and always
  ends with the call-sign prompt.
- Engineer characters (Director Imani Vale, Tomás Reyna, Dr. Kiko Hart) are fictional and drawn as simple
  SVG avatars.
- No NASA logo or insignia is used anywhere. The favicon is an original rocket drawing.

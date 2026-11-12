# Design decisions

## Version 2: simpler game (current)

The first version followed the full written brief (nine stages, six modules, Δv legs). The team asked for
something simpler and more game-like, so the game was rebuilt around this flow:
**login → mission control → blueprint builder → dials → launch → report → leaderboard**.

### What was kept from the brainstorm

- Three difficulties, each with its own five NASA Exoplanet Archive planets (`src/game/config.ts`).
- Briefing by a mission scientist; Level / Description / Stats / Resources for each planet.
- Payload, thrusters, fuel tanks and communication as drag-and-drop parts, plus outer hull materials
  (aluminium, titanium, stainless steel, carbon-ceramic) from the team's notes.
- Pressure as a dial ("tanks they can switch out" became a pressure-seal setting matched to the hull).
- Budget per difficulty, scored on its own (150 points).
- Astronaut multiplier: success × (1 + 0.1 per astronaut), failure −60 per astronaut.
- Launch sequence, take-off UI, pressure meter, shared pre-animated space journey.
- Ten launches per campaign; the average goes to that difficulty's leaderboard.

### Look and feel

- Original pixel-art astronaut and scientist (grid sprites in `src/game/ui/Pixel.tsx`), a futuristic
  control room with a holographic planet, a blueprint-grid builder, and a hazy city launch site. All
  artwork is original and drawn in code; no third-party characters, logos or ships are used.
- Lots of motion (idle bobbing, blinking, visor glint, hologram spin, part snapping, springy dials,
  countdown, smoke, camera follow, star streaks, confetti), all disabled by reduced-motion.
- Fonts: Press Start 2P, Russo One and Exo 2 from Google Fonts, with system fallbacks when offline.

### Game rules (GAME MODEL)

- Dry mass = payload + astronauts (0.3 t each) + antenna + tank + hull (per tank section) + thruster.
- Fuel needed = dry mass × (1.0 + 0.9·log10(ly) + 1.0·g) × (0.75 + 0.5·thrust%) ÷ fuel economy.
- Thrust-to-weight must be ≥ 1.2 at Earth (full tank) and on the planet (30% of the fuel left).
- Antenna range: < 15 ly, < 60 ly, or any distance.
- Hull heat limit must be at least the planet's equilibrium temperature.
- Pressure seal ≥ max(1 atm, outside pressure), and ≤ the hull's strength. Outside pressure by atmosphere
  class: thin 0, Earth-like 1, frozen 1.5, scorching 3, thick 8 atm.
- Checks run in order (launch, journey, approach, landing, take-off, return); the first failure ends the flight.
- Score (max 1,000 before crew): mission 400 (50 per stage cleared on failure), budget 150, each dial 100
  for accuracy (being close to the minimum that works), part choice 150 (cheapest suitable hull and antenna).
- Hint levels: Easy shows each dial's safe zone and live flight checks; Medium shows live checks and the
  scientist gives numeric tips; Hard shows neither.

### Balance (`npm run balance-check`, 216 part combinations per planet)

| Difficulty                                                                                                 | Budget | Cheapest winning rocket | Notes                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | ---------------------------------------------------------------------------- |
| Easy                                                                                                       | 500    | 270–310                 | Many combinations win                                                        |
| Medium                                                                                                     | 600    | 310                     | Further planets need the high-gain dish                                      |
| Hard                                                                                                       | 900    | 620–810                 | Needs the nuclear thruster and the right hull; 1–8 winning builds per planet |
| No single rocket wins every Hard planet. Budgets were tightened from 1,000/900/1,000 so that over-building |
| is actually limited (the most expensive possible rocket costs 980).                                        |

### Science quiz

- After fitting parts, Dr. Hart asks one multiple-choice question before the dials (heat → hull,
  distance → antenna, outside pressure → seal, gravity → thrust, or which thruster saves fuel). The most
  relevant topic for the planet comes first and the topic rotates with the mission number.
- A right answer adds 50 points ("Science quiz" in the report). Answers lock once chosen.

### Shared leaderboard

- On claude.ai the game uses the artifact's shared database: `scores/<viewer id>` holds the player's
  username and best campaign per difficulty. Rules: everyone with access reads; each player can write
  only their own row (needs "can interact" access); the owner can tidy. Elsewhere the leaderboard stays
  on the device (or a hosted backend via `RemoteLeaderboardService`).
- The shared board keeps one entry per player (their best average), so it can't be flooded.

### Installable app

- Progressive Web App rather than a native app: one codebase, installs on phones, tablets and
  computers, works offline, no app-store review. Hosted on GitHub Pages by a workflow. A native wrapper
  (Capacitor) can be added later without changing the game.
- Vite `base: './'` so the same build works at any path.

### Accounts and privacy

- Username and email are stored only in the browser (localStorage). The email is never shown or sent
  anywhere. The leaderboard shows usernames only. A hosted leaderboard can be added later through
  `RemoteLeaderboardService` (see README).

### Other

- Hosted builds use relative paths (`vite build --base ./`) and avoid `confirm()` dialogs.
- Planet data pipeline, NASA DATA / GAME MODEL badges and the scientific note are unchanged from v1.

## Version 1 (superseded)

See git history (commit "Build Rocket Builder…") for the original nine-stage design and its decisions.

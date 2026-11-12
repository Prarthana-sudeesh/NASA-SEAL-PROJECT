// Original, fictional mission-control characters (not real people).
export interface Character {
  id: 'vale' | 'reyna' | 'hart';
  name: string;
  role: string;
  color: string;
  accessory: 'headset' | 'goggles' | 'glasses';
  skin: string;
  hair: string;
}

export const CHARACTERS: Record<Character['id'], Character> = {
  vale: {
    id: 'vale',
    name: 'Director Imani Vale',
    role: 'Flight Director',
    color: '#2bb5a6',
    accessory: 'headset',
    skin: '#8d5a3b',
    hair: '#1c1410',
  },
  reyna: {
    id: 'reyna',
    name: 'Tomás Reyna',
    role: 'Chief Propulsion Engineer',
    color: '#ff7a1a',
    accessory: 'goggles',
    skin: '#d6a27a',
    hair: '#3a2a20',
  },
  hart: {
    id: 'hart',
    name: 'Dr. Kiko Hart',
    role: 'Planetary Scientist',
    color: '#9b7bff',
    accessory: 'glasses',
    skin: '#f0c9a4',
    hair: '#6b3b2a',
  },
};

export interface DialogueLine {
  speaker: Character['id'];
  text: string;
  /** Ask for the call-sign on this line. */
  askName?: boolean;
}

export const FULL_BRIEFING: DialogueLine[] = [
  {
    speaker: 'vale',
    text: 'Welcome to Mission Control, and congratulations. As of today you are our newest rocket scientist.',
  },
  {
    speaker: 'reyna',
    text: 'Until now this team built one-way probes. You have been promoted to the crewed programme, so every rocket you design has to bring its passengers home.',
  },
  {
    speaker: 'hart',
    text: 'That means a double trip: Earth to an exoplanet and back again. You will need to take off a second time, from that planet’s gravity.',
  },
  {
    speaker: 'reyna',
    text: 'Every part is a trade-off. More fuel means more weight. More thrust costs more credits. Pick parts that match the mission, not just the biggest ones.',
  },
  {
    speaker: 'hart',
    text: 'I will brief you on each world with real values from the NASA Exoplanet Archive. Anything marked GAME MODEL is one of our simplified assumptions.',
  },
  {
    speaker: 'hart',
    text: 'One honest note: real exoplanets are far beyond today’s spacecraft. The distances are real, but we have simplified travel physics so missions are playable.',
  },
  {
    speaker: 'vale',
    text: 'You will fly ten missions per campaign. Your average score goes on the leaderboard, so consistency beats one lucky launch.',
  },
  { speaker: 'vale', text: 'Before we begin: what is your call-sign?', askName: true },
];

export const SHORT_BRIEFING: DialogueLine[] = [
  {
    speaker: 'vale',
    text: 'Welcome back to Mission Control. Same rules: every rocket must make the round trip.',
  },
  {
    speaker: 'reyna',
    text: 'Ten missions per campaign, and the average counts. Watch your mass, your budget and the planet’s gravity.',
  },
  { speaker: 'vale', text: 'Confirm your call-sign and let’s fly.', askName: true },
];

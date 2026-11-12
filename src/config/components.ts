// Component catalogue. Tune cost, mass and performance here; everything else reads from this file.
import type {
  CommsComponent,
  FuelComponent,
  ModuleType,
  PayloadComponent,
  PressureComponent,
  ProtectionComponent,
  RocketComponent,
  ThrusterComponent,
} from '../data/types.ts';

/** Mass added per astronaut, in tonnes. */
export const ASTRONAUT_MASS_T = 0.5;

export const PAYLOADS: PayloadComponent[] = [
  {
    id: 'probe-pod',
    module: 'payload',
    name: 'Probe Pod',
    cost: 60,
    massT: 4,
    maxCrew: 0,
    landerLegs: true,
    lab: false,
    sampleBay: false,
    lifeSupportDays: 0,
    blurb: 'Light robotic lander. No room for crew.',
  },
  {
    id: 'crew-capsule',
    module: 'payload',
    name: 'Crew Capsule',
    cost: 140,
    massT: 12,
    maxCrew: 4,
    landerLegs: true,
    lab: false,
    sampleBay: false,
    lifeSupportDays: 200,
    blurb: 'Seats up to 4 astronauts with 200 days of life support.',
  },
  {
    id: 'habitat-module',
    module: 'payload',
    name: 'Habitat Module',
    cost: 220,
    massT: 20,
    maxCrew: 6,
    landerLegs: true,
    lab: true,
    sampleBay: true,
    lifeSupportDays: 400,
    blurb: 'Up to 6 crew, science lab, sample return bay, 400 days of life support.',
  },
];

export const THRUSTERS: ThrusterComponent[] = [
  {
    id: 'chem-mk1',
    module: 'thruster',
    name: 'Chemical Mk1',
    cost: 90,
    massT: 6,
    thrustKN: 2000,
    ispS: 320,
    canLiftOff: true,
    blurb: 'Reliable, cheap, thirsty.',
  },
  {
    id: 'chem-mk2',
    module: 'thruster',
    name: 'Chemical Mk2',
    cost: 160,
    massT: 9,
    thrustKN: 3500,
    ispS: 360,
    canLiftOff: true,
    blurb: 'Big push for heavy rockets.',
  },
  {
    id: 'nuclear-thermal',
    module: 'thruster',
    name: 'Nuclear Thermal',
    cost: 260,
    massT: 14,
    thrustKN: 1500,
    ispS: 850,
    canLiftOff: true,
    blurb: 'Over twice as fuel-efficient as chemical, but heavy and modest thrust.',
  },
  {
    id: 'ion-hybrid',
    module: 'thruster',
    name: 'Ion Hybrid',
    cost: 300,
    massT: 10,
    thrustKN: 900,
    ispS: 2500,
    canLiftOff: false,
    blurb: 'Superb efficiency in space. Needs a booster thruster for lift-off and landing.',
  },
];

export const FUEL_TANKS: FuelComponent[] = [
  {
    id: 'tank-small',
    module: 'fuel',
    name: 'Small Tank',
    cost: 40,
    massT: 3,
    fuelT: 20,
    blurb: '20 t of propellant.',
  },
  {
    id: 'tank-medium',
    module: 'fuel',
    name: 'Medium Tank',
    cost: 70,
    massT: 5,
    fuelT: 45,
    blurb: '45 t of propellant.',
  },
  {
    id: 'tank-large',
    module: 'fuel',
    name: 'Large Tank',
    cost: 110,
    massT: 8,
    fuelT: 80,
    blurb: '80 t of propellant.',
  },
];

export const COMMS: CommsComponent[] = [
  {
    id: 'low-gain',
    module: 'comms',
    name: 'Low-Gain Antenna',
    cost: 30,
    massT: 1,
    rangeTier: 1,
    blurb: 'Range tier 1: worlds under 15 light-years.',
  },
  {
    id: 'high-gain',
    module: 'comms',
    name: 'High-Gain Dish',
    cost: 70,
    massT: 2,
    rangeTier: 2,
    blurb: 'Range tier 2: worlds under 60 light-years.',
  },
  {
    id: 'deep-space-relay',
    module: 'comms',
    name: 'Deep Space Relay',
    cost: 130,
    massT: 4,
    rangeTier: 3,
    blurb: 'Range tier 3: any distance.',
  },
];

export const PRESSURE: PressureComponent[] = [
  {
    id: 'pressure-standard',
    module: 'pressure',
    name: 'Standard Tank',
    cost: 40,
    massT: 2,
    ratingAtm: 1,
    crewRated: true,
    blurb: 'Holds 1 atm. Crew-rated.',
  },
  {
    id: 'pressure-reinforced',
    module: 'pressure',
    name: 'Reinforced Tank',
    cost: 80,
    massT: 4,
    ratingAtm: 3,
    crewRated: true,
    blurb: 'Rated to 3 atm. Crew-rated.',
  },
  {
    id: 'pressure-extreme',
    module: 'pressure',
    name: 'Extreme Tank',
    cost: 140,
    massT: 7,
    ratingAtm: 10,
    crewRated: true,
    blurb: 'Rated to 10 atm. Crew-rated.',
  },
];

export const PROTECTION: ProtectionComponent[] = [
  {
    id: 'thermal-blanket',
    module: 'protection',
    name: 'Thermal Blanket',
    cost: 40,
    massT: 2,
    minK: 150,
    maxK: 400,
    blurb: 'Comfortable worlds: 150–400 K.',
  },
  {
    id: 'heat-shield',
    module: 'protection',
    name: 'Heat Shield',
    cost: 90,
    massT: 5,
    minK: 200,
    maxK: 900,
    blurb: 'Hot worlds: 200–900 K.',
  },
  {
    id: 'cryo-heat-composite',
    module: 'protection',
    name: 'Cryo + Heat Composite',
    cost: 150,
    massT: 8,
    minK: 50,
    maxK: 1500,
    blurb: 'Wide range: 50–1,500 K, from frozen worlds to very hot ones.',
  },
  {
    id: 'lava-ablator',
    module: 'protection',
    name: 'Lava Ablator',
    cost: 130,
    massT: 9,
    minK: 600,
    maxK: 2500,
    blurb: 'Lava worlds only: 600–2,500 K. Cracks in the cold.',
  },
];

export const ALL_COMPONENTS: RocketComponent[] = [
  ...PAYLOADS,
  ...COMMS,
  ...PRESSURE,
  ...FUEL_TANKS,
  ...THRUSTERS,
  ...PROTECTION,
];

const BY_ID = new Map<string, RocketComponent>(ALL_COMPONENTS.map((c) => [c.id, c]));

export function getComponent(id: string | null | undefined): RocketComponent | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function componentsFor(module: ModuleType): RocketComponent[] {
  return ALL_COMPONENTS.filter((c) => c.module === module);
}

export const MODULE_LABELS: Record<ModuleType, string> = {
  payload: 'Payload System',
  comms: 'Communication',
  pressure: 'Pressure Systems',
  fuel: 'Fuel Tanks',
  thruster: 'Thrusters',
  protection: 'Protection Systems',
};

export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  payload: 'Carries crew, cargo and science equipment. Must have lander legs to touch down.',
  comms: 'Keeps you in contact with Earth. Range must reach the destination.',
  pressure: 'Pressure tanks that hold the planet’s atmospheric pressure at bay. Swap to match.',
  fuel: 'Propellant. More fuel means more Δv, but also more weight. Stack up to 3.',
  thruster: 'Thrust lifts the rocket; specific impulse (Isp) sets fuel efficiency. Up to 2.',
  protection: 'Outer layer that keeps the spacecraft within a safe temperature range.',
};

export type MoveCategory = "physical" | "special" | "status";

export interface StatChange {
  stat: string;
  change: number;
}

export interface MoveMeta {
  ailment: string | null;
  ailmentChance: number;
  drain: number;
  healing: number;
  flinchChance: number;
  critRate: number;
  minHits: number | null;
  maxHits: number | null;
}

export interface Move {
  id: string;
  name: string;
  koreanName: string | null;
  type: string;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  energyCost: number;
  target: string;
  learnedByCount: number;
  meta: MoveMeta | null;
  statChanges: StatChange[];
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonSpecies {
  id: string;
  dexId: number;
  name: string;
  koreanName: string | null;
  isLegendary: boolean;
  isMythical: boolean;
  types: string[];
  baseStats: BaseStats;
  movepool: string[];
  evolvesTo: string | null;
  abilities: string[];
  spriteUrl: string | null;
}

export type StatusCondition = "burn" | "poison" | "paralysis" | "sleep" | "freeze" | "confusion";

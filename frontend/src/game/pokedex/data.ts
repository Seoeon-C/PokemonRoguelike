import speciesData from "../../data/species.json";
import movesData from "../../data/moves.json";
import type { Move, PokemonSpecies } from "../../types/pokemon";
import { SUB_LEGENDARY_IDS } from "./subLegendaries";

export const ALL_SPECIES = speciesData as PokemonSpecies[];
export const ALL_MOVES = movesData as Move[];

const speciesById = new Map(ALL_SPECIES.map((s) => [s.id, s]));
const moveById = new Map(ALL_MOVES.map((m) => [m.id, m]));

export function getSpecies(speciesId: string): PokemonSpecies {
  const species = speciesById.get(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);
  return species;
}

export function hasSpecies(speciesId: string): boolean {
  return speciesById.has(speciesId);
}

// --- enemy encounter tiers (normal wild encounters / elite / boss) ---

const PSEUDO_LEGENDARY_BST = 600;

export function baseStatTotal(species: PokemonSpecies): number {
  const s = species.baseStats;
  return s.hp + s.attack + s.defense + s.specialAttack + s.specialDefense + s.speed;
}

export function isPseudoLegendary(species: PokemonSpecies): boolean {
  return !species.isLegendary && !species.isMythical && baseStatTotal(species) === PSEUDO_LEGENDARY_BST;
}

export function isSubLegendary(species: PokemonSpecies): boolean {
  return SUB_LEGENDARY_IDS.has(species.id);
}

export type EnemyTier = "normal" | "elite" | "boss";

/** elite = 600-BST pseudo-legendaries + curated sub-legendaries; boss = legendary + mythical */
export function enemyTierOf(species: PokemonSpecies): EnemyTier {
  if (species.isMythical || (species.isLegendary && !isSubLegendary(species))) return "boss";
  if (isPseudoLegendary(species) || isSubLegendary(species)) return "elite";
  return "normal";
}

export function speciesByEnemyTier(tier: EnemyTier): PokemonSpecies[] {
  return ALL_SPECIES.filter((s) => enemyTierOf(s) === tier);
}

export function getMove(moveId: string): Move {
  const move = moveById.get(moveId);
  if (!move) throw new Error(`Unknown move: ${moveId}`);
  return move;
}

export function displaySpeciesName(species: PokemonSpecies): string {
  return species.koreanName ?? species.name;
}

export function displayMoveName(move: Move): string {
  return move.koreanName ?? move.name;
}

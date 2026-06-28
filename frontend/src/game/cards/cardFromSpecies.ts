import type { Card, CardEffect, PlayerClassId } from "../../types/card";
import type { BaseStats, PokemonSpecies } from "../../types/pokemon";

export type SpeciesCardKind = "physicalDamage" | "specialDamage" | "physicalDefense" | "specialDefense" | "draw" | "energy";

// tie-break order when two stats are exactly equal
const STAT_PRIORITY: (keyof BaseStats)[] = ["attack", "specialAttack", "defense", "specialDefense", "speed", "hp"];

const KIND_BY_STAT: Record<keyof BaseStats, SpeciesCardKind> = {
  attack: "physicalDamage",
  specialAttack: "specialDamage",
  defense: "physicalDefense",
  specialDefense: "specialDefense",
  speed: "draw",
  hp: "energy",
};

const BLOCK_PER_STAT_POINT = 0.3;

/** the species' dominant stat decides what kind of card it becomes */
export function dominantStat(baseStats: BaseStats): keyof BaseStats {
  return STAT_PRIORITY.reduce((best, stat) => (baseStats[stat] > baseStats[best] ? stat : best));
}

export function cardKindForSpecies(species: PokemonSpecies): SpeciesCardKind {
  return KIND_BY_STAT[dominantStat(species.baseStats)];
}

function costForStatValue(value: number): number {
  if (value <= 60) return 1;
  if (value <= 90) return 2;
  if (value <= 120) return 3;
  return 4;
}

function effectForKind(kind: SpeciesCardKind, statValue: number, moveType: string): CardEffect {
  switch (kind) {
    case "physicalDamage":
    case "specialDamage":
      return { kind: "damage", power: statValue, moveType, critRate: 0, minHits: null, maxHits: null };
    case "physicalDefense":
    case "specialDefense":
      return { kind: "block", amount: Math.round(statValue * BLOCK_PER_STAT_POINT) };
    case "draw":
      return { kind: "draw", count: 1 };
    case "energy":
      return { kind: "energyGain", amount: 1 };
  }
}

/** converts a Pokemon species into a card template, keyed off its dominant base stat */
export function cardFromSpecies(species: PokemonSpecies, classId: PlayerClassId): Card {
  const stat = dominantStat(species.baseStats);
  const kind = KIND_BY_STAT[stat];
  const statValue = species.baseStats[stat];
  const moveType = species.types[0];

  return {
    id: species.id,
    sourceMoveId: null,
    sourceSpeciesId: species.id,
    name: species.name,
    koreanName: species.koreanName,
    cost: costForStatValue(statValue),
    category: kind === "physicalDamage" || kind === "specialDamage" ? "attack" : "skill",
    classId,
    exhaust: false,
    moveType,
    effects: [effectForKind(kind, statValue, moveType)],
  };
}

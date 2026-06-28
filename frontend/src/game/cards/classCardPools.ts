import type { Card, PlayerClassId } from "../../types/card";
import { ALL_SPECIES, getSpecies } from "../pokedex/data";
import { cardFromSpecies, cardKindForSpecies, type SpeciesCardKind } from "./cardFromSpecies";
import { HAND_AUTHORED_CARDS } from "./handAuthoredCards";

// which dominant-stat "kind" of species-card belongs to which class — matches
// each class's identity (전사=물리, 마법사=특수, 궁수=공격 아닌 카드로 조준 스택)
const CLASS_BY_KIND: Record<SpeciesCardKind, PlayerClassId> = {
  physicalDamage: "warrior",
  physicalDefense: "warrior",
  specialDamage: "mage",
  specialDefense: "mage",
  draw: "archer",
  energy: "archer",
};

// rule-based, species-driven pools — every one of the 1025 species becomes exactly
// one card, classified by whichever base stat it's strongest in (see cardFromSpecies.ts)
const SPECIES_POOL_BY_CLASS: Record<PlayerClassId, Card[]> = { warrior: [], mage: [], archer: [] };
for (const species of ALL_SPECIES) {
  const classId = CLASS_BY_KIND[cardKindForSpecies(species)];
  SPECIES_POOL_BY_CLASS[classId].push(cardFromSpecies(species, classId));
}

// small, hand-picked starting decks — deliberately curated low-BST species so an
// opening hand isn't already a powerhouse, regardless of how the auto pool classifies them.
// every card is a Pokemon now except the mage's orb utility, which has no Pokemon equivalent.
const STARTING_SPECIES_BY_CLASS: Record<PlayerClassId, string[]> = {
  warrior: ["machop", "geodude", "onix", "machoke", "bellsprout"],
  mage: ["abra", "tentacool"],
  archer: ["rattata", "pidgey", "caterpie", "spearow", "poliwag"],
};
const STARTING_AUTHORED_BY_CLASS: Record<PlayerClassId, string[]> = {
  warrior: [],
  mage: ["channel-fire", "channel-water", "evoke-front", "evoke-front"],
  archer: [],
};

export function classCardPool(classId: PlayerClassId): Card[] {
  const authored = HAND_AUTHORED_CARDS.filter((c) => c.classId === classId);
  return [...SPECIES_POOL_BY_CLASS[classId], ...authored];
}

export function startingDeck(classId: PlayerClassId): Card[] {
  const fromSpecies = STARTING_SPECIES_BY_CLASS[classId].map((id) => cardFromSpecies(getSpecies(id), classId));
  const authoredPool = new Map(HAND_AUTHORED_CARDS.map((c) => [c.id, c]));
  const fromAuthored = STARTING_AUTHORED_BY_CLASS[classId].map((id) => {
    const card = authoredPool.get(id);
    if (!card) throw new Error(`Unknown starting card: ${id}`);
    return { ...card };
  });
  return [...fromSpecies, ...fromAuthored];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** card reward options after a fight: random class-pool cards */
export function generateCardRewardOptions(classId: PlayerClassId, count = 3): Card[] {
  return shuffle(classCardPool(classId)).slice(0, count);
}

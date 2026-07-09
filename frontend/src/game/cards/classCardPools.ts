import type { Card, PlayerClassId } from "../../types/card";
import { ALL_SPECIES, getSpecies } from "../pokedex/data";
import { cardFromSpecies, cardKindForSpecies, type SpeciesCardKind } from "./cardFromSpecies";
import { HAND_AUTHORED_CARDS } from "./handAuthoredCards";

// which dominant-stat "kind" of species-card belongs to which class — matches
// each class's identity (전사=물리, 마법사=특수). 궁수는 종족값 4개(공/특공/방/특방) 중
// 어디에도 아직 배정 안 함 — 보류 중인 결정, 일단 기본 드로우/에너지 카드만 가짐
const CLASS_BY_KIND: Record<SpeciesCardKind, PlayerClassId> = {
  physicalDamage: "warrior",
  physicalDefense: "warrior",
  specialDamage: "mage",
  specialDefense: "mage",
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
  archer: ["basic-draw", "basic-draw", "basic-energy"],
};

// basic-draw/basic-energy aren't class-exclusive — every class can draw them
const SHARED_CARD_IDS = new Set(["basic-draw", "basic-energy"]);

export function classCardPool(classId: PlayerClassId): Card[] {
  const authored = HAND_AUTHORED_CARDS.filter((c) => c.classId === classId || SHARED_CARD_IDS.has(c.id));
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

export type EncounterType = "battle" | "elite" | "boss";

const COST_WEIGHTS: Record<EncounterType, { cost: number; weight: number }[]> = {
  battle: [
    { cost: 1, weight: 70 },
    { cost: 2, weight: 20 },
    { cost: 3, weight: 10 },
  ],
  elite: [
    { cost: 2, weight: 50 },
    { cost: 3, weight: 40 },
    { cost: 4, weight: 10 },
  ],
  boss: [
    { cost: 3, weight: 50 },
    { cost: 4, weight: 50 },
  ],
};

function pickWeightedCost(encounterType: EncounterType): number {
  const weights = COST_WEIGHTS[encounterType];
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * total;
  for (const { cost, weight } of weights) {
    rand -= weight;
    if (rand <= 0) return cost;
  }
  return weights[weights.length - 1].cost;
}

/** card reward options after a fight: pick one cost tier, then show `count` cards from that tier */
export function generateCardRewardOptions(classId: PlayerClassId, encounterType: EncounterType = "battle", count = 3): Card[] {
  const pool = classCardPool(classId);
  const byCost: Record<number, Card[]> = {};
  for (const card of pool) {
    (byCost[card.cost] ??= []).push(card);
  }

  const cost = pickWeightedCost(encounterType);
  const tier = byCost[cost] ?? pool;

  const shuffled = [...tier].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

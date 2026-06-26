import type { Card, PlayerClassId } from "../../types/card";
import { ALL_MOVES, getMove } from "../pokedex/data";
import { cardFromMove } from "./cardFromMove";
import { classifyMoveForClass } from "./cardClassification";
import { HAND_AUTHORED_CARDS } from "./handAuthoredCards";

// auto-classified, rule-based pools (see cardClassification.ts) — adding a new move to the
// data set (e.g. expanding SPECIES_LIST and re-running the fetch script) flows in automatically,
// no per-card curation needed. cards with no representable effect (e.g. evasion-only moves we
// don't track) are dropped rather than hand-picked around.
const MOVE_POOL_BY_CLASS: Record<PlayerClassId, Card[]> = { warrior: [], mage: [], archer: [] };
for (const move of ALL_MOVES) {
  const classId = classifyMoveForClass(move);
  const card = cardFromMove(move, classId);
  if (card.effects.length > 0) MOVE_POOL_BY_CLASS[classId].push(card);
}

// small, hand-picked starting decks — deliberately curated regardless of how a move auto-classifies,
// since a starter kit is a design choice, not pool busywork
const STARTING_MOVES_BY_CLASS: Record<PlayerClassId, string[]> = {
  warrior: ["tackle", "harden"],
  mage: ["ember", "water-gun"],
  archer: ["quick-attack", "quick-attack", "peck", "agility", "leer"],
};
const STARTING_AUTHORED_BY_CLASS: Record<PlayerClassId, string[]> = {
  warrior: ["basic-strike", "basic-strike", "basic-guard", "basic-guard", "quick-scout"],
  mage: ["channel-fire", "channel-water", "evoke-front", "evoke-front", "basic-guard"],
  archer: ["basic-guard", "quick-scout"],
};

// basic-strike/basic-guard/quick-scout aren't class-exclusive — every class can draw them
const SHARED_CARD_IDS = new Set(["basic-strike", "basic-guard", "quick-scout", "deep-breath"]);

export function classCardPool(classId: PlayerClassId): Card[] {
  const authored = HAND_AUTHORED_CARDS.filter((c) => c.classId === classId || SHARED_CARD_IDS.has(c.id));
  return [...MOVE_POOL_BY_CLASS[classId], ...authored];
}

export function startingDeck(classId: PlayerClassId): Card[] {
  const fromMoves = STARTING_MOVES_BY_CLASS[classId].map((id) => cardFromMove(getMove(id), classId));
  const authoredPool = new Map(HAND_AUTHORED_CARDS.map((c) => [c.id, c]));
  const fromAuthored = STARTING_AUTHORED_BY_CLASS[classId].map((id) => {
    const card = authoredPool.get(id);
    if (!card) throw new Error(`Unknown starting card: ${id}`);
    return { ...card };
  });
  return [...fromMoves, ...fromAuthored];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** card reward options after a fight: random class-pool cards, excluding the boring shared basics */
export function generateCardRewardOptions(classId: PlayerClassId, count = 3): Card[] {
  const candidates = classCardPool(classId).filter((c) => !SHARED_CARD_IDS.has(c.id));
  return shuffle(candidates).slice(0, count);
}

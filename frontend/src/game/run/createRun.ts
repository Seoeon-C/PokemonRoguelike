import type { NodeType } from "../../types/map";
import type { PlayerClassId } from "../../types/card";
import type { RunState } from "../../types/run";
import { speciesByEnemyTier } from "../pokedex/data";
import { generateMap } from "../map/generateMap";
import { startingDeck } from "../cards/classCardPools";
import { createEnemyCombatant, STARTING_PLAYER_HP } from "../combat";
import type { EnemyCombatant } from "../../types/combat";

const FLOOR_STAT_SCALE = 0.05;

const NODE_BASE_MULTIPLIER: Partial<Record<NodeType, number>> = {
  battle: 1.0,
  elite: 1.2,
  boss: 1.4,
};

function enemyTierForNode(nodeType: NodeType): "normal" | "elite" | "boss" {
  if (nodeType === "boss") return "boss";
  if (nodeType === "elite") return "elite";
  return "normal";
}

// normal battles start 1v1 and only ramp up to multi-enemy fights on deeper floors,
// once the player's deck/HP have had a chance to grow
function enemyCountFor(nodeType: NodeType, floor: number): number {
  if (nodeType !== "battle") return 1;
  if (floor <= 2) return 1;
  if (floor <= 5) return 1 + Math.floor(Math.random() * 2);
  return 1 + Math.floor(Math.random() * 3);
}

export function createEnemyEncounter(seed: string, nodeType: NodeType, floor: number): EnemyCombatant[] {
  const baseMultiplier = NODE_BASE_MULTIPLIER[nodeType] ?? NODE_BASE_MULTIPLIER.battle!;
  const pool = speciesByEnemyTier(enemyTierForNode(nodeType));
  const statMultiplier = baseMultiplier + floor * FLOOR_STAT_SCALE;
  const count = enemyCountFor(nodeType, floor);

  return Array.from({ length: count }, (_, i) => {
    const species = pool[Math.floor(Math.random() * pool.length)];
    return createEnemyCombatant(species.id, `enemy-${seed}-${i}`, statMultiplier, nodeType as "battle" | "elite" | "boss");
  });
}

export function createInitialRun(classId: PlayerClassId): RunState {
  const maxHp = STARTING_PLAYER_HP[classId];
  return {
    classId,
    hp: maxHp,
    maxHp,
    deck: startingDeck(classId),
    gold: 0,
    map: generateMap(),
    currentNodeId: null,
    visitedNodeIds: [],
  };
}

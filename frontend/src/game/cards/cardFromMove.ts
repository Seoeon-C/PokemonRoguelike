import type { Card, CardEffect, PlayerClassId, StatStageKey } from "../../types/card";
import type { Move, StatusCondition } from "../../types/pokemon";

const STAT_NAME_MAP: Record<string, StatStageKey> = {
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

// kept above the flat "basic-guard" card's block (+5) so a thematic move-derived
// defense card is never strictly worse than the always-available fallback
const BLOCK_PER_DEFENSE_STAGE = 7;

// PokeAPI's move "ailment" field includes many non-status effects we don't
// model (leech-seed, torment, disable, yawn, ...) — only convert the subset
// that maps to our 6 actual status conditions
const SUPPORTED_AILMENTS = new Set<StatusCondition>(["burn", "poison", "paralysis", "sleep", "freeze", "confusion"]);
function isSupportedAilment(ailment: string): ailment is StatusCondition {
  return SUPPORTED_AILMENTS.has(ailment as StatusCondition);
}

/** converts a Pokemon move into a generic card template (not yet tied to a deck instance) */
export function cardFromMove(move: Move, classId: PlayerClassId): Card {
  const effects: CardEffect[] = [];
  const targetsSelf = move.target.includes("user");

  if (move.power != null) {
    effects.push({
      kind: "damage",
      power: move.power,
      moveType: move.type,
      critRate: move.meta?.critRate ?? 0,
      minHits: move.meta?.minHits ?? null,
      maxHits: move.meta?.maxHits ?? null,
    });
  }

  for (const { stat, change } of move.statChanges) {
    if ((stat === "defense" || stat === "special-defense") && targetsSelf && change > 0) {
      effects.push({ kind: "block", amount: change * BLOCK_PER_DEFENSE_STAGE });
      continue;
    }
    const key = STAT_NAME_MAP[stat];
    if (!key) continue;
    effects.push({ kind: "statStage", stat: key, change, target: targetsSelf ? "self" : "enemy" });
  }

  if (move.meta?.ailment && isSupportedAilment(move.meta.ailment)) {
    effects.push({
      kind: "ailment",
      status: move.meta.ailment,
      chance: move.meta.ailmentChance > 0 ? move.meta.ailmentChance : 100,
    });
  }

  return {
    id: move.id,
    sourceMoveId: move.id,
    name: move.name,
    koreanName: move.koreanName,
    cost: move.energyCost,
    category: move.power != null ? "attack" : "skill",
    classId,
    exhaust: false,
    moveType: move.type,
    effects,
  };
}

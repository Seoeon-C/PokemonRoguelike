import type { PlayerClassId } from "../../types/card";
import type { Move } from "../../types/pokemon";

// physical moves of these types read as "precise/agile" -> archer; the rest read as "heavy hitter" -> warrior
const ARCHER_PHYSICAL_TYPES = new Set(["bug", "flying", "normal", "poison"]);

// status/utility moves of these types read as "spell-like" -> mage
const MAGE_UTILITY_TYPES = new Set([
  "fire", "water", "electric", "ice", "grass", "psychic", "ghost", "dragon", "dark", "fairy",
]);

/** deterministic, attribute-based classification — no per-move curation needed */
export function classifyMoveForClass(move: Move): PlayerClassId {
  if (move.power != null) {
    if (move.category === "special") return "mage";
    return ARCHER_PHYSICAL_TYPES.has(move.type) ? "archer" : "warrior";
  }

  // status/utility moves
  if (MAGE_UTILITY_TYPES.has(move.type)) return "mage";
  const givesSelfBlock = move.statChanges.some(
    (sc) => (sc.stat === "defense" || sc.stat === "special-defense") && sc.change > 0
  );
  return givesSelfBlock ? "warrior" : "archer";
}

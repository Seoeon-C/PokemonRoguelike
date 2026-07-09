// Generates the hand-reviewable baseline for src/data/cardFlavorMoves.json — for each
// of the 1025 species, its full stat/movepool context plus which real move (if any)
// represents its card, so you can review and edit `moveId` without cross-referencing
// other files. Re-running this OVERWRITES any manual edits, so only run it when you
// want to reset to the algorithm's baseline (e.g. after species/moves data changes),
// not after you've started reviewing.
//
// Usage: npx tsx scripts/buildCardFlavorMoves.mts

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ALL_SPECIES, displayMoveName } from "../src/game/pokedex/data";
import { cardKindForSpecies, pickFlavorMove } from "../src/game/cards/cardFromSpecies";

function baseStatTotal(baseStats: Record<string, number>) {
  return Object.values(baseStats).reduce((sum, v) => sum + v, 0);
}

// PokeAPI only gives the forward direction (evolvesTo); the reverse is just
// whichever species' evolvesTo points at this one
const evolvesFromById = new Map<string, string>();
for (const s of ALL_SPECIES) {
  if (s.evolvesTo) evolvesFromById.set(s.evolvesTo, s.id);
}

const entries = ALL_SPECIES.map((species) => {
  const kind = cardKindForSpecies(species);
  const move = kind === "draw" || kind === "energy" ? null : pickFlavorMove(species, kind);
  return {
    id: species.id,
    koreanName: species.koreanName,
    types: species.types,
    baseStats: species.baseStats,
    baseStatTotal: baseStatTotal(species.baseStats),
    evolvesFrom: evolvesFromById.get(species.id) ?? null,
    evolvesTo: species.evolvesTo,
    abilities: species.abilities,
    kind,
    moveId: move?.id ?? null,
    moveKoreanName: move ? displayMoveName(move) : null,
    movepool: species.movepool,
  };
});

const outPath = path.resolve(import.meta.dirname, "../src/data/cardFlavorMoves.json");
await writeFile(outPath, JSON.stringify(entries, null, 2));
console.log(`Wrote ${entries.length} entries to src/data/cardFlavorMoves.json`);

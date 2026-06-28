// Derives a slim, card-design-focused reference file from src/data/species.json —
// just the stat/type/ability columns needed to design the species-based card system,
// without movepool/spriteUrl baggage. Re-run any time species.json changes.
//
// Usage: node scripts/buildSpeciesCardStats.mjs

import { writeFile } from "node:fs/promises";
import path from "node:path";
import speciesData from "../src/data/species.json" with { type: "json" };

function baseStatTotal(baseStats) {
  return Object.values(baseStats).reduce((sum, v) => sum + v, 0);
}

// PokeAPI only gives the forward direction (evolvesTo); the reverse is just
// whichever species' evolvesTo points at this one
const evolvesFromById = new Map();
for (const s of speciesData) {
  if (s.evolvesTo) evolvesFromById.set(s.evolvesTo, s.id);
}

const cardStats = speciesData.map((s) => ({
  id: s.id,
  name: s.name,
  koreanName: s.koreanName,
  types: s.types,
  baseStats: s.baseStats,
  baseStatTotal: baseStatTotal(s.baseStats),
  evolvesTo: s.evolvesTo,
  evolvesFrom: evolvesFromById.get(s.id) ?? null,
  abilities: s.abilities,
  movepool: s.movepool,
}));

const outPath = path.resolve(import.meta.dirname, "../src/data/speciesCardStats.json");
await writeFile(outPath, JSON.stringify(cardStats, null, 2));
console.log(`Wrote ${cardStats.length} entries to src/data/speciesCardStats.json`);

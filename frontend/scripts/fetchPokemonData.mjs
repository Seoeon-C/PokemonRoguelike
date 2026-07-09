// One-time build script: fetches species + move data from PokeAPI and writes
// static JSON into src/data/. The game never calls PokeAPI at runtime —
// only this script does, so slow/unavailable API responses don't affect gameplay.
//
// Usage: node scripts/fetchPokemonData.mjs
// Fetches the full national dex (gen 1-9). Re-run any time PokeAPI adds new species.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://pokeapi.co/api/v2";
// tried in order; falls through to an earlier game if a species has no
// learnset data for newer games (e.g. not in the base dex without DLC/transfer)
const VERSION_GROUP_FALLBACKS = ["scarlet-violet", "sword-shield", "sun-moon", "x-y", "black-white"];
const CONCURRENCY = 10;
const MAX_RETRIES = 4;

// raw PokeAPI responses are cached to disk by URL, so re-running after a
// failure/rate-limit (or expanding the dex later) doesn't re-fetch everything
const CACHE_DIR = path.resolve(import.meta.dirname, ".pokeapi-cache");
await mkdir(CACHE_DIR, { recursive: true });

function cachePathFor(url) {
  const hash = crypto.createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

async function fetchJson(url) {
  const cachePath = cachePathFor(url);
  try {
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch {
    // not cached yet, fall through to network fetch
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      await writeFile(cachePath, JSON.stringify(json));
      return json;
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function statValue(stats, name) {
  return stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
}

function koreanNameFrom(namesArray) {
  return namesArray.find((n) => n.language.name === "ko")?.name ?? null;
}

async function fetchAllSpeciesNames() {
  const list = await fetchJson(`${API}/pokemon-species?limit=2000`);
  return list.results.map((r) => r.name);
}

const evolutionChainCache = new Map();

async function getNextEvolution(speciesData) {
  const chainUrl = speciesData.evolution_chain.url;

  if (!evolutionChainCache.has(chainUrl)) {
    evolutionChainCache.set(chainUrl, fetchJson(chainUrl));
  }
  const chain = await evolutionChainCache.get(chainUrl);

  function findNode(node) {
    if (node.species.name === speciesData.name) return node;
    for (const child of node.evolves_to) {
      const found = findNode(child);
      if (found) return found;
    }
    return null;
  }

  const node = findNode(chain.chain);
  return node?.evolves_to[0]?.species.name ?? null;
}

function levelUpMovesFor(pokemon, versionGroup) {
  return pokemon.moves
    .map((m) => {
      const detail = m.version_group_details.find(
        (d) => d.move_learn_method.name === "level-up" && d.version_group.name === versionGroup
      );
      return detail ? { name: m.move.name, level: detail.level_learned_at } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.level - b.level);
}

async function fetchSpecies(speciesName) {
  const speciesData = await fetchJson(`${API}/pokemon-species/${speciesName}`);
  const defaultVariety = speciesData.varieties.find((v) => v.is_default)?.pokemon.name ?? speciesName;
  const pokemon = await fetchJson(`${API}/pokemon/${defaultVariety}`);

  let levelUpMoves = [];
  for (const versionGroup of VERSION_GROUP_FALLBACKS) {
    levelUpMoves = levelUpMovesFor(pokemon, versionGroup);
    if (levelUpMoves.length > 0) break;
  }

  const movepool = [...new Set(levelUpMoves.map((m) => m.name))];
  const evolvesTo = await getNextEvolution(speciesData);

  return {
    id: speciesName,
    dexId: speciesData.id,
    name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
    koreanName: koreanNameFrom(speciesData.names),
    isLegendary: speciesData.is_legendary,
    isMythical: speciesData.is_mythical,
    types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    baseStats: {
      hp: statValue(pokemon.stats, "hp"),
      attack: statValue(pokemon.stats, "attack"),
      defense: statValue(pokemon.stats, "defense"),
      specialAttack: statValue(pokemon.stats, "special-attack"),
      specialDefense: statValue(pokemon.stats, "special-defense"),
      speed: statValue(pokemon.stats, "speed"),
    },
    movepool,
    evolvesTo,
    abilities: pokemon.abilities.sort((a, b) => a.slot - b.slot).map((a) => a.ability.name),
    spriteUrl: pokemon.sprites.front_default,
  };
}

function energyCostFor(damageClass, power) {
  if (damageClass === "status") return 1;
  if (!power) return 1;
  if (power <= 40) return 1;
  if (power <= 70) return 2;
  if (power <= 100) return 3;
  return 4;
}

async function fetchMove(name) {
  const move = await fetchJson(`${API}/move/${name}`);
  return {
    id: name,
    name: move.name,
    koreanName: koreanNameFrom(move.names),
    type: move.type.name,
    category: move.damage_class?.name ?? "status",
    power: move.power,
    accuracy: move.accuracy,
    energyCost: energyCostFor(move.damage_class?.name, move.power),
    target: move.target.name,
    learnedByCount: move.learned_by_pokemon.length,
    meta: move.meta
      ? {
          ailment: move.meta.ailment.name !== "none" ? move.meta.ailment.name : null,
          ailmentChance: move.meta.ailment_chance,
          drain: move.meta.drain,
          healing: move.meta.healing,
          flinchChance: move.meta.flinch_chance,
          critRate: move.meta.crit_rate,
          minHits: move.meta.min_hits,
          maxHits: move.meta.max_hits,
        }
      : null,
    statChanges: move.stat_changes.map((sc) => ({
      stat: sc.stat.name,
      change: sc.change,
    })),
  };
}

async function main() {
  console.log("Fetching national dex species list...");
  const speciesList = await fetchAllSpeciesNames();

  console.log(`Fetching ${speciesList.length} species...`);
  const species = await mapLimit(speciesList, CONCURRENCY, fetchSpecies);

  const uniqueMoveNames = [...new Set(species.flatMap((s) => s.movepool))];
  console.log(`Fetching ${uniqueMoveNames.length} moves...`);
  const moves = await mapLimit(uniqueMoveNames, CONCURRENCY, fetchMove);

  const outDir = path.resolve(import.meta.dirname, "../src/data");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "species.json"), JSON.stringify(species, null, 2));
  await writeFile(path.join(outDir, "moves.json"), JSON.stringify(moves, null, 2));

  console.log(`Wrote ${species.length} species and ${moves.length} moves to src/data/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

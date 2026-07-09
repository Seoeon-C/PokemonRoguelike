// Adds the remaining regional-form Pokemon (Alola/Galar/Hisui/Paldea variants) as extra
// species entries, sharing the base species' Korean name (region forms are still "the
// same Pokemon" — only fused legendary forms like Kyurem-Black get a distinct name).
//
// Usage: node scripts/addRegionalForms2.mjs

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://pokeapi.co/api/v2";
const VERSION_GROUP_FALLBACKS = ["scarlet-violet", "sword-shield", "sun-moon", "x-y", "black-white"];
const CACHE_DIR = path.resolve(import.meta.dirname, ".pokeapi-cache");
await mkdir(CACHE_DIR, { recursive: true });

function cachePathFor(url) {
  return path.join(CACHE_DIR, crypto.createHash("sha1").update(url).digest("hex") + ".json");
}
async function fetchJson(url) {
  const cachePath = cachePathFor(url);
  try {
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch {}
  for (let attempt = 0; attempt <= 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      await writeFile(cachePath, JSON.stringify(json));
      return json;
    }
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
}
function statValue(stats, name) {
  return stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
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

// [form name, base species id] — koreanName is looked up from the base species
const FORMS = [
  ["rattata-alola", "rattata"],
  ["raticate-alola", "raticate"],
  ["raichu-alola", "raichu"],
  ["sandshrew-alola", "sandshrew"],
  ["sandslash-alola", "sandslash"],
  ["vulpix-alola", "vulpix"],
  ["ninetales-alola", "ninetales"],
  ["diglett-alola", "diglett"],
  ["dugtrio-alola", "dugtrio"],
  ["meowth-alola", "meowth"],
  ["meowth-galar", "meowth"],
  ["persian-alola", "persian"],
  ["growlithe-hisui", "growlithe"],
  ["arcanine-hisui", "arcanine"],
  ["geodude-alola", "geodude"],
  ["graveler-alola", "graveler"],
  ["golem-alola", "golem"],
  ["ponyta-galar", "ponyta"],
  ["rapidash-galar", "rapidash"],
  ["slowpoke-galar", "slowpoke"],
  ["slowbro-galar", "slowbro"],
  ["farfetchd-galar", "farfetchd"],
  ["grimer-alola", "grimer"],
  ["muk-alola", "muk"],
  ["voltorb-hisui", "voltorb"],
  ["electrode-hisui", "electrode"],
  ["marowak-alola", "marowak"],
  ["weezing-galar", "weezing"],
  ["typhlosion-hisui", "typhlosion"],
  ["wooper-paldea", "wooper"],
  ["qwilfish-hisui", "qwilfish"],
  ["sneasel-hisui", "sneasel"],
  ["corsola-galar", "corsola"],
  ["zigzagoon-galar", "zigzagoon"],
  ["linoone-galar", "linoone"],
  ["lilligant-hisui", "lilligant"],
  ["darumaka-galar", "darumaka"],
  ["yamask-galar", "yamask"],
  ["zorua-hisui", "zorua"],
  ["zoroark-hisui", "zoroark"],
  ["stunfisk-galar", "stunfisk"],
  ["braviary-hisui", "braviary"],
  ["sliggoo-hisui", "sliggoo"],
  ["goodra-hisui", "goodra"],
  ["avalugg-hisui", "avalugg"],
  ["decidueye-hisui", "decidueye"],
];

const speciesPath = path.resolve(import.meta.dirname, "../src/data/species.json");
const species = JSON.parse(await readFile(speciesPath, "utf-8"));
const speciesById = new Map(species.map((s) => [s.id, s]));

const newSpecies = [];
for (const [formName, baseId] of FORMS) {
  const base = speciesById.get(baseId);
  if (!base) {
    console.log(`base species not found: ${baseId}, skipping ${formName}`);
    continue;
  }
  const pokemon = await fetchJson(`${API}/pokemon/${formName}`);

  let levelUpMoves = [];
  for (const versionGroup of VERSION_GROUP_FALLBACKS) {
    levelUpMoves = levelUpMovesFor(pokemon, versionGroup);
    if (levelUpMoves.length > 0) break;
  }
  const movepool = [...new Set(levelUpMoves.map((m) => m.name))];

  newSpecies.push({
    id: formName,
    dexId: pokemon.id,
    name: pokemon.name,
    koreanName: base.koreanName,
    isLegendary: base.isLegendary,
    isMythical: base.isMythical,
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
    evolvesTo: null,
    abilities: pokemon.abilities.sort((a, b) => a.slot - b.slot).map((a) => a.ability.name),
    spriteUrl: pokemon.sprites.front_default,
  });
  console.log(`fetched ${base.koreanName} (${formName}): dexId=${pokemon.id}, movepool=${movepool.length}`);
}

species.push(...newSpecies);
await writeFile(speciesPath, JSON.stringify(species, null, 2));
console.log(`species.json에 ${newSpecies.length}개 추가, 총 ${species.length}개`);

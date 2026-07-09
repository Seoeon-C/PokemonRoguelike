// One-time script: adds alternate-form Pokemon (regional variants, fused legendaries) as
// extra species entries, for future use as bosses. PokeAPI's species endpoint only exposes
// the *default* variety per species (e.g. base Zapdos, not Galarian Zapdos) — these forms
// need their own `/pokemon/{form-name}` fetch. Each form gets its own unique numeric id
// (from PokeAPI) reused as `dexId`, since dexId's only consumer (pokemonImages.ts) just
// needs a unique key for sprite/artwork filenames, not a true national dex number.
//
// Usage: node scripts/addRegionalForms.mjs

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://pokeapi.co/api/v2";
const VERSION_GROUP_FALLBACKS = ["scarlet-violet", "sword-shield", "sun-moon", "x-y", "black-white"];
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

// form name -> [card id to use, Korean display name, isLegendary, isMythical]
const FORMS = {
  "articuno-galar": ["articuno-galar", "가라르 프리져", true, false],
  "zapdos-galar": ["zapdos-galar", "가라르 썬더", true, false],
  "moltres-galar": ["moltres-galar", "가라르 파이어", true, false],
  "exeggutor-alola": ["exeggutor-alola", "알로라 나시", false, false],
  "slowking-galar": ["slowking-galar", "가라르 야도킹", false, false],
  "mr-mime-galar": ["mr-mime-galar", "가라르 메더", false, false],
  "samurott-hisui": ["samurott-hisui", "히스이 대검귀", false, false],
  "kyurem-black": ["kyurem-black", "블랙큐레무", true, false],
  "kyurem-white": ["kyurem-white", "화이트큐레무", true, false],
  "necrozma-dusk": ["necrozma-dusk", "황혼의갈기 네크로즈마", true, false],
  "necrozma-dawn": ["necrozma-dawn", "새벽의날개 네크로즈마", true, false],
  "calyrex-ice": ["calyrex-ice", "백마 버드렉스", true, false],
  "calyrex-shadow": ["calyrex-shadow", "흑마 버드렉스", true, false],
};

const newSpecies = [];
for (const [formName, [id, koreanName, isLegendary, isMythical]] of Object.entries(FORMS)) {
  const pokemon = await fetchJson(`${API}/pokemon/${formName}`);

  let levelUpMoves = [];
  for (const versionGroup of VERSION_GROUP_FALLBACKS) {
    levelUpMoves = levelUpMovesFor(pokemon, versionGroup);
    if (levelUpMoves.length > 0) break;
  }
  const movepool = [...new Set(levelUpMoves.map((m) => m.name))];

  newSpecies.push({
    id,
    dexId: pokemon.id,
    name: pokemon.name,
    koreanName,
    isLegendary,
    isMythical,
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
  console.log(`fetched ${koreanName} (${id}): dexId=${pokemon.id}, movepool=${movepool.length}`);
}

const speciesPath = path.resolve(import.meta.dirname, "../src/data/species.json");
const species = JSON.parse(await readFile(speciesPath, "utf-8"));
species.push(...newSpecies);
await writeFile(speciesPath, JSON.stringify(species, null, 2));
console.log(`species.json에 ${newSpecies.length}개 추가, 총 ${species.length}개`);

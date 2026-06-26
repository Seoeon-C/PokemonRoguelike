// One-time build script: downloads per-species sprite + official artwork PNGs
// from the PokeAPI sprites CDN into public/pokemon/. The game never fetches
// images at runtime — only this script does.
//
// Usage: node scripts/fetchPokemonImages.mjs
// Safe to re-run: skips files that already exist on disk.

import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import speciesData from "../src/data/species.json" with { type: "json" };

const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const ARTWORK_BASE = `${SPRITE_BASE}/other/official-artwork`;
const CONCURRENCY = 10;
const MAX_RETRIES = 4;

const OUT_DIR = path.resolve(import.meta.dirname, "../public/pokemon");
const SPRITE_DIR = path.join(OUT_DIR, "sprite");
const ARTWORK_DIR = path.join(OUT_DIR, "artwork");
await mkdir(SPRITE_DIR, { recursive: true });
await mkdir(ARTWORK_DIR, { recursive: true });

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadTo(url, filePath) {
  if (await exists(filePath)) return "skipped";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
      return "downloaded";
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
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

let downloaded = 0;
let skipped = 0;
let failed = 0;

await mapLimit(speciesData, CONCURRENCY, async (species) => {
  const id = species.dexId;
  try {
    const spriteResult = await downloadTo(`${SPRITE_BASE}/${id}.png`, path.join(SPRITE_DIR, `${id}.png`));
    const artworkResult = await downloadTo(`${ARTWORK_BASE}/${id}.png`, path.join(ARTWORK_DIR, `${id}.png`));
    if (spriteResult === "downloaded" || artworkResult === "downloaded") downloaded++;
    else skipped++;
  } catch (err) {
    failed++;
    console.error(`failed: ${species.id} (#${id}): ${err.message}`);
  }
});

console.log(`done. downloaded=${downloaded} skipped(existing)=${skipped} failed=${failed}`);

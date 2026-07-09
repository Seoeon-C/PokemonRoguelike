// 리전폼 / 고dexId 포켓몬 이미지 다운로드 스크립트
// Usage: node scripts/downloadRegionalImages.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const speciesPath = path.resolve(import.meta.dirname, "../src/data/species.json");
const spriteDir   = path.resolve(import.meta.dirname, "../public/pokemon/sprite");
const artworkDir  = path.resolve(import.meta.dirname, "../public/pokemon/artwork");

await mkdir(spriteDir,  { recursive: true });
await mkdir(artworkDir, { recursive: true });

const species = JSON.parse(await readFile(speciesPath, "utf-8"));
const regionals = species.filter(s => s.dexId > 1025);

console.log(`다운로드 대상: ${regionals.length}개\n`);

async function downloadTo(url, destPath) {
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      await writeFile(destPath, Buffer.from(buf));
      return true;
    } catch {
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return false;
}

let spriteOk = 0, spriteSkip = 0, spriteFail = 0;
let artworkOk = 0, artworkSkip = 0, artworkFail = 0;

for (const s of regionals) {
  // ── 스프라이트 ──
  const spriteDest = path.join(spriteDir, `${s.dexId}.png`);
  if (existsSync(spriteDest)) {
    spriteSkip++;
  } else if (s.spriteUrl) {
    const ok = await downloadTo(s.spriteUrl, spriteDest);
    if (ok) { spriteOk++; console.log(`[sprite ✓] ${s.id} (${s.dexId})`); }
    else     { spriteFail++; console.log(`[sprite ✗] ${s.id} (${s.dexId}) — ${s.spriteUrl}`); }
  } else {
    spriteFail++;
    console.log(`[sprite ✗] ${s.id} — spriteUrl 없음`);
  }

  // ── 아트워크 (공식 일러스트) ──
  const artworkDest = path.join(artworkDir, `${s.dexId}.png`);
  if (existsSync(artworkDest)) {
    artworkSkip++;
  } else {
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.dexId}.png`;
    const ok = await downloadTo(artworkUrl, artworkDest);
    if (ok) { artworkOk++; console.log(`[artwork ✓] ${s.id} (${s.dexId})`); }
    else {
      // 아트워크가 없으면 스프라이트로 대체
      if (s.spriteUrl) {
        const fallback = await downloadTo(s.spriteUrl, artworkDest);
        if (fallback) { artworkOk++; console.log(`[artwork~sprite fallback ✓] ${s.id} (${s.dexId})`); }
        else          { artworkFail++; console.log(`[artwork ✗] ${s.id} (${s.dexId})`); }
      } else {
        artworkFail++;
        console.log(`[artwork ✗] ${s.id} (${s.dexId})`);
      }
    }
  }
}

console.log(`
=== 완료 ===
스프라이트: 신규 ${spriteOk}개 | 이미 존재 ${spriteSkip}개 | 실패 ${spriteFail}개
아트워크:   신규 ${artworkOk}개 | 이미 존재 ${artworkSkip}개 | 실패 ${artworkFail}개
`);

import type { Card, CardEffect, PlayerClassId } from "../../types/card";
import type { BaseStats, Move, PokemonSpecies } from "../../types/pokemon";
import { getMove, ALL_SPECIES } from "../pokedex/data";
import flavorOverrides from "../../data/cardFlavorMoves.json";

// hand-reviewable file (scripts/buildCardFlavorMoves.mts regenerates the baseline,
// but edits made directly in cardFlavorMoves.json take priority and are NOT
// overwritten unless that script is re-run) — see pickFlavorMove() below for
// the algorithm that produced the baseline.
const FLAVOR_MOVE_BY_SPECIES = new Map<string, string | null>(
  (flavorOverrides as { id: string; moveId: string | null }[]).map((e) => [e.id, e.moveId])
);

export type SpeciesCardKind = "physicalDamage" | "specialDamage" | "physicalDefense" | "specialDefense";

// only the 4 combat stats decide a card's kind — speed/hp are ignored, so every
// Pokemon card is always an attack or a defense card; draw/energy now come from
// generic (non-Pokemon) basic cards instead
const STAT_PRIORITY: (keyof Pick<BaseStats, "attack" | "specialAttack" | "defense" | "specialDefense">)[] = [
  "attack",
  "specialAttack",
  "defense",
  "specialDefense",
];

const KIND_BY_STAT: Record<"attack" | "specialAttack" | "defense" | "specialDefense", SpeciesCardKind> = {
  attack: "physicalDamage",
  specialAttack: "specialDamage",
  defense: "physicalDefense",
  specialDefense: "specialDefense",
};

const BLOCK_PER_STAT_POINT = 0.3;

// a move learnable by this few species (in our level-up-only movepool data) counts
// as a signature move, and gets picked over any other category-matching move
const SIGNATURE_LEARNED_BY_THRESHOLD = 3;

// ── 코스트 분류표 ────────────────────────────────────────────────────────────

// 4코스트: 초전설 (에너지 4 필요 → 게임 내 특별 취급)
const ULTRA_LEGENDARY_IDS = new Set([
  // 관동
  "mewtwo",
  // 성도
  "lugia", "ho-oh",
  // 호연
  "kyogre", "groudon", "rayquaza",
  // 신오
  "dialga", "palkia", "giratina",
  // 하나
  "reshiram", "zekrom", "kyurem", "kyurem-black", "kyurem-white",
  // 칼로스
  "xerneas", "yveltal", "zygarde",
  // 알로라
  "solgaleo", "lunala", "necrozma", "necrozma-dusk", "necrozma-dawn",
  // 가라르
  "zacian", "zamazenta", "eternatus", "calyrex", "calyrex-ice", "calyrex-shadow",
  // 팔데아
  "koraidon", "miraidon", "terapagos",
  // 환상 4코 예외
  "arceus",
]);

// 1코스트 특수 예외: 진화 시너지용 (원래 전설/준전설이지만 의도적으로 약하게)
const ONE_COST_OVERRIDE_IDS = new Set([
  "cosmog",   // 코스모그 → 코스모움 → 솔가레오/루나아라 진화선
  "cosmoem",  // 코스모움
  "kubfu",    // 치고마 → 우라오스 진화선
]);

// 다른 포켓몬의 evolvesTo 대상이 되는 ID Set → 최종진화 판별에 사용
const HAS_PRE_EVOLUTION = new Set<string>(
  ALL_SPECIES.filter((s) => s.evolvesTo !== null).map((s) => s.evolvesTo as string)
);

// 패러독스 포켓몬 + 600족 (isLegendary/isMythical 플래그 없이 3코 고정)
const PARADOX_AND_600_IDS = new Set([
  // 패러독스 (과거)
  "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane",
  "slither-wing", "sandy-shocks", "roaring-moon", "walking-wake", "gouging-fire",
  // 패러독스 (미래)
  "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis",
  "iron-moth", "iron-thorns", "iron-valiant",
  "iron-leaves", "raging-bolt", "iron-boulder", "iron-crown",
  // 600족 (전설 아님)
  "dragonite", "tyranitar", "salamence", "metagross", "garchomp",
  "hydreigon", "goodra", "kommo-o", "dragapult", "baxcalibur", "archaludon",
]);

/** the species' dominant combat stat decides what kind of card it becomes */
export function dominantStat(baseStats: BaseStats): "attack" | "specialAttack" | "defense" | "specialDefense" {
  return STAT_PRIORITY.reduce((best, stat) => (baseStats[stat] > baseStats[best] ? stat : best));
}

export function cardKindForSpecies(species: PokemonSpecies): SpeciesCardKind {
  return KIND_BY_STAT[dominantStat(species.baseStats)];
}

function costForSpecies(species: PokemonSpecies): number {
  if (ONE_COST_OVERRIDE_IDS.has(species.id)) return 1;
  if (ULTRA_LEGENDARY_IDS.has(species.id)) return 4;
  if (species.isLegendary || species.isMythical || PARADOX_AND_600_IDS.has(species.id)) return 3;
  // 일반 포켓몬: 최종진화(진화선 끝) → 2코, 나머지(기본/중간/단일) → 1코
  const isFinalEvolution = species.evolvesTo === null && HAS_PRE_EVOLUTION.has(species.id);
  return isFinalEvolution ? 2 : 1;
}

function targetsSelf(move: Move): boolean {
  return move.target.includes("user");
}

/** does this move mechanically fit the card kind, well enough to be its flavor? */
function matchesKind(move: Move, kind: SpeciesCardKind): boolean {
  if (kind === "physicalDamage") return move.category === "physical" && move.power != null;
  if (kind === "specialDamage") return move.category === "special" && move.power != null;
  if (kind === "physicalDefense") return targetsSelf(move) && move.statChanges.some((sc) => sc.stat === "defense" && sc.change > 0);
  return targetsSelf(move) && move.statChanges.some((sc) => sc.stat === "special-defense" && sc.change > 0);
}

/** how "good" a match this move is, for picking among several that fit the same kind */
function matchStrength(move: Move, kind: SpeciesCardKind): number {
  if (kind === "physicalDamage" || kind === "specialDamage") return move.power ?? 0;
  const stat = kind === "physicalDefense" ? "defense" : "special-defense";
  return move.statChanges.find((sc) => sc.stat === stat)?.change ?? 0;
}

/** picks the species' best representative move for its card kind — a signature
 * move (learnable by very few species) wins if one fits, otherwise the
 * strongest fitting move in its level-up movepool; null if nothing fits.
 * exported only for scripts/buildCardFlavorMoves.mts to regenerate the baseline file. */
export function pickFlavorMove(species: PokemonSpecies, kind: SpeciesCardKind): Move | null {
  const candidates = species.movepool.map(getMove).filter((m) => matchesKind(m, kind));
  if (candidates.length === 0) return null;

  const signature = candidates.filter((m) => m.learnedByCount <= SIGNATURE_LEARNED_BY_THRESHOLD);
  const pool = signature.length > 0 ? signature : candidates;
  return pool.reduce((best, m) => (matchStrength(m, kind) > matchStrength(best, kind) ? m : best));
}

function effectForKind(kind: SpeciesCardKind, statValue: number, moveType: string, flavorMove: Move | null): CardEffect {
  switch (kind) {
    case "physicalDamage":
      return {
        kind: "damage",
        power: statValue,
        moveType,
        attackCategory: "physical",
        critRate: flavorMove?.meta?.critRate ?? 0,
        minHits: flavorMove?.meta?.minHits ?? null,
        maxHits: flavorMove?.meta?.maxHits ?? null,
      };
    case "specialDamage":
      return {
        kind: "damage",
        power: statValue,
        moveType,
        attackCategory: "special",
        critRate: flavorMove?.meta?.critRate ?? 0,
        minHits: flavorMove?.meta?.minHits ?? null,
        maxHits: flavorMove?.meta?.maxHits ?? null,
      };
    case "physicalDefense":
    case "specialDefense":
      return { kind: "block", amount: Math.round(statValue * BLOCK_PER_STAT_POINT) };
  }
}

/** converts a Pokemon species into a card template, keyed off its dominant base stat.
 * the number stays tied to the species' own stat value (so e.g. Squirtle/Wartortle/Palkia
 * never share a number just because they happen to share a flavor move); the move only
 * supplies the name/type/crit/multi-hit flavor shown on the card. */
export function cardFromSpecies(species: PokemonSpecies, classId: PlayerClassId): Card {
  const stat = dominantStat(species.baseStats);
  const kind = KIND_BY_STAT[stat];
  const statValue = species.baseStats[stat];
  const overrideMoveId = FLAVOR_MOVE_BY_SPECIES.get(species.id);
  const flavorMove = overrideMoveId !== undefined ? (overrideMoveId ? getMove(overrideMoveId) : null) : pickFlavorMove(species, kind);
  const moveType = flavorMove?.type ?? species.types[0];

  return {
    id: species.id,
    sourceMoveId: flavorMove?.id ?? null,
    sourceSpeciesId: species.id,
    sourceTypes: species.types,
    name: species.name,
    koreanName: species.koreanName,
    cost: costForSpecies(species),
    category: kind === "physicalDamage" || kind === "specialDamage" ? "attack" : "skill",
    classId,
    exhaust: false,
    moveType,
    effects: [effectForKind(kind, statValue, moveType, flavorMove)],
  };
}

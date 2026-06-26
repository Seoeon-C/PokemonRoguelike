import type { Card, PlayerClassId, StatStageKey } from "../types/card";
import type { CombatState, EnemyCombatant, PlayerCombatant, ClassResourceState } from "../types/combat";
import type { StatusCondition } from "../types/pokemon";
import { getSpecies, getMove } from "./pokedex/data";
import { getTypeEffectiveness } from "./pokedex/typeChart";
import { STATUS_LABELS } from "./pokedex/statusLabels";

const DAMAGE_SCALE = 0.13;
const BASE_PLAYER_POWER = 70; // flat stand-in for an "attack stat", since the player isn't a Pokemon
const ENEMY_ATTACK_NORMALIZER = 100;
const HAND_SIZE = 5;
export const STARTING_PLAYER_HP: Record<PlayerClassId, number> = { warrior: 80, mage: 70, archer: 72 };
const STARTING_ENERGY = 3;
const ORB_SLOT_COUNT = 3;
const STATUS_TICK_FRACTION = 1 / 8;
const PARALYSIS_SKIP_CHANCE = 0.25;
const CONFUSION_SKIP_CHANCE = 0.33;
const STATUS_CURE_CHANCE = 0.25; // sleep/freeze recovery roll, each turn
const CRIT_DAMAGE_MULTIPLIER = 1.5;
export const CRIT_CHANCE_BY_STAGE = [1 / 24, 1 / 8, 1 / 2, 1]; // matches Move.meta.critRate stages
const CONFUSION_SELF_HIT_POWER = 40; // typeless, no STAB — mirrors the mainline games' confusion self-hit
const CONFUSION_SELF_HIT_FRACTION = 0.1; // the player has no atk/def stat pair, so use a flat % of max HP instead

function freshResource(classId: PlayerClassId): ClassResourceState {
  if (classId === "warrior") return { kind: "warrior", fervor: 0 };
  if (classId === "mage") return { kind: "mage", orbSlots: Array(ORB_SLOT_COUNT).fill(null) };
  return { kind: "archer", aim: 0 };
}

function freshStatStages(): Record<StatStageKey, number> {
  return { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
}

function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function effectiveStat(enemy: EnemyCombatant, stat: StatStageKey): number {
  return Math.max(1, Math.round(enemy.stats[stat] * stageMultiplier(enemy.statStages[stat])));
}

function rollCrit(critRate: number): boolean {
  const stage = Math.max(0, Math.min(CRIT_CHANCE_BY_STAGE.length - 1, critRate));
  return Math.random() < CRIT_CHANCE_BY_STAGE[stage];
}

/** rolls how many times a multi-hit move connects; non-multi-hit moves always return 1 */
function rollHitCount(minHits: number | null, maxHits: number | null): number {
  if (minHits == null || maxHits == null || minHits <= 1) return 1;
  if (minHits === maxHits) return minHits;
  if (minHits === 2 && maxHits === 5) {
    // approximates the mainline games' weighted 2/3/4/5-hit distribution
    const roll = Math.random();
    if (roll < 0.375) return 2;
    if (roll < 0.75) return 3;
    if (roll < 0.875) return 4;
    return 5;
  }
  return minHits + Math.floor(Math.random() * (maxHits - minHits + 1));
}

function confusionSelfDamageToEnemy(enemy: EnemyCombatant): number {
  const atk = effectiveStat(enemy, "attack");
  const def = effectiveStat(enemy, "defense");
  return Math.max(1, Math.round(CONFUSION_SELF_HIT_POWER * (atk / def) * DAMAGE_SCALE + 2));
}

function confusionSelfDamageToPlayer(player: PlayerCombatant): number {
  return Math.max(1, Math.round(player.maxHp * CONFUSION_SELF_HIT_FRACTION));
}

function rollConfusionSelfHit(status: StatusCondition | null): boolean {
  return status === "confusion" && Math.random() < CONFUSION_SKIP_CHANCE;
}

export function createEnemyCombatant(speciesId: string, instanceId: string, statMultiplier: number): EnemyCombatant {
  const species = getSpecies(speciesId);
  const scale = (n: number) => Math.round(n * statMultiplier);
  const maxHp = scale(species.baseStats.hp);
  const moves = species.movepool.slice(0, 4);
  return {
    instanceId,
    speciesId,
    name: species.koreanName ?? species.name,
    types: species.types,
    stats: {
      hp: maxHp,
      attack: scale(species.baseStats.attack),
      defense: scale(species.baseStats.defense),
      specialAttack: scale(species.baseStats.specialAttack),
      specialDefense: scale(species.baseStats.specialDefense),
      speed: scale(species.baseStats.speed),
    },
    statStages: freshStatStages(),
    currentHp: maxHp,
    maxHp,
    moves,
    status: null,
    fainted: false,
    nextMoveId: moves[Math.floor(Math.random() * moves.length)],
  };
}

function decideEnemyIntent(enemy: EnemyCombatant): string {
  return enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawCards(player: PlayerCombatant, count: number, log: string[]): void {
  for (let i = 0; i < count; i++) {
    if (player.drawPile.length === 0) {
      if (player.discardPile.length === 0) return;
      player.drawPile = shuffle(player.discardPile);
      player.discardPile = [];
      log.push("버린 카드 더미를 섞어 뽑을 카드 더미로 만들었다.");
    }
    const card = player.drawPile.pop();
    if (card) player.hand.push(card);
  }
}

export function createCombatState(
  classId: PlayerClassId,
  deck: Card[],
  enemies: EnemyCombatant[],
  hp: number = STARTING_PLAYER_HP[classId],
  maxHp: number = STARTING_PLAYER_HP[classId]
): CombatState {
  const player: PlayerCombatant = {
    classId,
    hp,
    maxHp,
    block: 0,
    energy: STARTING_ENERGY,
    maxEnergy: STARTING_ENERGY,
    resource: freshResource(classId),
    status: null,
    deck,
    drawPile: shuffle(deck),
    hand: [],
    discardPile: [],
    exhaustPile: [],
  };
  const log: string[] = [];
  drawCards(player, HAND_SIZE, log);
  return { player, enemies, turn: 1, log, result: "ongoing", playerTurnBlocked: false };
}

function aliveEnemies(state: CombatState): EnemyCombatant[] {
  return state.enemies.filter((e) => !e.fainted);
}

function applyDamageToEnemy(enemy: EnemyCombatant, amount: number, log: string[]): void {
  enemy.currentHp = Math.max(0, enemy.currentHp - amount);
  log.push(`${enemy.name}에게 ${amount}의 데미지!`);
  if (enemy.currentHp === 0) {
    enemy.fainted = true;
    log.push(`${enemy.name}은 쓰러졌다!`);
  }
}

function applyDamageToPlayer(player: PlayerCombatant, amount: number, log: string[]): number {
  const absorbed = Math.min(player.block, amount);
  player.block -= absorbed;
  const remaining = amount - absorbed;
  player.hp = Math.max(0, player.hp - remaining);
  log.push(absorbed > 0 ? `방어로 ${absorbed}, 체력으로 ${remaining} 데미지를 받았다.` : `${remaining}의 데미지를 받았다.`);
  return remaining;
}

function classDamageBonus(resource: ClassResourceState): number {
  return resource.kind === "warrior" ? resource.fervor : 0;
}

/** damage a player card would deal to `enemy` right now — also used to show a live preview on the card */
export function cardDamageToEnemy(power: number, moveType: string, enemy: EnemyCombatant, resource: ClassResourceState): number {
  const effectiveness = getTypeEffectiveness(moveType, enemy.types);
  if (effectiveness === 0) return 0;
  const defStat = (effectiveStat(enemy, "defense") + effectiveStat(enemy, "specialDefense")) / 2;
  const base = power * (BASE_PLAYER_POWER / defStat) * DAMAGE_SCALE + 2;
  return Math.max(1, Math.round(base * effectiveness) + classDamageBonus(resource));
}

/** damage at a neutral (1.0x) matchup with no class bonus — used outside combat (card reward/shop screens)
 * where there's no real enemy to preview against yet. */
export function baselineCardDamage(power: number): number {
  return Math.max(1, Math.round(power * DAMAGE_SCALE + 2));
}

const ENEMY_DAMAGE_SCALE = 0.20;

/** damage an enemy's move would deal to the player right now (before block) — also used for the intent preview */
export function enemyMoveDamage(enemy: EnemyCombatant, moveId: string): number {
  const move = getMove(moveId);
  if (move.power == null) return 0;
  const atk = effectiveStat(enemy, move.category === "physical" ? "attack" : "specialAttack");
  return Math.max(1, Math.round(move.power * (atk / ENEMY_ATTACK_NORMALIZER) * ENEMY_DAMAGE_SCALE));
}

function applyAilmentToEnemy(enemy: EnemyCombatant, status: StatusCondition, chance: number, log: string[]): void {
  if (enemy.status || Math.random() * 100 > chance) return;
  enemy.status = status;
  log.push(`${enemy.name}은 ${STATUS_LABELS[status]} 상태가 되었다!`);
}

function applyAilmentToPlayer(player: PlayerCombatant, status: StatusCondition, chance: number, log: string[]): void {
  if (player.status || Math.random() * 100 > chance) return;
  player.status = status;
  log.push(`플레이어는 ${STATUS_LABELS[status]} 상태가 되었다!`);
}

/** sleep/freeze (with a cure roll), paralysis, and confusion can all prevent a turn's action.
 * returns whether the entity may act this turn, and the (possibly cured) status to keep. */
function resolveStatusGate(
  status: StatusCondition | null,
  name: string,
  log: string[]
): { canAct: boolean; status: StatusCondition | null } {
  if (!status) return { canAct: true, status: null };

  if ((status === "sleep" || status === "freeze") && Math.random() < STATUS_CURE_CHANCE) {
    log.push(`${name}이 ${status === "sleep" ? "잠에서 깼다" : "얼음이 풀렸다"}!`);
    return { canAct: true, status: null };
  }
  if (status === "sleep") {
    log.push(`${name}은 잠들어 있다.`);
    return { canAct: false, status };
  }
  if (status === "freeze") {
    log.push(`${name}은 얼어 있다.`);
    return { canAct: false, status };
  }
  if (status === "paralysis" && Math.random() < PARALYSIS_SKIP_CHANCE) {
    log.push(`${name}은 마비되어 움직일 수 없다!`);
    return { canAct: false, status };
  }
  // confusion doesn't block acting here — it's resolved separately via rollConfusionSelfHit,
  // since a confused self-hit needs entity-specific damage math (Pokemon stats vs. flat player %)
  return { canAct: true, status };
}

function tickStatusDamage(
  status: StatusCondition | null,
  currentHp: number,
  maxHp: number,
  name: string,
  log: string[]
): number {
  if (status !== "burn" && status !== "poison") return currentHp;
  const damage = Math.max(1, Math.round(maxHp * STATUS_TICK_FRACTION));
  const newHp = Math.max(0, currentHp - damage);
  log.push(`${name}은 ${status === "burn" ? "화상" : "독"} 데미지를 입었다! (${damage})`);
  return newHp;
}

export const STAT_STAGE_LABELS: Record<StatStageKey, string> = {
  attack: "공격",
  defense: "방어",
  specialAttack: "특수공격",
  specialDefense: "특수방어",
  speed: "스피드",
};

function applyStatStageToEnemy(enemy: EnemyCombatant, stat: StatStageKey, change: number, log: string[]): void {
  const before = enemy.statStages[stat];
  enemy.statStages[stat] = Math.max(-6, Math.min(6, before + change));
  if (enemy.statStages[stat] !== before) {
    log.push(`${enemy.name}의 ${STAT_STAGE_LABELS[stat]}이 ${change > 0 ? "올랐다" : "내려갔다"}!`);
  }
}

export function playCard(
  state: CombatState,
  handIndex: number,
  targetEnemyIndex: number | null
): CombatState {
  if (state.result !== "ongoing" || state.playerTurnBlocked) return state;
  const next = structuredClone(state);
  const card = next.player.hand[handIndex];
  if (!card) return state;
  if (next.player.energy < card.cost) {
    next.log.push("에너지가 부족하다.");
    return next;
  }

  next.player.energy -= card.cost;
  next.player.hand.splice(handIndex, 1);
  next.log.push(`${card.koreanName ?? card.name} 사용!`);

  const target = targetEnemyIndex != null ? next.enemies[targetEnemyIndex] : null;
  let isAttack = false;

  for (const effect of card.effects) {
    if (effect.kind === "damage") {
      isAttack = true;
      if (target && !target.fainted) {
        const hits = rollHitCount(effect.minHits, effect.maxHits);
        if (hits > 1) next.log.push(`${hits}번 연속 공격!`);
        for (let h = 0; h < hits && !target.fainted; h++) {
          let dmg = cardDamageToEnemy(effect.power, effect.moveType, target, next.player.resource);
          if (rollCrit(effect.critRate)) {
            dmg = Math.round(dmg * CRIT_DAMAGE_MULTIPLIER);
            next.log.push("치명타!");
          }
          applyDamageToEnemy(target, dmg, next.log);
        }
      }
    } else if (effect.kind === "block") {
      next.player.block += effect.amount;
      next.log.push(`방어도 ${effect.amount} 획득.`);
    } else if (effect.kind === "ailment") {
      if (target && !target.fainted) applyAilmentToEnemy(target, effect.status, effect.chance, next.log);
    } else if (effect.kind === "statStage") {
      if (effect.target === "enemy" && target && !target.fainted) {
        applyStatStageToEnemy(target, effect.stat, effect.change, next.log);
      }
    } else if (effect.kind === "draw") {
      drawCards(next.player, effect.count, next.log);
    } else if (effect.kind === "energyGain") {
      next.player.energy += effect.amount;
    } else if (effect.kind === "channelOrb" && next.player.resource.kind === "mage") {
      const slots = next.player.resource.orbSlots;
      const emptyIndex = slots.indexOf(null);
      if (emptyIndex !== -1) slots[emptyIndex] = effect.orbType;
      else {
        next.log.push(`${slots[0]} 오브가 자동으로 발동했다.`);
        slots.shift();
        slots.push(effect.orbType);
      }
    } else if (effect.kind === "evokeOrb" && next.player.resource.kind === "mage") {
      const slots = next.player.resource.orbSlots;
      const idx = slots.findIndex((o) => o !== null);
      if (idx !== -1) {
        next.log.push(`${slots[idx]} 오브를 발동시켰다.`);
        slots.splice(idx, 1); // remove it and shift the remaining orbs forward
        slots.push(null); // keep the slot count fixed
      }
    }
  }

  if (!isAttack && next.player.resource.kind === "archer") {
    next.player.resource.aim += 1;
  } else if (isAttack && next.player.resource.kind === "archer" && next.player.resource.aim > 0) {
    next.log.push(`조준 ${next.player.resource.aim} 스택 소모!`);
    if (target && !target.fainted) applyDamageToEnemy(target, next.player.resource.aim * 3, next.log);
    next.player.resource.aim = 0;
  }

  (card.exhaust ? next.player.exhaustPile : next.player.discardPile).push(card);

  if (aliveEnemies(next).length === 0) next.result = "win";
  return next;
}

function resolveOrbPassives(state: CombatState): void {
  if (state.player.resource.kind !== "mage") return;
  const targets = aliveEnemies(state);
  for (const orb of state.player.resource.orbSlots) {
    if (!orb || targets.length === 0) continue;
    if (orb === "fire") applyAilmentToEnemy(targets[0], "burn", 100, state.log);
    else if (orb === "water") state.player.block += 4;
    else if (orb === "electric") applyDamageToEnemy(targets[Math.floor(Math.random() * targets.length)], 5, state.log);
    else if (orb === "psychic") state.player.energy += 1;
  }
}

function runEnemyTurn(state: CombatState): void {
  for (const enemy of aliveEnemies(state)) {
    if (state.result !== "ongoing") return;

    const gate = resolveStatusGate(enemy.status, enemy.name, state.log);
    enemy.status = gate.status;
    if (!gate.canAct) continue;

    if (rollConfusionSelfHit(enemy.status)) {
      const selfDmg = confusionSelfDamageToEnemy(enemy);
      enemy.currentHp = Math.max(0, enemy.currentHp - selfDmg);
      state.log.push(`${enemy.name}은 혼란에 빠져 스스로를 공격했다! (${selfDmg})`);
      if (enemy.currentHp === 0) {
        enemy.fainted = true;
        state.log.push(`${enemy.name}은 쓰러졌다!`);
      }
      continue;
    }

    const move = getMove(enemy.nextMoveId);
    state.log.push(`${enemy.name}의 ${move.koreanName ?? move.name}!`);
    if (move.power != null) {
      const hits = rollHitCount(move.meta?.minHits ?? null, move.meta?.maxHits ?? null);
      if (hits > 1) state.log.push(`${hits}번 연속으로 맞았다!`);
      for (let h = 0; h < hits && state.player.hp > 0; h++) {
        let dmg = enemyMoveDamage(enemy, enemy.nextMoveId);
        if (rollCrit(move.meta?.critRate ?? 0)) {
          dmg = Math.round(dmg * CRIT_DAMAGE_MULTIPLIER);
          state.log.push("치명타!");
        }
        const dealt = applyDamageToPlayer(state.player, dmg, state.log);
        if (dealt > 0 && state.player.resource.kind === "warrior") state.player.resource.fervor += 1;
      }
    }
    if (move.meta?.ailment) {
      const chance = move.meta.ailmentChance > 0 ? move.meta.ailmentChance : 100;
      applyAilmentToPlayer(state.player, move.meta.ailment as StatusCondition, chance, state.log);
    }

    if (state.player.hp === 0) {
      state.result = "lose";
      return;
    }
  }
}

function tickAllStatusDamage(state: CombatState): void {
  state.player.hp = tickStatusDamage(state.player.status, state.player.hp, state.player.maxHp, "플레이어", state.log);
  if (state.player.hp === 0) {
    state.result = "lose";
    return;
  }
  for (const enemy of aliveEnemies(state)) {
    enemy.currentHp = tickStatusDamage(enemy.status, enemy.currentHp, enemy.maxHp, enemy.name, state.log);
    if (enemy.currentHp === 0) {
      enemy.fainted = true;
      state.log.push(`${enemy.name}은 쓰러졌다!`);
    }
  }
  if (aliveEnemies(state).length === 0) state.result = "win";
}

export function endTurn(state: CombatState): CombatState {
  if (state.result !== "ongoing") return state;
  const next = structuredClone(state);

  resolveOrbPassives(next);
  next.player.discardPile.push(...next.player.hand);
  next.player.hand = [];

  runEnemyTurn(next);
  if (next.result !== "ongoing") return next;

  tickAllStatusDamage(next);
  if (next.result !== "ongoing") return next;

  next.player.block = 0;
  next.player.energy = next.player.maxEnergy;
  next.turn += 1;
  drawCards(next.player, HAND_SIZE, next.log);
  for (const enemy of aliveEnemies(next)) enemy.nextMoveId = decideEnemyIntent(enemy);

  const gate = resolveStatusGate(next.player.status, "플레이어", next.log);
  next.player.status = gate.status;
  next.playerTurnBlocked = !gate.canAct;

  if (gate.canAct && rollConfusionSelfHit(next.player.status)) {
    const selfDmg = confusionSelfDamageToPlayer(next.player);
    next.player.hp = Math.max(0, next.player.hp - selfDmg);
    next.log.push(`플레이어는 혼란에 빠져 스스로를 공격했다! (${selfDmg})`);
    next.playerTurnBlocked = true;
    if (next.player.hp === 0) next.result = "lose";
  }

  return next;
}

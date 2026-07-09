import type { Card, PlayerClassId, StatStageKey } from "./card";
import type { BaseStats, StatusCondition } from "./pokemon";

export type ClassResourceState =
  | { kind: "warrior"; fervor: number }
  | { kind: "mage"; orbSlots: (string | null)[] }
  | { kind: "archer"; aim: number };

export interface PlayerCombatant {
  classId: PlayerClassId;
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  resource: ClassResourceState;
  status: StatusCondition | null;
  deck: Card[];
  drawPile: Card[];
  hand: Card[];
  discardPile: Card[];
  exhaustPile: Card[];
}

export interface EnemyCombatant {
  instanceId: string;
  speciesId: string;
  name: string;
  types: string[];
  defensiveType: "physical" | "special";
  stats: BaseStats;
  statStages: Record<StatStageKey, number>;
  currentHp: number;
  maxHp: number;
  block: number;
  blockRefreshIn: number;
  bigBlockAmount: number;
  blockInterval: number;
  moves: string[];
  status: StatusCondition | null;
  fainted: boolean;
  nextMoveId: string;
}

export type CombatResult = "ongoing" | "win" | "lose";

export interface CombatState {
  player: PlayerCombatant;
  enemies: EnemyCombatant[];
  turn: number;
  log: string[];
  result: CombatResult;
  /** true if the player's status (sleep/freeze/paralysis/confusion) prevented acting this turn */
  playerTurnBlocked: boolean;
}

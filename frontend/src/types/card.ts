import type { StatusCondition } from "./pokemon";

export type PlayerClassId = "warrior" | "mage" | "archer";

export type StatStageKey = "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";

export type CardCategory = "attack" | "skill" | "power";

export type CardEffect =
  | { kind: "damage"; power: number; moveType: string; attackCategory: "physical" | "special"; critRate: number; minHits: number | null; maxHits: number | null }
  | { kind: "block"; amount: number }
  | { kind: "ailment"; status: StatusCondition; chance: number }
  | { kind: "statStage"; stat: StatStageKey; change: number; target: "self" | "enemy" }
  | { kind: "draw"; count: number }
  | { kind: "energyGain"; amount: number }
  | { kind: "channelOrb"; orbType: string }
  | { kind: "evokeOrb" };

export interface Card {
  id: string;
  sourceMoveId: string | null;
  sourceSpeciesId: string | null;
  sourceTypes: string[];
  name: string;
  koreanName: string | null;
  cost: number;
  category: CardCategory;
  classId: PlayerClassId;
  exhaust: boolean;
  moveType: string | null;
  effects: CardEffect[];
}

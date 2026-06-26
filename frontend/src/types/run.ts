import type { Card, PlayerClassId } from "./card";
import type { GameMap } from "./map";

export interface RunState {
  classId: PlayerClassId;
  hp: number;
  maxHp: number;
  deck: Card[];
  gold: number;
  map: GameMap;
  currentNodeId: string | null;
  visitedNodeIds: string[];
}

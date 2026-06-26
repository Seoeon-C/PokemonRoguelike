import type { GameMap, MapNode } from "../../types/map";

export function getNode(map: GameMap, nodeId: string): MapNode {
  for (const floor of map.floors) {
    const found = floor.find((n) => n.id === nodeId);
    if (found) return found;
  }
  throw new Error(`Unknown node: ${nodeId}`);
}

export function getSelectableNodeIds(map: GameMap, currentNodeId: string | null): string[] {
  if (currentNodeId == null) return map.floors[0].map((n) => n.id);
  return getNode(map, currentNodeId).connections;
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  battle: "전투",
  elite: "엘리트",
  event: "이벤트",
  shop: "상점",
  rest: "휴식",
  boss: "보스",
};

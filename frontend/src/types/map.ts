export type NodeType = "battle" | "elite" | "event" | "shop" | "rest" | "boss";

export interface MapNode {
  id: string;
  floor: number;
  type: NodeType;
  /** ids of nodes in the next floor reachable from this node */
  connections: string[];
}

export interface GameMap {
  floors: MapNode[][];
}

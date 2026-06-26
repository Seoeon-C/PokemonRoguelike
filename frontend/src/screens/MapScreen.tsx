import type { RunState } from "../types/run";
import type { MapNode } from "../types/map";
import { getSelectableNodeIds, getNode, NODE_TYPE_LABELS } from "../game/map/mapHelpers";
import { HpBar } from "../components/HpBar";

const MAP_WIDTH = 600;
const ROW_HEIGHT = 90;
const NODE_SIZE = 56;

const NODE_TYPE_ICONS: Record<string, string> = {
  battle: "⚔️",
  elite: "💀",
  event: "❓",
  shop: "🛒",
  rest: "🔥",
  boss: "👑",
};

function nodeX(node: MapNode, floorLength: number): number {
  const slot = Number(node.id.split("-")[1]);
  return (slot + 0.5) * (MAP_WIDTH / floorLength);
}

function nodeY(node: MapNode, floorCount: number): number {
  return (floorCount - 1 - node.floor) * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export function MapScreen({ run, onSelectNode }: { run: RunState; onSelectNode: (nodeId: string) => void }) {
  const selectableIds = new Set(getSelectableNodeIds(run.map, run.currentNodeId));
  const floorCount = run.map.floors.length;
  const mapHeight = floorCount * ROW_HEIGHT;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>맵</h2>
      <p>골드: {run.gold}</p>

      <div style={{ maxWidth: 240, margin: "0 auto 24px" }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          체력 {run.hp} / {run.maxHp} &middot; 덱 {run.deck.length}장
        </div>
        <HpBar current={run.hp} max={run.maxHp} />
      </div>

      <div style={{ position: "relative", width: MAP_WIDTH, height: mapHeight, margin: "0 auto" }}>
        <svg width={MAP_WIDTH} height={mapHeight} style={{ position: "absolute", top: 0, left: 0 }}>
          {run.map.floors.flatMap((floor) =>
            floor.flatMap((node) =>
              node.connections.map((targetId) => {
                const target = getNode(run.map, targetId);
                const isTraveled = run.visitedNodeIds.includes(node.id) && run.visitedNodeIds.includes(target.id);
                const isAvailable = run.currentNodeId === node.id && selectableIds.has(target.id);
                return (
                  <line
                    key={`${node.id}->${targetId}`}
                    x1={nodeX(node, floor.length)}
                    y1={nodeY(node, floorCount)}
                    x2={nodeX(target, run.map.floors[target.floor].length)}
                    y2={nodeY(target, floorCount)}
                    stroke={isTraveled ? "#888" : isAvailable ? "#88f" : "#3a3a3a"}
                    strokeWidth={2}
                  />
                );
              })
            )
          )}
        </svg>

        {run.map.floors.flatMap((floor) =>
          floor.map((node) => {
            const visited = run.visitedNodeIds.includes(node.id);
            const isCurrent = run.currentNodeId === node.id;
            const selectable = selectableIds.has(node.id);
            const x = nodeX(node, floor.length);
            const y = nodeY(node, floorCount);
            return (
              <button
                key={node.id}
                disabled={!selectable}
                onClick={() => onSelectNode(node.id)}
                title={NODE_TYPE_LABELS[node.type]}
                style={{
                  position: "absolute",
                  left: x - NODE_SIZE / 2,
                  top: y - NODE_SIZE / 2,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  borderRadius: "50%",
                  border: isCurrent ? "2px solid white" : "1px solid #555",
                  background: visited ? "#333" : selectable ? "#4a4a8a" : "#222",
                  color: selectable ? "white" : "#777",
                  cursor: selectable ? "pointer" : "default",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {NODE_TYPE_ICONS[node.type]}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

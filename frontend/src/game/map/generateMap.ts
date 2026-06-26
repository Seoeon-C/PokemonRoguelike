import type { GameMap, MapNode, NodeType } from "../../types/map";

const FLOOR_COUNT = 10;
const ELITE_MIN_FLOOR = 3;
const REST_FLOOR_BEFORE_BOSS = FLOOR_COUNT - 2;
const EARLY_SHOP_RANGE = [2, 3, 4];
const LATE_SHOP_RANGE = [5, 6, 7];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    if (roll < weight) return key;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

function pickNodeType(floor: number): NodeType {
  // too early for rest sites or shops to show up
  if (floor === 1) {
    return pickWeighted({ battle: 5, event: 4 }) as NodeType;
  }

  const weights: Record<string, number> = {
    battle: 5,
    event: 3,
    shop: 1.5,
    rest: 1.5,
  };
  if (floor >= ELITE_MIN_FLOOR) weights.elite = 2;
  return pickWeighted(weights) as NodeType;
}

/** forces one random node within floorIndices to `type` if none of that type already exists there */
function ensureTypePresent(floors: MapNode[][], floorIndices: number[], type: NodeType): void {
  const alreadyPresent = floorIndices.some((f) => floors[f]?.some((n) => n.type === type));
  if (alreadyPresent) return;

  const eligibleFloors = floorIndices.filter((f) => floors[f]?.length > 0);
  if (eligibleFloors.length === 0) return;

  const floor = eligibleFloors[randInt(0, eligibleFloors.length - 1)];
  const nodeIndex = randInt(0, floors[floor].length - 1);
  floors[floor][nodeIndex] = { ...floors[floor][nodeIndex], type };
}

const MIN_WIDTH = 1;
const MAX_WIDTH = 4;

// width wanders by at most +-1 per floor (e.g. 4 4 4 4 3 4 3 2 2) instead of
// strictly alternating wide/narrow — the very first floor is always wide
// (3-4) so a run starts with a real choice of battles.
function buildWidths(): number[] {
  const widths: number[] = [randInt(3, 4)];
  for (let floor = 1; floor < FLOOR_COUNT - 1; floor++) {
    const next = widths[floor - 1] + randInt(-1, 1);
    widths.push(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
  }
  widths.push(1); // boss
  return widths;
}

// each source slot covers a proportional range of the target floor's slots
// (e.g. slot 1 of 3 -> [2/3, 4/3) of a 2-wide floor) and connects to every
// target slot its range overlaps. consecutive ranges tile the target floor
// with no gaps, so this guarantees full coverage both ways with no fallback
// needed — and a source sitting right on a seam between two targets (like a
// middle node when 3 nodes narrow to 2) correctly connects to both.
function overlappingSlots(index: number, fromLen: number, toLen: number): number[] {
  if (toLen <= 1) return [0];
  const scale = toLen / fromLen;
  const start = index * scale;
  const end = (index + 1) * scale;
  const slots: number[] = [];
  for (let s = Math.floor(start); s < Math.ceil(end) && s < toLen; s++) {
    if (s >= 0) slots.push(s);
  }
  return slots;
}

export function generateMap(): GameMap {
  const floors: MapNode[][] = [];
  const widths = buildWidths();

  for (let floor = 0; floor < FLOOR_COUNT; floor++) {
    const isFirstFloor = floor === 0;
    const isBossFloor = floor === FLOOR_COUNT - 1;
    const isRestFloor = floor === REST_FLOOR_BEFORE_BOSS;
    const width = widths[floor];

    const fixedType: NodeType | null = isBossFloor ? "boss" : isFirstFloor ? "battle" : isRestFloor ? "rest" : null;

    floors.push(
      Array.from({ length: width }, (_, i) => ({
        id: `${floor}-${i}`,
        floor,
        type: fixedType ?? pickNodeType(floor),
        connections: [],
      }))
    );
  }

  // deterministic, gapless connections for any width pair — see overlappingSlots
  for (let floor = 0; floor < FLOOR_COUNT - 1; floor++) {
    const current = floors[floor];
    const next = floors[floor + 1];

    current.forEach((node, i) => {
      for (const slot of overlappingSlots(i, current.length, next.length)) {
        node.connections.push(next[slot].id);
      }
    });
  }

  // guarantee a shop is reachable in each half of the run, since pure random
  // weighting could otherwise leave a stretch with nowhere to spend gold
  ensureTypePresent(floors, EARLY_SHOP_RANGE, "shop");
  ensureTypePresent(floors, LATE_SHOP_RANGE, "shop");

  return { floors };
}

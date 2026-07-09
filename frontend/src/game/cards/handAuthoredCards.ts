import type { Card } from "../../types/card";

/** cards that aren't derived from a Pokemon species: mage orb utility, and generic
 * draw/energy basics. Pokemon cards now only ever come from attack/specialAttack/
 * defense/specialDefense (speed/hp dropped), so draw/energy live here instead — every
 * class can draw them (see SHARED_CARD_IDS in classCardPools.ts). */
export const HAND_AUTHORED_CARDS: Card[] = [
  {
    id: "basic-draw",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "basic-draw",
    koreanName: "기본 드로우",
    cost: 1,
    category: "skill",
    classId: "warrior",
    exhaust: false,
    moveType: null,
    effects: [{ kind: "draw", count: 1 }],
  },
  {
    id: "basic-energy",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "basic-energy",
    koreanName: "기본 에너지",
    cost: 0,
    category: "skill",
    classId: "warrior",
    exhaust: true,
    moveType: null,
    effects: [{ kind: "energyGain", amount: 1 }],
  },
  // mage orb utility
  {
    id: "channel-fire",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "channel-fire",
    koreanName: "불꽃 오브 충전",
    cost: 1,
    category: "skill",
    classId: "mage",
    exhaust: false,
    moveType: "fire",
    effects: [{ kind: "channelOrb", orbType: "fire" }],
  },
  {
    id: "channel-water",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "channel-water",
    koreanName: "물 오브 충전",
    cost: 1,
    category: "skill",
    classId: "mage",
    exhaust: false,
    moveType: "water",
    effects: [{ kind: "channelOrb", orbType: "water" }],
  },
  {
    id: "channel-electric",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "channel-electric",
    koreanName: "전기 오브 충전",
    cost: 1,
    category: "skill",
    classId: "mage",
    exhaust: false,
    moveType: "electric",
    effects: [{ kind: "channelOrb", orbType: "electric" }],
  },
  {
    id: "channel-psychic",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "channel-psychic",
    koreanName: "에스퍼 오브 충전",
    cost: 1,
    category: "skill",
    classId: "mage",
    exhaust: false,
    moveType: "psychic",
    effects: [{ kind: "channelOrb", orbType: "psychic" }],
  },
  {
    id: "evoke-front",
    sourceMoveId: null,
    sourceSpeciesId: null,
    sourceTypes: [],
    name: "evoke-front",
    koreanName: "오브 발동",
    cost: 0,
    category: "skill",
    classId: "mage",
    exhaust: true,
    moveType: null,
    effects: [{ kind: "evokeOrb" }],
  },
];

export function getHandAuthoredCard(id: string): Card {
  const card = HAND_AUTHORED_CARDS.find((c) => c.id === id);
  if (!card) throw new Error(`Unknown hand-authored card: ${id}`);
  return card;
}

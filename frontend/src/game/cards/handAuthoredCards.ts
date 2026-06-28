import type { Card } from "../../types/card";

/** cards that aren't derived from a Pokemon species: mage orb utility only — generic
 * basic-strike/basic-guard/quick-scout/deep-breath fillers were removed so every card
 * in the game (besides orb utility) is a Pokemon */
export const HAND_AUTHORED_CARDS: Card[] = [
  // mage orb utility
  {
    id: "channel-fire",
    sourceMoveId: null,
    sourceSpeciesId: null,
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

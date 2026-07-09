import type { Card } from "../../types/card";
import type { RunState } from "../../types/run";
import { generateCardRewardOptions } from "../cards/classCardPools";

export interface ShopOffer {
  card: Card;
  cost: number;
}

export const POTION_COST = 20;
export const SMALL_POTION_COST = 12;
export const SMALL_POTION_HEAL_FRACTION = 0.4;
export const REMOVAL_BASE_COST = 25;
export const REMOVAL_COST_INCREMENT = 15;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** pricier for higher-cost (generally stronger) cards, with a little variance so the shop doesn't feel flat */
function priceForCard(card: Card): number {
  return Math.max(12, 15 + card.cost * 8 + randomInt(-4, 6));
}

export function generateShopOffers(run: RunState, count = 3): ShopOffer[] {
  return generateCardRewardOptions(run.classId, "battle", count).map((card) => ({ card, cost: priceForCard(card) }));
}

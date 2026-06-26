import { useState } from "react";
import type { Card } from "../types/card";
import type { RunState } from "../types/run";
import {
  generateShopOffers,
  POTION_COST,
  REMOVAL_BASE_COST,
  REMOVAL_COST_INCREMENT,
  SMALL_POTION_COST,
  SMALL_POTION_HEAL_FRACTION,
  type ShopOffer,
} from "../game/run/shop";
import { healPlayer } from "../game/run/campActions";
import { STAT_STAGE_LABELS, baselineCardDamage } from "../game/combat";
import { TypeBadge } from "../components/TypeBadge";
import { STATUS_LABELS } from "../game/pokedex/statusLabels";

function describeEffect(effect: Card["effects"][number]): string {
  if (effect.kind === "damage") {
    const hitNote = effect.minHits != null && effect.maxHits != null
      ? effect.minHits === effect.maxHits ? ` x${effect.minHits}회` : ` x${effect.minHits}~${effect.maxHits}회`
      : "";
    return `데미지 ${baselineCardDamage(effect.power)}${hitNote} (1.0배 기준)`;
  }
  if (effect.kind === "block") return `방어 +${effect.amount}`;
  if (effect.kind === "ailment") return `${STATUS_LABELS[effect.status]} ${effect.chance}%`;
  if (effect.kind === "statStage") return `${effect.target === "self" ? "자신" : "적"} ${STAT_STAGE_LABELS[effect.stat]} ${effect.change > 0 ? "+" : ""}${effect.change}`;
  if (effect.kind === "draw") return `카드 ${effect.count}장 드로우`;
  if (effect.kind === "energyGain") return `에너지 +${effect.amount}`;
  if (effect.kind === "channelOrb") return `${effect.orbType} 오브 충전`;
  return "오브 발동";
}

export function ShopScreen({ run, onDone }: { run: RunState; onDone: (run: RunState) => void }) {
  const [offers, setOffers] = useState<ShopOffer[]>(() => generateShopOffers(run));
  const [currentRun, setCurrentRun] = useState(run);
  const [removing, setRemoving] = useState(false);
  const [removalCost, setRemovalCost] = useState(REMOVAL_BASE_COST);

  function buyOffer(offer: ShopOffer, index: number) {
    if (currentRun.gold < offer.cost) return;
    setCurrentRun({
      ...currentRun,
      gold: currentRun.gold - offer.cost,
      deck: [...currentRun.deck, offer.card],
    });
    setOffers(offers.filter((_, i) => i !== index));
  }

  function buyPotion() {
    if (currentRun.gold < POTION_COST) return;
    setCurrentRun(healPlayer({ ...currentRun, gold: currentRun.gold - POTION_COST }));
  }

  function buySmallPotion() {
    if (currentRun.gold < SMALL_POTION_COST) return;
    const amount = Math.round(currentRun.maxHp * SMALL_POTION_HEAL_FRACTION);
    setCurrentRun(healPlayer({ ...currentRun, gold: currentRun.gold - SMALL_POTION_COST }, amount));
  }

  function removeCard(index: number) {
    if (currentRun.gold < removalCost) return;
    const deck = [...currentRun.deck];
    deck.splice(index, 1);
    setCurrentRun({ ...currentRun, gold: currentRun.gold - removalCost, deck });
    setRemovalCost(removalCost + REMOVAL_COST_INCREMENT);
    setRemoving(false);
  }

  if (removing) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <h2>제거할 카드를 선택하세요 ({removalCost}G)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {currentRun.deck.map((card, i) => (
            <button key={i} onClick={() => removeCard(i)} style={{ padding: 10, width: 130, textAlign: "left" }}>
              {card.moveType && <TypeBadge type={card.moveType} size={14} />}{" "}
              <strong>{card.koreanName ?? card.name}</strong> (⚡{card.cost})
            </button>
          ))}
        </div>
        <button style={{ marginTop: 16 }} onClick={() => setRemoving(false)}>
          취소
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <h2>상점</h2>
      <p>보유 골드: {currentRun.gold}</p>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {offers.map((offer, i) => (
          <button
            key={i}
            onClick={() => buyOffer(offer, i)}
            disabled={currentRun.gold < offer.cost}
            style={{ padding: 16, width: 160 }}
          >
            {offer.card.moveType && <TypeBadge type={offer.card.moveType} size={16} />}
            <div style={{ marginTop: 8, fontWeight: "bold" }}>{offer.card.koreanName ?? offer.card.name}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {offer.card.effects.map((e, ei) => (
                <div key={ei}>{describeEffect(e)}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{offer.cost}G</div>
          </button>
        ))}
        <button onClick={buyPotion} disabled={currentRun.gold < POTION_COST} style={{ padding: 16, width: 160 }}>
          <div style={{ fontSize: 32 }}>🧪</div>
          <div style={{ fontWeight: "bold", marginTop: 8 }}>전체 회복</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{POTION_COST}G</div>
        </button>
        <button onClick={buySmallPotion} disabled={currentRun.gold < SMALL_POTION_COST} style={{ padding: 16, width: 160 }}>
          <div style={{ fontSize: 32 }}>🩹</div>
          <div style={{ fontWeight: "bold", marginTop: 8 }}>소형 회복 ({Math.round(SMALL_POTION_HEAL_FRACTION * 100)}%)</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{SMALL_POTION_COST}G</div>
        </button>
        <button
          onClick={() => setRemoving(true)}
          disabled={currentRun.deck.length === 0 || currentRun.gold < removalCost}
          style={{ padding: 16, width: 160 }}
        >
          <div style={{ fontSize: 32 }}>🗑️</div>
          <div style={{ fontWeight: "bold", marginTop: 8 }}>카드 제거</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{removalCost}G</div>
        </button>
      </div>

      <button style={{ marginTop: 24 }} onClick={() => onDone(currentRun)}>
        나가기
      </button>
    </div>
  );
}

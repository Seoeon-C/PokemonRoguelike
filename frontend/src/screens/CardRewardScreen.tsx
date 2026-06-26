import type { Card } from "../types/card";
import { TypeBadge } from "../components/TypeBadge";
import { STATUS_LABELS } from "../game/pokedex/statusLabels";
import { STAT_STAGE_LABELS, baselineCardDamage } from "../game/combat";

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

export function CardRewardScreen({
  options,
  onPick,
  onSkip,
}: {
  options: Card[];
  onPick: (card: Card) => void;
  onSkip: () => void;
}) {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <h2>카드를 선택하세요</h2>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {options.map((card, i) => (
          <button key={i} onClick={() => onPick(card)} style={{ padding: 16, width: 160, textAlign: "left" }}>
            <div>
              {card.moveType && <TypeBadge type={card.moveType} size={16} />}{" "}
              <strong>{card.koreanName ?? card.name}</strong>
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>코스트 {card.cost}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {card.effects.map((e, ei) => (
                <div key={ei}>{describeEffect(e)}</div>
              ))}
            </div>
          </button>
        ))}
      </div>
      <button style={{ marginTop: 24 }} onClick={onSkip}>
        건너뛰기
      </button>
    </div>
  );
}

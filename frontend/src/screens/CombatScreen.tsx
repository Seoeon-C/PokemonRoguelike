import { useState } from "react";
import type { Card, PlayerClassId } from "../types/card";
import type { CombatState, EnemyCombatant } from "../types/combat";
import { getMove, displayMoveName } from "../game/pokedex/data";
import { CRIT_CHANCE_BY_STAGE, STAT_STAGE_LABELS, cardDamageToEnemy, enemyMoveDamage } from "../game/combat";
import { PokemonPortrait } from "../components/PokemonPortrait";
import { TypeBadge } from "../components/TypeBadge";
import { HpBar } from "../components/HpBar";
import { STATUS_LABELS } from "../game/pokedex/statusLabels";

const CLASS_LABEL: Record<PlayerClassId, string> = { warrior: "전", mage: "마", archer: "궁" };
const CLASS_COLOR: Record<PlayerClassId, string> = { warrior: "#a83232", mage: "#3b4ea8", archer: "#3a8a4a" };

function describeEffect(
  effect: Card["effects"][number],
  previewTarget: EnemyCombatant | null,
  resource: CombatState["player"]["resource"],
  showTargetName: boolean
): string {
  if (effect.kind === "damage") {
    const hitNote = effect.minHits != null && effect.maxHits != null
      ? effect.minHits === effect.maxHits
        ? ` x${effect.minHits}회`
        : ` x${effect.minHits}~${effect.maxHits}회`
      : "";
    const critStage = Math.max(0, Math.min(CRIT_CHANCE_BY_STAGE.length - 1, effect.critRate));
    const critNote = critStage > 0 ? ` (크리티컬 ${Math.round(CRIT_CHANCE_BY_STAGE[critStage] * 100)}%)` : "";
    if (!previewTarget) return `${effect.power} 위력 공격${hitNote}${critNote}`;
    const dmg = cardDamageToEnemy(effect.power, effect.moveType, previewTarget, resource);
    return `데미지 ${dmg}${hitNote}${showTargetName ? ` (${previewTarget.name} 기준)` : ""}${critNote}`;
  }
  if (effect.kind === "block") return `방어 +${effect.amount}`;
  if (effect.kind === "ailment") return `${STATUS_LABELS[effect.status]} ${effect.chance}%`;
  if (effect.kind === "statStage") return `${effect.target === "self" ? "자신" : "적"} ${STAT_STAGE_LABELS[effect.stat]} ${effect.change > 0 ? "+" : ""}${effect.change}`;
  if (effect.kind === "draw") return `카드 ${effect.count}장 드로우`;
  if (effect.kind === "energyGain") return `에너지 +${effect.amount}`;
  if (effect.kind === "channelOrb") return `${effect.orbType} 오브 충전`;
  return "오브 발동";
}

function cardNeedsEnemyTarget(card: Card): boolean {
  return card.effects.some(
    (e) => e.kind === "damage" || e.kind === "ailment" || (e.kind === "statStage" && e.target === "enemy")
  );
}

function ResourceDisplay({ resource }: { resource: CombatState["player"]["resource"] }) {
  if (resource.kind === "warrior") return <span>투지 {resource.fervor}</span>;
  if (resource.kind === "archer") return <span>조준 {resource.aim}</span>;
  return <span>오브 [{resource.orbSlots.map((o) => o ?? "-").join(", ")}]</span>;
}

function PlayerPanel({ player }: { player: CombatState["player"] }) {
  return (
    <div style={{ textAlign: "center", width: 160 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: CLASS_COLOR[player.classId],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: "bold",
          color: "white",
          margin: "0 auto",
        }}
      >
        {CLASS_LABEL[player.classId]}
      </div>
      {player.status && <div style={{ fontSize: 11, color: "#f88" }}>{STATUS_LABELS[player.status]}</div>}
      <HpBar current={player.hp} max={player.maxHp} />
      <div style={{ fontSize: 13, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <span>방어 {player.block}</span>
        <span>⚡{player.energy}/{player.maxEnergy}</span>
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        <ResourceDisplay resource={player.resource} />
      </div>
    </div>
  );
}

export function CombatScreen({
  state,
  onPlayCard,
  onEndTurn,
  onContinue,
}: {
  state: CombatState;
  onPlayCard: (handIndex: number, targetEnemyIndex: number | null) => void;
  onEndTurn: () => void;
  onContinue: () => void;
}) {
  const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null);
  const aliveIndices = state.enemies.map((_, i) => i).filter((i) => !state.enemies[i].fainted);
  const firstAliveEnemyIndex = aliveIndices[0] ?? -1;

  function handleCardClick(i: number, card: Card) {
    if (!cardNeedsEnemyTarget(card)) {
      onPlayCard(i, null);
      return;
    }
    if (aliveIndices.length > 1) {
      setPendingCardIndex(i);
      return;
    }
    onPlayCard(i, firstAliveEnemyIndex === -1 ? null : firstAliveEnemyIndex);
  }

  function handleEnemyClick(enemyIndex: number) {
    if (pendingCardIndex == null || state.enemies[enemyIndex].fainted) return;
    onPlayCard(pendingCardIndex, enemyIndex);
    setPendingCardIndex(null);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 24px" }}>
      {pendingCardIndex != null && <p style={{ textAlign: "center", color: "#88f" }}>타겟을 선택하세요</p>}

      {/* battlefield: player on the left, enemies on the right, facing off */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <PlayerPanel player={state.player} />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {state.enemies.map((enemy, i) => (
            <div
              key={enemy.instanceId}
              onClick={() => handleEnemyClick(i)}
              style={{
                width: 150,
                textAlign: "center",
                cursor: pendingCardIndex != null && !enemy.fainted ? "pointer" : "default",
                outline: pendingCardIndex != null && !enemy.fainted ? "2px solid #88f" : "none",
                borderRadius: 8,
                padding: 4,
              }}
            >
              {!enemy.fainted && (() => {
                const intentMove = getMove(enemy.nextMoveId);
                const hits = intentMove.meta?.minHits;
                const hitNote = hits != null && intentMove.meta?.maxHits != null
                  ? hits === intentMove.meta.maxHits ? ` x${hits}회` : ` x${hits}~${intentMove.meta.maxHits}회`
                  : "";
                return (
                  <div style={{ fontSize: 11, marginBottom: 2, color: "#aaa" }}>
                    의도: {displayMoveName(intentMove)}
                    {intentMove.power != null && ` (데미지 ${enemyMoveDamage(enemy, enemy.nextMoveId)}${hitNote})`}
                  </div>
                );
              })()}
              <PokemonPortrait speciesId={enemy.speciesId} name={enemy.name} types={enemy.types} faded={enemy.fainted} />
              <div>
                {enemy.name} {enemy.types.map((t) => <TypeBadge key={t} type={t} size={14} />)}
              </div>
              {enemy.status && <div style={{ fontSize: 11, color: "#f88" }}>{STATUS_LABELS[enemy.status]}</div>}
              <HpBar current={enemy.currentHp} max={enemy.maxHp} />
              {i === firstAliveEnemyIndex && !enemy.fainted && pendingCardIndex == null && (
                <div style={{ fontSize: 11, color: "#88f" }}>▼ 기본 타겟</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #444",
          borderRadius: 8,
          padding: 12,
          height: 90,
          overflowY: "auto",
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        {state.log.slice(-8).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {state.result !== "ongoing" ? (
        <div style={{ textAlign: "center" }}>
          <h2>{state.result === "win" ? "승리!" : "패배..."}</h2>
          <button onClick={onContinue}>계속</button>
        </div>
      ) : state.playerTurnBlocked ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f88" }}>
            {state.player.status && STATUS_LABELS[state.player.status]} 상태라 행동할 수 없다!
          </p>
          <button onClick={onEndTurn}>턴 종료</button>
        </div>
      ) : (
        // hand row at the bottom: draw pile / cards / discard+exhaust / end-turn, StS-style
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, width: 70, textAlign: "center" }}>드로우 {state.player.drawPile.length}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", flex: 1 }}>
            {state.player.hand.map((card, i) => {
              const disabled = state.player.energy < card.cost || pendingCardIndex != null;
              const previewTarget = firstAliveEnemyIndex === -1 ? null : state.enemies[firstAliveEnemyIndex];
              return (
                <button
                  key={`${card.id}-${i}`}
                  disabled={disabled}
                  onClick={() => handleCardClick(i, card)}
                  style={{ padding: 10, width: 130, textAlign: "left" }}
                >
                  {card.moveType && <TypeBadge type={card.moveType} size={14} />}{" "}
                  <strong>{card.koreanName ?? card.name}</strong> (⚡{card.cost})
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    {card.effects.map((e, ei) => (
                      <div key={ei}>{describeEffect(e, previewTarget, state.player.resource, aliveIndices.length > 1)}</div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 12, width: 90, textAlign: "center" }}>
            버림 {state.player.discardPile.length} / 소멸 {state.player.exhaustPile.length}
          </div>

          {pendingCardIndex != null ? (
            <button onClick={() => setPendingCardIndex(null)}>취소</button>
          ) : (
            <button onClick={onEndTurn}>턴 종료</button>
          )}
        </div>
      )}
    </div>
  );
}

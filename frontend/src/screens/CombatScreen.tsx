import { useState } from 'react';
import type { Card, PlayerClassId } from '../types/card';
import type { CombatState, EnemyCombatant } from '../types/combat';
import { getMove, displayMoveName } from '../game/pokedex/data';
import {
  CRIT_CHANCE_BY_STAGE,
  STAT_STAGE_LABELS,
  cardDamageToEnemy,
  enemyMoveDamage,
} from '../game/combat';
import { PokemonPortrait } from '../components/PokemonPortrait';
import { TypeBadge } from '../components/TypeBadge';
import { HpBar } from '../components/HpBar';
import { STATUS_LABELS } from '../game/pokedex/statusLabels';

const CLASS_LABEL: Record<PlayerClassId, string> = {
  warrior: '전',
  mage: '마',
  archer: '궁',
};
const CLASS_COLOR: Record<PlayerClassId, string> = {
  warrior: '#a83232',
  mage: '#3b4ea8',
  archer: '#3a8a4a',
};
const CARD_BG: Record<PlayerClassId, string> = {
  warrior: 'linear-gradient(135deg, #2c1616 0%, #521d1d 100%)',
  mage: 'linear-gradient(135deg, #131b38 0%, #22326e 100%)',
  archer: 'linear-gradient(135deg, #122417 0%, #204b2a 100%)',
};

function describeEffect(
  effect: Card['effects'][number],
  previewTarget: EnemyCombatant | null,
  resource: CombatState['player']['resource'],
  showTargetName: boolean,
): string {
  if (effect.kind === 'damage') {
    const hitNote =
      effect.minHits != null && effect.maxHits != null
        ? effect.minHits === effect.maxHits
          ? ` x${effect.minHits}회`
          : ` x${effect.minHits}~${effect.maxHits}회`
        : '';
    const critStage = Math.max(
      0,
      Math.min(CRIT_CHANCE_BY_STAGE.length - 1, effect.critRate),
    );
    const critNote =
      critStage > 0
        ? ` (크리티컬 ${Math.round(CRIT_CHANCE_BY_STAGE[critStage] * 100)}%)`
        : '';
    if (!previewTarget) return `${effect.power} 위력 공격${hitNote}${critNote}`;
    const dmg = cardDamageToEnemy(
      effect.power,
      effect.moveType,
      previewTarget,
      resource,
    );
    return `데미지 ${dmg}${hitNote}${showTargetName ? ` (${previewTarget.name} 기준)` : ''}${critNote}`;
  }
  if (effect.kind === 'block') return `방어 +${effect.amount}`;
  if (effect.kind === 'ailment')
    return `${STATUS_LABELS[effect.status]} ${effect.chance}%`;
  if (effect.kind === 'statStage')
    return `${effect.target === 'self' ? '자신' : '적'} ${STAT_STAGE_LABELS[effect.stat]} ${effect.change > 0 ? '+' : ''}${effect.change}`;
  if (effect.kind === 'draw') return `카드 ${effect.count}장 드로우`;
  if (effect.kind === 'energyGain') return `에너지 +${effect.amount}`;
  if (effect.kind === 'channelOrb') return `${effect.orbType} 오브 충전`;
  return '오브 발동';
}

function cardNeedsEnemyTarget(card: Card): boolean {
  return card.effects.some(
    (e) =>
      e.kind === 'damage' ||
      e.kind === 'ailment' ||
      (e.kind === 'statStage' && e.target === 'enemy'),
  );
}

function ResourceDisplay({
  resource,
}: {
  resource: CombatState['player']['resource'];
}) {
  if (resource.kind === 'warrior') return <span>투지 {resource.fervor}</span>;
  if (resource.kind === 'archer') return <span>조준 {resource.aim}</span>;
  return (
    <span>오브 [{resource.orbSlots.map((o) => o ?? '-').join(', ')}]</span>
  );
}

function PlayerPanel({ player }: { player: CombatState['player'] }) {
  return (
    <div style={{ textAlign: 'center', width: 160 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: CLASS_COLOR[player.classId],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 'bold',
          color: 'white',
          margin: '0 auto',
        }}
      >
        {CLASS_LABEL[player.classId]}
      </div>
      {player.status && (
        <div style={{ fontSize: 11, color: '#f88' }}>
          {STATUS_LABELS[player.status]}
        </div>
      )}
      <HpBar current={player.hp} max={player.maxHp} />
      <div
        style={{
          fontSize: 13,
          marginTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>방어 {player.block}</span>
        <span>
          ⚡{player.energy}/{player.maxEnergy}
        </span>
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
  const aliveIndices = state.enemies
    .map((_, i) => i)
    .filter((i) => !state.enemies[i].fainted);
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 24px' }}>
      {pendingCardIndex != null && (
        <p style={{ textAlign: 'center', color: '#88f', fontWeight: 'bold' }}>
          🎯 타겟을 선택하세요
        </p>
      )}

      {/* 대결 전장 상자 꾸미기 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: 'rgba(20, 20, 27, 0.7)',
          border: '2px solid #2a2a3a',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          minHeight: 280,
        }}
      >
        {/* 플레이어 영역 오라 효과 */}
        <div
          style={{
            boxShadow: `0 0 30px ${CLASS_COLOR[state.player.classId]}44`,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <PlayerPanel player={state.player} />
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#444',
            fontStyle: 'italic',
          }}
        >
          VS
        </div>

        {/* 적 몬스터 정렬 및 디자인 수정 */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {state.enemies.map((enemy, i) => (
            <div
              key={enemy.instanceId}
              onClick={() => handleEnemyClick(i)}
              style={{
                width: 160,
                textAlign: 'center',
                cursor:
                  pendingCardIndex != null && !enemy.fainted
                    ? 'pointer'
                    : 'default',
                border:
                  pendingCardIndex != null && !enemy.fainted
                    ? '2px solid #88f'
                    : '2px solid transparent',
                background: enemy.fainted
                  ? 'rgba(0,0,0,0.4)'
                  : 'rgba(255,255,255,0.03)',
                boxShadow:
                  pendingCardIndex != null && !enemy.fainted
                    ? '0 0 15px #88f'
                    : 'none',
                borderRadius: 12,
                padding: '12px 8px',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* 말풍선 스타일로 변경된 의도(Intent) 표시 */}
              {!enemy.fainted &&
                (() => {
                  const intentMove = getMove(enemy.nextMoveId);
                  const hits = intentMove.meta?.minHits;
                  const hitNote =
                    hits != null && intentMove.meta?.maxHits != null
                      ? hits === intentMove.meta.maxHits
                        ? ` x${hits}`
                        : ` x${hits}~${intentMove.meta.maxHits}`
                      : '';
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        top: -35,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#222',
                        border: '1px solid #555',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 10,
                        color: '#ffb444',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      ⚔️ {displayMoveName(intentMove)}
                      {intentMove.power != null &&
                        ` (${enemyMoveDamage(enemy, enemy.nextMoveId)}${hitNote})`}
                    </div>
                  );
                })()}

              <PokemonPortrait
                speciesId={enemy.speciesId}
                name={enemy.name}
                types={enemy.types}
                faded={enemy.fainted}
              />
              <div>
                {enemy.name}{' '}
                {enemy.types.map((t) => (
                  <TypeBadge key={t} type={t} size={14} />
                ))}
              </div>
              {enemy.status && (
                <div style={{ fontSize: 11, color: '#f88' }}>
                  {STATUS_LABELS[enemy.status]}
                </div>
              )}
              <HpBar current={enemy.currentHp} max={enemy.maxHp} />

              {i === firstAliveEnemyIndex &&
                !enemy.fainted &&
                pendingCardIndex == null && (
                  <div style={{ fontSize: 10, color: '#88f', marginTop: 4 }}>
                    🎯 기본 타겟
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 12,
          height: 90,
          overflowY: 'auto',
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        {state.log.slice(-8).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {state.result !== 'ongoing' ? (
        <div style={{ textAlign: 'center' }}>
          <h2>{state.result === 'win' ? '승리!' : '패배...'}</h2>
          <button onClick={onContinue}>계속</button>
        </div>
      ) : state.playerTurnBlocked ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f88' }}>
            {state.player.status && STATUS_LABELS[state.player.status]} 상태라
            행동할 수 없다!
          </p>
          <button onClick={onEndTurn}>턴 종료</button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: 'rgba(10, 10, 12, 0.9)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #222',
          }}
        >
          {/* 덱 구슬 */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#334155',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #475569',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 9, color: '#94a3b8' }}>덱</span>
            <strong style={{ fontSize: 16 }}>
              {state.player.drawPile.length}
            </strong>
          </div>

          {/* 카드 패 영역 */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'nowrap',
              justifyContent: 'center',
              flex: 1,
              padding: '10px 0',
            }}
          >
            {state.player.hand.map((card, i) => {
              const disabled =
                state.player.energy < card.cost || pendingCardIndex != null;
              const previewTarget =
                firstAliveEnemyIndex === -1
                  ? null
                  : state.enemies[firstAliveEnemyIndex];
              return (
                <button
                  key={`${card.id}-${i}`}
                  disabled={disabled}
                  onClick={() => handleCardClick(i, card)}
                  className="game-card"
                  style={{
                    position: 'relative',
                    width: 140,
                    height: 190,
                    background: CARD_BG[state.player.classId],
                    border:
                      pendingCardIndex === i
                        ? '3px solid #ffde00'
                        : '2px solid #444',
                    borderRadius: '12px',
                    boxShadow:
                      '0 8px 16px rgba(0,0,0,0.6), inset 0 0 10px rgba(255,255,255,0.1)',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    color:
                      disabled && state.player.energy < card.cost
                        ? '#666'
                        : '#fff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity:
                      disabled && state.player.energy < card.cost ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  {/* 이름 & 코스트 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {card.moveType && (
                        <TypeBadge type={card.moveType} size={14} />
                      )}
                      {card.koreanName ?? card.name}
                    </span>
                    <div
                      style={{
                        background: '#3b82f6',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {card.cost}
                    </div>
                  </div>

                  {/* 중간 그래픽 공백 데코레이션 */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.15,
                      fontSize: 28,
                      pointerEvents: 'none',
                    }}
                  >
                    🃏
                  </div>

                  {/* 카드 텍스트 설명 창 */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '6px',
                      borderRadius: '6px',
                      fontSize: 10,
                      lineHeight: '1.3',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {card.effects.map((e, ei) => (
                      <div
                        key={ei}
                        style={{
                          color:
                            e.kind === 'damage'
                              ? '#ff7676'
                              : e.kind === 'block'
                                ? '#76bcff'
                                : '#fff',
                        }}
                      >
                        {describeEffect(
                          e,
                          previewTarget,
                          state.player.resource,
                          aliveIndices.length > 1,
                        )}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 무덤 및 소멸 보관함 */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 55,
                height: 55,
                borderRadius: '10px',
                background: '#3f2d2d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #5c3f3f',
              }}
            >
              <span style={{ fontSize: 9, color: '#fca5a5' }}>버림</span>
              <strong style={{ fontSize: 14 }}>
                {state.player.discardPile.length}
              </strong>
            </div>
            <div
              style={{
                width: 55,
                height: 55,
                borderRadius: '10px',
                background: '#2d3f3e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #3f5c5a',
              }}
            >
              <span style={{ fontSize: 9, color: '#99f6e4' }}>소멸</span>
              <strong style={{ fontSize: 14 }}>
                {state.player.exhaustPile.length}
              </strong>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div style={{ flexShrink: 0 }}>
            {pendingCardIndex != null ? (
              <button
                className="end-turn-btn"
                onClick={() => setPendingCardIndex(null)}
                style={{ background: '#dc2626' }}
              >
                취소
              </button>
            ) : (
              <button
                className="end-turn-btn"
                onClick={onEndTurn}
                style={{ background: '#059669' }}
              >
                턴 종료
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

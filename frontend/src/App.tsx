import { useState } from "react";
import type { PlayerClassId, Card } from "./types/card";
import type { CombatState } from "./types/combat";
import type { RunState } from "./types/run";
import { createCombatState, endTurn, playCard } from "./game/combat";
import { createEnemyEncounter, createInitialRun } from "./game/run/createRun";
import { generateCardRewardOptions, type EncounterType } from "./game/cards/classCardPools";
import { getNode } from "./game/map/mapHelpers";
import { ClassSelectScreen } from "./screens/ClassSelectScreen";
import { CombatScreen } from "./screens/CombatScreen";
import { CardRewardScreen } from "./screens/CardRewardScreen";
import { MapScreen } from "./screens/MapScreen";
import { EventScreen } from "./screens/EventScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { RestScreen } from "./screens/RestScreen";
import { GameOverScreen, type RunSummary } from "./screens/GameOverScreen";

interface ActiveCombat {
  nodeId: string;
  state: CombatState;
}

interface ActiveSpecialNode {
  nodeId: string;
  type: "event" | "shop" | "rest";
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function App() {
  const [run, setRun] = useState<RunState | null>(null);
  const [combat, setCombat] = useState<ActiveCombat | null>(null);
  const [cardReward, setCardReward] = useState<{ nodeId: string; options: Card[] } | null>(null);
  const [specialNode, setSpecialNode] = useState<ActiveSpecialNode | null>(null);
  const [runOver, setRunOver] = useState<RunSummary | null>(null);

  if (runOver) {
    return (
      <GameOverScreen
        summary={runOver}
        onRestart={() => {
          setRunOver(null);
          setRun(null);
        }}
      />
    );
  }

  if (!run) {
    return (
      <ClassSelectScreen
        onSelect={(classId: PlayerClassId) => setRun(createInitialRun(classId))}
      />
    );
  }

  if (combat) {
    return (
      <CombatScreen
        state={combat.state}
        onPlayCard={(handIndex, targetEnemyIndex) =>
          setCombat({ ...combat, state: playCard(combat.state, handIndex, targetEnemyIndex) })
        }
        onEndTurn={() => setCombat({ ...combat, state: endTurn(combat.state) })}
        onContinue={() => {
          const { nodeId, state } = combat;
          setCombat(null);

          if (state.result === "lose") {
            setRunOver({
              floor: Number(nodeId.split("-")[0]) + 1,
              gold: run.gold,
              deckSize: run.deck.length,
            });
            return;
          }

          const updatedRun: RunState = {
            ...run,
            hp: state.player.hp,
            deck: state.player.deck,
            gold: run.gold + randomInt(10, 20),
            currentNodeId: nodeId,
            visitedNodeIds: [...run.visitedNodeIds, nodeId],
          };
          setRun(updatedRun);
          const node = getNode(updatedRun.map, nodeId);
          const encounterType = node.type as EncounterType;
          setCardReward({ nodeId, options: generateCardRewardOptions(updatedRun.classId, encounterType) });
        }}
      />
    );
  }

  if (cardReward) {
    return (
      <CardRewardScreen
        options={cardReward.options}
        onSkip={() => setCardReward(null)}
        onPick={(card) => {
          setRun({ ...run, deck: [...run.deck, card] });
          setCardReward(null);
        }}
      />
    );
  }

  if (specialNode) {
    const finishSpecialNode = (updatedRun: RunState) => {
      setRun({
        ...updatedRun,
        currentNodeId: specialNode.nodeId,
        visitedNodeIds: [...updatedRun.visitedNodeIds, specialNode.nodeId],
      });
      setSpecialNode(null);
    };

    if (specialNode.type === "event") return <EventScreen run={run} onDone={finishSpecialNode} />;
    if (specialNode.type === "shop") return <ShopScreen run={run} onDone={finishSpecialNode} />;
    return <RestScreen run={run} onDone={finishSpecialNode} />;
  }

  return (
    <MapScreen
      run={run}
      onSelectNode={(nodeId) => {
        const node = getNode(run.map, nodeId);
        if (node.type === "battle" || node.type === "elite" || node.type === "boss") {
          const enemies = createEnemyEncounter(nodeId, node.type, node.floor);
          setCombat({
            nodeId,
            state: createCombatState(run.classId, run.deck, enemies, run.hp, run.maxHp),
          });
        } else {
          setSpecialNode({ nodeId, type: node.type });
        }
      }}
    />
  );
}

export default App;

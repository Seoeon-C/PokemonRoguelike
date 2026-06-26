import type { RunState } from "../../types/run";
import { generateCardRewardOptions } from "../cards/classCardPools";

export interface EventOutcome {
  run: RunState;
  resultText: string;
}

export interface EventChoice {
  label: string;
  resolve: (run: RunState) => EventOutcome;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addGold(run: RunState, amount: number): RunState {
  return { ...run, gold: run.gold + amount };
}

function heal(run: RunState, amount: number): RunState {
  return { ...run, hp: Math.min(run.maxHp, run.hp + amount) };
}

function damage(run: RunState, amount: number): RunState {
  return { ...run, hp: Math.max(1, run.hp - amount) };
}

function addRandomCard(run: RunState): RunState {
  const [card] = generateCardRewardOptions(run.classId, 1);
  return card ? { ...run, deck: [...run.deck, card] } : run;
}

function removeRandomCard(run: RunState): { run: RunState; removedName: string | null } {
  if (run.deck.length === 0) return { run, removedName: null };
  const index = randomInt(0, run.deck.length - 1);
  const deck = [...run.deck];
  const [removed] = deck.splice(index, 1);
  return { run: { ...run, deck }, removedName: removed.koreanName ?? removed.name };
}

export const EVENTS: GameEvent[] = [
  {
    id: "strange-berry",
    title: "이상한 베리",
    description: "길가에서 낯선 베리를 발견했다. 먹어볼까?",
    choices: [
      {
        label: "먹기",
        resolve: (run) => {
          const lucky = Math.random() < 0.5;
          const next = lucky ? heal(run, 15) : damage(run, 8);
          return { run: next, resultText: lucky ? "베리가 효과가 좋았다! 체력을 회복했다." : "베리가 상해 있었다... 체력이 깎였다." };
        },
      },
      { label: "무시하기", resolve: (run) => ({ run, resultText: "베리를 그냥 지나쳤다." }) },
    ],
  },
  {
    id: "wild-pack",
    title: "들개 무리",
    description: "들짐승 무리가 길을 막고 있다. 맞서면 뭔가 떨어뜨릴지도 모른다.",
    choices: [
      {
        label: "맞서다",
        resolve: (run) => {
          const gold = randomInt(15, 25);
          const next = addGold(damage(run, 8), gold);
          return { run: next, resultText: `무리를 쫓아내고 ${gold}골드를 주웠다. 그 과정에서 약간의 피해를 입었다.` };
        },
      },
      { label: "돌아가다", resolve: (run) => ({ run, resultText: "위험을 피해 돌아갔다." }) },
    ],
  },
  {
    id: "hidden-cave",
    title: "숨겨진 동굴",
    description: "동굴 안쪽에서 반짝이는 게 보인다.",
    choices: [
      {
        label: "탐험하기",
        resolve: (run) => {
          const gold = randomInt(15, 30);
          return { run: addGold(run, gold), resultText: `동굴에서 ${gold}골드를 발견했다!` };
        },
      },
      { label: "무시하기", resolve: (run) => ({ run, resultText: "동굴을 지나쳤다." }) },
    ],
  },
  {
    id: "wandering-healer",
    title: "떠돌이 약초꾼",
    description: "떠돌이 약초꾼이 살펴봐 주겠다고 한다.",
    choices: [
      {
        label: "부탁하기",
        resolve: (run) => ({ run: heal(run, 15), resultText: "체력이 약간 회복되었다." }),
      },
      { label: "거절하기", resolve: (run) => ({ run, resultText: "약초꾼과 헤어졌다." }) },
    ],
  },
  {
    id: "suspicious-merchant",
    title: "수상한 상인",
    description: "상인이 다가와 속삭인다. \"카드 한 장만 넘기면 골드를 후하게 쳐주지.\"",
    choices: [
      {
        label: "교환하기",
        resolve: (run) => {
          const { run: next, removedName } = removeRandomCard(run);
          if (!removedName) return { run, resultText: "넘길 카드가 없었다." };
          const gold = randomInt(35, 50);
          return { run: addGold(next, gold), resultText: `[${removedName}] 카드를 넘기고 ${gold}골드를 받았다.` };
        },
      },
      { label: "거절하기", resolve: (run) => ({ run, resultText: "상인을 그냥 지나쳤다." }) },
    ],
  },
  {
    id: "treasure-chest",
    title: "버려진 보물상자",
    description: "낡은 보물상자가 놓여 있다. 함정일 수도 있다.",
    choices: [
      {
        label: "열어보기",
        resolve: (run) => {
          const safe = Math.random() < 0.5;
          if (safe) {
            const gold = randomInt(30, 45);
            return { run: addGold(run, gold), resultText: `상자 안에 ${gold}골드가 들어 있었다!` };
          }
          return { run: damage(run, 12), resultText: "함정이었다! 가시에 찔렸다." };
        },
      },
      { label: "지나치기", resolve: (run) => ({ run, resultText: "상자를 건드리지 않고 지나쳤다." }) },
    ],
  },
  {
    id: "mysterious-altar",
    title: "신비한 제단",
    description: "제단이 기술머신 하나를 내어줄 것처럼 빛나고 있다. 체력을 바치면 받을 수 있을 것 같다.",
    choices: [
      {
        label: "체력 바치기",
        resolve: (run) => ({ run: addRandomCard(damage(run, 15)), resultText: "체력을 바치고 새로운 기술머신을 얻었다." }),
      },
      { label: "무시하기", resolve: (run) => ({ run, resultText: "제단을 그대로 두고 떠났다." }) },
    ],
  },
  {
    id: "ancient-ruins",
    title: "고대 유적",
    description: "오래된 유적 안쪽에서 뭔가 발견할 수 있을 것 같다.",
    choices: [
      {
        label: "탐험하기",
        resolve: (run) => {
          if (Math.random() < 0.5) {
            const gold = randomInt(20, 35);
            return { run: addGold(run, gold), resultText: `유적에서 ${gold}골드를 발견했다.` };
          }
          return { run: addRandomCard(run), resultText: "유적 깊은 곳에서 기술머신을 발견했다!" };
        },
      },
      { label: "돌아가기", resolve: (run) => ({ run, resultText: "유적을 뒤로 하고 돌아갔다." }) },
    ],
  },
  {
    id: "injured-traveler",
    title: "부상당한 여행자",
    description: "길가에 쓰러진 여행자가 도움을 청한다.",
    choices: [
      {
        label: "도와주기",
        resolve: (run) => {
          const gold = randomInt(10, 20);
          return { run: addGold(heal(run, 8), gold), resultText: `여행자를 도와주고 답례로 ${gold}골드를 받았다.` };
        },
      },
      { label: "무시하기", resolve: (run) => ({ run, resultText: "여행자를 못 본 척 지나쳤다." }) },
    ],
  },
];

export function pickRandomEvent(): GameEvent {
  return EVENTS[randomInt(0, EVENTS.length - 1)];
}

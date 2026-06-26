import type { RunState } from "../../types/run";

export function healPlayer(run: RunState, amount: number = run.maxHp): RunState {
  return { ...run, hp: Math.min(run.maxHp, run.hp + amount) };
}

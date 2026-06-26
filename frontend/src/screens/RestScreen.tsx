import type { RunState } from "../types/run";
import { healPlayer } from "../game/run/campActions";

export function RestScreen({ run, onDone }: { run: RunState; onDone: (run: RunState) => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <h2>휴식처</h2>
      <p>여기서 잠시 쉬면 체력이 모두 회복된다.</p>
      <button onClick={() => onDone(healPlayer(run))}>휴식하기</button>
    </div>
  );
}

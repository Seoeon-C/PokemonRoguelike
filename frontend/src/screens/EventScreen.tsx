import { useState } from "react";
import type { RunState } from "../types/run";
import { pickRandomEvent } from "../game/run/events";

export function EventScreen({ run, onDone }: { run: RunState; onDone: (run: RunState) => void }) {
  const [event] = useState(() => pickRandomEvent());
  const [outcome, setOutcome] = useState<{ run: RunState; resultText: string } | null>(null);

  if (outcome) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2>{event.title}</h2>
        <p>{outcome.resultText}</p>
        <button onClick={() => onDone(outcome.run)}>계속</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {event.choices.map((choice, i) => (
          <button key={i} onClick={() => setOutcome(choice.resolve(run))}>
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

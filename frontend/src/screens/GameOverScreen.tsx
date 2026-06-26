export interface RunSummary {
  floor: number;
  gold: number;
  deckSize: number;
}

export function GameOverScreen({ summary, onRestart }: { summary: RunSummary; onRestart: () => void }) {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>런 종료</h1>
      <p>쓰러지고 말았다...</p>
      <p>도달한 층: {summary.floor}</p>
      <p>보유 골드: {summary.gold}</p>
      <p>덱 크기: {summary.deckSize}장</p>
      <button onClick={onRestart}>새로운 런 시작</button>
    </div>
  );
}

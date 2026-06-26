export function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const color = pct > 50 ? "#78C850" : pct > 20 ? "#F8D030" : "#F08030";

  return (
    <div style={{ width: "100%" }}>
      <div style={{ background: "#333", borderRadius: 4, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 12, marginTop: 2 }}>
        {current} / {max}
      </div>
    </div>
  );
}

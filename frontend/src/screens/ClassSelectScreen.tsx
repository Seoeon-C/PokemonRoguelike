import type { PlayerClassId } from "../types/card";

const CLASS_INFO: Record<PlayerClassId, { label: string; description: string }> = {
  warrior: { label: "전사", description: "투지 — 맞을수록 다음 공격이 강해진다." },
  mage: { label: "마법사", description: "오브 — 원소 오브를 충전하고 발동시켜 싸운다." },
  archer: { label: "궁수", description: "조준 — 비공격 카드로 조준을 쌓고 다음 공격에 터뜨린다." },
};

export function ClassSelectScreen({ onSelect }: { onSelect: (classId: PlayerClassId) => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <h1>직업 선택</h1>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {(Object.keys(CLASS_INFO) as PlayerClassId[]).map((classId) => (
          <button
            key={classId}
            onClick={() => onSelect(classId)}
            style={{ padding: 16, width: 180 }}
          >
            <div style={{ fontWeight: "bold", fontSize: 18 }}>{CLASS_INFO[classId].label}</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>{CLASS_INFO[classId].description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

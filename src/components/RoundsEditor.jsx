import {
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { genId, todayStr } from "../utils.js";

export default function RoundsEditor({ mode, rounds, onChange }) {
  const addRound = () => onChange([...rounds, { id: genId(), date: mode === "scheduled" ? todayStr() : "", count: 1, done: false }]);
  const updateRound = (id, patch) => onChange(rounds.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeRound = (id) => onChange(rounds.filter(r => r.id !== id));

  if (mode === "anytime") {
    const r = rounds[0] || { id: genId(), date: "", count: 1, done: false };
    return (
      <div className="pgs-field">
        <label className="pgs-label">จำนวนรอบที่ต้องตี (ไม่ระบุวัน)</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="pgs-input pgs-mono" type="number" min="1" style={{ flex: 1 }} value={r.count}
            onChange={e => onChange([{ ...r, count: e.target.value }])} />
          <button type="button" className={"pgs-chip" + (r.done ? " active" : "")} onClick={() => onChange([{ ...r, done: !r.done }])}>
            {r.done ? "เสร็จแล้ว ✓" : "ยังไม่เสร็จ"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="pgs-field">
      <label className="pgs-label">รอบที่ตั้งไว้ ({rounds.filter(r => r.done).length}/{rounds.length} เสร็จ)</label>
      {rounds.map((r, i) => (
        <div key={r.id} className="pgs-roundrow">
          <span style={{ fontSize: 11, color: "var(--muted)", width: 16 }}>{i + 1}</span>
          <input className="pgs-input" type="date" style={{ flex: 1.4 }} value={r.date} onChange={e => updateRound(r.id, { date: e.target.value })} />
          <input className="pgs-input pgs-mono" type="number" min="1" style={{ flex: 0.7 }} value={r.count} onChange={e => updateRound(r.id, { count: e.target.value })} />
          <button type="button" className="pgs-iconbtn" style={{ color: r.done ? "var(--green)" : "var(--muted)" }} onClick={() => updateRound(r.id, { done: !r.done })}><CheckCircle2 size={15} /></button>
          <button type="button" className="pgs-iconbtn" onClick={() => removeRound(r.id)}><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginTop: 4 }} onClick={addRound}><Plus size={14} /> เพิ่มรอบ</button>
    </div>
  );
}

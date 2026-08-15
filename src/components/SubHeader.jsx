import {
  ArrowLeft,
} from "lucide-react";

export default function SubHeader({ title, back }) {
  return (
    <div className="pgs-row" style={{ marginBottom: 14 }}>
      <button className="pgs-btn pgs-btn-outline" style={{ padding: 8 }} onClick={back}><ArrowLeft size={16} /></button>
      <h2 className="pgs-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      <div style={{ width: 34 }} />
    </div>
  );
}

import { fmtDate } from "../utils.js";

export default function StockMovementHistory({ data, stockItemId }) {
  const rows = (data.stockMovements || []).filter(m => m.stockItemId === stockItemId).slice(0, 20);
  if (!rows.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="pgs-sectiontitle" style={{ margin: "0 0 8px" }}>ประวัติการเคลื่อนไหวสต๊อก</div>
      <div className="pgs-card" style={{ padding: 0, overflow: "hidden" }}>
        {rows.map((m, i) => (
          <div key={m.id} className="pgs-row" style={{ padding: "9px 12px", borderTop: i ? "1px solid var(--border)" : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{m.reason}{m.refOrderCode ? ` · ${m.refOrderCode}` : ""}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{fmtDate(m.date)}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="pgs-mono" style={{ fontSize: 13, fontWeight: 700, color: m.delta > 0 ? "var(--green)" : "var(--red)" }}>
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </div>
              {m.resultQty != null && <div style={{ fontSize: 10, color: "var(--muted)" }}>เหลือ {m.resultQty}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

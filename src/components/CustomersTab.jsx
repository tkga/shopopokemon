import { useState } from "react";
import {
  Plus,
  Search,
} from "lucide-react";
import { fmtMoney } from "../utils.js";
import EmptyState from "./EmptyState.jsx";
import SubHeader from "./SubHeader.jsx";


export default function CustomersTab({ data, openNew, openEdit, openDetail, back }) {
  const [q, setQ] = useState("");
  const spentOf = (id) => data.orders.filter(o => o.customerId === id && !o.cancelled).reduce((s, o) => {
    if (o.paymentStatus === "paid") return s + (Number(o.price) || 0);
    if (o.paymentStatus === "partial") return s + (Number(o.paidAmount) || 0);
    return s;
  }, 0);
  // เรียงจากยอดซื้อทั้งหมด (ไม่กรองด้วยคำค้นหา) ไว้แยกใช้เป็น Top 3 บนสุด
  const allSorted = data.customers
    .map(c => ({ ...c, _spent: spentOf(c.id) }))
    .sort((a, b) => b._spent - a._spent);
  const top3 = allSorted.slice(0, 3);
  // ลิสต์ด้านล่างยังกรองด้วยคำค้นหาได้ตามปกติ
  const list = allSorted.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <SubHeader title="ลูกค้า" back={back} />
      {!q && top3.length > 0 && (
        <div className="pgs-card" style={{ marginBottom: 12 }}>
          <div className="pgs-sectiontitle" style={{ margin: "0 0 10px 2px" }}>ลูกค้าซื้อเยอะสุด</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10 }}>
            {PODIUM_ORDER.map(rank => {
              const c = top3[rank - 1];
              if (!c) return <div key={rank} style={{ flex: 1 }} />;
              const s = PODIUM_STYLE[rank];
              return (
                <div key={c.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={() => openDetail(c)}>
                  <div style={{ fontSize: s.medalSize }}>{s.medal}</div>
                  <div style={{ fontWeight: 700, fontSize: s.nameSize, textAlign: "center" }}>{maskName(c.name)}</div>
                  <div className="pgs-mono" style={{ fontSize: s.moneySize, fontWeight: 700, color: "var(--green)" }}>฿{fmtMoney(c._spent)}</div>
                  <div style={{ width: "100%", height: s.height, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: 12 }} onClick={openNew}><Plus size={15} /> เพิ่มลูกค้าใหม่</button>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 12, top: 12 }} />
        <input className="pgs-input" style={{ paddingLeft: 32 }} placeholder="ค้นหาลูกค้า..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <EmptyState text="ยังไม่มีลูกค้า" /> : list.map((c, i) => (
        <div key={c.id} className="pgs-card" style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => openDetail(c)}>
          <div className="pgs-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pgs-mono" style={{ fontSize: 11, color: "var(--muted)", width: 18, textAlign: "center" }}>#{i + 1}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.facebook || "ไม่มี Facebook"}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="pgs-mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--green)" }}>฿{fmtMoney(c._spent)}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>ยอดซื้อสะสม</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import {
  Plus,
  Search,
} from "lucide-react";
import { fmtMoney } from "../utils.js";
import EmptyState from "./EmptyState.jsx";
import SubHeader from "./SubHeader.jsx";

// คำนวณยอดซื้อสะสมของลูกค้า 1 คน จากออเดอร์ที่ชำระแล้ว/ชำระบางส่วน (ไม่นับที่ยกเลิก)
// นับราคาสินค้าเต็มจำนวนของออเดอร์ ไม่ว่าจะชำระครบหรือชำระบางส่วน (ซื้อเท่าไหร่ แสดงเท่านั้น)
function spentOf(customerId, orders) {
  return orders
    .filter(o => o.customerId === customerId && !o.cancelled)
    .filter(o => ["sell_pokemon", "hire_boss", "hire_invite"].includes(o.type))
    .reduce((sum, o) => {
      if (o.paymentStatus === "paid" || o.paymentStatus === "partial") return sum + (Number(o.price) || 0);
      return sum;
    }, 0);
}

export default function CustomersTab({ data, openNew, openEdit, openDetail, back }) {
  const [q, setQ] = useState("");

  const allSorted = [...data.customers]
    .map(c => ({ ...c, _spent: spentOf(c.id, data.orders) }))
    .sort((a, b) => b._spent - a._spent);

  // ลิสต์ด้านล่างยังกรองด้วยคำค้นหาได้ตามปกติ
  const list = allSorted.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <SubHeader title="ลูกค้า" back={back} />
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

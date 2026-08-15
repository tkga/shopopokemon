import { useState } from "react";
import {
  Plus,
  Gamepad2,
  Search,
  QrCode,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { fmtMoney, clamp0 } from "../utils.js";
import EmptyState from "./EmptyState.jsx";
import SubHeader from "./SubHeader.jsx";

export default function AccountsTab({ data, stats, openNew, openDetail, onMoveAccount, openCodeSearch, back }) {
  const [q, setQ] = useState("");
  const accounts = data.gameAccounts.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  // จัดเรียงเองได้ (เลื่อนขึ้น/ลง) เฉพาะตอนไม่ได้ค้นหาอยู่ — ตอนค้นหา ลำดับที่เห็นในรายการที่กรองแล้ว
  // ไม่ตรงกับลำดับจริงในไอดีทั้งหมด ปุ่มเลื่อนจะสลับตำแหน่งผิดที่ได้ ต้องล้างคำค้นหาก่อนถึงจะจัดเรียงได้
  const canReorder = !q && !!onMoveAccount;
  return (
    <div>
      <SubHeader title="ไอดีเกม" back={back} />
      <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: 8 }} onClick={openNew}><Plus size={15} /> เพิ่มไอดีใหม่</button>
      {openCodeSearch && (
        <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 12 }} onClick={openCodeSearch}>
          <QrCode size={15} /> ค้นหาด้วยรหัสสินค้า
        </button>
      )}
      {data.gameAccounts.length > 0 && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input className="pgs-input" style={{ paddingLeft: 32 }} placeholder="ค้นหาไอดีเกม..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      )}
      {data.gameAccounts.length > 1 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
          {canReorder ? "กดปุ่ม ▲ ▼ ที่ไอดีเพื่อจัดลำดับการแสดงผลเอง" : "ล้างคำค้นหาก่อน ถึงจะจัดลำดับไอดีเองได้"}
        </div>
      )}
      {accounts.length === 0 ? <EmptyState text={data.gameAccounts.length === 0 ? "ยังไม่มีไอดีเกม" : "ไม่พบไอดีที่ค้นหา"} /> : accounts.map((a, i) => {
        const invested = stats.investByAccount[a.id] || 0;
        // นับยอดที่ชำระเข้ามาแล้วจริงทันที ไม่ต้องรอกดเสร็จสิ้น/เทรดแล้ว (ดูคอมเมนต์ใน AccountDetail.jsx)
        const income = data.orders.filter(o => o.sourceAccountId === a.id && !o.cancelled && (o.paymentStatus === "paid" || o.paymentStatus === "partial")).reduce((s, o) => s + (o.paymentStatus === "paid" ? Number(o.price || 0) : Number(o.paidAmount || 0)), 0);
        const profit = income - invested;
        const pokemonCount = data.orders.filter(o => o.sourceAccountId === a.id && o.type === "sell_pokemon" && !o.cancelled).length;
        const lowStock = (a.stock || []).filter(s => clamp0(s.quantity) <= (s.lowStockThreshold ?? 2));
        return (
          <div key={a.id} className="pgs-card" style={{ marginBottom: 8, cursor: "pointer", display: "flex", gap: 8 }} onClick={() => openDetail(a)}>
            {canReorder && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                <button
                  className="pgs-iconbtn" style={{ padding: 4 }}
                  disabled={i === 0}
                  onClick={() => onMoveAccount(a.id, -1)}
                  title="เลื่อนขึ้น"
                ><ChevronUp size={14} /></button>
                <button
                  className="pgs-iconbtn" style={{ padding: 4 }}
                  disabled={i === accounts.length - 1}
                  onClick={() => onMoveAccount(a.id, 1)}
                  title="เลื่อนลง"
                ><ChevronDown size={14} /></button>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="pgs-row" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Gamepad2 size={16} color="var(--yellow)" />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</span>
                </div>
                <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 13, color: profit >= 0 ? "var(--green)" : "var(--red)" }}>฿{fmtMoney(profit)}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 10, color: "var(--muted)" }}>
                <div>ลงทุน<br /><span className="pgs-mono" style={{ color: "var(--text)", fontSize: 12 }}>฿{fmtMoney(invested)}</span></div>
                <div>รายรับ<br /><span className="pgs-mono" style={{ color: "var(--text)", fontSize: 12 }}>฿{fmtMoney(income)}</span></div>
                <div>Pokémon<br /><span className="pgs-mono" style={{ color: "var(--text)", fontSize: 12 }}>{pokemonCount}</span></div>
              </div>
              {lowStock.length > 0 && (
                <div className="pgs-badge" style={{ marginTop: 8, background: "rgba(255,84,112,0.15)", color: "var(--red)" }}>
                  <AlertTriangle size={10} /> สต๊อกใกล้หมด {lowStock.length} รายการ
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


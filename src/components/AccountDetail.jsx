import { useState } from "react";
import {
  Plus,
  TrendingUp,
  Heart,
  Clock,
  Trash2,
  Edit2,
  Coins,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { INVEST_TYPES, POKEMON_VARIANTS } from "../constants.js";
import { fmtMoney, fmtDate, clamp0 } from "../utils.js";
import StatCard from "./StatCard.jsx";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

export default function AccountDetail({ item, data, stats, onClose, onEdit, onDelete, onAddInvestment, onDeleteInvestment, onDeleteManual, onAddStock, onEditStock }) {
  const invested = stats.investByAccount[item.id] || 0;
  // นับยอดที่ "ชำระเข้ามาแล้วจริง" ทันทีที่มีออเดอร์ ไม่ต้องรอกดเสร็จสิ้น/เทรดแล้วก่อน — ชำระเต็มนับเต็มราคา,
  // ชำระบางส่วนนับเฉพาะยอดที่ชำระมาแล้ว (paidAmount) แก้บั๊กเดิมที่นับเฉพาะ paymentStatus === "paid" เท่านั้น
  const income = data.orders.filter(o => o.sourceAccountId === item.id && !o.cancelled && (o.paymentStatus === "paid" || o.paymentStatus === "partial")).reduce((s, o) => s + (o.paymentStatus === "paid" ? Number(o.price || 0) : Number(o.paidAmount || 0)), 0);
  // ประวัติการลงทุน = รายการ "เติม Coin / ซื้อ Pokémon" (investmentHistory) รวมกับรายการ "อื่นๆ" ที่เป็นรายจ่าย
  // และผูกกับไอดีนี้ (manualTx) — ทั้งสองแบบนับเป็นเงินลงทุนของไอดีนี้อยู่แล้วใน stats.investByAccount
  // ดังนั้นให้แสดงรวมกันในประวัติด้วย ไม่ใช่แค่รวมในยอดสรุป
  const investEntries = data.investmentHistory.filter(h => h.accountId === item.id).map(h => ({ ...h, source: "investment" }));
  const manualEntries = (data.manualTx || []).filter(t => t.type === "expense" && t.accountId === item.id).map(t => ({ ...t, source: "manual" }));
  const history = [...investEntries, ...manualEntries].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const waitingTrade = data.orders.filter(o => o.sourceAccountId === item.id && !o.cancelled && o.tradeStatus === "waiting").length;
  const threeHearts = data.orders.filter(o => o.sourceAccountId === item.id && !o.cancelled && o.tradeStatus === "three_hearts").length;
  const stock = item.stock || [];
  const allOrderCount = data.orders.filter(o => o.sourceAccountId === item.id).length;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmInvId, setConfirmInvId] = useState(null);
  return (
    <Modal title={item.name} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <StatCard icon={Coins} label="ลงทุนสะสม" value={"฿" + fmtMoney(invested)} color="var(--yellow)" />
        <StatCard icon={TrendingUp} label="กำไร" value={"฿" + fmtMoney(income - invested)} color={income - invested >= 0 ? "var(--green)" : "var(--red)"} />
        <StatCard icon={Clock} label="ลูกค้ารอเทรด" value={waitingTrade} />
        <StatCard icon={Heart} label="ทำ 3 ใจ" value={threeHearts} color="var(--yellow)" />
      </div>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 12 }} onClick={onAddInvestment}><Plus size={14} /> บันทึกเติม Coin / ซื้อ Pokémon</button>

      <div className="pgs-row" style={{ marginBottom: 8 }}>
        <div className="pgs-sectiontitle" style={{ margin: 0 }}>สต๊อก Pokémon</div>
        <button className="pgs-iconbtn" onClick={onAddStock}><Plus size={14} /></button>
      </div>
      {stock.length === 0 ? <EmptyState text="ยังไม่มีสต๊อก" /> : stock.map(s => {
        const low = clamp0(s.quantity) <= (s.lowStockThreshold ?? 2);
        return (
          <div key={s.id} className="pgs-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12, cursor: "pointer" }} onClick={() => onEditStock(s)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.photoDataUrl ? (
                <img src={s.photoDataUrl} alt={s.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={14} color="var(--muted)" />
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600 }}>{s.name} {(s.variants || []).filter(v => v !== "normal").map(v => POKEMON_VARIANTS[v]?.emoji).join("")}</div>
                <div style={{ color: "var(--muted)", fontSize: 10 }}>
                  {(s.variants || []).map(v => POKEMON_VARIANTS[v]?.label).join(", ")}
                  {s.productCode ? <span className="pgs-mono" style={{ color: "var(--yellow)", marginLeft: 6 }}>#{s.productCode}</span> : null}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {low && <AlertTriangle size={13} color="var(--red)" />}
              <span className="pgs-mono" style={{ fontWeight: 700, color: low ? "var(--red)" : "var(--text)" }}>{s.quantity}</span>
            </div>
          </div>
        );
      })}

      <div className="pgs-sectiontitle">ประวัติการลงทุน</div>
      {history.length === 0 ? <EmptyState text="ยังไม่มีประวัติ" /> : history.map(h => (
        <div key={h.id} className="pgs-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{h.source === "investment" ? INVEST_TYPES[h.type].label : "รายการอื่นๆ"}</div>
            <div style={{ color: "var(--muted)", fontSize: 10 }}>{fmtDate(h.date)}{h.note ? " · " + h.note : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pgs-mono" style={{ color: "var(--red)" }}>-฿{fmtMoney(h.amount)}</span>
            {confirmInvId === h.id ? (
              <button onClick={() => { (h.source === "investment" ? onDeleteInvestment : onDeleteManual)(h.id); setConfirmInvId(null); }} className="pgs-btn pgs-btn-danger" style={{ padding: "4px 8px", fontSize: 10 }}>ยืนยัน?</button>
            ) : (
              <button onClick={() => setConfirmInvId(h.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color="var(--muted)" /></button>
            )}
          </div>
        </div>
      ))}
      {confirmDelete && (allOrderCount > 0 || stock.length > 0) && (
        <div className="pgs-cancelbanner">
          <AlertTriangle size={14} /> ไอดีนี้มีออเดอร์ {allOrderCount} รายการ และสต๊อก {stock.length} รายการผูกอยู่ — ลบแล้วข้อมูลเหล่านั้นจะไม่แสดงชื่อไอดีนี้อีก
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={onEdit}><Edit2 size={14} /> แก้ไข</button>
        {!confirmDelete ? (
          <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> ลบไอดี</button>
        ) : (
          <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={onDelete}>ยืนยันลบถาวร?</button>
        )}
      </div>
    </Modal>
  );
}

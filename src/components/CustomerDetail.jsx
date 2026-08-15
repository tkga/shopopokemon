import { useState } from "react";
import {
  Trash2,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { ORDER_TYPES } from "../constants.js";
import { todayStr, fmtMoney } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

export default function CustomerDetail({ item, data, onClose, onEdit, onDelete }) {
  const [period, setPeriod] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const orders = data.orders.filter(o => o.customerId === item.id && !o.cancelled);
  const allOrderCount = data.orders.filter(o => o.customerId === item.id).length;
  const today = todayStr();
  const inPeriod = (o) => {
    if (period === "all") return true;
    const d = (o.createdAt || "").slice(0, period === "month" ? 7 : 4);
    const t = today.slice(0, period === "month" ? 7 : 4);
    return d === t;
  };
  const relevant = orders.filter(inPeriod);
  const paidAmountOf = (o) => o.paymentStatus === "paid" ? Number(o.price || 0) : (o.paymentStatus === "partial" ? Number(o.paidAmount || 0) : 0);
  const byType = (t) => relevant.filter(o => o.type === t);
  const sumType = (t) => byType(t).reduce((s, o) => s + paidAmountOf(o), 0);
  const total = ["sell_pokemon", "hire_boss", "hire_invite"].reduce((s, t) => s + sumType(t), 0);
  return (
    <Modal title={item.name} onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{item.facebook || "ไม่มี Facebook"}{item.note ? " · " + item.note : ""}</div>
      {(item.gameIds || []).some(g => g.value) && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          ไอดีในเกม: {item.gameIds.filter(g => g.value).map(g => g.value).join(", ")}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button className={"pgs-chip" + (period === "month" ? " active" : "")} onClick={() => setPeriod("month")}>รายเดือน</button>
        <button className={"pgs-chip" + (period === "year" ? " active" : "")} onClick={() => setPeriod("year")}>รายปี</button>
        <button className={"pgs-chip" + (period === "all" ? " active" : "")} onClick={() => setPeriod("all")}>ทั้งหมด</button>
      </div>
      <div className="pgs-card" style={{ marginBottom: 10 }}>
        <div className="pgs-row" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>ยอดรวม</span>
          <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--green)" }}>฿{fmtMoney(total)}</span>
        </div>
        {Object.entries(ORDER_TYPES).map(([k, v]) => (
          <div key={k} className="pgs-row" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--muted)" }}>{v.emoji} {v.label} ({byType(k).length})</span>
            <span className="pgs-mono">฿{fmtMoney(sumType(k))}</span>
          </div>
        ))}
      </div>
      <div className="pgs-sectiontitle">ประวัติออเดอร์</div>
      {relevant.length === 0 ? <EmptyState text="ไม่มีข้อมูล" /> : relevant.slice(0, 8).map(o => (
        <div key={o.id} className="pgs-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
          <span>{ORDER_TYPES[o.type].emoji} {o.type === "sell_pokemon" ? o.pokemonName : ORDER_TYPES[o.type].label}</span>
          <span className="pgs-mono">฿{fmtMoney(o.price)}</span>
        </div>
      ))}
      {confirmDelete && allOrderCount > 0 && (
        <div className="pgs-cancelbanner">
          <AlertTriangle size={14} /> ลูกค้านี้มีออเดอร์อยู่ {allOrderCount} รายการ — ลบแล้วออเดอร์เหล่านั้นจะยังอยู่แต่จะไม่แสดงชื่อลูกค้า
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={onEdit}><Edit2 size={14} /> แก้ไข</button>
        {!confirmDelete ? (
          <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> ลบ</button>
        ) : (
          <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={onDelete}>ยืนยันลบถาวร?</button>
        )}
      </div>
    </Modal>
  );
}

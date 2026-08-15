import { useState, useMemo } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
} from "lucide-react";
import { ORDER_TYPES, INVEST_TYPES } from "../constants.js";
import { fmtMoney, fmtDate } from "../utils.js";
import StatCard from "./StatCard.jsx";
import EmptyState from "./EmptyState.jsx";
import SubHeader from "./SubHeader.jsx";

export default function FinanceTab({ data, stats, custName, accName, openNew, back, onDeleteManual, onDeleteInvestment, openDetail }) {
  const [confirmTxId, setConfirmTxId] = useState(null);
  const [filter, setFilter] = useState("all");
  const ledger = useMemo(() => {
    const rows = [
      ...data.orders.filter(o => !o.cancelled && o.paymentStatus === "paid").map(o => ({
        id: "o_" + o.id, type: "income", label: `${ORDER_TYPES[o.type].label} - ${custName(o.customerId)}`,
        amount: Number(o.price) || 0, date: (o.paidDate || o.createdAt).slice(0, 10), source: "order",
      })),
      ...data.orders.filter(o => !o.cancelled && o.paymentStatus === "partial").map(o => ({
        id: "op_" + o.id, type: "income", label: `${ORDER_TYPES[o.type].label} - ${custName(o.customerId)} (ชำระบางส่วน)`,
        amount: Number(o.paidAmount) || 0, date: (o.paidDate || o.createdAt).slice(0, 10), source: "order",
      })),
      ...data.investmentHistory.map(h => ({
        id: "i_" + h.id, type: "expense", label: INVEST_TYPES[h.type].label, amount: Number(h.amount) || 0, date: h.date, source: "investment", accountId: h.accountId, rawId: h.id,
      })),
      ...data.manualTx.map(t => ({
        id: "m_" + t.id, type: t.type, label: t.category || "อื่นๆ", amount: Number(t.amount) || 0, date: t.date, source: "manual", rawId: t.id, accountId: t.accountId,
      })),
    ];
    return rows.filter(r => filter === "all" || r.type === filter).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [data, filter, custName]);

  return (
    <div>
      <SubHeader title="การเงิน" back={back} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard icon={TrendingUp} label="รายรับเดือนนี้" value={"฿" + fmtMoney(stats.incomeMonth)} color="var(--green)" />
        <StatCard icon={TrendingDown} label="รายจ่ายเดือนนี้" value={"฿" + fmtMoney(stats.expenseMonth)} color="var(--red)" />
      </div>
      {stats.totalDue > 0 && (
        <button onClick={() => openDetail?.({ type: "debt" })} className="pgs-card" style={{ marginBottom: 12, borderColor: "rgba(255,84,112,0.4)", width: "100%", textAlign: "left", cursor: "pointer" }}>
          <div className="pgs-row">
            <span style={{ fontSize: 12, color: "var(--muted)" }}>ยอดค้างชำระรวมทั้งร้าน · แตะดูรายลูกค้า</span>
            <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--red)" }}>฿{fmtMoney(stats.totalDue)}</span>
          </div>
        </button>
      )}
      <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: 12 }} onClick={openNew}><Plus size={15} /> เพิ่มรายการ (เติม Coin / ซื้อ Pokémon / อื่นๆ)</button>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button className={"pgs-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>ทั้งหมด</button>
        <button className={"pgs-chip" + (filter === "income" ? " active" : "")} onClick={() => setFilter("income")}>รายรับ</button>
        <button className={"pgs-chip" + (filter === "expense" ? " active" : "")} onClick={() => setFilter("expense")}>รายจ่าย</button>
      </div>
      {ledger.length === 0 ? <EmptyState text="ยังไม่มีรายการ" /> : ledger.map(r => (
        <div key={r.id} className="pgs-row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{fmtDate(r.date)}{r.accountId ? ` · ${accName(r.accountId)}` : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pgs-mono" style={{ fontWeight: 700, color: r.type === "income" ? "var(--green)" : "var(--red)" }}>{r.type === "income" ? "+" : "-"}฿{fmtMoney(r.amount)}</span>
            {(r.source === "manual" || r.source === "investment") && (
              confirmTxId === r.rawId ? (
                <button onClick={() => { (r.source === "manual" ? onDeleteManual : onDeleteInvestment)(r.rawId); setConfirmTxId(null); }} className="pgs-btn pgs-btn-danger" style={{ padding: "4px 8px", fontSize: 10 }}>ยืนยัน?</button>
              ) : (
                <button onClick={() => setConfirmTxId(r.rawId)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} color="var(--muted)" /></button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

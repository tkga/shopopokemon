import { useState } from "react";
import {
  Package,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Download,
  Clock,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { ORDER_TYPES } from "../constants.js";
import { fmtMoney, daysBetween } from "../utils.js";
import StatusDot from "./StatusDot.jsx";
import StatCard from "./StatCard.jsx";
import EmptyState from "./EmptyState.jsx";

const PERIODS = {
  today: { label: "วันนี้" },
  month: { label: "เดือนนี้" },
  year: { label: "ปีนี้" },
};

export default function Dashboard({ data, stats, custName, accName, goTab, openDetail, onGoTrade }) {
  const [period, setPeriod] = useState("today");
  const recentOrders = data.orders.filter(o => !o.cancelled).slice(0, 4);

  const income = period === "today" ? stats.incomeToday : period === "month" ? stats.incomeMonth : stats.incomeYear;
  const expense = period === "today" ? stats.expenseToday : period === "month" ? stats.expenseMonth : stats.expenseYear;
  const profit = period === "today" ? stats.profitToday : period === "month" ? stats.profitMonth : stats.profitYear;

  const daysSinceBackup = data.settings.lastBackupAt ? daysBetween(data.settings.lastBackupAt, new Date().toISOString()) : null;
  const needsBackup = daysSinceBackup === null ? data.orders.length + data.customers.length > 0 : daysSinceBackup >= 7;

  return (
    <div>
      {needsBackup && (
        <button onClick={() => goTab("settings")} className="pgs-card" style={{ marginBottom: 12, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(255,203,5,0.4)" }}>
          <Download size={18} color="var(--yellow)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--yellow)" }}>{daysSinceBackup === null ? "ยังไม่เคย Backup ข้อมูล" : `ไม่ได้ Backup มา ${daysSinceBackup} วันแล้ว`}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>ข้อมูลอยู่ในเครื่องนี้เครื่องเดียว แตะเพื่อไปหน้าตั้งค่า</div>
          </div>
          <ChevronRight size={16} color="var(--muted)" />
        </button>
      )}
      <div className="pgs-row" style={{ marginBottom: 10 }}>
        <div className="pgs-sectiontitle" style={{ margin: 0 }}>ภาพรวม</div>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.entries(PERIODS).map(([k, v]) => (
            <button key={k} className={"pgs-chip" + (period === k ? " active" : "")} onClick={() => setPeriod(k)}>{v.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard icon={TrendingUp} label={"รายรับ" + PERIODS[period].label} value={"฿" + fmtMoney(income)} color="var(--green)" />
        <StatCard icon={TrendingDown} label={"รายจ่าย" + PERIODS[period].label} value={"฿" + fmtMoney(expense)} color="var(--red)" />
      </div>

      <div className="pgs-sectiontitle">สรุปกำไร</div>
      <div className="pgs-card" style={{ marginBottom: 4 }}>
        <div className="pgs-row">
          <span style={{ fontSize: 12, color: "var(--muted)" }}>กำไรสุทธิ ({PERIODS[period].label})</span>
          <span className="pgs-mono pgs-display" style={{ fontSize: 22, fontWeight: 700, color: profit >= 0 ? "var(--green)" : "var(--red)" }}>฿{fmtMoney(profit)}</span>
        </div>
      </div>

      <div className="pgs-sectiontitle">เงินลงทุน</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard icon={Coins} label="ลงทุนทั้งหมด" value={"฿" + fmtMoney(stats.totalInvestment)} color="var(--yellow)" />
        <StatCard icon={Package} label="ออเดอร์ทั้งหมด" value={stats.totalOrders} />
      </div>

      <div className="pgs-sectiontitle">รอดำเนินการ</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button onClick={() => goTab("orders")} className="pgs-statcard" style={{ cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>รอชำระ/ค้าง</div>
          <div className="pgs-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--red)" }}>{stats.pendingPayment}</div>
        </button>
        <button onClick={onGoTrade} className="pgs-statcard" style={{ cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>รอเทรด</div>
          <div className="pgs-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--muted)" }}>{stats.pendingTrade}</div>
        </button>
        <button onClick={onGoTrade} className="pgs-statcard" style={{ cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>ทำ 3 ใจ</div>
          <div className="pgs-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--yellow)" }}>{stats.threeHearts}</div>
        </button>
      </div>

      {stats.totalDue > 0 && (
        <button onClick={() => openDetail({ type: "debt" })} className="pgs-card" style={{ marginTop: 10, borderColor: "rgba(255,84,112,0.4)", width: "100%", textAlign: "left", cursor: "pointer" }}>
          <div className="pgs-row">
            <span style={{ fontSize: 12, color: "var(--muted)" }}>ยอดค้างชำระรวม · แตะเพื่อดูรายลูกค้า</span>
            <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--red)" }}>฿{fmtMoney(stats.totalDue)}</span>
          </div>
        </button>
      )}

      {stats.dueSoonCount > 0 && (
        <button onClick={() => openDetail({ type: "duesoon" })} className="pgs-card" style={{ marginTop: 10, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(255,203,5,0.4)" }}>
          <Clock size={18} color="var(--yellow)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--yellow)" }}>นัดหมาย/รอบตีใกล้ถึงกำหนด {stats.dueSoonCount} รายการ</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>ภายใน 7 วัน · แตะเพื่อดูรายการ แล้วไปหน้าเทรด/ตีบอสได้เลย</div>
          </div>
          <ChevronRight size={16} color="var(--muted)" />
        </button>
      )}

      {stats.lowStockCount > 0 && (
        <button onClick={() => goTab("accounts")} className="pgs-card" style={{ marginTop: 10, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(255,84,112,0.4)" }}>
          <AlertTriangle size={18} color="var(--red)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--red)" }}>สต๊อกใกล้หมด {stats.lowStockCount} รายการ</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>แตะเพื่อดูไอดีเกม</div>
          </div>
          <ChevronRight size={16} color="var(--muted)" />
        </button>
      )}

      <div className="pgs-row" style={{ marginTop: 18, marginBottom: 8 }}>
        <div className="pgs-sectiontitle" style={{ margin: 0 }}>ออเดอร์ล่าสุด</div>
        <button onClick={() => goTab("orders")} style={{ background: "none", border: "none", color: "var(--yellow)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>ดูทั้งหมด</button>
      </div>
      {recentOrders.length === 0 ? <EmptyState text="ยังไม่มีออเดอร์" /> : recentOrders.map(o => (
        <div key={o.id} className="pgs-card" style={{ marginBottom: 8 }}>
          <div className="pgs-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{ORDER_TYPES[o.type].emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{custName(o.customerId)}</div>
                <div className="pgs-mono" style={{ fontSize: 10, color: "var(--muted)" }}>{o.code}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="pgs-mono" style={{ fontWeight: 700, fontSize: 13 }}>฿{fmtMoney(o.price)}</div>
              <StatusDot payment={o.paymentStatus} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

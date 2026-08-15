import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { ORDER_TYPES } from "../constants.js";
import { fmtMoney } from "../utils.js";

const PIE_COLORS = ["#ffcb05", "#4d68e0", "#33c481", "#ff5470", "#8b8da6"];
import EmptyState from "./EmptyState.jsx";
import SubHeader from "./SubHeader.jsx";

export default function ReportsTab({ data, custName, accName, back }) {
  const monthly = useMemo(() => {
    const map = {};
    const push = (date, key, amt) => {
      const m = (date || "").slice(0, 7);
      if (!m) return;
      map[m] = map[m] || { month: m, income: 0, expense: 0 };
      map[m][key] += amt;
    };
    data.orders.filter(o => !o.cancelled && o.paymentStatus === "paid").forEach(o => push((o.paidDate || o.createdAt), "income", Number(o.price) || 0));
    data.orders.filter(o => !o.cancelled && o.paymentStatus === "partial").forEach(o => push((o.paidDate || o.createdAt), "income", Number(o.paidAmount) || 0));
    data.manualTx.forEach(t => push(t.date, t.type, Number(t.amount) || 0));
    data.investmentHistory.forEach(h => push(h.date, "expense", Number(h.amount) || 0));
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map(m => ({ ...m, label: m.month.slice(5) + "/" + m.month.slice(2, 4) }));
  }, [data]);

  const paidAmountOf = (o) => o.paymentStatus === "paid" ? Number(o.price || 0) : (o.paymentStatus === "partial" ? Number(o.paidAmount || 0) : 0);

  const incomeByAccount = useMemo(() => {
    const map = {};
    data.orders.filter(o => !o.cancelled && o.sourceAccountId && paidAmountOf(o) > 0).forEach(o => {
      const name = accName(o.sourceAccountId);
      map[name] = (map[name] || 0) + paidAmountOf(o);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const incomeByType = useMemo(() => {
    const map = {};
    data.orders.filter(o => !o.cancelled && paidAmountOf(o) > 0).forEach(o => {
      const label = ORDER_TYPES[o.type].short;
      map[label] = (map[label] || 0) + paidAmountOf(o);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const topCustomers = useMemo(() => {
    const map = {};
    data.orders.filter(o => !o.cancelled && paidAmountOf(o) > 0).forEach(o => {
      map[o.customerId] = (map[o.customerId] || 0) + paidAmountOf(o);
    });
    return Object.entries(map).map(([id, amount]) => ({ name: custName(id), amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [data]);

  return (
    <div>
      <SubHeader title="รายงาน" back={back} />
      <div className="pgs-sectiontitle">รายรับ-รายจ่าย 6 เดือนล่าสุด</div>
      <div className="pgs-card" style={{ marginBottom: 16, height: 190 }}>
        {monthly.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2f42" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8b8da6", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8b8da6", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: "#1b1d2a", border: "1px solid #2c2f42", borderRadius: 8, fontSize: 12 }} formatter={(v) => "฿" + fmtMoney(v)} />
              <Bar dataKey="income" fill="#33c481" radius={[4, 4, 0, 0]} name="รายรับ" />
              <Bar dataKey="expense" fill="#ff5470" radius={[4, 4, 0, 0]} name="รายจ่าย" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pgs-sectiontitle">รายได้แยกตามไอดี</div>
      <div className="pgs-card" style={{ marginBottom: 16 }}>
        {incomeByAccount.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomeByAccount} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {incomeByAccount.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1b1d2a", border: "1px solid #2c2f42", borderRadius: 8, fontSize: 12 }} formatter={(v) => "฿" + fmtMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pgs-sectiontitle">รายได้แยกตามประเภทบริการ</div>
      <div className="pgs-card" style={{ marginBottom: 16 }}>
        {incomeByType.map((t, i) => (
          <div key={t.name} className="pgs-row" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />{t.name}</span>
            <span className="pgs-mono" style={{ fontSize: 12, fontWeight: 700 }}>฿{fmtMoney(t.value)}</span>
          </div>
        ))}
        {incomeByType.length === 0 && <EmptyState text="ยังไม่มีข้อมูล" />}
      </div>

      <div className="pgs-sectiontitle">ลูกค้าใช้จ่ายสูงสุด</div>
      <div className="pgs-card">
        {topCustomers.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : topCustomers.map((c, i) => (
          <div key={c.name} className="pgs-row" style={{ padding: "6px 0" }}>
            <span style={{ fontSize: 12 }}>#{i + 1} {c.name}</span>
            <span className="pgs-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>฿{fmtMoney(c.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { fmtMoney, orderBalance } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

export default function DebtModal({ data, custName, onClose, onOpenCustomer }) {
  const byCustomer = useMemo(() => {
    const map = {};
    data.orders.filter(o => !o.cancelled).forEach(o => {
      const bal = orderBalance(o);
      if (bal <= 0) return;
      if (!map[o.customerId]) map[o.customerId] = { customerId: o.customerId, total: 0, count: 0 };
      map[o.customerId].total += bal;
      map[o.customerId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);
  const grandTotal = byCustomer.reduce((s, c) => s + c.total, 0);
  return (
    <Modal title="ยอดค้างชำระตามลูกค้า" onClose={onClose}>
      <div className="pgs-card" style={{ marginBottom: 12 }}>
        <div className="pgs-row">
          <span style={{ fontSize: 12, color: "var(--muted)" }}>ค้างชำระรวมทั้งร้าน</span>
          <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--red)" }}>฿{fmtMoney(grandTotal)}</span>
        </div>
      </div>
      {byCustomer.length === 0 ? <EmptyState text="ไม่มีลูกค้าติดค้างชำระ" /> : byCustomer.map((c, i) => {
        const customer = data.customers.find(x => x.id === c.customerId);
        return (
          <div
            key={c.customerId} className="pgs-row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: customer ? "pointer" : "default" }}
            onClick={() => customer && onOpenCustomer(customer)}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>#{i + 1} {custName(c.customerId)}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.count} ออเดอร์ค้างชำระ</div>
            </div>
            <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 13, color: "var(--red)" }}>฿{fmtMoney(c.total)}</span>
          </div>
        );
      })}
    </Modal>
  );
}

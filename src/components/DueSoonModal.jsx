import {
  Repeat,
  ChevronRight,
  Clock,
  Target,
} from "lucide-react";
import { ORDER_TYPES } from "../constants.js";
import { fmtDate } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

export default function DueSoonModal({ items, data, custName, onClose, onGoTo }) {
  return (
    <Modal title="นัดหมาย/รอบตีใกล้ถึงกำหนด" onClose={onClose}>
      {items.length === 0 ? <EmptyState text="ไม่มีรายการ" /> : items.map((it, i) => {
        const order = data.orders.find(o => o.id === it.orderId);
        if (!order) return null;
        const isRound = it.kind === "round";
        const isFarm = it.kind === "farm";
        const overdue = it.remain < 0;
        const dueColor = overdue ? "var(--red)" : (it.remain === 0 ? "var(--yellow)" : "var(--muted)");
        const dueText = overdue ? `เลยกำหนด ${Math.abs(it.remain)} วัน` : it.remain === 0 ? "ถึงกำหนดวันนี้" : `อีก ${it.remain} วัน`;
        return (
          <div
            key={i} className="pgs-card" style={{ marginBottom: 8, cursor: "pointer" }}
            onClick={() => onGoTo(order.type)}
          >
            <div className="pgs-row" style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isRound || isFarm ? <Target size={15} color="var(--yellow)" /> : <Repeat size={15} color="var(--blue)" />}
                <span style={{ fontWeight: 700, fontSize: 13 }}>{custName(order.customerId)}</span>
              </div>
              <ChevronRight size={15} color="var(--muted)" />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              {isRound ? `รอบตี · ${ORDER_TYPES[order.type]?.label || ""}` : isFarm ? `นัดฟาม · ${ORDER_TYPES[order.type]?.label || ""}` : `นัดเทรด · ${order.pokemonName || ""}`}
            </div>
            <div style={{ fontSize: 11, color: dueColor, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {fmtDate(it.date)} · {dueText}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

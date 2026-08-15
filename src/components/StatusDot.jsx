import {
  Heart,
  Circle,
  Ban,
} from "lucide-react";
import { PAYMENT_STATUS, TRADE_STATUS } from "../constants.js";

export default function StatusDot({ payment, trade, cancelled }) {
  if (cancelled) {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <span className="pgs-badge" style={{ background: "rgba(255,84,112,0.15)", color: "var(--red)" }}>
          <Ban size={9} /> ยกเลิกแล้ว
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {payment && (
        <span className="pgs-badge" style={{ background: PAYMENT_STATUS[payment].color + "22", color: PAYMENT_STATUS[payment].color }}>
          <Circle size={7} fill={PAYMENT_STATUS[payment].color} stroke="none" /> {PAYMENT_STATUS[payment].label}
        </span>
      )}
      {trade && (
        <span className="pgs-badge" style={{ background: TRADE_STATUS[trade].color + "22", color: TRADE_STATUS[trade].color }}>
          {trade === "three_hearts" ? <Heart size={9} fill={TRADE_STATUS[trade].color} stroke="none" /> : <Circle size={7} fill={TRADE_STATUS[trade].color} stroke="none" />} {TRADE_STATUS[trade].label}
        </span>
      )}
    </div>
  );
}

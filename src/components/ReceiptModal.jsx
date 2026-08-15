import { useState, useMemo } from "react";
import {
  Download,
  Ban,
  Copy,
} from "lucide-react";
import { fmtMoney } from "../utils.js";
import { buildReceiptLines, buildReceiptData, downloadReceiptImage } from "../receipt.js";
import Modal from "./Modal.jsx";
import ShopLogo from "./ShopLogo.jsx";

// ธีมสี "ใบเสนอราคา" ครีม-น้ำตาล — ใช้เฉพาะกล่องรายการสีขาวด้านใน ให้ตรงกับตัวที่วาดลง canvas ใน receipt.js
const THEME = {
  card: "#FFFFFF",
  border: "#E3D8C3",
  maroon: "#8B3E3E",
  textDark: "#3B2E28",
  textMuted: "#948573",
};

// ธีมสำหรับข้อความที่วางทับพื้นหลังใบเสร็จ (ภาพอัปโหลด หรือเดฟอลต์) โดยตรง — ต้องเป็นโทนสว่าง
// เพราะพื้นหลังมี dark overlay ทับอยู่เสมอ ให้ตรงกับ HERO ใน receipt.js
const HERO = {
  accent: "#FFD54A",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.78)",
  divider: "rgba(255,255,255,0.28)",
  outerBorder: "rgba(255,255,255,0.14)",
  overlay: "rgba(8,10,20,0.72)",
};

// พื้นหลังเดฟอลต์แบบ "Pokémon GO" (โทนน้ำเงินค่ำคืนบนแผนที่) ใช้ตอนร้านยังไม่อัปโหลดพื้นหลังเอง
// ให้ตรงกับ DEFAULT_BG_STOPS ใน receipt.js
const DEFAULT_BG_GRADIENT = "linear-gradient(135deg, #1e3c72 0%, #2a5298 55%, #131c2e 100%)";

// ลายน้ำ Poké Ball — วางกลางพื้นหลัง โปร่งใส ให้ตรงกับ drawPokeballWatermark ใน receipt.js
function PokeballWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "78%", height: "auto", opacity: 0.1, pointerEvents: "none",
      }}
    >
      <circle cx="100" cy="100" r="90" fill="none" stroke="#FFFFFF" strokeWidth="10" />
      <line x1="10" y1="100" x2="190" y2="100" stroke="#FFFFFF" strokeWidth="10" />
      <circle cx="100" cy="100" r="20" fill="none" stroke="#FFFFFF" strokeWidth="10" />
      <circle cx="100" cy="100" r="9" fill="#FFFFFF" />
    </svg>
  );
}

export default function ReceiptModal({ order, data, custName, accName, onClose, onToast }) {
  const lines = buildReceiptLines(order, data, custName, accName);
  const text = lines.join("\n");
  const r = useMemo(() => buildReceiptData(order, data, custName, accName), [order, data]);
  const [downloading, setDownloading] = useState(false);
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      onToast("คัดลอกใบเสร็จแล้ว");
    } catch {
      onToast("คัดลอกไม่สำเร็จ");
    }
  }
  async function download() {
    setDownloading(true);
    try {
      await downloadReceiptImage(order, data, custName, accName);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Modal title="ใบเสร็จ / สรุปออเดอร์" onClose={onClose}>
      <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: `1px solid ${HERO.outerBorder}`, marginBottom: 14 }}>
        {/* พื้นหลัง: รูปที่ร้านอัปโหลด (receiptBgDataUrl) แบบ cover-fit หรือเดฟอลต์ธีม Pokémon GO */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: r.receiptBgDataUrl ? `url(${r.receiptBgDataUrl})` : DEFAULT_BG_GRADIENT,
          backgroundSize: "cover", backgroundPosition: "center",
        }} />
        {/* Dark overlay ให้อ่านข้อความง่าย */}
        <div style={{ position: "absolute", inset: 0, background: HERO.overlay }} />
        {/* ลายน้ำ Poké Ball */}
        <PokeballWatermark />

        {/* เนื้อหาใบเสร็จ — วางทับพื้นหลัง 3 ชั้นด้านบน */}
        <div style={{ position: "relative", zIndex: 1, padding: 22 }}>
          {/* โลโก้ซ้าย + หัวเรื่องใหญ่ขวา */}
          <div className="pgs-row" style={{ alignItems: "flex-start", marginBottom: 10 }}>
            <ShopLogo logoDataUrl={r.logoDataUrl} size={44} />
            <div className="pgs-display" style={{ fontSize: 24, fontWeight: 700, color: HERO.accent, textAlign: "right", lineHeight: 1.15 }}>
              {r.cancelled ? "ใบเสร็จ (ยกเลิกแล้ว)" : "ใบเสร็จ"}
            </div>
          </div>

          {/* ชื่อร้าน (ซ้าย) + เลขที่/วันที่ (ขวา) เหนือเส้นแบ่ง */}
          <div className="pgs-row" style={{ alignItems: "flex-end", borderBottom: `1px solid ${HERO.divider}`, paddingBottom: 14, marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: HERO.text }}>{r.shopName}</span>
            <div style={{ textAlign: "right" }}>
              <div className="pgs-mono" style={{ fontSize: 12, fontWeight: 700, color: HERO.text }}>เลขที่ {r.code}</div>
              <div className="pgs-mono" style={{ fontSize: 11, color: HERO.textMuted }}>{r.dateStr}</div>
            </div>
          </div>

          {/* ตารางรายการ — กล่องขาวทึบ ใช้ THEME เดิม อ่านง่ายไม่ว่าพื้นหลังจะเป็นอะไร
              ตอนนี้รวมบล็อกชื่อลูกค้า/บริการ/นัดไว้ด้านบนสุดของกล่องนี้ด้วย */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 14 }}>
            <div className="pgs-row" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: THEME.textDark }}>{r.customerName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.maroon }}>ครั้งที่ {r.orderNoForCustomer}</span>
            </div>
            <div style={{ fontSize: 12, color: THEME.textMuted }}>
              {r.serviceEmoji} {r.serviceLabel}{r.customerGameId ? ` · ไอดี ${r.customerGameId}` : ""}
            </div>
            {r.periodStr && <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>🗓️ {r.periodStr}</div>}

            <div className="pgs-row" style={{ fontSize: 11, fontWeight: 700, color: THEME.maroon, textTransform: "uppercase", letterSpacing: 0.4, paddingTop: 12, paddingBottom: 8, marginTop: 12, marginBottom: 8, borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` }}>
              <span>รายละเอียด</span><span>รวม</span>
            </div>
            {r.items.map((it, i) => (
              <div key={i} className="pgs-row" style={{ alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: THEME.textDark }}>{it.label}</div>
                  <div style={{ fontSize: 11, color: THEME.textMuted }}>{it.sub}</div>
                </div>
                <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 13, color: THEME.textDark }}>฿{fmtMoney(it.price)}</span>
              </div>
            ))}
            <div className="pgs-row" style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: THEME.maroon, fontWeight: 700 }}>รวมทั้งหมด</span>
              <span className="pgs-mono pgs-display" style={{ fontWeight: 700, fontSize: 20, color: THEME.maroon }}>฿{fmtMoney(r.total)}</span>
            </div>
          </div>

          {r.proofImageDataUrl && (
            <div style={{ marginBottom: 14 }}>
              <div className="pgs-label" style={{ marginBottom: 8, color: HERO.textMuted }}>รูปภาพกิจกรรม</div>
              <div style={{ display: "flex", justifyContent: "center", background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, padding: 6 }}>
                <img
                  src={r.proofImageDataUrl}
                  alt="รูปภาพกิจกรรม"
                  style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: 420 }}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: r.note ? 10 : 0 }}>
            <span className="pgs-badge" style={{ background: r.paymentColor + "40", color: r.paymentColor }}>{r.paymentStatus}</span>
            {r.tradeStatus && <span className="pgs-badge" style={{ background: HERO.accent + "40", color: HERO.accent }}>{r.tradeStatus}</span>}
          </div>
          {r.note && <div style={{ fontSize: 12, color: HERO.textMuted }}>หมายเหตุ: {r.note}</div>}
          {r.cancelled && <div className="pgs-cancelbanner" style={{ marginTop: 10, marginBottom: 0, background: "rgba(179,56,56,0.32)", color: "#FFD3D3" }}><Ban size={13} /> ออเดอร์นี้ถูกยกเลิกแล้ว</div>}

          <div style={{ borderTop: `1px solid ${HERO.divider}`, marginTop: 14, paddingTop: 12, fontSize: 11, color: HERO.textMuted, textAlign: "center" }}>
            ขอบคุณที่ใช้บริการ {r.shopName} 🐾
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={copyText}><Copy size={14} /> คัดลอกข้อความ</button>
        <button className="pgs-btn pgs-btn-primary" style={{ flex: 1 }} disabled={downloading} onClick={download}><Download size={14} /> {downloading ? "กำลังสร้างรูป..." : "ดาวน์โหลดรูป"}</button>
      </div>
    </Modal>
  );
}
